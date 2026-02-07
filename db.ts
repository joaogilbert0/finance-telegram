import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
});

export async function initDb() {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id SERIAL PRIMARY KEY,
        data TIMESTAMP NOT NULL,
        descricao TEXT NOT NULL,
        categoria TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        tipo TEXT NOT NULL,
        meio_pagamento TEXT DEFAULT 'debito'
      )
    `);
        
        // Adiciona a coluna meio_pagamento se ela não existir (para bancos existentes)
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='transacoes' AND column_name='meio_pagamento'
        ) THEN
          ALTER TABLE transacoes ADD COLUMN meio_pagamento TEXT DEFAULT 'debito';
        END IF;
      END $$;
    `);
    } finally {
        client.release();
    }
}

export async function adicionarTransacao(
    descricao: string,
    categoria: string,
    valor: number,
    meioPagamento: string = 'debito',
) {
    const tipo = valor > 0 ? "Entrada" : "Saída";
    await pool.query(
        "INSERT INTO transacoes (data, descricao, categoria, valor, tipo, meio_pagamento) VALUES ($1, $2, $3, $4, $5, $6)",
        [new Date(), descricao, categoria, valor, tipo, meioPagamento],
    );
}

export async function buscarTransacoesDoMes(mes: number, ano: number) {
    const mesFormatado = (mes + 1).toString().padStart(2, "0");
    const result = await pool.query(
        `SELECT * FROM transacoes
     WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2
     ORDER BY data DESC`,
        [ano, parseInt(mesFormatado)],
    );
    return result.rows.map((row: any) => ({
        ...row,
        valor: parseFloat(row.valor),
    }));
}

export async function buscarSaldoTotal() {
    // Saldo total considera apenas débito e entradas
    const result = await pool.query(
        "SELECT SUM(valor) as total FROM transacoes WHERE meio_pagamento = 'debito' OR tipo = 'Entrada'",
    );
    return parseFloat(result.rows[0]?.total) || 0;
}

export async function buscarSaldoCredito() {
    // Total gasto no crédito (valores negativos)
    const result = await pool.query(
        "SELECT SUM(valor) as total FROM transacoes WHERE meio_pagamento = 'credito'",
    );
    return parseFloat(result.rows[0]?.total) || 0;
}

export async function buscarUltimaTransacao() {
    const result = await pool.query(
        "SELECT * FROM transacoes ORDER BY id DESC LIMIT 1",
    );
    return result.rows[0];
}

export async function deletarTransacao(id: number) {
    await pool.query("DELETE FROM transacoes WHERE id = $1", [id]);
}

export async function fecharBanco() {
    await pool.end();
    console.log("✅ Banco de dados fechado com sucesso!");
}
