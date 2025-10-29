import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Contar registros realizados (certificados gerados)
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM registro_anuncios 
       WHERE certificado_url IS NOT NULL`
    );

    const count = parseInt(result.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Erro ao contar registros:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar contagem de registros' },
      { status: 500 }
    );
  }
}
