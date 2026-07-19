import { Pool } from 'pg';
import { refreshShopeeToken } from '@/app/services/shopee';

export interface ShopeeAccountRecord {
  id: number;
  user_id: number;
  shop_id: number;
  shop_name?: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // renova se faltar menos de 5 min

/**
 * Garante um access_token válido para a loja, renovando via refresh_token
 * quando estiver perto de expirar. Persiste o novo token no banco.
 */
export async function ensureShopeeAccessToken(
  pool: Pool,
  account: ShopeeAccountRecord,
): Promise<ShopeeAccountRecord> {
  const expiresAt = new Date(account.expires_at);
  const now = Date.now();

  if (expiresAt.getTime() - now > REFRESH_THRESHOLD_MS) {
    return account;
  }

  const refreshed = await refreshShopeeToken(account.refresh_token, String(account.shop_id));
  const newExpiresAt = new Date(Date.now() + Math.max(30, refreshed.expire_in - 60) * 1000);

  const result = await pool.query(
    `UPDATE shopee_accounts
       SET access_token = $1,
           refresh_token = $2,
           expires_at = $3,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, user_id, shop_id, shop_name, access_token, refresh_token, expires_at`,
    [refreshed.access_token, refreshed.refresh_token, newExpiresAt, account.id],
  );

  return { ...account, ...result.rows[0] };
}
