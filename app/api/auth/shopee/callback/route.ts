import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { exchangeShopeeCode, getShopeeShopName } from '@/app/services/shopee';

// Mesmo padrão visual do callback do Mercado Livre: página HTML minimalista
// que fecha o popup e notifica a janela pai via postMessage.
function buildResultHtml(success: boolean, title: string, message: string, eventType: string, errorCode?: string) {
  const iconHtml = success
    ? `<div class="icon"><div class="checkmark"></div></div>`
    : `<div class="icon" style="background:#fef2f2"><div class="xmark"></div></div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .container { max-width: 320px; width: 100%; text-align: center; }
        .card { background: white; border-radius: 16px; padding: 32px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e5e5; }
        .icon { width: 48px; height: 48px; margin: 0 auto 16px; background: #f5f5f5; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .checkmark { width: 24px; height: 24px; border: 2px solid #22c55e; border-radius: 50%; position: relative; }
        .checkmark::after { content: ''; position: absolute; left: 6px; top: 2px; width: 6px; height: 12px; border: solid #22c55e; border-width: 0 2px 2px 0; transform: rotate(45deg); }
        .xmark { width: 24px; height: 24px; border: 2px solid #ef4444; border-radius: 50%; position: relative; }
        .xmark::before, .xmark::after { content: ''; position: absolute; left: 50%; top: 50%; width: 12px; height: 2px; background: #ef4444; }
        .xmark::before { transform: translate(-50%, -50%) rotate(45deg); }
        .xmark::after { transform: translate(-50%, -50%) rotate(-45deg); }
        h1 { font-size: 18px; font-weight: 600; color: #171717; margin-bottom: 8px; }
        p { font-size: 14px; color: #737373; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          ${iconHtml}
          <h1>${title}</h1>
          <p>${message}</p>
        </div>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: '${eventType}'${errorCode ? `, error: '${errorCode}'` : ''} }, '*');
          setTimeout(() => window.close(), 1500);
        } else {
          setTimeout(() => {
            window.location.href = '/contas-conectadas?${success ? 'shopee_success=true' : `shopee_error=${errorCode}`}';
          }, 1500);
        }
      </script>
    </body>
    </html>
  `;
}

export async function GET(request: NextRequest) {
  const html = (body: string) => new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/html' } });

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const state = searchParams.get('state');

    if (!code || !shopId || !state) {
      return html(buildResultHtml(false, 'Erro', 'Callback inválido', 'SHOPEE_AUTH_ERROR', 'invalid_callback'));
    }

    const userId = parseInt(state, 10);
    if (!Number.isFinite(userId)) {
      return html(buildResultHtml(false, 'Erro', 'Sessão inválida', 'SHOPEE_AUTH_ERROR', 'invalid_state'));
    }

    let tokens;
    try {
      tokens = await exchangeShopeeCode(code, shopId);
    } catch (err) {
      console.error('Erro ao trocar código Shopee:', err);
      return html(buildResultHtml(false, 'Erro ao Conectar', 'Falha ao obter token da Shopee', 'SHOPEE_AUTH_ERROR', 'token_exchange_failed'));
    }

    const shopName = await getShopeeShopName(String(tokens.shop_id), tokens.access_token);
    const expiresAt = new Date(Date.now() + Math.max(30, tokens.expire_in - 60) * 1000);

    await pool.query(
      `INSERT INTO shopee_accounts (user_id, shop_id, shop_name, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, shop_id)
       DO UPDATE SET
         shop_name = EXCLUDED.shop_name,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, tokens.shop_id, shopName, tokens.access_token, tokens.refresh_token, expiresAt],
    );

    return html(buildResultHtml(true, 'Loja Conectada', 'Fechando automaticamente...', 'SHOPEE_AUTH_SUCCESS'));
  } catch (error) {
    console.error('Erro no callback da Shopee:', error);
    return html(buildResultHtml(false, 'Erro ao Conectar', 'Ocorreu um erro inesperado', 'SHOPEE_AUTH_ERROR', 'unexpected_error'));
  }
}
