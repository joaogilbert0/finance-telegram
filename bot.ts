import "dotenv/config";
import { Bot, InputFile, webhookCallback } from "grammy";
import Groq from "groq-sdk";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
    initDb,
    adicionarTransacao,
    buscarTransacoesDoMes,
    buscarSaldoTotal,
    buscarSaldoCredito,
    buscarUltimaTransacao,
    deletarTransacao,
    fecharBanco,
} from "./db.js";
import http from "http";

const bot = new Bot(process.env.BOT_TOKEN!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configurar lista de comandos que aparece quando o usuário digita '/'
bot.api.setMyCommands([
    { command: "start", description: "🚀 Iniciar bot e ver instruções" },
    { command: "balanco", description: "📊 Ver balanço mensal e gráfico" },
    { command: "delete", description: "🗑️ Deletar última transação" },
]);

// Configuração do Chart.js
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: 800,
    height: 600,
    backgroundColour: "white",
    plugins: {
        modern: [ChartDataLabels],
    },
});

bot.command("start", async (ctx) => {
    const nomeUsuario = ctx.from?.first_name || "👋";
    await ctx.reply(
        `Olá, ${nomeUsuario}! 👋\n\n` +
            `🤖 *Sou seu assistente financeiro pessoal!*\n\n` +
            `📝 *Como usar:*\n\n` +
            `💸 *Registrar gastos no débito:*\n` +
            `   • Digite: \`-50 Pizza d\` ou \`-50 Pizza debito\`\n` +
            `   • Digite: \`-120.50 Gasolina d\`\n\n` +
            `💳 *Registrar gastos no crédito:*\n` +
            `   • Digite: \`-200 Restaurante c\` ou \`-200 Restaurante credito\`\n` +
            `   • Digite: \`-89.90 Netflix c\`\n\n` +
            `💰 *Registrar entradas:*\n` +
            `   • Digite: \`+3000 Salário\`\n` +
            `   • Digite: \`+500 Freelance\`\n\n` +
            `ℹ️ *Como funciona:*\n` +
            `   • Gastos no débito: descontam do seu saldo\n` +
            `   • Gastos no crédito: aparecem no balanço mas não afetam o saldo\n` +
            `   • Se não especificar, será débito por padrão\n\n` +
            `🔍 *Comandos disponíveis:*\n` +
            `/balanco - Ver balanço mensal completo com gráfico\n` +
            `/delete - Deletar última transação registrada\n\n` +
            `✨ A IA classifica automaticamente seus gastos por categoria!`,
        { parse_mode: "Markdown" },
    );
});

function obterIconeCategoria(categoria: string): string {
    const icones: Record<string, string> = {
        Alimentação: "🍔",
        Supermercado: "🛒",
        Transporte: "🚗",
        Lazer: "🎮",
        Saúde: "💊",
        Educação: "📚",
        Contas: "📄",
        "Roupas/Beleza": "✂️",
        Salário: "💰",
        Investimentos: "📈",
        Outros: "📦",
    };
    return icones[categoria] || "📦";
}

async function classificarGastoComGroq(item: string): Promise<string> {
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `Classifique em: [Alimentação, Supermercado, Transporte, Lazer, Saúde, Educação, Contas, Roupas/Beleza, Salário, Investimentos, Outros]. Responda APENAS a categoria.`,
                },
                { role: "user", content: item },
            ],
            temperature: 0,
        });
        return completion.choices[0]?.message?.content?.trim() || "Outros";
    } catch {
        return "Outros";
    }
}

