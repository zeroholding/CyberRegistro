import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Função para verificar autenticação
function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// Atualizar cupom (status, campos editáveis, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const resolvedParams = await params;

    // Construir o UPDATE dinâmico
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (typeof body.is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }
    if (body.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(body.code.toUpperCase().trim());
    }
    if (body.discount_type !== undefined) {
      updates.push(`discount_type = $${paramIndex++}`);
      values.push(body.discount_type);
    }
    if (body.discount_value !== undefined) {
      updates.push(`discount_value = $${paramIndex++}`);
      values.push(parseFloat(body.discount_value));
    }
    if (body.max_uses !== undefined) {
      updates.push(`max_uses = $${paramIndex++}`);
      values.push(body.max_uses || null);
    }
    if (body.expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(body.expires_at || null);
    }
    if (body.repasse_percent !== undefined) {
      updates.push(`repasse_percent = $${paramIndex++}`);
      values.push(parseFloat(body.repasse_percent) || 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');
    values.push(resolvedParams.id);

    const result = await pool.query(
      `UPDATE cupons
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, code, discount_type, discount_value,
        max_uses, uses_count, expires_at, is_active,
        created_at, updated_at, partner_token, repasse_percent`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cupom: result.rows[0] });

  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cupom' },
      { status: 500 }
    );
  }
}

// Excluir cupom
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const result = await pool.query(
      'DELETE FROM cupons WHERE id = $1 RETURNING id, code',
      [resolvedParams.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Cupom ${result.rows[0].code} excluído com sucesso`
    });

  } catch (error) {
    console.error('Erro ao excluir cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cupom' },
      { status: 500 }
    );
  }
}
