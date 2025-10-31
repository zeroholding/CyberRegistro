const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration(filename) {
  const filePath = path.join(__dirname, '..', 'sql', filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n📄 Executando ${filename}...`);
  try {
    await pool.query(sql);
    console.log(`✅ ${filename} executado com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao executar ${filename}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando migrations...\n');

  try {
    // Executar migrations na ordem correta
    await runMigration('create_anuncios.sql');
    await runMigration('alter_anuncios_registro.sql');
    // Opcional: garantir colunas auxiliares
    try { await runMigration('alter_anuncios_pdf.sql'); } catch (e) {}
    try { await runMigration('alter_anuncios_sku.sql'); } catch (e) {}

    console.log('\n✨ Todas as migrations foram executadas com sucesso!');
  } catch (error) {
    console.error('\n💥 Erro durante as migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
