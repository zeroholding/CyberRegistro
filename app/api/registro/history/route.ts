import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const perPageParam = parseInt(searchParams.get('perPage') || '20', 10);
    const search = (searchParams.get('search') || '').trim();
    const platformFilter = (searchParams.get('platform') || '').trim(); // 'mercadolivre' | 'shopee' | ''
    const accountParam = (searchParams.get('accountId') || '').trim(); // 'ml:3' | 'shopee:5'

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const perPage = Number.isFinite(perPageParam) && perPageParam > 0 && perPageParam <= 100 ? perPageParam : 20;
    const offset = (page - 1) * perPage;

    const where: string[] = [
      'a.user_id = $1',
      "(a.registro_status = 'protegido' OR a.registro_gerado_em IS NOT NULL)",
    ];
    const params: any[] = [userId];
    let idx = 2;

    if (search) {
      where.push(`(a.title ILIKE $${idx} OR a.mlb_code ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (platformFilter === 'mercadolivre' || platformFilter === 'shopee') {
      where.push(`a.platform = $${idx}`);
      params.push(platformFilter);
      idx++;
    }

    if (accountParam.includes(':')) {
      const [origin, rawId] = accountParam.split(':');
      const id = parseInt(rawId, 10);
      if (Number.isFinite(id)) {
        if (origin === 'ml') {
          where.push(`a.ml_account_id = $${idx}`);
          params.push(id);
          idx++;
        } else if (origin === 'shopee') {
          where.push(`a.shopee_account_id = $${idx}`);
          params.push(id);
          idx++;
        }
      }
    }

    const whereClause = where.join(' AND ');

    const countSql = `SELECT COUNT(*)::int as total FROM anuncios a WHERE ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const listSql = `
      SELECT
        a.id,
        a.mlb_code,
        a.title,
        a.thumbnail,
        a.permalink,
        a.registro_status,
        a.registro_gerado_em,
        a.registro_hash,
        (a.registro_pdf_data IS NOT NULL) as has_pdf,
        a.platform,
        ma.nickname as account_nickname,
        ma.first_name as account_first_name,
        ma.last_name as account_last_name,
        sa.shop_name as shopee_shop_name
      FROM anuncios a
      LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
      LEFT JOIN shopee_accounts sa ON a.shopee_account_id = sa.id
      WHERE ${whereClause}
      ORDER BY a.registro_gerado_em DESC NULLS LAST, a.updated_at_ml DESC NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const listRes = await pool.query(listSql, [...params, perPage, offset]);
    return NextResponse.json({ items: listRes.rows, total, page, perPage });
  } catch (error) {
    console.error('Erro ao buscar histórico de certificados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

