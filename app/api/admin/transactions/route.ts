import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface JWTPayload {
  id: string;
  email: string;
  nome?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Buscar todas as transações de todos os usuários com informações do usuário
    const result = await query(
      `SELECT
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.credits_quantity,
        t.payment_method,
        t.payment_id,
        t.status,
        t.description,
        t.created_at,
        t.updated_at,
        u.nome as user_name,
        u.email as user_email
      FROM transactions t
      JOIN usuarios u ON t.user_id = u.id
      ORDER BY t.created_at DESC`
    );

    const transactions = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      type: row.type,
      amount: parseFloat(row.amount),
      creditsQuantity: row.credits_quantity,
      paymentMethod: row.payment_method,
      paymentId: row.payment_id,
      status: row.status,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar transações",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
