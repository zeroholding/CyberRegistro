import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Busca anúncios que foram enviados para o ambiente de registro
    const sql = `
      SELECT
        a.id,
        a.mlb_code,
        a.title,
        a.price,
        a.thumbnail,
        a.permalink,
        a.status,
        a.sold_quantity,
        a.registro_enviado,
        a.registro_enviado_em,
        a.registro_status,
        a.registro_gerado_em,
        a.registro_hash,
        a.platform,
        a.ml_account_id,
        a.shopee_account_id,
        acc.nickname as account_nickname,
        acc.first_name as account_first_name,
        acc.last_name as account_last_name,
        sa.shop_name as shopee_shop_name
      FROM anuncios a
      LEFT JOIN mercadolivre_accounts acc ON a.ml_account_id = acc.id
      LEFT JOIN shopee_accounts sa ON a.shopee_account_id = sa.id
      WHERE a.user_id = $1
        AND a.registro_enviado = TRUE
      ORDER BY a.registro_enviado_em DESC
    `;

    const res = await pool.query(sql, [userId]);
    return NextResponse.json({ anuncios: res.rows });
  } catch (error) {
    console.error('Erro ao buscar anúncios enviados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
