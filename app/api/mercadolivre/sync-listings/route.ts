import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ensureMercadoLivreAccessToken, MercadoLivreAccountRecord } from '../token-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface MLListing {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  permalink: string;
  listing_type_id: string;
  condition: string;
  date_created: string;
  last_updated: string;
}

// Small concurrency helper
async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (limit <= 1) {
    const out: R[] = [];
    for (let i = 0; i < items.length; i++) out.push(await mapper(items[i], i));
    return out;
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      results[idx] = await mapper(items[idx], idx);
    }
  }
  const workers = Array(Math.min(limit, items.length)).fill(0).map(() => worker());
  await Promise.all(workers);
  return results;
}

// Fetch all listings (all relevant statuses) with pagination, using controlled concurrency
async function fetchAllMLListings(mlUserId: string, accessToken: string): Promise<MLListing[]> {
  const limit = 50;

  // Known item statuses on Mercado Livre for items API.
  // We include a broad set to ensure we capture everything relevant.
  const statuses = [
    'active',
    'paused',
    'under_review',
    'closed',
    // Extra/edge statuses that may appear depending on account/site policies
    'inactive',
    'not_yet_active',
    'payment_required',
    'blocked',
  ];

  // Helper to collect ids for a given status using scan and fallback to offset.
  // Returns a list of item ids (may contain duplicates across statuses)
  const collectIdsForStatus = async (statusParam?: string): Promise<string[]> => {
    const ids: string[] = [];
    // Try scan first
    try {
      let scrollId: string | undefined = undefined;
      let guard = 0;
      while (true) {
        const base = `https://api.mercadolibre.com/users/${mlUserId}/items/search?search_type=scan&limit=${limit}`;
        const url: string = base + (statusParam ? `&status=${statusParam}` : '') + (scrollId ? `&scroll_id=${encodeURIComponent(scrollId)}` : '');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error('scan_not_supported');
        const data = await res.json();
        const batch: string[] = data.results || [];
        ids.push(...batch);
        scrollId = data.scroll_id;
        if (!scrollId || batch.length === 0) break;
        guard++;
        if (guard > 1000) break; // safety
      }
      return ids; // success via scan
    } catch (_) {
      // ignore and try offset pagination
    }

    // Fallback: offset pagination
    try {
      let offset = 0;
      let guard = 0;
      while (true) {
        const base = `https://api.mercadolibre.com/users/${mlUserId}/items/search?limit=${limit}&offset=${offset}`;
        const url = base + (statusParam ? `&status=${statusParam}` : '');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error(`error_${res.status}`);
        const data = await res.json();
        const batch: string[] = data.results || [];
        ids.push(...batch);
        if (batch.length < limit) break;
        offset += limit;
        guard++;
        if (guard > 400) break; // safety
      }
    } catch (_) {
      // Swallow error for this specific status and continue with others
    }
    return ids;
  };

  // Collect ids concurrently across statuses
  const idGroups = await Promise.all([
    collectIdsForStatus(undefined),
    ...statuses.map((s) => collectIdsForStatus(s)),
  ]);
  const itemIds = Array.from(new Set(idGroups.flat()));
  if (itemIds.length === 0) return [];

  // Fetch item details in parallel with limited concurrency
  const batchSize = 20; // ML items API supports up to ~20 ids per call
  const detailsConcurrency = 4;
  const batches: string[][] = [];
  for (let i = 0; i < itemIds.length; i += batchSize) {
    batches.push(itemIds.slice(i, i + batchSize));
  }

  const batchResults = await mapWithConcurrency(batches, detailsConcurrency, async (batch) => {
    const ids = batch.join(',');
    const detailsResponse = await fetch(
      `https://api.mercadolibre.com/items?ids=${ids}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listings: MLListing[] = [];
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      detailsData.forEach((item: any) => {
        if (item.code === 200 && item.body) {
          listings.push({
            id: item.body.id,
            title: item.body.title,
            thumbnail: item.body.thumbnail,
            price: item.body.price,
            available_quantity: item.body.available_quantity,
            sold_quantity: item.body.sold_quantity,
            status: item.body.status,
            permalink: item.body.permalink,
            listing_type_id: item.body.listing_type_id,
            condition: item.body.condition,
            date_created: item.body.date_created,
            last_updated: item.body.last_updated,
          });
        }
      });
    }
    return listings;
  });

  return batchResults.flat();
}

// Sync listings with streaming progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accountIds } = body;

    if (!userId || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: 'userId and accountIds (array) are required' }, { status: 400 });
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          console.log('Sending SSE event:', event, data);
          controller.enqueue(encoder.encode(message));
        };

        const allListings: any[] = [];
        const errors: any[] = [];

        try {
          // Upsert helper in batches to cut DB round-trips dramatically
          const upsertListingsBatch = async (
            accountId: number,
            accountNickname: string | undefined,
            userIdParam: number,
            listingsBatch: MLListing[],
            savedCounterRef: { value: number }
          ) => {
            if (listingsBatch.length === 0) return;
            const valuesPerRow = 14; // number of placeholders per row in VALUES(...)
            const params: any[] = [];
            const valuesChunks: string[] = [];
            for (let i = 0; i < listingsBatch.length; i++) {
              const l = listingsBatch[i];
              const base = i * valuesPerRow;
              valuesChunks.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, CURRENT_TIMESTAMP)`
              );
              params.push(
                userIdParam,
                accountId,
                l.id,
                l.title,
                l.thumbnail ?? null,
                l.price ?? null,
                l.available_quantity ?? null,
                l.sold_quantity ?? null,
                l.status ?? null,
                l.permalink ?? null,
                l.listing_type_id ?? null,
                l.condition ?? null,
                l.date_created ?? null,
                l.last_updated ?? null,
              );
            }

            const query = `INSERT INTO anuncios (
                user_id, ml_account_id, mlb_code, title, thumbnail,
                price, available_quantity, sold_quantity, status,
                permalink, listing_type_id, condition,
                created_at_ml, updated_at_ml, synced_at
              ) VALUES ${valuesChunks.join(', ')}
              ON CONFLICT (ml_account_id, mlb_code)
              DO UPDATE SET
                title = EXCLUDED.title,
                thumbnail = EXCLUDED.thumbnail,
                price = EXCLUDED.price,
                available_quantity = EXCLUDED.available_quantity,
                sold_quantity = EXCLUDED.sold_quantity,
                status = EXCLUDED.status,
                permalink = EXCLUDED.permalink,
                listing_type_id = EXCLUDED.listing_type_id,
                condition = EXCLUDED.condition,
                updated_at_ml = EXCLUDED.updated_at_ml,
                synced_at = CURRENT_TIMESTAMP`;

            await pool.query(query, params);
            savedCounterRef.value += listingsBatch.length;
            sendEvent('progress', {
              accountId,
              nickname: accountNickname,
              saved: savedCounterRef.value,
            });
          };

          const ACCOUNTS_CONCURRENCY = 3;

          await mapWithConcurrency(accountIds as number[], ACCOUNTS_CONCURRENCY, async (accountId, _idx) => {
            try {
              const accountResult = await pool.query(
                `SELECT id, user_id, ml_user_id, access_token, refresh_token, expires_at, nickname, token_type, scope
                 FROM mercadolivre_accounts
                 WHERE id = $1 AND user_id = $2`,
                [accountId, userId]
              );

              if (accountResult.rows.length === 0) {
                errors.push({ accountId, error: 'Account not found' });
                sendEvent('error', { accountId, error: 'Account not found' });
                return;
              }

              let account = accountResult.rows[0] as MercadoLivreAccountRecord;

              try {
                account = await ensureMercadoLivreAccessToken(pool, account);
              } catch (refreshError: any) {
                const message = refreshError?.message || 'Failed to refresh access token';
                errors.push({ accountId, nickname: account.nickname, error: message });
                sendEvent('error', { accountId, nickname: account.nickname, error: message });
                return;
              }

              // Send fetching event
              sendEvent('fetching', { accountId, nickname: account.nickname });
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure flush

              const listings = await fetchAllMLListings(account.ml_user_id.toString(), account.access_token);

              // Send found event
              sendEvent('found', {
                accountId,
                nickname: account.nickname,
                count: listings.length
              });
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure flush

              // Save listings in batches with fewer DB round-trips
              const savedForAccount = { value: 0 };
              const SAVE_BATCH_SIZE = 100;
              for (let i = 0; i < listings.length; i += SAVE_BATCH_SIZE) {
                const batch = listings.slice(i, i + SAVE_BATCH_SIZE);
                await upsertListingsBatch(account.id, account.nickname, Number(userId), batch, savedForAccount);
              }

              allListings.push({ accountId, nickname: account.nickname, count: listings.length });
            } catch (error: any) {
              console.error(`Erro ao sincronizar conta ${accountId}:`, error);
              errors.push({ accountId, error: error.message || 'Unknown error' });
              sendEvent('error', { accountId, error: error.message || 'Unknown error' });
            }
          });

          // Send complete event
          sendEvent('complete', {
            success: true,
            synced: allListings,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (error: any) {
          console.error('Erro ao sincronizar anuncios:', error);
          sendEvent('error', { error: 'Erro ao sincronizar anuncios' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro ao sincronizar anuncios:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar anuncios' }, { status: 500 });
  }
}

// List listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const perPageParam = parseInt(searchParams.get('perPage') || '21', 10);
    const searchTerm = (searchParams.get('search') || '').trim();
    const statusFilter = (searchParams.get('status') || '').trim();
    const accountParam = (searchParams.get('accountId') || '').trim();
    const accountId = accountParam ? parseInt(accountParam, 10) : null;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const perPage = Number.isFinite(perPageParam) && perPageParam > 0 && perPageParam <= 100 ? perPageParam : 21;
    const offset = (page - 1) * perPage;

    const whereClauses: string[] = ['a.user_id = $1'];
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (statusFilter) {
      whereClauses.push(`a.status = $${paramIndex}`);
      params.push(statusFilter);
      paramIndex++;
    }

    if (accountId) {
      whereClauses.push(`a.ml_account_id = $${paramIndex}`);
      params.push(accountId);
      paramIndex++;
    }

    if (searchTerm) {
      // Se começar com MLB ou for só números, buscar exato no mlb_code
      const isMLBCode = searchTerm.toUpperCase().startsWith('MLB') || /^\d+$/.test(searchTerm);

      if (isMLBCode) {
        // Remover "MLB" se existir para buscar apenas pelos números
        const numericSearch = searchTerm.replace(/^MLB/i, '');
        whereClauses.push(`(
          a.mlb_code ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex + 1}
          OR a.title ILIKE $${paramIndex + 2}
          OR COALESCE(a.seller_custom_field, '') ILIKE $${paramIndex + 3}
        )`);
        params.push(`MLB${numericSearch}%`); // Busca exata começando com MLB+números
        params.push(`%${numericSearch}%`); // Busca pelos números em qualquer parte
        params.push(`%${searchTerm}%`); // Busca no título
        params.push(`%${searchTerm}%`); // Busca no SKU
        paramIndex += 4;
      } else {
        // Busca normal em título, mlb_code, permalink e SKU
        whereClauses.push(`(
          a.title ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex}
          OR COALESCE(a.permalink, '') ILIKE $${paramIndex}
          OR COALESCE(a.seller_custom_field, '') ILIKE $${paramIndex}
        )`);
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total, MAX(synced_at) as latest_synced_at
       FROM anuncios a
       WHERE ${whereClause}`,
      params
    );

    const total = countRes.rows[0]?.total || 0;
    const latestSyncedAt = countRes.rows[0]?.latest_synced_at || null;

    const listRes = await pool.query(
      `SELECT
        a.*,
        ma.nickname as account_nickname,
        ma.first_name as account_first_name,
        ma.last_name as account_last_name
       FROM anuncios a
       LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
       WHERE ${whereClause}
       ORDER BY a.synced_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset]
    );

    return NextResponse.json({ listings: listRes.rows, total, latestSyncedAt, page, perPage });
  } catch (error) {
    console.error('Erro ao buscar anuncios:', error);
    return NextResponse.json({ error: 'Erro ao buscar anuncios' }, { status: 500 });
  }
}
