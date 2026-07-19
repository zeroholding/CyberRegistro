import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type VerifySearchParams = {
  mlb?: string;
  ts?: string;
  h?: string;
};

type VerifyRow = {
  title: string;
  mlb_code: string;
  platform: string | null;
  permalink: string | null;
  registro_gerado_em: string | null;
  registro_hash: string | null;
};

async function lookupRegistro(mlb: string, hash: string): Promise<VerifyRow | null> {
  try {
    const result = await pool.query(
      `SELECT title, mlb_code, platform, permalink, registro_gerado_em, registro_hash
         FROM anuncios
        WHERE mlb_code = $1 AND registro_hash = $2
        LIMIT 1`,
      [mlb, hash],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    console.error('Erro ao verificar registro:', error);
    return null;
  }
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

function platformLabel(platform: string | null): string {
  if (platform === 'shopee') return 'Shopee';
  if (platform === 'mercadolivre') return 'Mercado Livre';
  return platform || '-';
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<VerifySearchParams>;
}) {
  const { mlb, ts, h } = await searchParams;

  const hasParams = Boolean(mlb && h);
  const registro = hasParams ? await lookupRegistro(mlb as string, h as string) : null;
  const isValid = Boolean(registro);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Cyber Registro</h1>
          <p className="mt-1 text-sm text-neutral-500">Verificação de autenticidade do certificado</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div
            className={`px-6 py-5 flex items-center gap-3 ${
              isValid ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isValid ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            >
              {isValid ? (
                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 10.5l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-base font-semibold ${isValid ? 'text-emerald-800' : 'text-red-800'}`}>
                {isValid ? 'Certificado válido' : 'Certificado não encontrado'}
              </p>
              <p className={`text-xs ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {isValid
                  ? 'Este registro consta na base do Cyber Registro.'
                  : 'Os dados informados não correspondem a um registro válido.'}
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {isValid && registro ? (
              <>
                <Field label="Obra / Anúncio" value={registro.title} />
                <Field label="Código" value={registro.mlb_code} />
                <Field label="Plataforma" value={platformLabel(registro.platform)} />
                <Field label="Registrado em" value={formatDate(registro.registro_gerado_em)} />
                <Field label="Hash (SHA-256)" value={h as string} mono />
                {registro.permalink ? (
                  <a
                    href={registro.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2F4F7F] hover:underline"
                  >
                    Ver anúncio original
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                ) : null}
              </>
            ) : (
              <div className="space-y-4">
                {!hasParams ? (
                  <p className="text-sm text-neutral-600">
                    Link de verificação incompleto. Escaneie o QR Code do certificado novamente.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-neutral-600">
                      Não localizamos um certificado com os dados informados. Isso pode ocorrer se o
                      certificado ainda não foi gerado ou se o link foi alterado.
                    </p>
                    <Field label="Código informado" value={mlb as string} />
                    {ts ? <Field label="Data informada" value={formatDate(ts)} /> : null}
                    <Field label="Hash informado" value={h as string} mono />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Cyber Registro © {new Date().getFullYear()} — Proteção de direitos autorais
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-sm text-neutral-800 break-words ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}
