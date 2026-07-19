/**
 * Shopee Open Platform API v2 — cliente HTTP + assinatura.
 *
 * Diferente do Mercado Livre (OAuth Bearer simples), a Shopee usa:
 *   - um app Partner: partner_id + partner_key
 *   - uma assinatura HMAC-SHA256 (`sign`) em toda chamada
 *   - um access_token/refresh_token por LOJA (shop_id)
 *
 * Base host: https://partner.shopeemobile.com
 * Credenciais via env: SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY.
 */
import crypto from 'crypto';

const SHOPEE_HOST = 'https://partner.shopeemobile.com';

export function getShopeeCredentials(): { partnerId: string; partnerKey: string } {
  return {
    partnerId: process.env.SHOPEE_PARTNER_ID || '',
    partnerKey: process.env.SHOPEE_PARTNER_KEY || '',
  };
}

function sign(partnerKey: string, baseString: string): string {
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

/** URL de autorização — o vendedor faz login na Shopee e autoriza o app. */
export function getShopeeAuthUrl(redirectUrl: string): string {
  const { partnerId, partnerKey } = getShopeeCredentials();
  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const signature = sign(partnerKey, baseString);

  const url = new URL(`${SHOPEE_HOST}${path}`);
  url.searchParams.set('partner_id', partnerId);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('sign', signature);
  url.searchParams.set('redirect', redirectUrl);
  return url.toString();
}

/** Assinatura para chamadas autenticadas por LOJA (shop-scoped). */
function signShopCall(path: string, accessToken: string, shopId: string, timestamp: number): string {
  const { partnerId, partnerKey } = getShopeeCredentials();
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return sign(partnerKey, baseString);
}

export type ShopeeTokens = {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  shop_id: number;
};

/** Troca o `code` do callback por tokens da loja. */
export async function exchangeShopeeCode(code: string, shopId: string): Promise<ShopeeTokens> {
  const { partnerId, partnerKey } = getShopeeCredentials();
  const path = '/api/v2/auth/token/get';
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const signature = sign(partnerKey, baseString);

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${signature}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(partnerId) }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Erro ao obter token Shopee: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Renova o access_token de uma loja usando o refresh_token salvo. */
export async function refreshShopeeToken(refreshToken: string, shopId: string): Promise<ShopeeTokens> {
  const { partnerId, partnerKey } = getShopeeCredentials();
  const path = '/api/v2/auth/access_token/get';
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const signature = sign(partnerKey, baseString);

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${signature}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      partner_id: Number(partnerId),
      shop_id: Number(shopId),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Erro ao renovar token Shopee: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Nome da loja (para exibir na UI, igual ao nickname do ML). */
export async function getShopeeShopName(shopId: string, accessToken: string): Promise<string | null> {
  try {
    const { partnerId } = getShopeeCredentials();
    const path = '/api/v2/shop/get_shop_info';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signShopCall(path, accessToken, shopId, timestamp);
    const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${signature}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return data?.shop_name ?? null;
  } catch {
    return null;
  }
}

export type ShopeeItem = {
  item_id: number;
  item_name: string;
  item_sku: string;
  item_status: string;
  image?: { image_url_list?: string[] };
  price_info?: Array<{ current_price: number }>;
};

/** Lista os item_ids da loja (paginado por offset/cursor). */
export async function getShopeeItemList(
  shopId: string,
  accessToken: string,
  offset = 0,
  pageSize = 50,
): Promise<{ items: Array<{ item_id: number }>; hasNextPage: boolean; nextOffset: number }> {
  const { partnerId } = getShopeeCredentials();
  const path = '/api/v2/product/get_item_list';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signShopCall(path, accessToken, shopId, timestamp);

  const url = new URL(`${SHOPEE_HOST}${path}`);
  url.searchParams.set('partner_id', partnerId);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('shop_id', shopId);
  url.searchParams.set('sign', signature);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('item_status', 'NORMAL');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Erro ao listar itens Shopee: ${JSON.stringify(data)}`);
  }
  const response = data.response || {};
  return {
    items: response.item || [],
    hasNextPage: !!response.has_next_page,
    nextOffset: response.next_offset ?? offset + pageSize,
  };
}

/** Detalhes em lote (até 50 por chamada) dos itens listados. */
export async function getShopeeItemBaseInfo(
  shopId: string,
  accessToken: string,
  itemIds: number[],
): Promise<ShopeeItem[]> {
  const { partnerId } = getShopeeCredentials();
  const path = '/api/v2/product/get_item_base_info';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signShopCall(path, accessToken, shopId, timestamp);

  const url = new URL(`${SHOPEE_HOST}${path}`);
  url.searchParams.set('partner_id', partnerId);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('shop_id', shopId);
  url.searchParams.set('sign', signature);
  url.searchParams.set('item_id_list', itemIds.join(','));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Erro ao buscar detalhes de itens Shopee: ${JSON.stringify(data)}`);
  }
  return data.response?.item_list || [];
}
