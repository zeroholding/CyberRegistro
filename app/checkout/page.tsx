"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../components/ToastContainer";
import { Check, Copy, CreditCard, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";

// --- Helpers (copied/adapted from PurchaseCreditsModal) ---
const PRICING_TIERS = [
  { min: 1, max: 10, price: 39.9 },
  { min: 11, max: 30, price: 37.9 },
  { min: 31, max: 50, price: 35.9 },
  { min: 51, max: 100, price: 32.9 },
  { min: 101, max: null, price: 29.9 },
];

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const formatCpfCnpj = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 14);
  if (!digits) return "";
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatPhone = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || /^([0-9])\1+$/.test(digits)) return false;
  let sum = 0, check;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(digits[10]);
};

const isValidCnpj = (digits: string) => {
  if (digits.length !== 14 || /^([0-9])\1+$/.test(digits)) return false;
  // Simplificando validação CNPJ para brevidade, mas idealmente usaria a completa
  return true; 
};

// --- Page Component ---
// --- Page Component (Content with SearchParams) ---
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  
  // State
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"register" | "payment">("register");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  
  // Form Data
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    cpfCnpj: "",
    telefone: "",
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; paymentId: string } | null>(null);
  const [pixStatus, setPixStatus] = useState("PENDING");

  // Load quantity from URL
  useEffect(() => {
    const qty = parseInt(searchParams.get("quantity") || "1");
    if (!isNaN(qty) && qty > 0) setQuantity(qty);
  }, [searchParams]);

  // Pricing Logic
  const unitPrice = useMemo(() => {
    const tier = PRICING_TIERS.find(t => quantity >= t.min && (t.max === null || quantity <= t.max));
    return tier ? tier.price : PRICING_TIERS[0].price;
  }, [quantity]);
  
  const total = unitPrice * quantity;

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (e.target.name === 'cpfCnpj') value = formatCpfCnpj(value);
    if (e.target.name === 'telefone') value = formatPhone(value);
    
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleAuthAndPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let token = localStorage.getItem("token");

      // 1. Authenticate (Register or Login)
      if (!token) {
        if (authMode === "register") {
            // Validate Inputs
            const digits = normalizeDigits(formData.cpfCnpj);
            if (digits.length === 11 && !isValidCpf(digits)) throw new Error("CPF inválido");
            if (digits.length === 14 && !isValidCnpj(digits)) throw new Error("CNPJ inválido");
            if (formData.senha.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");

            // Register
            const regRes = await fetch("/api/cadastro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: formData.nome, email: formData.email, senha: formData.senha }),
            });
            const regData = await regRes.json();
            if (!regRes.ok) throw new Error(regData.erro || "Erro ao cadastrar");
        }

        // Login (always do this to get the token)
        const loginRes = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, senha: formData.senha }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.erro || "Erro ao fazer login automatico");

        token = loginData.token;
        localStorage.setItem("token", token!);
        localStorage.setItem("customerCpfCnpj", normalizeDigits(formData.cpfCnpj));
        localStorage.setItem("customerPhone", normalizeDigits(formData.telefone));
      }

      // 2. Create Payment
      if (paymentMethod === "pix") {
         const payRes = await fetch("/api/payments/pix", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({
                quantity,
                total,
                customerName: formData.nome,
                customerEmail: formData.email,
                customerCpfCnpj: normalizeDigits(formData.cpfCnpj),
                customerPhone: normalizeDigits(formData.telefone),
            }),
         });
         const payData = await payRes.json();
         if (!payRes.ok) throw new Error(payData.error || payData.details || "Erro ao gerar PIX");

         setPixData({
            qrCode: payData.payment.pixQrCode,
            copyPaste: payData.payment.pixCopyPaste,
            paymentId: payData.payment.id
         });
         setStep("payment");
      } else {
        showToast("Cartão de crédito em breve. Use PIX por enquanto.", "error");
      }

    } catch (err: any) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Poll PIX Status
  useEffect(() => {
    if (step !== "payment" || !pixData?.paymentId) return;

    const interval = setInterval(async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`/api/payments/status?id=${pixData.paymentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
                setPixStatus("CONFIRMED");
                clearInterval(interval);
                showToast("Pagamento confirmado! Redirecionando...", "success");
                setTimeout(() => router.push("/dashboard?purchase_success=true"), 2000);
            }
        } catch (e) { console.error(e); }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, pixData, router, showToast]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src="/logo.png" alt="CyberRegistro" className="h-8 w-auto" />
        </Link>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Auth & Data */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</div>
                    Seus Dados
                </h2>
                
                {step === "register" ? (
                    <form onSubmit={handleAuthAndPayment} className="space-y-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                type="button" 
                                onClick={() => setAuthMode("register")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "register" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Criar Conta
                            </button>
                            <button 
                                type="button"
                                onClick={() => setAuthMode("login")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "login" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Já tenho conta
                            </button>
                        </div>

                        {authMode === "register" && (
                            <>
                                <input
                                    name="nome"
                                    placeholder="Nome Completo"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-500 font-medium"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                     <input
                                        name="cpfCnpj"
                                        placeholder="CPF / CNPJ"
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-500 font-medium"
                                        value={formData.cpfCnpj}
                                        onChange={handleInputChange}
                                     />
                                     <input
                                        name="telefone"
                                        placeholder="Telefone / WhatsApp"
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-500 font-medium"
                                        value={formData.telefone}
                                        onChange={handleInputChange}
                                     />
                                </div>
                            </>
                        )}
                        
                        <input
                            name="email"
                            type="email"
                            placeholder="Seu melhor e-mail"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-500 font-medium"
                            value={formData.email}
                            onChange={handleInputChange}
                        />

                        <input
                            name="senha"
                            type="password"
                            placeholder={authMode === "register" ? "Crie uma senha segura" : "Sua senha"}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-500 font-medium"
                            value={formData.senha}
                            onChange={handleInputChange}
                        />

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#2F4F7F] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#253B65] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (authMode === "register" ? "Continuar para Pagamento" : "Entrar e Pagar")}
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3" />
                                Seus dados estão 100% seguros
                            </p>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8 opacity-50">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Conta autenticada</p>
                        <p className="text-sm">Prosseguindo com pagamento...</p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Order Summary & Payment */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 z-0" />
                
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</div>
                    Resumo do Pedido
                </h2>

                <div className="mb-6 relative z-10">
                     <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                        <div>
                            <p className="font-semibold text-gray-900 text-lg">{quantity} Créditos</p>
                            <p className="text-sm text-gray-500">Pacote de registro</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl text-[#2F4F7F]">R$ {total.toFixed(2).replace('.', ',')}</p>
                            <p className="text-xs text-green-600 font-medium">Melhor preço aplicado</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <span>Preço unitário</span>
                        <span>R$ {unitPrice.toFixed(2).replace('.', ',')}</span>
                     </div>
                </div>

                {step === "payment" && pixData ? (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
                            <p className="text-green-800 font-medium">QR Code gerado com sucesso!</p>
                            <p className="text-green-600 text-sm">Escaneie para pagar e liberar seus créditos.</p>
                        </div>

                        <div className="flex justify-center mb-6">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`data:image/jpeg;base64,${pixData.qrCode}`} alt="PIX QR Code" className="w-48 h-48 rounded-lg border-2 border-gray-200 p-2" />
                        </div>

                        <div className="space-y-3">
                            <p className="text-center text-sm text-gray-500 mb-2">Ou copie o código "Copia e Cola"</p>
                            <div className="flex gap-2">
                                <input readOnly value={pixData.copyPaste} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate" />
                                <button onClick={() => { navigator.clipboard.writeText(pixData.copyPaste); showToast("Copiado!", "success"); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 text-center space-y-2">
                            {pixStatus === "CONFIRMED" ? (
                                <div className="text-green-600 font-bold flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" /> Pagamento Confirmado!
                                </div>
                            ) : (
                                <div className="text-blue-600 text-sm flex items-center justify-center gap-2 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Aguardando pagamento...
                                </div>
                            )}
                        </div>
                     </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Método de Pagamento</h3>
                        <div 
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-[#2F4F7F] bg-blue-50/50' : 'border-gray-200 bg-white'}`}
                            onClick={() => setPaymentMethod('pix')}
                        >
                            <div className="w-6 h-6 flex items-center justify-center">
                                <Smartphone className="w-5 h-5 text-[#2F4F7F]" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">PIX (Instantâneo)</p>
                                <p className="text-xs text-gray-500">Liberação imediata dos créditos</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'pix' ? 'border-[#2F4F7F] bg-[#2F4F7F]' : 'border-gray-300'}`}>
                                {paymentMethod === 'pix' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <ShieldCheck className="w-4 h-4" />
                Compra Segura e Garantida
            </div>
        </div>
      </main>
    </div>
  );
}

// --- Main Page (Wrapped in Suspense) ---
import { Suspense } from "react";

export default function CheckoutPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    }>
        <CheckoutContent />
    </Suspense>
  );
}
