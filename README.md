# 🤖 Bot Financeiro Telegram

Bot inteligente para controle financeiro pessoal com classificação automática de gastos usando IA e visualização de dados.

## 📋 Funcionalidades

### 💰 Registro de Transações
- **Formato simples**: Digite valores com descrição
  - Saídas: `50 Pizza` ou `-50 Pizza`
  - Entradas: `+2000 Salário`
- **Classificação Automática**: IA classifica seus gastos automaticamente em categorias

### 📊 Balanço Mensal (`/balanco`)
- Relatório completo com ícones por categoria
- Separação visual entre entradas 💚 e saídas ❤️
- **Gráfico de Pizza**: Visualização gráfica da distribuição dos gastos
- **Porcentagens no gráfico**: Cada fatia mostra sua porcentagem em relação ao total
- Saldo acumulado total

### 🗑️ Deletar Transação (`/delete`)
- Remove a última transação registrada
- Mostra detalhes da transação deletada
- Atualiza o saldo automaticamente

### 🏷️ Categorias com Ícones

| Categoria | Ícone | Tipo |
|-----------|-------|------|
| Alimentação | 🍔 | Saída |
| Transporte | 🚗 | Saída |
| Lazer | 🎮 | Saída |
| Saúde | 💊 | Saída |
| Educação | 📚 | Saída |
| Contas | 📄 | Saída |
| Roupas/Beleza | ✂️ | Saída |
| Salário | 💰 | Entrada |
| Investimentos | 📈 | Entrada |
| Outros | 📦 | Ambos |

## 🚀 Instalação e Deploy

### Desenvolvimento Local

#### 1. Clone e instale dependências
```bash
git clone https://github.com/seu-usuario/MyBotTelegram.git
cd MyBotTelegram
npm install
```

#### 2. Configure variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
BOT_TOKEN=seu_token_do_botfather
GROQ_API_KEY=sua_chave_groq
DATABASE_URL=postgresql://usuario:senha@localhost:5432/financeiro
```

#### 3. Compile o TypeScript
```bash
npx tsc
```

#### 4. Execute o bot
```bash
node bot.js
```

### Deploy em Produção (Render + Supabase)

#### 1. Configure o Banco de Dados no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Aguarde a criação do banco PostgreSQL
3. Vá em **Settings** → **Database**
4. Copie a **Connection String** (URI mode)

#### 2. Deploy no Render
1. Acesse [render.com](https://render.com) e conecte seu repositório GitHub
2. Crie um novo **Web Service**
3. Configure:
   - **Build Command**: `npm install && npx tsc`
   - **Start Command**: `node bot.js`
4. Adicione as variáveis de ambiente:
   - `BOT_TOKEN`: Token do BotFather
   - `GROQ_API_KEY`: Chave da API Groq
   - `DATABASE_URL`: Connection string do Supabase

#### 3. Deploy Automático
- Cada push na branch `main` fará deploy automático
- O Render executará graceful shutdown ao reiniciar (SIGTERM)
- O banco PostgreSQL do Supabase é persistente

## 📦 Dependências

- **grammy**: Framework para bots do Telegram
- **groq-sdk**: IA para classificação de gastos (LLaMA 3.3)
- **pg**: Cliente PostgreSQL para Node.js
- **chartjs-node-canvas**: Geração de gráficos
- **chartjs-plugin-datalabels**: Porcentagens no gráfico
- **dotenv**: Gerenciamento de variáveis de ambiente

## 🎯 Exemplos de Uso

### Registrar Gastos
```
50 Almoço no restaurante
→ João spent 50.00 BRL on 🍔 Alimentação
  13 January 2026, Tuesday

  Almoço no restaurante

  👛 Remaining January balance is 1950.00 BRL (~105.14 BRL per day)
  Send /balanco to see detailed balance.
```

### Registrar Entrada
```
+2000 Salário
→ João received 2000.00 BRL in 💰 Salário
  13 January 2026, Tuesday

  Salário

  👛 Remaining January balance is 2000.00 BRL (~108.11 BRL per day)
  Send /balanco to see detailed balance.
