const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    const files = ['create_shopee_accounts.sql', 'alter_anuncios_shopee.sql'];

    for (const file of files) {
      const sqlPath = path.join(__dirname, '..', 'sql', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Executando ${file}...`);
      await pool.query(sql);
      console.log(`${file} executado com sucesso!`);
    }

    console.log('Migração Shopee concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migração Shopee:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
