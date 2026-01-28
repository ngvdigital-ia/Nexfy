# Checklist de Ativacao - NexFy

**Data:** 28/01/2026
**URL:** https://nexfy-three.vercel.app

---

## 1. O QUE ESTA FUNCIONANDO

### Infraestrutura
- [x] Aplicacao deployada na Vercel
- [x] Banco de dados Supabase conectado
- [x] Autenticacao NextAuth funcionando
- [x] Rotas protegidas por middleware
- [x] SSL/HTTPS ativo

### Paginas
- [x] Landing page
- [x] Login/Logout
- [x] Termos de Uso / Privacidade
- [x] Dashboard Infoprodutor
- [x] Painel Administrativo
- [x] Area de Membros
- [x] Checkout publico

### Funcionalidades
- [x] CRUD de produtos
- [x] CRUD de cupons
- [x] Listagem de vendas
- [x] Listagem de membros
- [x] Relatorios administrativos
- [x] Mascaras de CPF e telefone
- [x] Timer countdown no checkout
- [x] Validacao de cupom em tempo real

---

## 2. O QUE PRECISA SER CONFIGURADO (OBRIGATORIO)

### 2.1 Variaveis de Ambiente no Vercel

Acesse: https://vercel.com → Projeto NexFy → Settings → Environment Variables

| Variavel | Status | Acao |
|----------|--------|------|
| `DATABASE_URL` | Configurado | Verificar se conexao esta OK |
| `AUTH_SECRET` | Configurado | Ja funciona (login OK) |
| `STRIPE_SECRET_KEY` | **VERIFICAR** | Adicionar chave live (sk_live_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **VERIFICAR** | Adicionar chave publica (pk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | **CONFIGURAR** | Copiar do Stripe Dashboard (whsec_...) |
| `UTMIFY_API_KEY` | **CONFIGURAR** | Obter no painel UTMify |
| `RESEND_API_KEY` | **CONFIGURAR** | Obter no painel Resend |
| `CRON_SECRET` | **CONFIGURAR** | Gerar string aleatoria |

**Como gerar CRON_SECRET:**
```bash
openssl rand -base64 32
```

### 2.2 Configuracao do Stripe

#### Passo 1: Webhook no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **"Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://nexfy-three.vercel.app/api/webhooks/stripe`
   - **Events:** Selecione:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
     - `charge.dispute.created`
4. Copie o **Signing secret** (whsec_...)
5. Adicione como `STRIPE_WEBHOOK_SECRET` no Vercel

#### Passo 2: Apple Pay Domain Verification

1. Acesse: https://dashboard.stripe.com/settings/payment_methods
2. Na secao **Apple Pay**, clique em **"Add new domain"**
3. Adicione: `nexfy-three.vercel.app`
4. Siga as instrucoes para verificar o dominio

**Nota:** Sem esta configuracao, Apple Pay/Google Pay nao aparecerao no checkout.

#### Passo 3: Ativar Modo Live

1. Certifique-se de que sua conta Stripe esta ativada (nao em modo revisao)
2. Use chaves `sk_live_` e `pk_live_` em producao
3. Desative modo teste quando estiver pronto

### 2.3 Configuracao UTMify

1. Acesse seu painel UTMify
2. Va em **Configuracoes → API**
3. Copie a **API Key**
4. Adicione como `UTMIFY_API_KEY` no Vercel

### 2.4 Configuracao Resend (Emails)

1. Acesse: https://resend.com/api-keys
2. Crie uma nova API key
3. Adicione como `RESEND_API_KEY` no Vercel
4. (Opcional) Verifique seu dominio para envio de emails

---

## 3. VERIFICACAO POS-CONFIGURACAO

### 3.1 Testar Fluxo de Pagamento

1. Acesse `/dashboard/products/new`
2. Crie um produto de teste com preco R$ 1,00
3. Acesse o checkout do produto
4. Preencha os dados pessoais
5. Selecione **Cartao**
6. Use cartao de teste Stripe: `4242 4242 4242 4242`
7. Verifique se:
   - [ ] Payment Intent e criado
   - [ ] Pagamento e aprovado
   - [ ] Webhook e recebido
   - [ ] Venda aparece no dashboard

### 3.2 Testar Webhook

1. Realize um pagamento de teste
2. Acesse: https://dashboard.stripe.com/webhooks
3. Verifique se o webhook foi recebido com status 200
4. Verifique nos logs do Vercel se foi processado

### 3.3 Testar UTMify

1. Realize uma venda
2. Acesse seu painel UTMify
3. Verifique se a venda apareceu

### 3.4 Testar Emails

1. Realize uma venda aprovada
2. Verifique se email de boas-vindas foi enviado
3. Verifique logs do Resend

---

## 4. CONFIGURACOES OPCIONAIS

### 4.1 Dominio Personalizado

1. Acesse Vercel → Settings → Domains
2. Adicione seu dominio (ex: checkout.seusite.com)
3. Configure DNS conforme instrucoes
4. Atualize `NEXT_PUBLIC_APP_URL` e `AUTH_URL`

### 4.2 Monitoramento de Erros (Sentry)

1. Crie conta em sentry.io
2. Instale: `npm install @sentry/nextjs`
3. Configure conforme documentacao
4. Adicione `SENTRY_DSN` no Vercel

### 4.3 Outros Gateways

Os gateways alternativos podem ser configurados em:
`/dashboard/settings/gateways`

| Gateway | Credenciais Necessarias |
|---------|------------------------|
| Mercado Pago | Access Token |
| Efi | Client ID, Client Secret, Certificado P12 |
| PushinPay | API Key |
| Beehive | API Key |
| Hypercash | API Key |

---

## 5. SEGURANCA (CRITICO)

### 5.1 Verificar Chaves Expostas

- [ ] Chaves Stripe **NUNCA** devem estar no codigo-fonte
- [ ] Verificar se `.env` esta no `.gitignore`
- [ ] Verificar se nenhuma chave esta hardcoded

### 5.2 Rotacionar Chaves (Se Necessario)

Se alguma chave foi exposta em chat ou commit:
1. Acesse o dashboard do provedor (Stripe, Resend, etc)
2. Gere novas chaves
3. Atualize no Vercel
4. Invalide as chaves antigas

### 5.3 Backup do Banco

Configure backup automatico no Supabase:
1. Acesse: Supabase → Project Settings → Database
2. Verifique se Point-in-Time Recovery esta ativo

---

## 6. RESUMO RAPIDO

### Antes de Usar em Producao:

```
OBRIGATORIO:
[ ] STRIPE_SECRET_KEY (sk_live_...)
[ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)
[ ] STRIPE_WEBHOOK_SECRET (whsec_...)
[ ] Webhook configurado no Stripe Dashboard
[ ] Dominio Apple Pay verificado (para Apple Pay funcionar)

RECOMENDADO:
[ ] UTMIFY_API_KEY (para rastreamento)
[ ] RESEND_API_KEY (para emails)
[ ] CRON_SECRET (para recuperacao de carrinho)

OPCIONAL:
[ ] Dominio personalizado
[ ] Sentry para monitoramento
[ ] Gateways alternativos
```

---

## 7. SUPORTE

### Documentacao
- Stripe: https://stripe.com/docs
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Resend: https://resend.com/docs

### Logs
- Vercel Functions: https://vercel.com/[projeto]/functions
- Stripe Webhooks: https://dashboard.stripe.com/webhooks
- Supabase Logs: https://supabase.com/dashboard/project/[ref]/logs

---

**Ultima atualizacao:** 28/01/2026
