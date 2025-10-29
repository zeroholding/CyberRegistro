'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCreditsPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(10);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload);
    } catch (e) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleAddCredits = async () => {
    if (!usuario?.id) return;

    setProcessing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usuario.id,
          amount: amount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Sucesso! ${amount} créditos adicionados. Saldo atual: ${data.newBalance}`);
      } else {
        setMessage(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erro ao adicionar créditos: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Gerenciar Créditos
          </h1>
          <p className="text-neutral-600 mb-6">
            Adicione créditos à sua conta para teste.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Quantidade de Créditos
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min="1"
                max="1000"
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <button
              onClick={handleAddCredits}
              disabled={processing || amount <= 0}
              className="w-full px-6 py-3 bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                `Adicionar ${amount} Créditos`
              )}
            </button>

            {message && (
              <div className={`p-4 rounded-lg border ${
                message.startsWith('✅')
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {message}
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Informações
            </h2>
            <p className="text-sm text-neutral-600">
              <strong>Usuário:</strong> {usuario?.nome || 'N/A'} (ID: {usuario?.id})
            </p>
            <p className="text-sm text-neutral-600 mt-2">
              Esta página é apenas para testes. Em produção, os créditos devem ser adquiridos através do sistema de pagamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
