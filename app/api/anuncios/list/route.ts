import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Listagem UNIFICADA de anúncios (Mercado Livre + Shopee), lendo da mesma
 * tabela `anuncios`. Não substitui `/api/mercadolivre/listings` (mantido
 * intacto para não quebrar nada existente) — esta é a rota nova usada pela
 * tela de Anúncios atualizada, que agora mostra as duas plataformas juntas.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const perPageParam = parseInt(searchParams.get('perPage') || '21', 10);
    const searchTerm = (searchParams.get('search') || '').trim();
    const statusFilter = (searchParams.get('status') || '').trim();
    const platformFilter = (searchParams.get('platform') || '').trim(); // 'mercadolivre' | 'shopee' | ''
    const accountParam = (searchParams.get('accountId') || '').trim(); // formato "ml:3" ou "shopee:5"

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

    if (platformFilter === 'mercadolivre' || platformFilter === 'shopee') {
      whereClauses.push(`a.platform = $${paramIndex}`);
      params.push(platformFilter);
      paramIndex++;
    }

    if (accountParam.includes(':')) {
      const [origin, rawId] = accountParam.split(':');
      const id = parseInt(rawId, 10);
      if (Number.isFinite(id)) {
        if (origin === 'ml') {
          whereClauses.push(`a.ml_account_id = $${paramIndex}`);
        } else if (origin === 'shopee') {
          whereClauses.push(`a.shopee_account_id = $${paramIndex}`);
        }
        params.push(id);
        paramIndex++;
      }
    }

    if (searchTerm) {
      whereClauses.push(`(
        a.title ILIKE $${paramIndex}
        OR a.mlb_code ILIKE $${paramIndex}
        OR COALESCE(a.permalink, '') ILIKE $${paramIndex}
        OR COALESCE(a.sku, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total, MAX(synced_at) as latest_synced_at
       FROM anuncios a
       WHERE ${whereClause}`,
      params,
    );

    const total = countRes.rows[0]?.total || 0;
    const latestSyncedAt = countRes.rows[0]?.latest_synced_at || null;

    const listRes = await pool.query(
      `SELECT
        a.*,
        ma.nickname as ml_account_nickname,
        sa.shop_name as shopee_shop_name
       FROM anuncios a
       LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
       LEFT JOIN shopee_accounts sa ON a.shopee_account_id = sa.id
       WHERE ${whereClause}
       ORDER BY a.synced_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset],
    );

    return NextResponse.json({ listings: listRes.rows, total, latestSyncedAt, page, perPage });
  } catch (error) {
    console.error('Erro ao buscar anúncios (unificado):', error);
    return NextResponse.json({ error: 'Erro ao buscar anúncios' }, { status: 500 });
  }
}
