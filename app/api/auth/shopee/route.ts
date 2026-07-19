import { NextRequest, NextResponse } from 'next/server';
import { getShopeeAuthUrl, getShopeeCredentials } from '@/app/services/shopee';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 });
    }

    const { partnerId, partnerKey } = getShopeeCredentials();
    if (!partnerId || !partnerKey) {
      return NextResponse.json(
        { error: 'Configuração da Shopee não encontrada (SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY)' },
        { status: 500 },
      );
    }

    const redirectUri = process.env.SHOPEE_REDIRECT_URI;
    if (!redirectUri) {
      return NextResponse.json({ error: 'SHOPEE_REDIRECT_URI não configurado' }, { status: 500 });
    }

    // O userId vai no `state` da própria URL de redirect (a Shopee devolve
    // o `redirect` completo no callback, incluindo query string).
    const redirectWithState = `${redirectUri}?state=${encodeURIComponent(userId)}`;
    const authUrl = getShopeeAuthUrl(redirectWithState);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação Shopee:', error);
    return NextResponse.json({ error: 'Erro ao iniciar autenticação' }, { status: 500 });
  }
}
