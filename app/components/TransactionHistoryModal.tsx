'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  creditsQuantity: number;
  paymentMethod: string;
  paymentId: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionHistoryModal({
  isOpen,
  onClose,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      credit_purchase: { label: 'Compra de Créditos', color: 'text-green-700 bg-green-100' },
      credit_usage: { label: 'Uso de Créditos', color: 'text-red-700 bg-red-100' },
      refund: { label: 'Reembolso', color: 'text-blue-700 bg-blue-100' },
    };
    return types[type] || { label: type, color: 'text-neutral-700 bg-neutral-100' };
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendente', color: 'text-yellow-700 bg-yellow-100' },
      completed: { label: 'Concluído', color: 'text-green-700 bg-green-100' },
      failed: { label: 'Falhou', color: 'text-red-700 bg-red-100' },
      refunded: { label: 'Reembolsado', color: 'text-blue-700 bg-blue-100' },
    };
    return statuses[status] || { label: status, color: 'text-neutral-700 bg-neutral-100' };
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      PIX: 'PIX',
      CREDIT_CARD: 'Cartão de Crédito',
    };
    return methods[method] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Transações" maxWidth="xl">
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="mt-4 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTransactions}
              className="mt-4 px-4 py-2 bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-4 text-sm text-neutral-600">
              Nenhuma transação encontrada
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Suas transações aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {transactions.map((transaction) => {
              const typeInfo = getTypeLabel(transaction.type);
              const statusInfo = getStatusLabel(transaction.status);

              return (
                <div
                  key={transaction.id}
                  className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                >
                  {/* Header da transação */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-neutral-600 mt-1">
                          {transaction.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-neutral-900">
                        {transaction.creditsQuantity >= 0 ? '+' : ''}
                        {transaction.creditsQuantity.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-neutral-400">créditos</div>
                    </div>
                  </div>

                  {/* Detalhes da transação */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Valor:</span>
                      <span className="ml-2 font-medium text-neutral-900">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Método:</span>
                      <span className="ml-2 font-medium text-neutral-900">
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-500">Data:</span>
                      <span className="ml-2 font-medium text-neutral-900">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
