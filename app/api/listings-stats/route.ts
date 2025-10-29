import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  try {
    // Verificar se há duplicatas e contar DISTINCT por mlb_code
    const result = await pool.query(
      `SELECT 
        ml_account_id as account_id,
        COUNT(DISTINCT mlb_code)::int as total,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'active')::int as active,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'paused')::int as paused,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'under_review')::int as under_review
       FROM anuncios 
       WHERE mlb_code IS NOT NULL
       GROUP BY ml_account_id`
    );

    // Log para debug
    console.log('Estatísticas por conta:', result.rows);

    // Verificar total geral
    const totalGeral = await pool.query(
      `SELECT COUNT(DISTINCT mlb_code)::int as total FROM anuncios WHERE mlb_code IS NOT NULL`
    );
    console.log('Total geral de anúncios únicos:', totalGeral.rows[0]);

    // Converter strings para números
    const stats = result.rows.map((row: any) => ({
      account_id: row.account_id,
      total: parseInt(row.total) || 0,
      active: parseInt(row.active) || 0,
      paused: parseInt(row.paused) || 0,
      under_review: parseInt(row.under_review) || 0,
    }));

    return NextResponse.json({
      success: true,
      stats,
      totalGeral: parseInt(totalGeral.rows[0]?.total) || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de anúncios:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
