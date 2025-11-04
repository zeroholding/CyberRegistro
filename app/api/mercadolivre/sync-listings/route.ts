import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ensureMercadoLivreAccessToken, MercadoLivreAccountRecord } from '../token-utils';

// Next.js route config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  sku?: string | null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
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

async function fetchAllMLListings(mlUserId: string, accessToken: string): Promise<MLListing[]> {
  const limit = 50;
  const statuses = [
    'active',
    'paused',
    'under_review',
    'closed',
    'inactive',
    'not_yet_active',
    'payment_required',
    'blocked',
  ];

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
      // swallow and return whatever we got
    }
    return ids;
  };

  // Collect ids across statuses
  const idGroups = await Promise.all([
    collectIdsForStatus(undefined),
    ...statuses.map((s) => collectIdsForStatus(s)),
  ]);
  const itemIds = Array.from(new Set(idGroups.flat()));
  if (itemIds.length === 0) return [];

  // Fetch details batched
  const batchSize = 20;
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
            sku: item.body.seller_custom_field ?? null,
          });
        }
      });
    }
    return listings;
  });

  return batchResults.flat();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accountIds } = body as { userId?: number | string; accountIds?: number[] };
    if (!userId || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: 'userId and accountIds (array) are required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        const allListings: any[] = [];
        const errors: any[] = [];

        try {
          const upsertListingsBatch = async (
            accountId: number,
            accountNickname: string | undefined,
            userIdParam: number,
            listingsBatch: MLListing[],
            savedCounterRef: { value: number }
          ) => {
            if (listingsBatch.length === 0) return;
            const valuesPerRow = 15;
            const params: any[] = [];
            const valuesChunks: string[] = [];
            for (let i = 0; i < listingsBatch.length; i++) {
              const l = listingsBatch[i];
              const base = i * valuesPerRow;
              valuesChunks.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, CURRENT_TIMESTAMP)`
              );
              params.push(
                userIdParam,
                accountId,
                l.id,
                l.sku ?? null,
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
                user_id, ml_account_id, mlb_code, sku, title, thumbnail,
                price, available_quantity, sold_quantity, status,
                permalink, listing_type_id, condition,
                created_at_ml, updated_at_ml, synced_at
              ) VALUES ${valuesChunks.join(', ')}
              ON CONFLICT (ml_account_id, mlb_code)
              DO UPDATE SET
                sku = EXCLUDED.sku,
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
          await mapWithConcurrency(accountIds as number[], ACCOUNTS_CONCURRENCY, async (accountId) => {
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

              sendEvent('fetching', { accountId, nickname: account.nickname });
              await new Promise((resolve) => setTimeout(resolve, 10));

              const listings = await fetchAllMLListings(account.ml_user_id.toString(), account.access_token);

              sendEvent('found', {
                accountId,
                nickname: account.nickname,
                count: listings.length,
              });
              await new Promise((resolve) => setTimeout(resolve, 10));

              const savedForAccount = { value: 0 };
              const SAVE_BATCH_SIZE = 100;
              for (let i = 0; i < listings.length; i += SAVE_BATCH_SIZE) {
                const batch = listings.slice(i, i + SAVE_BATCH_SIZE);
                await upsertListingsBatch(account.id, account.nickname, Number(userId), batch, savedForAccount);
              }

              allListings.push({ accountId: account.id, nickname: account.nickname, count: savedForAccount.value });
            } catch (error: any) {
              console.error(`Erro ao sincronizar conta ${accountId}:`, error);
              errors.push({ accountId, error: error.message || 'Unknown error' });
              sendEvent('error', { accountId, error: error.message || 'Unknown error' });
            }
          });

          sendEvent('complete', {
            success: true,
            synced: allListings,
            errors: errors.length > 0 ? errors : undefined,
          });
        } catch (error) {
          console.error('Erro ao sincronizar anuncios:', error);
          sendEvent('error', { error: 'Erro ao sincronizar anuncios' });
        } finally {
          controller.close();
        }
      },
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
      const isMLBCode = searchTerm.toUpperCase().startsWith('MLB') || /^\d+$/.test(searchTerm);
      if (isMLBCode) {
        const numericSearch = searchTerm.replace(/^MLB/i, '');
        whereClauses.push(`(
          a.mlb_code ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex + 1}
          OR COALESCE(a.sku, '') ILIKE $${paramIndex + 2}
          OR a.title ILIKE $${paramIndex + 3}
        )`);
        params.push(`MLB${numericSearch}%`);
        params.push(`%${numericSearch}%`);
        params.push(`%${searchTerm}%`);
        params.push(`%${searchTerm}%`);
        paramIndex += 4;
      } else {
        whereClauses.push(`(
          a.title ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex}
          OR COALESCE(a.permalink, '') ILIKE $${paramIndex}
          OR COALESCE(a.sku, '') ILIKE $${paramIndex}
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
