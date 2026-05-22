# CLAUDE.md

## Agents

Specialized agents live in `agents/`. Use them when work falls clearly in their domain:

| Agent | File | Use when |
|-------|------|----------|
| Architect | `agents/architect.md` | Planning features, evaluating trade-offs, structural decisions |
| Frontend | `agents/frontend.md` | UI components, search UX, streaming, performance |
| Backend | `agents/backend.md` | API routes, external API integration, caching |
| AI | `agents/ai.md` | Prompt design, query normalization, hallucination guardrails |
| Security | `agents/security.md` | Input validation, SSRF, rate limiting, secret management |
| Tester | `agents/tester.md` | Unit tests, integration tests, E2E, CI gates |
| DevOps | `agents/devops.md` | Vercel config, CI/CD, Sentry, deployments, rollback |

---

## Project Goal

Build a free-access automotive parts search engine for mechanics.

The platform:
- has no login
- has no internal inventory database
- uses external automotive APIs
- uses AI to normalize mechanic searches

Core priorities:
1. Low infrastructure cost
2. Fast search experience
3. Simplicity
4. Production readiness
5. Security

---

# Architecture

Frontend:
- Next.js
- TailwindCSS
- TypeScript

Backend:
- Next.js API routes

Deployment:
- Vercel

AI:
- OpenRouter
- Gemini

External APIs:
- NHTSA Vehicle API
- CarQuery API

Caching:
- in-memory initially

---

# Core Flow

User Search
→ AI normalization
→ External API search
→ Compatibility aggregation
→ Results UI

---

# Engineering Rules

Prefer:
- serverless
- stateless architecture
- edge caching
- lightweight dependencies

Avoid:
- databases initially
- Kubernetes
- microservices
- authentication systems

---

# Security Rules

All user input MUST:
- be validated
- sanitized
- rate limited

Prevent:
- prompt injection
- SSRF
- API abuse

Never expose:
- AI keys
- API secrets

---

# Performance Rules

Target:
- <2 second searches
- lightweight bundles
- minimal client JavaScript

Use:
- server components
- caching
- streaming UI

---

# AI Rules

AI is ONLY used for:
- parsing user intent
- normalizing automotive terminology

AI MUST NOT:
- hallucinate compatibility
- invent OEM codes

All compatibility must come from external data sources.

---

# Production Requirements

Must support:
- serverless deployment
- CDN caching
- rate limiting
- error monitoring

Deployment:
- Vercel

Monitoring:

- Sentry

---

# Scaling Strategy

Start:
- no database
- no auth
- no inventory

Scale later with:
1. Redis
2. PostgreSQL
3. Search engine
4. Supplier integrations

---

# Localization

Target audience: **Brazilian mechanics (pt-BR)**.

## Language

- UI language: Portuguese (Brazil)
- HTML lang: `pt-BR`
- All user-facing strings must be in Portuguese
- AI prompt instructs Gemini to normalize part names to Brazilian Portuguese terminology

## AI — Brazilian context

The AI prompt must:
- Accept queries in Portuguese and English
- Normalize part names to pt-BR terms (e.g. "pastilha de freio", "amortecedor", "vela de ignição")
- Recognize Brazilian slang: "buzina", "retrovisor", "coxim", "bengala" (CV axle), "tensor"
- Know Brazilian-market models: Onix, HB20, Gol, Uno, Sandero, Kwid, Argo, Mobi, Compass, Tracker, T-Cross, Creta, Pulse, Cronos

## Suppliers

Brazilian suppliers used in the PartCard dropdown (in priority order):

| Supplier | URL pattern |
|---|---|
| Mercado Livre | `https://lista.mercadolivre.com.br/{query}` |
| Amazon Brasil | `https://www.amazon.com.br/s?k={query}` |
| Shopee | `https://shopee.com.br/search?keyword={query}` |
| Magazine Luiza | `https://www.magazineluiza.com.br/busca/{query}/` |
| Americanas | `https://www.americanas.com.br/busca/{query}` |

Do NOT add US-only suppliers (AutoZone, O'Reilly, RockAuto).

## Tutorial links

YouTube and Google searches use Portuguese phrasing:
- YouTube: `como trocar {peça} {veículo}`
- Google: `como trocar {peça} {veículo}` on google.com.br