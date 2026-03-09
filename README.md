# BaT Signal

Real-time BMW 2002 auction monitoring, price prediction, and bidding intelligence platform.

## Architecture

| Service | Platform | Tech |
|---------|----------|------|
| Backend & Database | **Convex** | Schema, server functions, real-time sync |
| Scraper | **Railway** | Node.js, Playwright, node-cron |
| ML / Predictions | **Railway** | Python, FastAPI, XGBoost |
| Frontend | **Vercel** | React 18, Vite, TypeScript |

```
Scraper (Railway) ──POST──▶ Convex HTTP Actions ──▶ Database
                                    │
Convex ──HTTP──▶ ML Service (Railway) ──▶ Predictions
                                    │
Frontend (Vercel) ◀──real-time──▶ Convex React Hooks
```

## Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- npm 10+
- Accounts on: [Convex](https://convex.dev), [Railway](https://railway.app), [Vercel](https://vercel.com)

### 1. Install dependencies
```bash
npm install                     # Root + workspaces (frontend, scraper)
cd ml && pip install -r requirements.txt
```

### 2. Authenticate CLIs
```bash
npx convex login               # Convex
npm install -g @railway/cli && railway login   # Railway
npm install -g vercel && vercel login          # Vercel
```

### 3. Initialize Convex
```bash
npx convex dev                  # Creates project, deploys schema, starts dev server
# Set environment variables:
npx convex env set SCRAPER_SECRET "$(openssl rand -hex 32)"
npx convex env set ML_SERVICE_URL "https://your-ml-service.up.railway.app"
```

### 4. Run locally
```bash
# Terminal 1: Convex dev server
npm run dev:convex

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Scraper (optional — needs Playwright browsers)
npm run dev:scraper

# Terminal 4: ML service
cd ml && uvicorn app.main:app --reload --port 8001
```

### 5. Deploy
```bash
# Convex (production)
npx convex deploy

# Railway (scraper + ML)
cd scraper && railway up
cd ml && railway up

# Vercel (frontend)
cd frontend && vercel --prod
```

## Project Structure

```
├── convex/           # Convex backend (schema, functions, HTTP actions)
├── frontend/         # React + Vite frontend (deployed to Vercel)
├── scraper/          # Playwright scraper (deployed to Railway)
├── ml/               # Python ML service (deployed to Railway)
└── scripts/          # Admin helper scripts
```
