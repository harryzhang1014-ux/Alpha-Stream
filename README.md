# Alpha-Stream

Alpha-Stream is an interactive equity analysis dashboard built for the ACC102 individual project. It combines market price data, simple technical indicators, and a lightweight valuation workflow to help users explore whether a stock appears undervalued or overvalued.

The project uses a React + Vite frontend for the dashboard experience and a FastAPI backend for market data aggregation. The backend tries multiple sources in sequence so the app remains usable even when one provider is unavailable.

## Features

- Search and analyze common stock tickers such as `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `NVDA`, `META`, `TSLA`, and `JPM`
- Visualize historical price series with moving-average overlays
- Adjust valuation assumptions including:
  - `SMA` period
  - `LMA` period
  - terminal growth rate
  - `WACC`
- Generate a rule-based report that summarizes:
  - valuation signal
  - risk level from Beta
  - trend interpretation
  - DCF-style intrinsic value estimate
- Fall back across multiple market data providers when the primary source fails
- Cache recent responses on the backend to reduce provider errors and rate-limit friction

## Project Structure

```text
.
├── backend/                # FastAPI service for stock and benchmark data
│   ├── main.py
│   ├── requirements.txt
│   └── fallback_data.json
├── src/
│   ├── app/
│   │   ├── components/     # Dashboard UI components
│   │   └── services/       # Frontend market data request layer
│   └── styles/             # Theme and styling files
├── guidelines/             # Project/course guidelines
├── package.json
├── vite.config.ts
├── vercel.json
└── README.md
```

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Radix UI
- Recharts
- Lucide React

### Backend

- FastAPI
- Uvicorn
- yfinance
- requests

## How It Works

### Frontend workflow

The frontend lets the user choose a ticker, modify model assumptions, and trigger a new analysis. It requests stock data from the backend, computes moving averages, estimates Beta against a market benchmark, derives a simple intrinsic value from free cash flow inputs, and renders a dashboard plus a compact AI-style report card.

### Backend data pipeline

The backend exposes `GET /api/stock/{ticker}` and attempts to fetch data in the following order:

1. `yfinance`
2. `Alpha Vantage` if an API key is provided
3. `Stooq` as a fallback for price series
4. cached data if a recent successful response exists

This design makes the app more resilient when one provider is unavailable, rate-limited, or missing a free endpoint.

## Local Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
pip3 install -r requirements.txt
```

### 3. Start the backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

If `uvicorn` is not available in your shell path, you can run it with the full Python user binary path, for example:

```bash
/Users/harry/Library/Python/3.12/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Start the frontend

From the project root:

```bash
npm run dev -- --host 0.0.0.0 --port 4173
```

The frontend will usually be available at:

- `http://localhost:4173`

The backend API will usually be available at:

- `http://localhost:8000`

## Environment Notes

The frontend reads the backend base URL from `VITE_API_BASE_URL`. If this variable is not provided, it defaults to:

```text
http://localhost:8000
```

Example:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 4173
```

## API Key Usage

You can optionally enter an `Alpha Vantage API Key` in the sidebar.

- Without a key, the app mainly relies on `yfinance`
- If `yfinance` fails and no key is provided, only `MSFT` can use the Alpha Vantage `demo` path
- With a valid key, tickers such as `AAPL` can more reliably retrieve data through Alpha Vantage fallback

## API Endpoint

### `GET /api/stock/{ticker}`

Returns:

```json
{
  "prices": [{ "date": "2026-01-01", "close": 123.45 }],
  "marketPrices": [{ "date": "2026-01-01", "close": 5678.9 }],
  "latestFcf": 1000000000,
  "sharesOutstanding": 100000000,
  "source": "yfinance"
}
```

### Query parameter

- `av_key`: optional Alpha Vantage API key

Example:

```text
/api/stock/AAPL?av_key=YOUR_KEY
```

## Core Metrics Used

- `SMA`: short moving average for recent trend direction
- `LMA`: long moving average for broader trend context
- `Beta`: estimated by comparing aligned stock returns with market benchmark returns
- `FCF per share`: derived from backend free cash flow and share count data
- `Intrinsic value`: estimated with a simplified perpetual-growth valuation formula

## Known Limitations

- This is an educational project, not investment advice
- The valuation model is intentionally simplified and should not be treated as a full institutional DCF
- Data quality depends on third-party providers and their free-tier constraints
- Some fallback paths use estimated or reduced fundamentals when full data is unavailable
- Market data access may temporarily fail due to rate limits or provider restrictions

## Suggested Demo Flow

1. Start both backend and frontend
2. Open the dashboard in the browser
3. Try `MSFT` first if you do not have an Alpha Vantage key
4. Adjust `SMA`, `LMA`, growth, and `WACC`
5. Click `Run AI Analysis`
6. Compare current price, intrinsic value, Beta, and the generated recommendation

## Future Improvements

- Add portfolio-level multi-asset comparison
- Add exportable analysis reports
- Add more robust authentication and API key management
- Support additional data providers and retry strategies
- Improve valuation models beyond the current perpetual-growth approximation

## Attribution

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party attribution details.
