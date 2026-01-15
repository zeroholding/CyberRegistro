import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { asaasService } from "@/app/services/asaas";

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
      verify(token, JWT_SECRET);
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const paymentId = request.nextUrl.searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Parâmetro id é obrigatório" },
        { status: 400 },
      );
    }

    const payment = await asaasService.getPaymentStatus(paymentId);

    // --- Lazy Sync Start ---
    // If the payment is confirmed in Asaas, ensure it's processed in our DB.
    // This handles cases where the webhook failed or wasn't received.
    const { isPaymentStatusConfirmed, applyPaymentConfirmation } = await import("@/lib/payments");
    
    if (isPaymentStatusConfirmed(payment.status)) {
        try {
            console.log(`[Lazy Sync] Verificando pagamento ${paymentId} (Status: ${payment.status})`);
            await applyPaymentConfirmation(payment);
        } catch (syncError) {
            console.error(`[Lazy Sync] Erro ao sincronizar pagamento ${paymentId}:`, syncError);
            // Don't block the response; we still want to return the status to the client
        }
    }
    // --- Lazy Sync End ---

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      description: payment.description,
    });
  } catch (error) {
    console.error("Erro ao consultar status do pagamento:", error);
    return NextResponse.json(
      {
        error: "Erro ao consultar status",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
