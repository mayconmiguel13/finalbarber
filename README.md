# Barber.ia — Plataforma SaaS + Fintech para Barbearias

Plataforma completa de gestão, agendamento conversacional com IA via WhatsApp, PWA de alta conversão e divisão financeira em conformidade com a **Lei do Salão-Parceiro (Lei nº 13.352/2016)**.

---

## 🏗️ Estrutura do Projeto

```text
d:\barber\
├── apps/
│   ├── api/             # Backend em Node.js (Fastify + TypeScript + Prisma)
│   ├── web-admin/       # Painel do Dono e Gestão (Vue 3 + Vite + Tailwind + Pinia)
│   └── web-client/      # PWA Mobile-first para Clientes (em breve)
├── packages/
│   └── database/        # Schema mestre do Prisma & Migrações MySQL
├── package.json         # Scripts de orquestração do projeto
└── README.md
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js v20+ ou superior
* MySQL 8+ ativo (ou Docker container)

### 1. Backend (`apps/api`)
```bash
# Entrar no diretório e iniciar em modo de desenvolvimento
npm run dev:api
```
* O servidor iniciará em `http://localhost:3333`.
* Rotas disponíveis:
  * `GET /health` — Status da API
  * `GET /api/appointments/today` — Lista de agendamentos e status
  * `POST /api/appointments` — Criação de agendamento com cálculo de split automático
  * `GET /api/metrics/dashboard` — Métricas de faturamento, no-show e produtividade
  * `GET /api/settings/:orgId` — Configurações da barbearia (tema, cores e desconto)

### 2. Painel Administrativo (`apps/web-admin`)
```bash
# Iniciar o frontend Vue 3 com Vite
npm run dev:admin
```
* O painel abrirá em `http://localhost:5173`.
* **Rotas do Painel:**
  * `/` — Dashboard Operacional (baseado nas referências visuais com cards e timeline)
  * `/settings` — Configurações de Cores da Marca (Dourado Imperial, Azul Cobalto, Esmeralda, Bronze), alternância Light/Dark e calibração do desconto anti-falta via Pix.

---

## 💡 Recursos-Chave Implementados

1. **Incentivo de Pagamento Online (Anti No-Show):**
   * Configuração de 10% OFF (ou valor fixo) no Pix/App para garantir o recebimento antecipado e reduzir faltas para zero.
2. **Motor de Split da Lei do Salão-Parceiro:**
   * Cálculo automatizado da cota-parte da Barbearia vs cota-parte do Barbeiro MEI, retendo na fonte a taxa de intermediação da sua plataforma SaaS.
3. **Identidade Visual Customizável (White-Label):**
   * Seletor de cores da marca integrado ao tema Dark/Light na tela de configurações.
