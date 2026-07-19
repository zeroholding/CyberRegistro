-- ===================================================
-- TABELA DE CONTAS DA SHOPEE (Open Platform v2)
-- ===================================================
-- Migração ADITIVA — não afeta nenhuma tabela existente.
-- Espelha mercadolivre_accounts, mas a autenticação da Shopee usa
-- partner_id + partner_key (assinatura HMAC-SHA256) + token por LOJA
-- (shop_id), diferente do OAuth Bearer do Mercado Livre.

CREATE TABLE IF NOT EXISTS shopee_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    shop_id BIGINT NOT NULL,
    shop_name VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, shop_id),
    CONSTRAINT fk_shopee_accounts_user
        FOREIGN KEY(user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopee_accounts_user_id ON shopee_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopee_accounts_shop_id ON shopee_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shopee_accounts_expires_at ON shopee_accounts(expires_at);

CREATE TRIGGER trigger_update_shopee_accounts_updated_at
    BEFORE UPDATE ON shopee_accounts
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

COMMENT ON TABLE shopee_accounts IS 'Lojas conectadas da Shopee (Open Platform v2)';
