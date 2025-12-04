// Configuração direta da API key (produção)
const ASAAS_API_KEY = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjhjZGUzMzhjLTliZjItNGE3Yi1hZDMxLTgzZGI1ZGRlMmRhZjo6JGFhY2hfNjU1NzQ2MjUtNjZkMC00MzYzLThiNTAtYzA5YTJhMjIyZGQ4";
const ASAAS_ENV = "production";
const ASAAS_BASE_URL = "https://www.asaas.com/api/v3";

interface CreateCustomerData {
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

interface CreatePixPaymentData {
  customer: string; // ID do cliente no Asaas
  billingType: "PIX";
  value: number;
  dueDate: string; // Formato: YYYY-MM-DD
  description?: string;
  externalReference?: string;
}

interface CreateCreditCardPaymentData {
  customer: string;
  billingType: "CREDIT_CARD";
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  remoteIp?: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

class AsaasService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const hasApiKey = ASAAS_API_KEY.length > 0;
    console.log("ASAAS_API_KEY presente:", hasApiKey);
    if (hasApiKey) {
      console.log(
        "ASAAS_API_KEY primeiros caracteres:",
        ASAAS_API_KEY.substring(0, 10),
      );
    }

    if (!hasApiKey) {
      throw new Error(
        "ASAAS_API_KEY nao configurada. Verifique as variáveis de ambiente.",
      );
    }

    this.apiKey = ASAAS_API_KEY;
    this.baseUrl = ASAAS_BASE_URL;

    console.log("AsaasService inicializado - Ambiente:", ASAAS_ENV);
    console.log("AsaasService usando URL:", ASAAS_BASE_URL);
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    data?: any,
  ) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // Conforme documentação do Asaas, o header oficial é 'access_token'.
      // Manter somente este header evita inconsistências de autenticação.
      access_token: this.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    console.log(`[ASAAS] ${method} ${url}`);
    if (data) {
      console.log("[ASAAS] Payload:", JSON.stringify(data, null, 2));
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = "Erro ao comunicar com Asaas";
        try {
          const responseData = await response.json();
          console.error("[ASAAS] Erro na requisicao:", {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          });
          errorMessage = responseData.errors?.[0]?.description || errorMessage;
        } catch (parseError) {
          console.error("[ASAAS] Erro ao fazer parse da resposta de erro:", parseError);
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("[ASAAS] Resposta sucesso:", responseData);
      return responseData;
    } catch (error) {
      console.error("[ASAAS] Erro ao fazer requisicao:", error);
      throw error;
    }
  }

  // Criar ou buscar cliente
  async findOrCreateCustomer(data: CreateCustomerData) {
    try {
      // Tentar buscar cliente pelo CPF/CNPJ
      if (data.cpfCnpj) {
        const customers = await this.makeRequest(
          `/customers?cpfCnpj=${data.cpfCnpj}`,
        );
        if (customers.data && customers.data.length > 0) {
          return customers.data[0];
        }
      }

      // Se não encontrou, criar novo cliente
      return await this.makeRequest("/customers", "POST", data);
    } catch (error) {
      console.error("Erro ao buscar/criar cliente:", error);
      throw error;
    }
  }

  // Criar cobranca PIX
  async createPixPayment(data: CreatePixPaymentData) {
    try {
      const payment = await this.makeRequest("/payments", "POST", data);

      // Buscar o QR Code PIX
      if (payment.id) {
        const pixQrCode = await this.makeRequest(
          `/payments/${payment.id}/pixQrCode`,
        );
        return {
          ...payment,
          pixQrCode: pixQrCode.encodedImage,
          pixCopyPaste: pixQrCode.payload,
        };
      }

      return payment;
    } catch (error) {
      console.error("Erro ao criar cobranca PIX:", error);
      throw error;
    }
  }

  // Criar cobranca com Cartao de Credito
  async createCreditCardPayment(data: CreateCreditCardPaymentData) {
    try {
      return await this.makeRequest("/payments", "POST", data);
    } catch (error) {
      console.error("Erro ao criar cobranca com cartao:", error);
      throw error;
    }
  }

  // Consultar status do pagamento
  async getPaymentStatus(paymentId: string) {
    try {
      return await this.makeRequest(`/payments/${paymentId}`);
    } catch (error) {
      console.error("Erro ao consultar pagamento:", error);
      throw error;
    }
  }

  // Validar webhook (verifica se a requisicao veio do Asaas)
  validateWebhook(payload: any): boolean {
    // Em producao, voce deve implementar validacao adicional
    // Por exemplo, validar assinatura do webhook se disponivel
    return payload && payload.event;
  }
}

export const asaasService = new AsaasService();
