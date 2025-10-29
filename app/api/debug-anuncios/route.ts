import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  try {
    // Verificar total de registros
    const totalRows = await pool.query(
      `SELECT COUNT(*)::int as total FROM anuncios`
    );

    // Verificar anúncios únicos por mlb_code
    const uniqueMLB = await pool.query(
      `SELECT COUNT(DISTINCT mlb_code)::int as total FROM anuncios WHERE mlb_code IS NOT NULL`
    );

    // Verificar duplicatas
    const duplicates = await pool.query(
      `SELECT mlb_code, COUNT(*) as count
       FROM anuncios
       WHERE mlb_code IS NOT NULL
       GROUP BY mlb_code
       HAVING COUNT(*) > 1
       ORDER BY count DESC
       LIMIT 10`
    );

    // Contar por conta
    const porConta = await pool.query(
      `SELECT 
        ml_account_id,
        COUNT(*) as total_rows,
        COUNT(DISTINCT mlb_code) as unique_mlb
       FROM anuncios
       GROUP BY ml_account_id`
    );

    return NextResponse.json({
      totalRegistros: totalRows.rows[0]?.total || 0,
      totalUnicos: uniqueMLB.rows[0]?.total || 0,
      duplicatas: duplicates.rows.length,
      exemplosDuplicatas: duplicates.rows,
      porConta: porConta.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar debug:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar informações' },
      { status: 500 }
    );
  }
}
