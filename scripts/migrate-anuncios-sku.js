const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gustavo2501@localhost:5432/cyberregistro',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migration SKU...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'alter_anuncios_sku.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ Migration executada com sucesso!');
    console.log('\nAlterações feitas:');
    console.log('  - anuncios (coluna sku adicionada)');
    console.log('  - idx_anuncios_sku (índice criado)');

    // Verificar se a coluna foi criada
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'anuncios' AND column_name = 'sku'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Coluna "sku" verificada na tabela anuncios');
      console.log(`   Tipo: ${result.rows[0].data_type}`);
    }

    // Verificar se o índice foi criado
    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'anuncios' AND indexname = 'idx_anuncios_sku'
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Índice "idx_anuncios_sku" verificado');
    }

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error);
    process.exit(1);
  });
