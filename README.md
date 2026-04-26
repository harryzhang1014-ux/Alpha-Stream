# Alpha-Stream

## FinTech Dashboard Design

## Running the code

1. 前端依赖安装
```bash
npm i
```

2. 启动后端（必须）
```bash
cd backend
pip3 install -r requirements.txt
/Users/harry/Library/Python/3.12/bin/uvicorn main:app --port 8000 --host 0.0.0.0
```

3. 启动前端
```bash
npm run dev -- --host 0.0.0.0 --port 4173
```

说明：
- 后端优先使用 yfinance。
- 若 yfinance 失败，会自动切换 Alpha Vantage。
- 你可以在左侧面板填入 Alpha Vantage API Key 以确保 AAPL 等股票可用。
