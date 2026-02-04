import "dotenv/config";
import { Bot, InputFile } from "grammy";
import Groq from "groq-sdk";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
    initDb,
    adicionarTransacao,
    buscarTransacoesDoMes,
    buscarSaldoTotal,
    buscarUltimaTransacao,
    deletarTransacao,
    fecharBanco,
} from "./db.js";

const bot = new Bot(process.env.BOT_TOKEN!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuração do Chart.js
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: 800,
    height: 600,
    backgroundColour: "white",
    plugins: {
        modern: [ChartDataLabels],
    },
});

function obterIconeCategoria(categoria: string): string {
    const icones: Record<string, string> = {
        Alimentação: "🍔",
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
                    content: `Classifique em: [Alimentação, Transporte, Lazer, Saúde, Educação, Contas, Roupas/Beleza, Salário, Investimentos, Outros]. Responda APENAS a categoria.`,
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

    // 2. Agrupa por Categoria (Lógica JS continua útil aqui)
    const porCategoria = transacoesMes.reduce(
        (acc: Record<string, number>, t: any) => {
            if (!acc[t.categoria]) acc[t.categoria] = 0;
            acc[t.categoria] += t.valor;
            return acc;
        },
        {} as Record<string, number>,
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

    if (Object.keys(saidas).length > 0) {
        relatorio += `❤️ *SAÍDAS:*\n`;
        for (const [cat, valor] of Object.entries(saidas)) {
            const icone = obterIconeCategoria(cat);
            relatorio += `${icone} *${cat}:* R$ -${valor.toFixed(2)}\n`;
        }
    }

    // 4. Saldo Total (Geral, não só do mês)
    const saldoTotal = await buscarSaldoTotal();
    relatorio += `\n💰 *Saldo Acumulado: R$ ${saldoTotal.toFixed(2)}*`;

    await ctx.reply(relatorio, { parse_mode: "Markdown" });

    // 5. Gera e envia gráfico de pizza
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

    // Deleta a transação
    await deletarTransacao(ultimaTransacao.id);

    // Busca saldo atualizado
    const saldoAtualizado = await buscarSaldoTotal();

    await ctx.reply(
        `🗑️ *Transação deletada com sucesso!*\n\n` +
            `${icone} ${ultimaTransacao.categoria}: R$ ${tipo === "entrada" ? "+" : "-"}${valor.toFixed(2)}\n` +
            `📝 ${ultimaTransacao.descricao}\n\n` +
            `💰 Novo saldo: R$ ${saldoAtualizado.toFixed(2)}`,
        { parse_mode: "Markdown" },
    );
});

// --- OUVINTE DE MENSAGENS ---
const regexFinanceiro = /^([+-]?\d+(?:[.,]\d+)?)\s+(.+)$/;

bot.hears(regexFinanceiro, async (ctx) => {
    await ctx.replyWithChatAction("typing");

    const rawNumber = ctx.match![1]!.replace(",", ".");
    const descricao = ctx.match![2]!;

    let valor = parseFloat(rawNumber);
    const isEntrada = rawNumber.includes("+");

    if (!isEntrada && !rawNumber.includes("-")) {
        valor = -Math.abs(valor);
    }

    const categoria = isEntrada
        ? "Salário"
        : await classificarGastoComGroq(descricao);

    // --- AQUI A MUDANÇA: SALVA NO BANCO ---
    await adicionarTransacao(descricao, categoria, valor);

    // Busca saldo atualizado direto do banco
    const saldoAtual = await buscarSaldoTotal();

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

    // Calcular saldo diário
    const saldoDiario = diasRestantes > 0 ? saldoAtual / diasRestantes : 0;

    // Obter nome do usuário
    const nomeUsuario = ctx.from?.first_name || "Você";

    // Obter ícone da categoria
    const icone = obterIconeCategoria(categoria);

    // Montar mensagem
    let mensagem = "";

    if (isEntrada) {
        mensagem = `${nomeUsuario} received ${Math.abs(valor).toFixed(2)} BRL in ${icone} ${categoria}\n`;
    } else {
        mensagem = `${nomeUsuario} spent ${Math.abs(valor).toFixed(2)} BRL on ${icone} ${categoria}\n`;
    }

    mensagem += `${dataFormatada}\n\n`;
    mensagem += `${descricao}\n\n`;
    mensagem += `👛 Remaining ${mes} balance is ${saldoAtual.toFixed(2)} BRL (~${saldoDiario.toFixed(2)} BRL per day)\n`;
    mensagem += `Send /balanco to see detailed balance.`;

    await ctx.reply(mensagem);
});

initDb().then(() => console.log("Banco de dados pronto!"));

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
