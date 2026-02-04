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

## 🚀 Instalação

### 1. Clone e instale dependências
```bash
npm install
```

### 2. Configure variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
BOT_TOKEN=seu_token_do_botfather
GROQ_API_KEY=sua_chave_groq
```

### 3. Compile o TypeScript
```bash
npx tsc
```

### 4. Execute o bot
```bash
node bot.js
```

## 📦 Dependências

- **grammy**: Framework para bots do Telegram
- **groq-sdk**: IA para classificação de gastos
- **better-sqlite3**: Banco de dados local
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

O bot utiliza SQLite (`financeiro.db`) para armazenar:
- Descrição da transação
- Categoria (classificada por IA)
- Valor (positivo para entradas, negativo para saídas)
- Data e hora do registro

## 🎨 Recursos Visuais

- ✅ Ícones específicos para cada categoria no relatório
- 📊 Gráfico de pizza colorido com distribuição de gastos
- 📈 **Porcentagens visíveis**: Cada fatia do gráfico mostra sua porcentagem
- 💚❤️ Separação visual entre entradas e saídas
- 🎨 Cores vibrantes no gráfico para melhor visualização
- 📋 Legenda limpa no gráfico (apenas nomes das categorias, sem ícones)

## 🔒 Segurança

- API Keys em arquivo `.env` (não versionado)
- Banco de dados local (SQLite)
- Graceful shutdown para preservar dados
- Comando `/delete` remove apenas a última transação (segurança contra exclusões acidentais)

## 📝 Notas

- O gráfico de pizza mostra apenas as **saídas** para visualizar onde você está gastando
- O saldo acumulado considera todas as transações (entradas e saídas)
- A classificação por IA funciona em português e entende contexto

## 🛠️ Tecnologias

- **TypeScript**: Tipagem estática
- **Node.js**: Runtime
- **Telegram Bot API**: Interface
- **Groq LLaMA 3.3**: IA para classificação
- **Chart.js**: Visualização de dados

---

Desenvolvido com ❤️ para facilitar seu controle financeiro!
