'use client';

import { useState, useEffect, useCallback } from 'react';
import UserDropdown from './UserDropdown';
import CreditDisplay from './CreditDisplay';
import ProfileModal from './ProfileModal';

interface TopbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
}

export default function Topbar({ onMenuClick, onLogout }: TopbarProps) {
  const [usuario, setUsuario] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fetchCredits = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/credits', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar creditos');
      }

      const data = await response.json();
      setCredits(Number(data.credits ?? 0));
    } catch (error) {
      console.error('Erro ao carregar creditos:', error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsuario(payload);
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }

      fetchCredits();
    }
  }, [fetchCredits]);

  const handleUpdateUsuario = (novoUsuario: any, novoToken: string) => {
    setUsuario((prev: any) => ({ ...prev, ...novoUsuario }));
    localStorage.setItem('token', novoToken);
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Lado esquerdo - Menu */}
        <div className="flex items-center">
          {/* BotÃ£o do menu mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden text-neutral-500 hover:text-neutral-700 transition-colors duration-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Lado direito - CrÃ©ditos e Avatar */}
        <div className="flex items-center gap-3">
          <CreditDisplay credits={credits} onCreditsUpdated={fetchCredits} />
          <UserDropdown 
            usuario={usuario} 
            onLogout={onLogout} 
            onOpenProfile={() => setShowProfileModal(true)} 
          />
        </div>
      </div>

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        usuario={usuario}
        onUpdateUsuario={handleUpdateUsuario}
      />
    </header>
  );
}









