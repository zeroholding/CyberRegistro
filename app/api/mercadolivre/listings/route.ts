import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

