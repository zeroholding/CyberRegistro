'use client';

import { useState } from 'react';

export default function MigrationsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigrations = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/migrations/run', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Erro ao executar migrations');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Executar Migrations
          </h1>
          <p className="text-neutral-600 mb-6">
            Clique no botão abaixo para criar/atualizar as tabelas do banco de dados com as colunas necessárias para o ambiente de registro.
          </p>

          <button
            onClick={runMigrations}
            disabled={loading}
            className="w-full px-6 py-3 bg-[#2F4F7F] text-white rounded-xl hover:bg-[#253B65] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executando migrations...
              </>
            ) : (
              <>
                🚀 Executar Migrations
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-semibold">❌ Erro:</span>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {results && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 font-semibold">✅ {results.message}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-neutral-900">Detalhes:</h3>
                {results.results?.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900">{result.file}</span>
                      <span
                        className={`text-sm font-semibold ${
                          result.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {result.status === 'success' ? '✅ Sucesso' : '❌ Erro'}
                      </span>
                    </div>
                    {result.error && (
                      <div className="mt-2 text-sm text-red-800">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
