'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useToast } from '../components/ToastContainer';

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validações
    if (formData.senha !== formData.confirmarSenha) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    if (formData.senha.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Cadastro realizado com sucesso!', 'success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        showToast(data.erro || 'Erro ao realizar cadastro', 'error');
      }
    } catch (error) {
      showToast('Erro ao conectar com o servidor', 'error');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          {/* Header */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Criar conta
            </h1>
            <p className="text-sm text-neutral-500">
              Preencha os dados para começar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Completo */}
            <div className="space-y-2">
              <label 
                htmlFor="nome" 
                className="text-sm font-medium leading-none text-neutral-950"
              >
                Nome completo
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                value={formData.nome}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="João Silva"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="text-sm font-medium leading-none text-neutral-950"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label 
                htmlFor="senha" 
                className="text-sm font-medium leading-none text-neutral-950"
              >
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                value={formData.senha}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label 
                htmlFor="confirmarSenha" 
                className="text-sm font-medium leading-none text-neutral-950"
              >
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                required
                value={formData.confirmarSenha}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>


            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#2F4F7F] px-4 py-2 text-sm font-medium text-neutral-50 ring-offset-white transition-colors hover:bg-[#253B65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F4F7F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Footer - dentro do card */}
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-medium text-neutral-950 underline underline-offset-4 hover:text-neutral-700 transition-colors"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>

        {/* Terms - fora do card */}
        <p className="text-center text-xs text-neutral-500">
          Ao criar uma conta, você concorda com nossos{' '}
          <Link href="/termos" className="underline underline-offset-4 hover:text-neutral-700">
            Termos de Serviço
          </Link>
          {' '}e{' '}
          <Link href="/privacidade" className="underline underline-offset-4 hover:text-neutral-700">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}