bot.command("balanco", async (ctx) => {
    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    // 1. Busca no Banco
    const transacoesMes = await buscarTransacoesDoMes(mes, ano);

    if (transacoesMes.length === 0) {
        return ctx.reply("📭 Nenhuma transação registrada neste mês.");
    }

    // 2. Agrupa por Categoria e Meio de Pagamento
    const porCategoria = transacoesMes.reduce(
        (acc: Record<string, number>, t: any) => {
            if (!acc[t.categoria]) acc[t.categoria] = 0;
            acc[t.categoria] += t.valor;
            return acc;
        },
        {} as Record<string, number>,
    );

    // Agrupa gastos por meio de pagamento
    const gastosPorMeio = transacoesMes.reduce(
        (acc: Record<string, Record<string, number>>, t: any) => {
            if (t.valor < 0) { // Apenas gastos (negativos)
                const meio = t.meio_pagamento || 'debito';
                if (!acc[meio]) acc[meio] = {};
                if (!acc[meio][t.categoria]) acc[meio][t.categoria] = 0;
                acc[meio][t.categoria] += Math.abs(t.valor);
            }
            return acc;
        },
        {} as Record<string, Record<string, number>>,
    );

    // Separa entradas e saídas
    const entradas: Record<string, number> = {};
    const saidas: Record<string, number> = {};

    for (const [cat, valor] of Object.entries(porCategoria)) {
        if ((valor as number) > 0) {
            entradas[cat] = valor as number;
        } else {
            saidas[cat] = Math.abs(valor as number);
        }
    }

    // 3. Monta Relatório
    let relatorio = `📊 *Balanço de ${hoje.toLocaleString("pt-BR", { month: "long" })}*\n\n`;

    if (Object.keys(entradas).length > 0) {
        relatorio += `💚 *ENTRADAS:*\n`;
        for (const [cat, valor] of Object.entries(entradas)) {
            const icone = obterIconeCategoria(cat);
            relatorio += `${icone} *${cat}:* R$ ${valor.toFixed(2)}\n`;
        }
        relatorio += "\n";
    }

    // Mostra gastos separados por débito e crédito
    if (gastosPorMeio.debito && Object.keys(gastosPorMeio.debito).length > 0) {
        relatorio += `💸 *GASTOS NO DÉBITO:*\n`;
        for (const [cat, valor] of Object.entries(gastosPorMeio.debito)) {
            const icone = obterIconeCategoria(cat);
            relatorio += `${icone} *${cat}:* R$ -${valor.toFixed(2)}\n`;
        }
        relatorio += "\n";
    }

    if (gastosPorMeio.credito && Object.keys(gastosPorMeio.credito).length > 0) {
        relatorio += `💳 *GASTOS NO CRÉDITO:*\n`;
        for (const [cat, valor] of Object.entries(gastosPorMeio.credito)) {
            const icone = obterIconeCategoria(cat);
            relatorio += `${icone} *${cat}:* R$ -${valor.toFixed(2)}\n`;
        }
        relatorio += "\n";
    }

    // 4. Saldos
    const saldoDebito = await buscarSaldoTotal();
    const saldoCredito = await buscarSaldoCredito();
    
    relatorio += `💰 *Saldo em Conta (Débito): R$ ${saldoDebito.toFixed(2)}*\n`;
    relatorio += `💳 *Fatura do Crédito: R$ ${Math.abs(saldoCredito).toFixed(2)}*`;

    await ctx.reply(relatorio, { parse_mode: "Markdown" });

    // 5. Gera e envia gráfico de pizza (todos os gastos)
    if (Object.keys(saidas).length > 0) {
        try {
            const labels = Object.keys(saidas);
            const data = Object.values(saidas);

            // Cores vibrantes para o gráfico
            const cores = [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
                "#FF6384",
                "#C9CBCF",
                "#4BC0C0",
            ];

            const configuration: any = {
                type: "pie",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            data: data,
                            backgroundColor: cores.slice(0, data.length),
                            borderWidth: 2,
                            borderColor: "#fff",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                font: {
                                    size: 14,
                                },
                                padding: 15,
                            },
                        },
                        title: {
                            display: true,
                            text: `Distribuição de Gastos - ${hoje.toLocaleString("pt-BR", { month: "long" })}`,
                            font: {
                                size: 18,
                            },
                            padding: 20,
                        },
                        datalabels: {
                            color: "#fff",
                            font: {
                                size: 16,
                                weight: "bold",
                            },
                            formatter: (value: number, ctx: any) => {
                                const total =
                                    ctx.chart.data.datasets[0].data.reduce(
                                        (a: number, b: number) => a + b,
                                        0,
                                    );
                                const percentage = (
                                    (value / total) *
                                    100
                                ).toFixed(1);
                                return percentage + "%";
                            },
                        },
                    },
                },
                plugins: [
                    {
                        id: "chartjs-plugin-datalabels",
                    },
                ],
            };

            const imageBuffer =
                await chartJSNodeCanvas.renderToBuffer(configuration);

            await ctx.replyWithPhoto(new InputFile(imageBuffer), {
                caption: "📊 Gráfico de distribuição dos seus gastos",
            });
        } catch (error) {
            console.error("Erro ao gerar gráfico:", error);
        }
    }
});

