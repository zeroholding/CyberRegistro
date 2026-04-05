const { Client } = require("pg");

const DATABASE_URL = "postgresql://postgres:bA5S8FeihH1jOkqi8iAlEDy2sc61fnBkItGzlMTesSMUGBW4oxnqduyirATIdm82@72.61.62.227:5454/postgres";

const client = new Client({ connectionString: DATABASE_URL, ssl: false });

async function main() {
  try {
    await client.connect();
    console.log("✅ Conectado ao banco Coolify com sucesso pela porta 5454!");

    await client.query(`
      ALTER TABLE cupons ADD COLUMN IF NOT EXISTS repasse_percent DECIMAL(5,2) DEFAULT 0.00;
    `);

    console.log("🎉 Tabela cupons modificada com sucesso! Coluna repasse_percent adicionada.");
  } catch (err) {
    console.error("❌ Erro ao modificar banco:", err);
  } finally {
    await client.end();
  }
}

main();
