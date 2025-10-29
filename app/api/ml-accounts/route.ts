import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Obter usuário do token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('token')?.value;

    if (!token) {
      // Tentar obter do localStorage (já estará no header se vier do client)
      // Por enquanto vamos buscar todas as contas (ajustar auth depois)
    }

    // Buscar contas conectadas do Mercado Livre
    const result = await query(
      `SELECT id, user_id, nickname, first_name, last_name, email, created_at 
       FROM ml_accounts 
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      accounts: result.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar contas do ML:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar contas conectadas' },
      { status: 500 }
    );
  }
}
