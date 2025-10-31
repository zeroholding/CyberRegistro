-- Adiciona coluna SKU aos anuncios para permitir busca por SKU
ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS sku TEXT;

-- Índice para melhorar a performance de busca por SKU
CREATE INDEX IF NOT EXISTS idx_anuncios_sku ON anuncios(sku);

