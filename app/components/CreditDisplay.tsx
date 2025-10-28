'use client';

import { useEffect, useState, useRef } from 'react';
import Lottie from 'lottie-react';
import PurchaseCreditsModal from './PurchaseCreditsModal';
import TransactionHistoryModal from './TransactionHistoryModal';

interface CreditDisplayProps {
  credits?: number;
  onCreditsUpdated?: () => void;
}

export default function CreditDisplay({ credits = 0, onCreditsUpdated }: CreditDisplayProps) {
  const [animationData, setAnimationData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carregar o arquivo JSON do Lottie
    fetch('/Coin.json')
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error('Erro ao carregar animaÃ§Ã£o:', error));
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BotÃ£o de CrÃ©ditos */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-neutral-50 transition-all duration-200 focus:outline-none"
      >
        {/* Ãcone da moeda */}
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 flex items-center justify-center p-1">
            {animationData && (
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>

        {/* Texto de crÃ©ditos - uma linha horizontal */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-neutral-900 font-mono tabular-nums">
            {credits.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm font-normal text-neutral-600">
            Créditos
          </span>
        </div>

        {/* Seta animada */}
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ease-out ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        className={`
          absolute right-0 mt-2 w-48 origin-top-right
          transform transition-all duration-200 ease-out
          ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
      >
        <div className="rounded-xl bg-white border border-neutral-200/60 overflow-hidden shadow-sm">
          {/* Saldo */}
          <div className="px-4 py-3 border-b border-neutral-100">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-neutral-900 font-mono tabular-nums">
                {credits.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-neutral-400">
                {credits === 1 ? 'Crédito' : 'Créditos'}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsPurchaseModalOpen(true);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-black bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors duration-150"
            >
              <svg
                className="h-4 w-4 text-neutral-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="font-medium">Comprar</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsHistoryModalOpen(true);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-black hover:bg-neutral-50 rounded-lg transition-colors duration-150 mt-1"
            >
              <svg
                className="h-4 w-4 text-neutral-400"
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
              <span className="font-medium">Extrato</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Compra */}
      <PurchaseCreditsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      {/* Modal de Histórico */}
      <TransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}





