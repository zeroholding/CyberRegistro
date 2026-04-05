'use client';

import { useState, useEffect, useRef } from 'react';

interface UserDropdownProps {
  usuario: any;
  onLogout: () => void;
  onOpenProfile?: () => void;
}

export default function UserDropdown({ usuario, onLogout, onOpenProfile }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Gera uma cor única e consistente para cada usuário
  const getUserColor = (identifier: string) => {
    if (!identifier) {
      return 'rgba(23, 23, 23, 0.9)'; // Fallback
    }

    // Hash simples do identificador (nome ou email)
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Gera HUE (0-360) para ter cores bem distribuídas
    const hue = Math.abs(hash % 360);

    // Saturação alta (70-90%) para cores vibrantes
    const saturation = 70 + (Math.abs(hash >> 8) % 20);

    // Luminosidade média (45-65%) para garantir contraste com texto branco
    const lightness = 45 + (Math.abs(hash >> 16) % 20);

    // Converte HSL para RGB
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    // Converte para valores RGB (0-255) e adiciona opacidade
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);
    const opacity = 0.9;

    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  };

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
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none group"
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 group-hover:ring-2 group-hover:ring-offset-1"
          style={{
            backgroundColor: getUserColor(usuario?.email || usuario?.nome || 'User'),
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <span className="text-white text-sm font-semibold">
            {usuario ? getInitials(usuario.nome) : 'U'}
          </span>
        </div>
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
          {/* User Info */}
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {usuario?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-neutral-600 truncate">
              {usuario?.email || 'email@exemplo.com'}
            </p>
          </div>

          {/* Menu Items */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors duration-150 font-medium"
            >
              Perfil
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors duration-150 font-medium"
            >
              Configurações
            </button>

            <a
              href="#"
              className="block w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors duration-150 font-medium"
            >
              Ajuda
            </a>

            {/* Logout */}
            <div className="mt-1 pt-1.5 border-t border-neutral-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 font-medium text-left"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
