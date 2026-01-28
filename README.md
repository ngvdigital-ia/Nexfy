# NexFy - Plataforma de Pagamentos

Gateway de pagamento multi-provedor com area de membros, dashboard para infoprodutores e painel admin.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript (strict)
- **Banco**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Auth**: NextAuth v5 (Credentials + JWT)
- **Email**: Resend
- **Pagamentos**: Mercado Pago, Efi, PushinPay, Beehive, Hypercash, Stripe
- **UI**: Tailwind CSS + Recharts
- **Deploy**: Vercel Pro

## Setup Local

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Copiar variaveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# Rodar em desenvolvimento
npm run dev

# Build de producao
npm run build
```

## Variaveis de Ambiente

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase) |
| `AUTH_SECRET` | Secret para NextAuth (gerar com `openssl rand -base64 32`) |
| `AUTH_URL` | URL da aplicacao |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave publica do Stripe |
| `RESEND_API_KEY` | API key do Resend para envio de emails |
| `CRON_SECRET` | Secret para proteger endpoints de cron |
| `NEXT_PUBLIC_APP_URL` | URL publica da aplicacao |

## Estrutura de Rotas

### Publicas
- `/login` - Login
- `/checkout/[hash]` - Checkout publico
- `/obrigado/[transactionId]` - Pagina de obrigado

### Dashboard (Infoprodutor)
- `/dashboard` - KPIs, graficos, vendas recentes
- `/dashboard/products` - CRUD de produtos
- `/dashboard/sales` - Lista de vendas + reembolso
- `/dashboard/coupons` - CRUD de cupons
- `/dashboard/settings` - Gateways, webhooks

### Admin
- `/admin` - KPIs globais, top sellers
- `/admin/users` - Gerenciamento de usuarios
- `/admin/reports` - Relatorios por gateway/metodo/produto
- `/admin/settings` - Config da plataforma

### Area de Membros (Aluno)
- `/member` - Cursos adquiridos
- `/member/course/[courseId]` - Visualizador de curso (video + modulos)
- `/member/progress` - Progresso geral
- `/member/profile` - Perfil do aluno

### APIs
- `/api/payments/create` - Processar pagamento
- `/api/payments/status` - Consultar status
- `/api/payments/refund` - Reembolso
- `/api/payments/stripe-intent` - Criar Payment Intent (Stripe Elements)
- `/api/webhooks/[gateway]` - Webhooks dinamicos por gateway
- `/api/coupons/validate` - Validar cupom
- `/api/cron/cart-recovery` - Cron de recuperacao de carrinho

## Gateways

| Gateway | PIX | Cartao | Boleto |
|---------|-----|--------|--------|
| Mercado Pago | OK | OK | OK |
| Efi | OK | OK | - |
| PushinPay | OK | - | - |
| Beehive | - | OK | - |
| Hypercash | - | OK | - |
| Stripe | - | OK (Elements) | - |

## Anti-Chargeback

- **Stripe Radar**: ML automatico (incluso no Stripe)
- **Validacao interna**: CPF, email descartavel, rate limiting
- **ClearSale** (opcional): Score de risco para cartao BR
- Documentacao em `src/lib/anti-chargeback/index.ts`

## Deploy na Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configurar variaveis de ambiente no dashboard da Vercel.

O `vercel.json` ja inclui o cron de cart recovery (a cada 30 min).

## Banco de Dados

24 tabelas no Supabase (PostgreSQL):
- `users`, `products`, `product_offers`, `order_bumps`, `coupons`
- `transactions`, `entitlements`, `refunds`
- `cart_recovery`, `webhook_logs`, `notifications`
- `courses`, `modules`, `lessons`, `lesson_files`, `student_progress`
- `saas_config`, `saas_plans`, `saas_subscriptions`, `saas_monthly_counters`
- `webhooks`, `utmfy_integrations`, `starfy_tracking_products`, `email_queue`

Schema completo em `src/lib/db/schema.ts`.
