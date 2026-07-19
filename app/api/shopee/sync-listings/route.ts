import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureShopeeAccessToken, ShopeeAccountRecord } from '../token-utils';
import { getShopeeItemList, getShopeeItemBaseInfo, ShopeeItem } from '@/app/services/shopee';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Percorre todas as páginas de item_ids da loja. */
async function fetchAllShopeeItemIds(shopId: string, accessToken: string): Promise<number[]> {
  const ids: number[] = [];
  let offset = 0;
  let guard = 0;
  while (guard < 200) {
    const page = await getShopeeItemList(shopId, accessToken, offset, 50);
    ids.push(...page.items.map((i) => i.item_id));
    if (!page.hasNextPage || page.items.length === 0) break;
    offset = page.nextOffset;
    guard++;
  }
  return ids;
}

function buildPermalink(shopId: string, itemId: number): string {
  return `https://shopee.com.br/product/${shopId}/${itemId}`;
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
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const allSynced: any[] = [];
        const errors: any[] = [];

        for (const accountId of accountIds) {
          try {
            const accountResult = await pool.query(
              `SELECT id, user_id, shop_id, shop_name, access_token, refresh_token, expires_at
               FROM shopee_accounts WHERE id = $1 AND user_id = $2`,
              [accountId, userId],
            );

            if (accountResult.rows.length === 0) {
              errors.push({ accountId, error: 'Conta não encontrada' });
              sendEvent('error', { accountId, error: 'Conta não encontrada' });
              continue;
            }

            let account = accountResult.rows[0] as ShopeeAccountRecord;
            try {
              account = await ensureShopeeAccessToken(pool, account);
            } catch (refreshError: any) {
              const message = refreshError?.message || 'Falha ao renovar token';
              errors.push({ accountId, shopName: account.shop_name, error: message });
              sendEvent('error', { accountId, error: message });
              continue;
            }

            sendEvent('fetching', { accountId, nickname: account.shop_name });

            const shopId = String(account.shop_id);
            const itemIds = await fetchAllShopeeItemIds(shopId, account.access_token);

            sendEvent('found', { accountId, nickname: account.shop_name, count: itemIds.length });

            let saved = 0;
            const BATCH_SIZE = 50; // limite da API get_item_base_info
            for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
              const batchIds = itemIds.slice(i, i + BATCH_SIZE);
              const items: ShopeeItem[] = await getShopeeItemBaseInfo(shopId, account.access_token, batchIds);
              if (items.length === 0) continue;

              const valuesPerRow = 10;
              const params: any[] = [];
              const valuesChunks: string[] = [];
              for (let j = 0; j < items.length; j++) {
                const it = items[j];
                const base = j * valuesPerRow;
                valuesChunks.push(
                  `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, CURRENT_TIMESTAMP)`,
                );
                params.push(
                  Number(userId),
                  account.id,
                  String(it.item_id),
                  it.item_sku || null,
                  it.item_name,
                  it.image?.image_url_list?.[0] || null,
                  it.price_info?.[0]?.current_price ?? null,
                  it.item_status || null,
                  buildPermalink(shopId, it.item_id),
                  'shopee',
                );
              }

              const query = `INSERT INTO anuncios (
                  user_id, shopee_account_id, mlb_code, sku, title, thumbnail,
                  price, status, permalink, platform, synced_at
                ) VALUES ${valuesChunks.join(', ')}
                ON CONFLICT (shopee_account_id, mlb_code) WHERE shopee_account_id IS NOT NULL
                DO UPDATE SET
                  sku = EXCLUDED.sku,
                  title = EXCLUDED.title,
                  thumbnail = EXCLUDED.thumbnail,
                  price = EXCLUDED.price,
                  status = EXCLUDED.status,
                  permalink = EXCLUDED.permalink,
                  synced_at = CURRENT_TIMESTAMP`;

              await pool.query(query, params);
              saved += items.length;
              sendEvent('progress', { accountId, nickname: account.shop_name, saved });
            }

            allSynced.push({ accountId: account.id, nickname: account.shop_name, count: saved });
          } catch (error: any) {
            console.error(`Erro ao sincronizar conta Shopee ${accountId}:`, error);
            errors.push({ accountId, error: error.message || 'Erro desconhecido' });
            sendEvent('error', { accountId, error: error.message || 'Erro desconhecido' });
          }
        }

        sendEvent('complete', { success: true, synced: allSynced, errors: errors.length > 0 ? errors : undefined });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (error) {
    console.error('Erro ao sincronizar anúncios Shopee:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar anúncios' }, { status: 500 });
  }
}
