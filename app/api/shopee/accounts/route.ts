import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureShopeeAccessToken, ShopeeAccountRecord } from '../token-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, user_id, shop_id, shop_name, access_token, refresh_token, expires_at, created_at, updated_at
       FROM shopee_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    const refreshedAccounts = [];
    for (const rawAccount of result.rows as ShopeeAccountRecord[]) {
      let account = rawAccount;
      try {
        account = await ensureShopeeAccessToken(pool, rawAccount);
      } catch (refreshError) {
        console.error(`Failed to refresh Shopee token for account ${rawAccount.id}:`, refreshError);
      }

      refreshedAccounts.push({
        id: account.id,
        shop_id: account.shop_id,
        shop_name: account.shop_name,
        expires_at: account.expires_at,
        created_at: rawAccount.created_at,
        updated_at: rawAccount.updated_at,
      });
    }

    return NextResponse.json({ accounts: refreshedAccounts });
  } catch (error) {
    console.error('Erro ao buscar contas Shopee:', error);
    return NextResponse.json({ error: 'Erro ao buscar contas conectadas' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const accountId = searchParams.get('accountId');

    if (!userId || !accountId) {
      return NextResponse.json({ error: 'User ID e Account ID são obrigatórios' }, { status: 400 });
    }

    await pool.query('DELETE FROM shopee_accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar conta Shopee:', error);
    return NextResponse.json({ error: 'Erro ao deletar conta' }, { status: 500 });
  }
}
