"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { useToast } from "./ToastContainer";

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsUpdated?: () => Promise<void> | void;
}

type ActiveTab = "pix" | "credit-card";
type Step = 1 | 2 | 3;

const PRICING_TIERS = [
  { min: 1, max: 10, price: 39.9 },
  { min: 11, max: 30, price: 37.9 },
  { min: 31, max: 50, price: 35.9 },
  { min: 51, max: 100, price: 32.9 },
  { min: 101, max: null, price: 29.9 },
];

const CONFIRMED_STATUSES = new Set([
  "RECEIVED",
  "RECEIVED_IN_CASH",
  "RECEIVED_OUT_OF_DATE",
  "RECEIVED_IN_ADVANCE",
  "RECEIVED_BILL",
  "CONFIRMED",
]);

const FAILED_STATUSES = new Set([
  "CANCELLED",
  "CHARGED_BACK",
  "REFUNDED",
  "DELETED",
]);

const POLL_INTERVAL = 5000;

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const formatCpfCnpj = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 14);
  if (!digits) return "";

  if (digits.length <= 11) {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);

    let formatted = part1;
    if (part2) formatted += `.${part2}`;
    if (part3) formatted += `.${part3}`;
    if (part4) formatted += `-${part4}`;
    return formatted;
  }

  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);

  let formatted = part1;
  if (part2) formatted += `.${part2}`;
  if (part3) formatted += `.${part3}`;
  if (part4) formatted += `/${part4}`;
  if (part5) formatted += `-${part5}`;
  return formatted;
};

