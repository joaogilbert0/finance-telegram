import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
        tipo TEXT NOT NULL
      )
    `);
    } finally {
        client.release();
    }
}

export async function adicionarTransacao(
    descricao: string,
    categoria: string,
    valor: number,
) {
    const tipo = valor > 0 ? "Entrada" : "Saída";
    await pool.query(
        "INSERT INTO transacoes (data, descricao, categoria, valor, tipo) VALUES ($1, $2, $3, $4, $5)",
        [new Date(), descricao, categoria, valor, tipo],
    );
}

export async function buscarTransacoesDoMes(mes: number, ano: number) {
    const mesFormatado = (mes + 1).toString().padStart(2, "0");
    const result = await pool.query(
        `SELECT * FROM transacoes
     WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2`,
        [ano, parseInt(mesFormatado)],
    );
    return result.rows;
}

export async function buscarSaldoTotal() {
    const result = await pool.query(
        "SELECT SUM(valor) as total FROM transacoes",
    );
    return result.rows[0]?.total || 0;
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
