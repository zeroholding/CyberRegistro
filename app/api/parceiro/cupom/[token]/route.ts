import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Buscar cupom pelo token
    const cupomResult = await pool.query(
      `SELECT id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active, created_at, repasse_percent
       FROM cupons
       WHERE partner_token = $1`,
      [token]
    );

    if (cupomResult.rows.length === 0) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
    }

    const cupom = cupomResult.rows[0];

    // Buscar histórico de uso (COM JOIN NA TRANSAÇÃO PARA VENDAS/REPASSE)
    // E calcular totais ao mesmo tempo
    const statsQuery = `
      SELECT
        COUNT(cu.id) as period_uses,
        COALESCE(SUM(cu.discount_applied), 0) as period_discount,
        COALESCE(SUM(t.amount), 0) as period_sales,
        COALESCE(SUM(t.amount * ($3::numeric / 100)), 0) as period_repass
      FROM cupons_usage cu
      LEFT JOIN transactions t ON cu.transaction_id = t.id AND t.status = 'completed'
      WHERE cu.cupom_id = $1
        AND ($2::timestamp IS NULL OR cu.used_at >= $2::timestamp)
        AND ($4::timestamp IS NULL OR cu.used_at <= $4::timestamp + interval '1 day')
    `;

    const statsResult = await pool.query(statsQuery, [
      cupom.id,
      startDate || null,
      cupom.repasse_percent || 0,
       endDate || null
    ]);

    const stats = statsResult.rows[0];

    // Buscar histórico recente detalhado
    const usageResult = await pool.query(
      `SELECT cu.used_at, cu.discount_applied, t.amount as sale_amount, (t.amount * ($2::numeric / 100)) as commission
       FROM cupons_usage cu
       LEFT JOIN transactions t ON cu.transaction_id = t.id AND t.status = 'completed'
       WHERE cu.cupom_id = $1
         AND ($3::timestamp IS NULL OR cu.used_at >= $3::timestamp)
         AND ($4::timestamp IS NULL OR cu.used_at <= $4::timestamp + interval '1 day')
       ORDER BY cu.used_at DESC
       LIMIT 100`,
      [cupom.id, cupom.repasse_percent || 0, startDate || null, endDate || null]
    );

    return NextResponse.json({
      cupom,
      stats: {
        total_uses: Number(stats.period_uses) || 0,
        total_discount: Number(stats.period_discount) || 0,
        total_sales: Number(stats.period_sales) || 0,
        total_commission: Number(stats.period_repass) || 0,
        recent_usage: usageResult.rows
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do parceiro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
