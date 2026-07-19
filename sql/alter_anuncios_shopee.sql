-- ===================================================
-- SUPORTE À SHOPEE NA TABELA anuncios (migração ADITIVA)
-- ===================================================
-- Objetivo: reaproveitar a MESMA tabela `anuncios` (e todo o fluxo de
-- registro/certificado que já existe) para os produtos importados da
-- Shopee, em vez de duplicar a lógica de PDF/hash/histórico.
--
-- Estratégia:
--   1. ml_account_id passa a ser NULLABLE (linhas Shopee não têm conta ML).
--   2. Nova coluna `platform` ('mercadolivre' | 'shopee'), default
--      'mercadolivre' para não alterar o significado das linhas existentes.
--   3. Nova coluna `shopee_account_id` (FK para shopee_accounts).
--   4. `mlb_code` continua sendo a coluna do "código do anúncio" — para
--      Shopee, guardamos o item_id da Shopee ali (mesmo papel: identificador
--      único do anúncio na origem). Evita duplicar coluna e quebrar as
--      queries/telas que já leem `mlb_code`.
--   5. Novo índice único parcial para (shopee_account_id, mlb_code), já que
--      o UNIQUE(ml_account_id, mlb_code) existente não cobre linhas Shopee
--      (ml_account_id fica NULL nelas).
--
-- Nada é removido nem renomeado — 100% compatível com o código existente
-- do Mercado Livre.

ALTER TABLE anuncios
  ALTER COLUMN ml_account_id DROP NOT NULL;

ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS platform VARCHAR(20) NOT NULL DEFAULT 'mercadolivre',
  ADD COLUMN IF NOT EXISTS shopee_account_id INTEGER;

ALTER TABLE anuncios
  ADD CONSTRAINT fk_anuncios_shopee_account
    FOREIGN KEY (shopee_account_id)
    REFERENCES shopee_accounts(id)
    ON DELETE CASCADE;

-- Garante consistência: linha é de UMA origem só (ML xor Shopee).
ALTER TABLE anuncios
  ADD CONSTRAINT chk_anuncios_platform_account
    CHECK (
      (platform = 'mercadolivre' AND ml_account_id IS NOT NULL AND shopee_account_id IS NULL)
      OR
      (platform = 'shopee' AND shopee_account_id IS NOT NULL AND ml_account_id IS NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_anuncios_shopee_account_code
  ON anuncios(shopee_account_id, mlb_code)
  WHERE shopee_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anuncios_platform ON anuncios(platform);
CREATE INDEX IF NOT EXISTS idx_anuncios_shopee_account_id ON anuncios(shopee_account_id);

COMMENT ON COLUMN anuncios.platform IS 'Origem do anúncio: mercadolivre ou shopee';
COMMENT ON COLUMN anuncios.shopee_account_id IS 'Loja Shopee de origem (quando platform = shopee)';
COMMENT ON COLUMN anuncios.mlb_code IS 'Código do anúncio na origem: MLB... (Mercado Livre) ou item_id (Shopee)';
