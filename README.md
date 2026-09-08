# Trader Command Center

Production-oriented Next.js market intelligence dashboard.

## Stack
- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Recharts v3
- Lucide React

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm start
```

## Environment
Copy `.env.example` and configure U.S. market-data keys as needed. Binance public market data works without API keys where network access is available.

## Deployment
Import this repository into Vercel with:
- Framework: Next.js
- Root Directory: `./`
- Production Branch: `main`

No legacy HTML rewrites are used.
