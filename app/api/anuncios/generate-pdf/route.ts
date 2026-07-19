import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureShopeeAccessToken, ShopeeAccountRecord } from '@/app/api/shopee/token-utils';
import { getShopeeItemBaseInfo, getShopeeModelList } from '@/app/services/shopee';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anuncioId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!anuncioId || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Buscar dados do anúncio (join com as duas origens possíveis)
    const result = await pool.query(
      `SELECT
        a.*,
        ma.nickname as account_nickname,
        ma.first_name as account_first_name,
        ma.last_name as account_last_name,
        sa.shop_name as shopee_shop_name
       FROM anuncios a
       LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
       LEFT JOIN shopee_accounts sa ON a.shopee_account_id = sa.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [anuncioId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Anúncio não encontrado' },
        { status: 404 }
      );
    }

    const anuncio = result.rows[0];
    const isShopee = anuncio.platform === 'shopee';

    // Buscar detalhes adicionais da API de origem, quando aplicável.
    let mlDetails = null;
    let mlDescription = '';

    // Shopee: imagens e descrição vêm da API no momento do PDF (o sync em
    // lote não guarda todas as fotos/descrição, igual ao ML).
    let shopeePictures: Array<{ url: string; secure_url: string }> = [];
    let shopeeDescription = '';

    if (isShopee) {
      try {
        const acc = await pool.query(
          `SELECT id, user_id, shop_id, shop_name, access_token, refresh_token, expires_at
           FROM shopee_accounts WHERE id = $1`,
          [anuncio.shopee_account_id],
        );
        if (acc.rows.length > 0) {
          let account = acc.rows[0] as ShopeeAccountRecord;
          account = await ensureShopeeAccessToken(pool, account);
          const items = await getShopeeItemBaseInfo(
            String(account.shop_id),
            account.access_token,
            [Number(anuncio.mlb_code)],
          );
          if (items.length > 0) {
            const it = items[0];
            // Fotos principais do anúncio + imagem de cada variação.
            // A Shopee guarda a imagem da variação no 1º tier (ex.: cor).
            // Coletamos do get_item_base_info E do get_model_list (endpoint
            // dedicado a variações) para garantir que TODAS venham. Dedupe
            // por URL para não repetir páginas.
            const urls: string[] = [];
            for (const u of it.image?.image_url_list || []) {
              if (u) urls.push(u);
            }
            for (const tier of it.tier_variation || []) {
              for (const opt of tier.option_list || []) {
                const u = opt.image?.image_url;
                if (u) urls.push(u);
              }
            }

            // Fonte dedicada de variações (mais confiável para as imagens).
            try {
              const modelList = await getShopeeModelList(
                String(account.shop_id),
                account.access_token,
                Number(anuncio.mlb_code),
              );
              for (const tier of modelList.tier_variation || []) {
                for (const opt of tier.option_list || []) {
                  const u = opt.image?.image_url;
                  if (u) urls.push(u);
                }
              }
            } catch (modelErr) {
              console.error('Erro ao buscar get_model_list Shopee:', modelErr);
            }

            const seen = new Set<string>();
            shopeePictures = urls
              .filter((u) => {
                if (seen.has(u)) return false;
                seen.add(u);
                return true;
              })
              .map((url) => ({ url, secure_url: url }));
            shopeeDescription = it.description || '';
          }
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da Shopee para PDF:', error);
        // Continue mesmo se falhar — usa thumbnail como fallback abaixo.
      }

      // Fallback: se a API não devolveu fotos, ao menos usa a thumbnail salva.
      if (shopeePictures.length === 0 && anuncio.thumbnail) {
        shopeePictures = [{ url: anuncio.thumbnail, secure_url: anuncio.thumbnail }];
      }
    }

    if (!isShopee) {
      try {
        // Buscar token da conta ML
        const accountResult = await pool.query(
          `SELECT access_token FROM mercadolivre_accounts WHERE id = $1`,
          [anuncio.ml_account_id]
        );

        if (accountResult.rows.length > 0) {
          const accessToken = accountResult.rows[0].access_token;

          // Buscar detalhes completos do item
          const itemResponse = await fetch(
            `https://api.mercadolibre.com/items/${anuncio.mlb_code}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (itemResponse.ok) {
            mlDetails = await itemResponse.json();
          }

          // Buscar descrição do item (endpoint separado)
          const descriptionResponse = await fetch(
            `https://api.mercadolibre.com/items/${anuncio.mlb_code}/description`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (descriptionResponse.ok) {
            const descData = await descriptionResponse.json();
            mlDescription = descData.plain_text || descData.text || '';
          }
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do ML:', error);
        // Continue mesmo se falhar
      }
    }

    // Montar dados para o PDF (compatível com ambas as origens)
    const pdfData = {
      title: anuncio.title,
      mlbCode: anuncio.mlb_code,
      price: anuncio.price,
      availableQuantity: anuncio.available_quantity,
      soldQuantity: anuncio.sold_quantity,
      status: anuncio.status,
      condition: anuncio.condition,
      listingType: anuncio.listing_type_id,
      permalink: anuncio.permalink,
      thumbnail: anuncio.thumbnail,
      createdAt: anuncio.created_at_ml,
      updatedAt: anuncio.updated_at_ml,
      platform: anuncio.platform || 'mercadolivre',
      // Campos de controle do registro (opcionais)
      registroEnviado: anuncio.registro_enviado ?? false,
      registroEnviadoEm: anuncio.registro_enviado_em ?? null,
      registroStatus: anuncio.registro_status ?? null,
      registroGeradoEm: anuncio.registro_gerado_em ?? null,
      registroHash: anuncio.registro_hash ?? null,
      account: isShopee
        ? { nickname: anuncio.shopee_shop_name, firstName: null, lastName: null }
        : {
            nickname: anuncio.account_nickname,
            firstName: anuncio.account_first_name,
            lastName: anuncio.account_last_name,
          },
      // Imagens/descrição: da API do ML ou da Shopee, conforme a origem.
      pictures: isShopee ? shopeePictures : (mlDetails?.pictures || []),
      description: isShopee ? shopeeDescription : mlDescription,
      attributes: mlDetails?.attributes || [],
      warranty: mlDetails?.warranty || '',
      shipping: mlDetails?.shipping || {},
    };

    return NextResponse.json(pdfData);
  } catch (error) {
    console.error('Erro ao gerar dados do PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar dados do PDF' },
      { status: 500 }
    );
  }
}