bot.command("delete", async (ctx) => {
    const ultimaTransacao = await buscarUltimaTransacao();

    if (!ultimaTransacao) {
        return ctx.reply("❌ Não há transações para deletar.");
    }

    const icone = obterIconeCategoria(ultimaTransacao.categoria);
    const valor = Math.abs(ultimaTransacao.valor);
    const tipo = ultimaTransacao.valor > 0 ? "entrada" : "saída";
    const meio = ultimaTransacao.meio_pagamento === 'credito' ? '💳 Crédito' : '💸 Débito';

    // Deleta a transação
    await deletarTransacao(ultimaTransacao.id);

    // Busca saldos atualizados
    const saldoDebito = await buscarSaldoTotal();
    const saldoCredito = await buscarSaldoCredito();

    await ctx.reply(
        `🗑️ *Transação deletada com sucesso!*\n\n` +
            `${icone} ${ultimaTransacao.categoria}: R$ ${tipo === "entrada" ? "+" : "-"}${valor.toFixed(2)}\n` +
            `📝 ${ultimaTransacao.descricao}\n` +
            `${tipo === "saída" ? meio : ""}\n\n` +
            `💰 Saldo em conta: R$ ${saldoDebito.toFixed(2)}\n` +
            `💳 Fatura do crédito: R$ ${Math.abs(saldoCredito).toFixed(2)}`,
        { parse_mode: "Markdown" },
    );
});

// --- OUVINTE DE MENSAGENS ---
// Regex atualizado para aceitar 'd', 'debito', 'c', 'credito' no final (opcional)
const regexFinanceiro = /^([+-]?\d+(?:[.,]\d+)?)\s+(.+?)(?:\s+(d|debito|c|credito))?$/i;

bot.hears(regexFinanceiro, async (ctx) => {
    await ctx.replyWithChatAction("typing");

    const rawNumber = ctx.match![1]!.replace(",", ".");
    const descricao = ctx.match![2]!.trim();
    const meioPagamentoInput = ctx.match![3]?.toLowerCase() || 'd'; // Padrão é débito

    let valor = parseFloat(rawNumber);
    const isEntrada = rawNumber.includes("+");

    if (!isEntrada && !rawNumber.includes("-")) {
        valor = -Math.abs(valor);
    }

    // Determina o meio de pagamento
    let meioPagamento = 'debito';
    if (meioPagamentoInput === 'c' || meioPagamentoInput === 'credito') {
        meioPagamento = 'credito';
    }

    const categoria = isEntrada
        ? "Salário"
        : await classificarGastoComGroq(descricao);

    // --- SALVA NO BANCO COM MEIO DE PAGAMENTO ---
    await adicionarTransacao(descricao, categoria, valor, meioPagamento);

    // Busca saldos atualizados direto do banco
    const saldoDebito = await buscarSaldoTotal();
    const saldoCredito = await buscarSaldoCredito();

    // Formatar data
    const agora = new Date();
    const diasDaSemana = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const meses = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const diaSemana = diasDaSemana[agora.getDay()];
    const dia = agora.getDate();
    const mes = meses[agora.getMonth()];
    const ano = agora.getFullYear();

    const dataFormatada = `${dia} ${mes} ${ano}, ${diaSemana}`;

    // Calcular dias restantes no mês
    const ultimoDiaMes = new Date(
        agora.getFullYear(),
        agora.getMonth() + 1,
        0,
    ).getDate();
    const diasRestantes = ultimoDiaMes - agora.getDate() + 1;

    // Calcular saldo diário (apenas do débito)
    const saldoDiario = diasRestantes > 0 ? saldoDebito / diasRestantes : 0;

    // Obter nome do usuário
    const nomeUsuario = ctx.from?.first_name || "Você";

    // Obter ícone da categoria
    const icone = obterIconeCategoria(categoria);

    // Emoji do meio de pagamento
    const emojiMeio = meioPagamento === 'credito' ? '💳' : '💸';

    // Montar mensagem
    let mensagem = "";

    if (isEntrada) {
        mensagem = `${nomeUsuario} received ${Math.abs(valor).toFixed(2)} BRL in ${icone} ${categoria}\n`;
    } else {
        mensagem = `${nomeUsuario} spent ${Math.abs(valor).toFixed(2)} BRL on ${icone} ${categoria}\n`;
        mensagem += `${emojiMeio} Payment: ${meioPagamento === 'credito' ? 'Credit Card' : 'Debit'}\n`;
    }

    mensagem += `${dataFormatada}\n\n`;
    mensagem += `${descricao}\n\n`;
    mensagem += `💰 Account balance: ${saldoDebito.toFixed(2)} BRL (~${saldoDiario.toFixed(2)} BRL per day)\n`;
    mensagem += `💳 Credit card bill: ${Math.abs(saldoCredito).toFixed(2)} BRL\n`;
    mensagem += `Send /balanco to see detailed balance.`;

    await ctx.reply(mensagem);
});