const formatPhone = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);

  if (digits.length === 1) return `(${ddd}`;
  if (digits.length === 2) return `(${ddd})`;
  if (digits.length <= 6) return `(${ddd}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isRepeatedSequence = (digits: string) => /^([0-9])\1+$/.test(digits);

const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || isRepeatedSequence(digits)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check = 11 - (sum % 11);
  check = check >= 10 ? 0 : check;
  if (check !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  check = 11 - (sum % 11);
  check = check >= 10 ? 0 : check;

  return check === Number(digits[10]);
};

const isValidCnpj = (digits: string) => {
  if (digits.length !== 14 || isRepeatedSequence(digits)) {
    return false;
  }

  const multipliers1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const multipliers2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calculateDigit = (multipliers: number[]) => {
    const sum = multipliers.reduce(
      (acc, multiplier, index) => acc + Number(digits[index]) * multiplier,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const digit1 = calculateDigit(multipliers1);
  if (digit1 !== Number(digits[12])) return false;

  const digit2 = calculateDigit(multipliers2);
  return digit2 === Number(digits[13]);
};

const LoadingIndicator = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <span className="loader" />
    <span className="text-sm text-neutral-600">{label}</span>
  </div>
);

export default function PurchaseCreditsModal({
  isOpen,
  onClose,
  onCreditsUpdated,
}: PurchaseCreditsModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("pix");
  const [step, setStep] = useState<Step>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [pixQrCode, setPixQrCode] = useState<string>("");
  const [pixCopyPaste, setPixCopyPaste] = useState<string>("");
  const [pixPaymentId, setPixPaymentId] = useState<string>("");
  const [pixStatus, setPixStatus] = useState<string>("");
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevPixStatusRef = useRef<string>("");
  const completionTriggeredRef = useRef<string | null>(null);

  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Estados do cupom
  const [cupomCode, setCupomCode] = useState<string>("");
  const [cupomData, setCupomData] = useState<any>(null);
  const [cupomDiscount, setCupomDiscount] = useState<number>(0);
  const [isValidatingCupom, setIsValidatingCupom] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const persistValue = useCallback((key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Nao foi possivel salvar ${key}:`, error);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!onCreditsUpdated) return;
    try {
      await onCreditsUpdated();
    } catch (error) {
      console.warn("Nao foi possivel atualizar creditos automaticamente:", error);
    }
  }, [onCreditsUpdated]);

  const finalizePixPayment = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!pixPaymentId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("/api/payments/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId: pixPaymentId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn("Falha ao completar pagamento PIX:", data);
        completionTriggeredRef.current = null;
        return;
      }

      await refreshCredits();
    } catch (error) {
      console.warn("Erro ao completar pagamento PIX:", error);
      completionTriggeredRef.current = null;
    }
  }, [pixPaymentId, refreshCredits]);

  useEffect(() => {
    if (!pixPaymentId) {
      completionTriggeredRef.current = null;
    }
  }, [pixPaymentId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const base64 = token.split(".")[1];
      if (!base64) return;
      const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));
      if (decoded?.nome) setCustomerName((prev) => prev || decoded.nome || "");
      if (decoded?.email) setCustomerEmail((prev) => prev || decoded.email || "");
    } catch (error) {
      console.warn("Nao foi possivel pre-preencher os dados do token JWT:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedCpf = localStorage.getItem("customerCpfCnpj");
      const storedPhone = localStorage.getItem("customerPhone");
      if (storedCpf) setCustomerCpfCnpj(formatCpfCnpj(storedCpf));
      if (storedPhone) setCustomerPhone(formatPhone(storedPhone));
    } catch (error) {
      console.warn("Nao foi possivel ler dados salvos:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const unitPrice = useMemo(() => {
    const tier = PRICING_TIERS.find(
      (t) => quantity >= t.min && (t.max === null || quantity <= t.max),
    );
    return tier ? tier.price : PRICING_TIERS[0].price;
  }, [quantity]);

  const subtotal = unitPrice * quantity;
  const total = subtotal - cupomDiscount;

  // Calcular economia comparando com o preço mais alto (primeiro tier)
  const highestPrice = PRICING_TIERS[0].price;
  const priceWithoutDiscount = highestPrice * quantity;
  const savings = priceWithoutDiscount - subtotal;

  const goToStep = (nextStep: Step) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    setIsTransitioning(true);
    transitionTimerRef.current = setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 220);
  };

  const resetPixData = () => {
    setPixQrCode("");
    setPixCopyPaste("");
    setPixPaymentId("");
    setPixStatus("");
    completionTriggeredRef.current = null;
  };

  const resetFormState = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setIsTransitioning(false);
    setIsLoading(false);
    setIsSuccess(false);
    setStep(1);
    setCupomCode("");
    setCupomData(null);
    setCupomDiscount(0);
    resetPixData();
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    resetPixData();
    goToStep(1);
  };

  const handleQuantityChange = (newValue: number) => {
    if (newValue < 1 || isNaN(newValue)) return;
    setQuantity(newValue);
  };

  const handleQuantityInputChange = (value: string) => {
    // Permitir campo vazio temporariamente
    if (value === '') {
      setQuantity(1);
      return;
    }

    // Remover zeros à esquerda e converter para número
    const numValue = parseInt(value.replace(/^0+/, '') || '0', 10);

    if (!isNaN(numValue) && numValue >= 1) {
      setQuantity(numValue);
    }
  };

  const handleQuantityBlur = () => {
    // Garantir valor mínimo ao sair do campo
    if (quantity < 1 || isNaN(quantity)) {
      setQuantity(1);
    }
  };

  const validateCustomerData = () => {
    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerCpfCnpj.trim() ||
      !customerPhone.trim()
    ) {
      showToast("Informe nome, email, CPF ou CNPJ e telefone.", "error");
      return null;
    }

    const sanitizedCpf = normalizeDigits(customerCpfCnpj);
    if (!(sanitizedCpf.length === 11 || sanitizedCpf.length === 14)) {
      showToast("CPF ou CNPJ deve ter 11 ou 14 digitos.", "error");
      return null;
    }

    if (sanitizedCpf.length === 11 && !isValidCpf(sanitizedCpf)) {
      showToast("CPF invalido. Confira os digitos.", "error");
      return null;
    }

    if (sanitizedCpf.length === 14 && !isValidCnpj(sanitizedCpf)) {
      showToast("CNPJ invalido. Confira os digitos.", "error");
      return null;
    }

    const formattedCpf = formatCpfCnpj(sanitizedCpf);
    setCustomerCpfCnpj(formattedCpf);
    persistValue("customerCpfCnpj", sanitizedCpf);

    const sanitizedPhone = normalizeDigits(customerPhone);
    if (!(sanitizedPhone.length === 10 || sanitizedPhone.length === 11)) {
      showToast("Telefone com DDD invalido.", "error");
      return null;
    }

    const formattedPhone = formatPhone(sanitizedPhone);
    setCustomerPhone(formattedPhone);
    persistValue("customerPhone", sanitizedPhone);

    return { sanitizedCpf, sanitizedPhone };
  };

  const copyPixCode = () => {
    if (!pixCopyPaste) return;
    navigator.clipboard.writeText(pixCopyPaste);
    showToast("Codigo PIX copiado!", "success");
  };

  const handleBack = () => {
    if (activeTab === "credit-card" && step === 2) {
      goToStep(1);
      return;
    }

    if (activeTab === "pix") {
      if (step === 3) {
        resetPixData();
        goToStep(2);
        return;
      }
      if (step === 2) {
        goToStep(1);
        return;
      }
    }
  };

  const handleValidateCupom = async () => {
    if (!cupomCode.trim()) {
      showToast("Digite um código de cupom", "error");
      return;
    }

    setIsValidatingCupom(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/cupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: cupomCode.trim(),
          total: subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Cupom inválido", "error");
        setCupomData(null);
        setCupomDiscount(0);
        return;
      }

      setCupomData(data.cupom);
      setCupomDiscount(data.discount);
      showToast("Cupom aplicado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao validar cupom:", error);
      showToast("Erro ao validar cupom", "error");
      setCupomData(null);
      setCupomDiscount(0);
    } finally {
      setIsValidatingCupom(false);
    }
  };

  const handleRemoveCupom = () => {
    setCupomCode("");
    setCupomData(null);
    setCupomDiscount(0);
  };

  const handlePurchase = async () => {
    setIsLoading(true);

    try {
      if (activeTab === "credit-card" && step === 1) {
        goToStep(2 as Step);
        setIsLoading(false);
        return;
      }

      if (activeTab === "pix") {
        if (step === 1) {
          goToStep(2 as Step);
          setIsLoading(false);
          return;
        }

        if (step === 2) {
          const validated = validateCustomerData();
          if (!validated) {
            setIsLoading(false);
            return;
          }

          const { sanitizedCpf, sanitizedPhone } = validated;
          const token = localStorage.getItem("token");
          setPixStatus("PENDING");

          const response = await fetch("/api/payments/pix", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              quantity,
              total,
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim(),
              customerCpfCnpj: sanitizedCpf,
              customerPhone: sanitizedPhone,
              cupomId: cupomData?.id || null,
              cupomDiscount: cupomDiscount || 0,
            }),
          });

          const data = await response.json();
          console.log("Payment response status:", response.status);
          console.log("Payment response data:", data);

          if (!response.ok) {
            const errorMessage = data.details || data.error || "Erro ao processar pagamento";
            throw new Error(errorMessage);
          }

          completionTriggeredRef.current = null;
          setPixPaymentId(data.payment?.id ?? "");
          setPixStatus(String(data.payment?.status ?? "PENDING"));
          setPixQrCode(data.payment?.pixQrCode ?? "");
          setPixCopyPaste(data.payment?.pixCopyPaste ?? "");
          goToStep(3 as Step);
          showToast("QR Code PIX gerado com sucesso!", "success");
          setIsLoading(false);
          return;
        }
      }

      if (activeTab === "credit-card") {
        if (step === 2) {
          const cardNumber = (
            document.querySelector(
              'input[placeholder="0000 0000 0000 0000"]',
            ) as HTMLInputElement
          )?.value;
          const expiry = (
            document.querySelector('input[placeholder="MM/AA"]') as HTMLInputElement
          )?.value;
          const cvv = (
            document.querySelector('input[placeholder="123"]') as HTMLInputElement
          )?.value;
          const holderName = (
            document.querySelector(
              'input[placeholder="Como esta no cartao"]',
            ) as HTMLInputElement
          )?.value;

          if (!cardNumber || !expiry || !cvv || !holderName) {
            showToast("Preencha todos os dados do cartao.", "error");
            setIsLoading(false);
            return;
          }

          const validated = validateCustomerData();
          if (!validated) {
            setIsLoading(false);
            return;
          }

          const { sanitizedCpf, sanitizedPhone } = validated;

          // Validar formato de validade MM/AA
          const expiryParts = expiry.split("/");
          if (expiryParts.length !== 2) {
            showToast("Formato de validade inválido. Use MM/AA", "error");
            setIsLoading(false);
            return;
          }

          const [expiryMonth, expiryYear] = expiryParts;
          const monthNum = parseInt(expiryMonth, 10);
          const yearNum = parseInt(expiryYear, 10);

          if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            showToast("Mês de validade inválido (01-12)", "error");
            setIsLoading(false);
            return;
          }

          if (isNaN(yearNum) || expiryYear.length !== 2) {
            showToast("Ano de validade inválido (formato: AA)", "error");
            setIsLoading(false);
            return;
          }

          const token = localStorage.getItem("token");

          const response = await fetch("/api/payments/credit-card", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              quantity,
              total,
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim(),
              customerCpfCnpj: sanitizedCpf,
              customerPhone: sanitizedPhone,
              cupomId: cupomData?.id || null,
              cupomDiscount: cupomDiscount || 0,
              creditCard: {
                holderName,
                number: cardNumber.replace(/\s/g, ""),
                expiryMonth: expiryMonth.padStart(2, '0'),
                expiryYear: expiryYear ? `20${expiryYear}` : "",
                ccv: cvv,
              },
            }),
          });

          const data = await response.json();
          console.log("Payment response status:", response.status);
          console.log("Payment response data:", data);

          if (!response.ok) {
            const errorMessage = data.details || data.error || "Erro ao processar pagamento";
            throw new Error(errorMessage);
          }

          // showToast("Pagamento processado com sucesso!", "success");
          await refreshCredits();
          setIsSuccess(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      showToast(
        error instanceof Error ? error.message : "Erro desconhecido",
        "error",
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeTab !== "pix" || step !== 3 || !pixPaymentId) return;

    let cancelled = false;
    let intervalId: number | undefined;

    const pollStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(
          `/api/payments/status?id=${pixPaymentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          throw new Error("Falha ao consultar status do pagamento PIX");
        }

        const data = await response.json();
        if (cancelled) return;
        setPixStatus(String(data.status || ""));

        if (
          CONFIRMED_STATUSES.has(data.status) ||
          FAILED_STATUSES.has(data.status)
        ) {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.warn("Falha ao atualizar status do PIX:", error);
      }
    };

    pollStatus();
    intervalId = window.setInterval(pollStatus, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeTab, step, pixPaymentId]);

  useEffect(() => {
    if (!pixStatus) return;
    const previous = prevPixStatusRef.current;
    prevPixStatusRef.current = pixStatus;

    if (
      CONFIRMED_STATUSES.has(pixStatus) &&
      !CONFIRMED_STATUSES.has(previous)
    ) {
      showToast("Pagamento confirmado!", "success");
      if (pixPaymentId && completionTriggeredRef.current !== pixPaymentId) {
        completionTriggeredRef.current = pixPaymentId;
        void finalizePixPayment();
      }
    }

    if (FAILED_STATUSES.has(pixStatus) && !FAILED_STATUSES.has(previous)) {
      showToast("Pagamento nao foi concluido.", "error");
      completionTriggeredRef.current = null;
    }
  }, [pixStatus, pixPaymentId, finalizePixPayment, showToast]);

  const getPixStatusInfo = () => {
    if (FAILED_STATUSES.has(pixStatus)) {
      return {
        label: "Pagamento nao concluido",
        description:
          "Identificamos um problema com esta cobranca. Gere um novo pagamento.",
        tone: "error" as const,
      };
    }

    if (CONFIRMED_STATUSES.has(pixStatus)) {
      return {
        label: "Pagamento confirmado",
        description: "Seus creditos serao liberados em instantes.",
        tone: "success" as const,
      };
    }

    return {
      label: "Aguardando pagamento",
      description: "Abra o app do seu banco e finalize o pagamento.",
      tone: "pending" as const,
    };
  };

  const renderQuantitySection = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-neutral-900 mb-3">
          Tabela de precos por unidade
        </h3>
        <div className="space-y-2">
          {PRICING_TIERS.map((tier, index) => {
            const isActive =
              quantity >= tier.min && (tier.max === null || quantity <= tier.max);
            return (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs ${isActive ? "bg-[#2F4F7F] text-white" : "bg-neutral-50 text-neutral-600"}`}
              >
                <span>
                  {tier.min} - {tier.max ? tier.max : "mais"} creditos
                </span>
                <span>R$ {tier.price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <label className="block text-xs font-semibold text-neutral-900 mb-2 text-center">
          Quantidade de creditos
        </label>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-neutral-100 hover:bg-neutral-200"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={quantity}
            onChange={(event) => handleQuantityInputChange(event.target.value)}
            onBlur={handleQuantityBlur}
            className="w-20 h-10 text-center text-base font-semibold border border-neutral-200 rounded-md"
          />
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-neutral-100 hover:bg-neutral-200"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3 text-sm">
        {/* Preços */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Preco unitario</span>
            <span>R$ {unitPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Campo de Cupom Compacto */}
        <div className="pt-2 border-t border-neutral-200">
          {!cupomData ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-600">
                Cupom de desconto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cupomCode}
                  onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                  placeholder="Código"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md uppercase font-mono focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none"
                  disabled={isValidatingCupom}
                />
                <button
                  onClick={handleValidateCupom}
                  disabled={isValidatingCupom || !cupomCode.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#2F4F7F] rounded-md hover:bg-[#253B65] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isValidatingCupom ? "..." : "Aplicar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-mono font-semibold text-green-900">
                  {cupomData.code}
                </span>
              </div>
              <button
                onClick={handleRemoveCupom}
                className="text-xs text-green-700 hover:text-green-900 font-medium"
              >
                Remover
              </button>
            </div>
          )}

          {cupomDiscount > 0 && (
            <div className="flex items-center justify-between text-green-600 font-medium mt-2">
              <span>✓ Desconto aplicado</span>
              <span>- R$ {cupomDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>

        {savings > 0 && (
          <div className="flex items-center justify-between text-xs text-green-600 font-medium">
            <span>✓ Você está economizando</span>
            <span>R$ {savings.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderCustomerForm = ({ title }: { title: string }) => (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Nome completo
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nome e sobrenome"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="email@exemplo.com"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            CPF ou CNPJ
          </label>
          <input
            type="text"
            value={customerCpfCnpj}
            onChange={(event) => {
              const digits = normalizeDigits(event.target.value);
              const formatted = formatCpfCnpj(digits);
              setCustomerCpfCnpj(formatted);
              persistValue("customerCpfCnpj", digits);
            }}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Telefone com DDD
          </label>
          <input
            type="text"
            value={customerPhone}
            onChange={(event) => {
              const digits = normalizeDigits(event.target.value);
              const formatted = formatPhone(digits);
              setCustomerPhone(formatted);
              persistValue("customerPhone", digits);
            }}
            placeholder="(11) 99999-9999"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
      </div>
    </div>
  );

  const renderCreditCardForm = () => (
    <div className="space-y-4 animate-fade-in">
      {renderCustomerForm({ title: "Dados do titular" })}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Numero do cartao
          </label>
          <input
            type="text"
            placeholder="0000 0000 0000 0000"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Validade
            </label>
            <input
              type="text"
              placeholder="MM/AA"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              placeholder="123"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Nome no cartao
          </label>
          <input
            type="text"
            placeholder="Como esta no cartao"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md"
          />
        </div>
      </div>
    </div>
  );

  const renderPixConfirmation = () => {
    const statusInfo = getPixStatusInfo();
    const toneClasses = {
      pending: {
        badge: "bg-amber-500",
        text: "text-amber-700",
        bg: "bg-amber-50 border-amber-100",
      },
      success: {
        badge: "bg-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-100",
      },
      error: {
        badge: "bg-red-500",
        text: "text-red-700",
        bg: "bg-red-50 border-red-100",
      },
    } as const;

    const tone = toneClasses[statusInfo.tone];

    return (
      <div className="space-y-4 text-center animate-fade-in">
        <div
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border ${tone.bg} ${tone.text}`}
        >
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone.badge} animate-pulse`} />
          <span className="text-sm font-medium uppercase tracking-wide">
            {statusInfo.label}
          </span>
        </div>
        <p className="text-xs text-neutral-600">{statusInfo.description}</p>

        {pixQrCode && (
          <div className="flex justify-center">
            <img
              src={`data:image/png;base64,${pixQrCode}`}
              alt="QR Code PIX"
              className="w-64 h-64"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-neutral-700">
            Codigo copia e cola
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pixCopyPaste}
              readOnly
              className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md"
            />
            <button
              onClick={copyPixCode}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2F4F7F] rounded-md"
            >
              Copiar
            </button>
          </div>
        </div>
        <p className="text-xs text-neutral-600">
          Assim que o pagamento for confirmado seus creditos serao liberados automaticamente.
        </p>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center gap-4 py-8 animate-fade-in">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-neutral-900">Pagamento realizado com sucesso!</h3>
        <p className="text-sm text-neutral-600">
          Seus créditos foram adicionados à sua conta.
        </p>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (isLoading) {
      return <LoadingIndicator label="Processando pagamento..." />;
    }

    if (isSuccess) {
      return renderSuccess();
    }

    if (isTransitioning) {
      return <LoadingIndicator label="Carregando..." />;
    }

    if (activeTab === "pix") {
      if (step === 1) {
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700">
              Escolha a quantidade de creditos e avance para informar seus dados.
            </div>
            {renderQuantitySection()}
          </div>
        );
      }
      if (step === 2) {
        return renderCustomerForm({ title: "Dados do pagador" });
      }
      return renderPixConfirmation();
    }

    if (activeTab === "credit-card") {
      if (step === 1) {
        return renderQuantitySection();
      }
      return renderCreditCardForm();
    }

    return null;
  };

  const getPrimaryButtonLabel = () => {
    if (activeTab === "pix") {
      if (step === 1) return "Continuar";
      if (step === 2) return isLoading ? "Gerando..." : "Gerar QR Code";
      return "Fechar";
    }

    if (activeTab === "credit-card") {
      if (step === 1) return "Continuar";
      return isLoading ? "Processando..." : "Confirmar pagamento";
    }

    return "Continuar";
  };

  const isPrimaryDisabled = () => {
    if (isLoading) return true;
    if (activeTab === "pix" && step === 3 && !pixQrCode) return true;
    return false;
  };

  const handlePrimaryAction = () => {
    if (activeTab === "pix" && step === 3) {
      handleClose();
      return;
    }
    handlePurchase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Comprar creditos"
      maxWidth="md"
      footer={
        isSuccess ? (
          <div className="flex justify-end w-full">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2F4F7F] rounded-md"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {((activeTab === "pix" && step > 1) ||
              (activeTab === "credit-card" && step === 2)) && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
                disabled={isLoading}
              >
                Voltar
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handlePrimaryAction}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2F4F7F] rounded-md disabled:opacity-50"
                disabled={isPrimaryDisabled()}
              >
                {getPrimaryButtonLabel()}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex gap-2 mb-4 p-1 bg-neutral-100 rounded-lg">
        <button
          onClick={() => handleTabChange("pix")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${activeTab === "pix" ? "bg-white shadow-sm" : "hover:bg-neutral-200"}`}
        >
          Pagar com Pix
        </button>
        <button
          onClick={() => handleTabChange("credit-card")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${activeTab === "credit-card" ? "bg-white shadow-sm" : "hover:bg-neutral-200"}`}
        >
          Cartao de credito
        </button>
      </div>

      {renderStepContent()}

      <style jsx>{`
        .loader {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          border: 3px solid #e5e7eb;
          border-top-color: #111827;
          animation: spin 0.8s linear infinite;
        }

        .animate-fade-in {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Modal>
  );
}
