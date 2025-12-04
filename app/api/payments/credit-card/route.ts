import { NextRequest, NextResponse } from "next/server";
import { asaasService } from "@/app/services/asaas";
import { verify } from "jsonwebtoken";
import { applyPaymentConfirmation, isPaymentStatusConfirmed } from "@/lib/payments";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface JWTPayload {
  id: string;
  email: string;
  nome?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
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

    // Obter dados do corpo da requisição
    const body = await request.json();
    const {
      quantity,
      total,
      customerName,
      customerEmail,
      customerCpfCnpj,
      customerPhone,
      cupomId,
      cupomDiscount,
      creditCard,
    } = body;

    if (!quantity || !total) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    if (!customerCpfCnpj || !customerPhone) {
      return NextResponse.json(
        { error: "CPF/CNPJ e telefone são obrigatórios" },
        { status: 400 },
      );
    }

    if (!creditCard || !creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      return NextResponse.json(
        { error: "Dados do cartão incompletos" },
        { status: 400 },
      );
    }

    const sanitizedCpf = String(customerCpfCnpj).replace(/\D/g, "").slice(0, 14);
    const sanitizedPhone = String(customerPhone).replace(/\D/g, "").slice(0, 11);

    if (!(sanitizedCpf.length === 11 || sanitizedCpf.length === 14)) {
      return NextResponse.json(
        { error: "CPF/CNPJ inválido" },
        { status: 400 },
      );
    }

    if (!(sanitizedPhone.length === 10 || sanitizedPhone.length === 11)) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      );
    }

    console.info("[CREDIT-CARD] Criando/atualizando cliente", {
      email: customerEmail || decoded.email,
      sanitizedCpf,
      sanitizedPhone,
      quantity,
      total,
    });

    // Criar ou buscar cliente no Asaas
    const customer = await asaasService.findOrCreateCustomer({
      name: customerName || decoded.nome || "Cliente",
      email: customerEmail || decoded.email,
      cpfCnpj: sanitizedCpf,
      mobilePhone: sanitizedPhone,
    });

    // Criar data de vencimento (hoje)
    const dueDate = new Date();
    const dueDateString = dueDate.toISOString().split("T")[0];

    // Obter IP do cliente
    const forwardedFor = request.headers.get("x-forwarded-for");
    const remoteIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // Criar cobrança com cartão de crédito
    const externalRef = cupomId
      ? `user_${decoded.id}_${Date.now()}_qty${quantity}_cupom${cupomId}`
      : `user_${decoded.id}_${Date.now()}_qty${quantity}`;

    const payment = await asaasService.createCreditCardPayment({
      customer: customer.id,
      billingType: "CREDIT_CARD",
      value: total,
      dueDate: dueDateString,
      description: `Compra de ${quantity} credito(s) - CyberRegistro`,
      externalReference: externalRef,
      remoteIp,
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: customerName || decoded.nome || "Cliente",
        email: customerEmail || decoded.email,
        cpfCnpj: sanitizedCpf,
        postalCode: "01001000", // CEP genérico válido para evitar erro de validação
        addressNumber: "SN",
        phone: sanitizedPhone,
      },
    });

    console.log("[CREDIT-CARD] Pagamento criado:", {
      id: payment.id,
      status: payment.status,
      value: payment.value,
    });

    // Se o pagamento for aprovado imediatamente, adicionar créditos ao usuário
    if (isPaymentStatusConfirmed(payment.status)) {
      console.log("[CREDIT-CARD] Pagamento confirmado, adicionando créditos ao usuário");
      try {
        await applyPaymentConfirmation(payment);
        console.log("[CREDIT-CARD] Créditos adicionados com sucesso");
      } catch (error) {
        console.error("[CREDIT-CARD] Erro ao adicionar créditos:", error);
        // Não falhamos a requisição, pois o pagamento foi criado
        // Os créditos podem ser adicionados posteriormente via webhook ou manualmente
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        value: payment.value,
        dueDate: payment.dueDate,
      },
    });
  } catch (error) {
    console.error("Erro detalhado ao criar pagamento com cartão:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    let details = "Erro desconhecido";
    if (error instanceof Error) {
      details = error.message;
    } else if (typeof error === "string") {
      details = error;
    } else if (typeof error === "object" && error !== null) {
      details = JSON.stringify(error);
    }

    return NextResponse.json(
      {
        error: "Falha no processamento do pagamento",
        details: details,
      },
      { status: 500 },
    );
  }
}