// Inicializa o banco de dados
initDb().then(() => console.log("Banco de dados pronto!"));

// === WEBHOOK SETUP ===
const PORT = process.env.PORT || 8080;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Ex: https://seu-app.onrender.com

async function iniciarBot() {
    if (WEBHOOK_URL) {
        // Modo WEBHOOK (para produção no Render)
        console.log("🌐 Iniciando bot em modo WEBHOOK...");

        // IMPORTANTE: Inicializa o bot ANTES de configurar webhook e receber updates
        await bot.init();
        console.log("✅ Bot inicializado");

        // Configura o webhook
        await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`);
        console.log(`✅ Webhook configurado: ${WEBHOOK_URL}/webhook`);

        // Cria servidor HTTP
        const server = http.createServer(async (req, res) => {
            if (req.url === "/webhook" && req.method === "POST") {
                // Processa updates do Telegram
                try {
                    let body = "";
                    req.on("data", (chunk) => {
                        body += chunk.toString();
                    });
                    req.on("end", async () => {
                        try {
                            const update = JSON.parse(body);
                            await bot.handleUpdate(update);
                            res.writeHead(200);
                            res.end("OK");
                        } catch (error) {
                            console.error("Erro ao processar update:", error);
                            res.writeHead(500);
                            res.end("Error");
                        }
                    });
                } catch (error) {
                    console.error("Erro no webhook:", error);
                    res.writeHead(500);
                    res.end("Error");
                }
            } else if (req.url === "/" || req.url === "/health") {
                // Endpoint de health check
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("Bot Online ✅");
            } else {
                res.writeHead(404);
                res.end("Not Found");
            }
        });

        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });

        // Graceful shutdown
        process.on("SIGINT", async () => {
            console.log("\n🛑 Encerrando bot...");
            await bot.api.deleteWebhook();
            await fecharBanco();
            server.close();
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            console.log("\n🛑 Encerrando bot...");
            await bot.api.deleteWebhook();
            await fecharBanco();
            server.close();
            process.exit(0);
        });
    } else {
        // Modo POLLING (para desenvolvimento local)
        console.log("🔄 Iniciando bot em modo POLLING...");
        bot.start();

        process.on("SIGINT", async () => {
            console.log("\n🛑 Encerrando bot...");
            await fecharBanco();
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            console.log("\n🛑 Encerrando bot...");
            await fecharBanco();
            process.exit(0);
        });
    }
}

// Inicia o bot
iniciarBot().catch((error) => {
    console.error("❌ Erro ao iniciar bot:", error);
    process.exit(1);
});
