import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verify } from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // Autenticação e identificação do usuário
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
    } catch (error) {
      console.error('Erro ao verificar token em listings-stats:', error);
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Estatísticas por conta do usuário (DISTINCT por mlb_code)
    const result = await pool.query(
      `SELECT 
        ml_account_id as account_id,
        COUNT(DISTINCT mlb_code)::int as total,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'active')::int as active,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'paused')::int as paused,
        COUNT(DISTINCT mlb_code) FILTER (WHERE status = 'under_review')::int as under_review,
        COUNT(DISTINCT mlb_code) FILTER (
          WHERE registro_status = 'protegido' OR registro_gerado_em IS NOT NULL
        )::int as protegidos,
        COUNT(DISTINCT mlb_code) FILTER (
          WHERE status = 'active'
            AND (registro_status = 'protegido' OR registro_gerado_em IS NOT NULL)
        )::int as protegidos_ativos
       FROM anuncios 
       WHERE mlb_code IS NOT NULL AND user_id = $1 AND platform = 'mercadolivre'
       GROUP BY ml_account_id`,
      [userId]
    );

    // Totais gerais (apenas Mercado Livre — Shopee tem endpoint próprio).
    // "Protegido" segue o MESMO critério da tela de certificados.
    const totalGeral = await pool.query(
      `SELECT
         COUNT(DISTINCT mlb_code)::int as total,
         COUNT(DISTINCT mlb_code) FILTER (
           WHERE registro_status = 'protegido' OR registro_gerado_em IS NOT NULL
         )::int as protegidos,
         COUNT(DISTINCT mlb_code) FILTER (
           WHERE status = 'active'
             AND (registro_status = 'protegido' OR registro_gerado_em IS NOT NULL)
         )::int as protegidos_ativos
       FROM anuncios
       WHERE mlb_code IS NOT NULL AND user_id = $1 AND platform = 'mercadolivre'`,
      [userId]
    );

    // Converter strings para números
    const stats = result.rows.map((row: any) => ({
      account_id: row.account_id,
      total: parseInt(row.total) || 0,
      active: parseInt(row.active) || 0,
      paused: parseInt(row.paused) || 0,
      under_review: parseInt(row.under_review) || 0,
      protegidos: parseInt(row.protegidos) || 0,
      protegidos_ativos: parseInt(row.protegidos_ativos) || 0,
    }));

    return NextResponse.json({
      success: true,
      stats,
      totalGeral: parseInt(totalGeral.rows[0]?.total) || 0,
      totalProtegidos: parseInt(totalGeral.rows[0]?.protegidos) || 0,
      totalProtegidosAtivos: parseInt(totalGeral.rows[0]?.protegidos_ativos) || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de anúncios:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