```

### Deletar Última Transação
```
/delete
→ 🗑️ Transação deletada com sucesso!

  🍔 Alimentação: R$ -50.00
  📝 Almoço no restaurante

  💰 Novo saldo: R$ 1950.00
```

### Ver Balanço
```
/balanco
→ 📊 Balanço de janeiro

  💚 ENTRADAS:
  💰 Salário: R$ 2000.00

  ❤️ SAÍDAS:
  🍔 Alimentação: R$ -150.00
  🚗 Transporte: R$ -80.00
  🎮 Lazer: R$ -50.00

  💰 Saldo Acumulado: R$ 1720.00

  [Gráfico de Pizza com porcentagens em cada fatia]
  Alimentação: 45.5%
  Transporte: 30.3%
  Lazer: 24.2%
  
  📊 Gráfico de distribuição dos seus gastos
```

## 🗄️ Banco de Dados

O bot utiliza **PostgreSQL** (via Supabase em produção) com a seguinte estrutura:

### Tabela `transacoes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL | ID único (auto-incremento) |
| `data` | TIMESTAMP | Data e hora da transação |
| `descricao` | TEXT | Descrição fornecida pelo usuário |
| `categoria` | TEXT | Categoria classificada pela IA |
| `valor` | DECIMAL(10,2) | Valor (positivo=entrada, negativo=saída) |
| `tipo` | TEXT | "Entrada" ou "Saída" |

### Inicialização
- A tabela é criada automaticamente na primeira execução
- Função `initDb()` executa antes do bot iniciar
- Connection pooling gerenciado pelo pacote `pg`

## 🎨 Recursos Visuais

- ✅ Ícones específicos para cada categoria no relatório
- 📊 Gráfico de pizza colorido com distribuição de gastos
- 📈 **Porcentagens visíveis**: Cada fatia do gráfico mostra sua porcentagem
- 💚❤️ Separação visual entre entradas e saídas
- 🎨 Cores vibrantes no gráfico para melhor visualização
- 📋 Legenda limpa no gráfico (apenas nomes das categorias, sem ícones)

## 🔒 Segurança

- ✅ API Keys em arquivo `.env` (não versionado)
- ✅ Banco de dados PostgreSQL gerenciado (Supabase)
- ✅ Connection string segura via variável de ambiente
- ✅ Graceful shutdown (SIGINT/SIGTERM) para fechar conexões
- ✅ Pool de conexões gerenciado automaticamente
- ✅ Comando `/delete` remove apenas a última transação

## 📝 Notas Técnicas

- O gráfico de pizza mostra apenas as **saídas** para visualizar onde você está gastando
- O saldo acumulado considera todas as transações (entradas e saídas)
- A classificação por IA funciona em português e entende contexto
- Todas as operações de banco são **async/await** (PostgreSQL)
- O bot usa **long polling** do Grammy (compatível com Render)

## 🛠️ Stack Tecnológica

- **TypeScript**: Tipagem estática e desenvolvimento moderno
- **Node.js**: Runtime JavaScript
- **PostgreSQL**: Banco de dados relacional robusto
- **Supabase**: PostgreSQL gerenciado com backups automáticos
- **Render**: Plataforma de deploy com CI/CD
- **Telegram Bot API**: Interface do usuário
- **Groq LLaMA 3.3 70B**: IA para classificação inteligente
- **Chart.js**: Visualização de dados profissional

## 🚨 Troubleshooting

### Erro de conexão com PostgreSQL
- Verifique se a `DATABASE_URL` está correta
- Teste a conexão: `psql $DATABASE_URL`
- No Supabase, use a Connection String no modo "Session" ou "Transaction"

### Bot não responde
- Verifique se o `BOT_TOKEN` está correto
- Teste o token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
- Verifique os logs no Render

### IA não classifica corretamente
- Verifique se `GROQ_API_KEY` está configurada
- Descrições mais detalhadas melhoram a classificação
- Exemplo: "Pizza Hut" > "comida"

---

Desenvolvido com ❤️ para facilitar seu controle financeiro!
