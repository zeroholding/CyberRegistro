import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verify } from 'jsonwebtoken';

/**
 * Evolução dos certificados emitidos nos últimos 6 meses.
 * Usa o MESMO critério de "protegido" das outras telas
 * (registro_status = 'protegido' OU registro_gerado_em preenchido),
 * agrupando por mês de registro_gerado_em no fuso de São Paulo.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || '';
    let userId: string;
    try {
      const decoded: any = verify(token, JWT_SECRET);
      userId = decoded?.id;
      if (!userId) throw new Error('Token sem id');
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const result = await pool.query(
      `WITH meses AS (
         SELECT generate_series(
           date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) - INTERVAL '5 months',
           date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')),
           INTERVAL '1 month'
         ) AS mes
       )
       SELECT
         to_char(m.mes, 'YYYY-MM') AS mes,
         COALESCE(COUNT(DISTINCT a.mlb_code), 0)::int AS total
       FROM meses m
       LEFT JOIN anuncios a
         ON date_trunc('month', (a.registro_gerado_em AT TIME ZONE 'America/Sao_Paulo')) = m.mes
        AND a.user_id = $1
        AND a.mlb_code IS NOT NULL
        AND (a.registro_status = 'protegido' OR a.registro_gerado_em IS NOT NULL)
       GROUP BY m.mes
       ORDER BY m.mes ASC`,
      [userId]
    );

    // Certificados emitidos nos últimos 7 e 30 dias
    const recentes = await pool.query(
      `SELECT
         COUNT(DISTINCT mlb_code) FILTER (WHERE registro_gerado_em >= now() - INTERVAL '7 days')::int AS ultimos7,
         COUNT(DISTINCT mlb_code) FILTER (WHERE registro_gerado_em >= now() - INTERVAL '30 days')::int AS ultimos30
       FROM anuncios
       WHERE user_id = $1
         AND mlb_code IS NOT NULL
         AND (registro_status = 'protegido' OR registro_gerado_em IS NOT NULL)`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      meses: result.rows.map((r: any) => ({ mes: r.mes, total: parseInt(r.total) || 0 })),
      ultimos7: parseInt(recentes.rows[0]?.ultimos7) || 0,
      ultimos30: parseInt(recentes.rows[0]?.ultimos30) || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar evolução de certificados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
