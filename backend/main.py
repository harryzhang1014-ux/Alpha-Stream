from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import requests
import re
from datetime import datetime, timedelta
import time

VALID_TICKER_RE = re.compile(r"^[A-Z\.\-\^]{1,10}$")
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
DATA_CACHE: dict[str, dict] = {}
MARKET_CACHE: dict[str, dict] = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_ticker(ticker: str) -> str:
    code = ticker.strip().upper()
    if not code or not VALID_TICKER_RE.fullmatch(code):
        raise HTTPException(status_code=422, detail=f"无效代码: {ticker}")
    return code


def parse_av_series(payload: dict):
    series = payload.get("Time Series (Daily)")
    if not isinstance(series, dict):
        return []

    cutoff = datetime.now() - timedelta(days=370)
    rows = []
    for date_str, item in series.items():
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            if dt < cutoff:
                continue
            close = float(item.get("4. close", "nan"))
            if close > 0:
                rows.append({"date": date_str, "close": close})
        except Exception:
            continue
    rows.sort(key=lambda x: x["date"])
    return rows


def call_alpha_vantage(function_name: str, symbol: str, key: str):
    resp = requests.get(
        ALPHA_VANTAGE_URL,
        params={
            "function": function_name,
            "symbol": symbol,
            "outputsize": "compact",
            "apikey": key,
        },
        timeout=20,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("Error Message"):
        raise HTTPException(status_code=422, detail=f"无效代码: {symbol}")
    info_text = str(payload.get("Information", "")) + " " + str(payload.get("Note", ""))
    if "premium endpoint" in info_text.lower():
        raise HTTPException(status_code=503, detail="ALPHA_PREMIUM_REQUIRED")
    if payload.get("Information") or payload.get("Note"):
        raise HTTPException(status_code=503, detail="ALPHA_RATE_LIMIT")
    return payload


def fetch_from_alpha_vantage(code: str, key: str):
    stock_payload = call_alpha_vantage("TIME_SERIES_DAILY", code, key)

    prices = parse_av_series(stock_payload)
    if key == "demo":
        # demo key 仅支持 MSFT；基准指数无法稳定获取时，先用同序列保持链路可用
        market_prices = prices
    else:
        market_prices = fetch_market_prices_stooq()
        if not market_prices:
            # 兜底：仅当 Stooq 不可用时才额外调用 Alpha Vantage，尽量降低限频概率
            try:
                market_payload = call_alpha_vantage("TIME_SERIES_DAILY", "SPY", key)
                market_prices = parse_av_series(market_payload)
            except HTTPException:
                market_prices = []
        if not market_prices:
            market_prices = prices
    if not prices or not market_prices:
        raise HTTPException(status_code=503, detail="Alpha Vantage 未返回有效日线")

    return {
        "prices": prices,
        "marketPrices": market_prices,
        # 免费配额优先保行情稳定，FCF/股本在前端会 fallback 估算
        "latestFcf": 0.0,
        "sharesOutstanding": 1,
        "source": "AlphaVantage",
    }


def set_cache(code: str, payload: dict):
    DATA_CACHE[code] = {"ts": time.time(), "payload": payload}


def get_cache(code: str, max_age_sec: int = 3600):
    item = DATA_CACHE.get(code)
    if not item:
        return None
    if time.time() - item["ts"] > max_age_sec:
        return None
    cached = dict(item["payload"])
    cached["source"] = f'{cached.get("source", "Cached")} (cached)'
    return cached


def fetch_market_prices_stooq(max_age_sec: int = 3600):
    cache_key = "SPX_STOOQ"
    cached = MARKET_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"] <= max_age_sec):
        return cached["payload"]

    try:
        resp = requests.get("https://stooq.com/q/d/l/?s=^spx&i=d", timeout=15)
        resp.raise_for_status()
        lines = resp.text.splitlines()
        if len(lines) <= 2:
            return []
        cutoff = datetime.now() - timedelta(days=370)
        rows = []
        for line in lines[1:]:
            parts = line.strip().split(",")
            if len(parts) < 5:
                continue
            date_str = parts[0]
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if dt < cutoff:
                    continue
                close = float(parts[4])
                if close > 0:
                    rows.append({"date": date_str, "close": close})
            except Exception:
                continue
        rows.sort(key=lambda x: x["date"])
        if rows:
            MARKET_CACHE[cache_key] = {"ts": time.time(), "payload": rows}
        return rows
    except Exception:
        return []


def fetch_stock_prices_stooq(code: str):
    # Stooq 对美股代码通常使用 {ticker}.us（小写）
    symbol = f"{code.lower()}.us"
    try:
        resp = requests.get(f"https://stooq.com/q/d/l/?s={symbol}&i=d", timeout=15)
        resp.raise_for_status()
        lines = resp.text.splitlines()
        if len(lines) <= 2:
            return []
        cutoff = datetime.now() - timedelta(days=370)
        rows = []
        for line in lines[1:]:
            parts = line.strip().split(",")
            if len(parts) < 5:
                continue
            date_str = parts[0]
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if dt < cutoff:
                    continue
                close = float(parts[4])
                if close > 0:
                    rows.append({"date": date_str, "close": close})
            except Exception:
                continue
        rows.sort(key=lambda x: x["date"])
        return rows
    except Exception:
        return []


def fetch_from_stooq(code: str):
    prices = fetch_stock_prices_stooq(code)
    market_prices = fetch_market_prices_stooq()
    if not prices:
        raise HTTPException(status_code=503, detail="Stooq 股票日线暂不可用")
    if not market_prices:
        raise HTTPException(status_code=503, detail="Stooq 基准指数暂不可用")
    return {
        "prices": prices,
        "marketPrices": market_prices,
        "latestFcf": 0.0,
        "sharesOutstanding": 1,
        "source": "Stooq",
    }


@app.get("/api/stock/{ticker}")
async def get_stock_data(ticker: str, av_key: str = Query(default="", alias="av_key")):
    code = validate_ticker(ticker)
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        stock = yf.Ticker(code, session=session)
        hist = stock.history(period="1y")
        if hist.empty:
            raise HTTPException(status_code=503, detail=f"yfinance 暂不可用: {code}")

        spy = yf.Ticker("^GSPC", session=session)
        spy_hist = spy.history(period="1y")
        if spy_hist.empty:
            raise HTTPException(status_code=503, detail="yfinance 基准指数暂不可用")

        info = stock.info if isinstance(stock.info, dict) else {}
        prices = [{"date": d.strftime("%Y-%m-%d"), "close": float(r["Close"])} for d, r in hist.iterrows()]
        market_prices = [{"date": d.strftime("%Y-%m-%d"), "close": float(r["Close"])} for d, r in spy_hist.iterrows()]

        return {
            "prices": prices,
            "marketPrices": market_prices,
            "latestFcf": info.get("freeCashflow", 0),
            "sharesOutstanding": info.get("sharesOutstanding", 1),
            "source": "yfinance",
        }
        
    except HTTPException as y_err:
        key = (av_key or "").strip()
        if not key:
            if code == "MSFT":
                try:
                    av_payload = fetch_from_alpha_vantage(code, "demo")
                    set_cache(code, av_payload)
                    return av_payload
                except HTTPException:
                    cached = get_cache(code)
                    if cached:
                        return cached
                    raise HTTPException(status_code=503, detail="MSFT demo 数据源频率受限，请稍后重试")
            raise HTTPException(status_code=503, detail="缺少 Alpha Vantage Key，请在侧栏输入后再试")
        if key:
            try:
                av_payload = fetch_from_alpha_vantage(code, key)
                set_cache(code, av_payload)
                return av_payload
            except HTTPException as av_error:
                if "ALPHA_PREMIUM_REQUIRED" in str(av_error.detail):
                    cached = get_cache(code)
                    if cached:
                        return cached
                    raise HTTPException(
                        status_code=503,
                        detail="当前 Alpha Vantage Key 无免费接口权限（返回 premium endpoint）。请更换为可用免费 key，或先用 MSFT + demo 验证实时链路。",
                    )
                if "ALPHA_RATE_LIMIT" in str(av_error.detail):
                    cached = get_cache(code)
                    if cached:
                        return cached
                    # 频率限制时自动切 Stooq，避免前端进入 Sandbox
                    try:
                        stooq_payload = fetch_from_stooq(code)
                        set_cache(code, stooq_payload)
                        return stooq_payload
                    except HTTPException:
                        raise HTTPException(status_code=503, detail="Alpha Vantage 频率限制，且 Stooq 不可用，请等待 60 秒后重试")
                # Alpha 认为无效代码则继续抛出；其他错误继续尝试 Stooq
                if av_error.status_code == 422:
                    raise

        # Alpha 失败时再尝试 Stooq 兜底
        stooq_payload = fetch_from_stooq(code)
        set_cache(code, stooq_payload)
        return stooq_payload
    except Exception as e:
        cached = get_cache(code)
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"数据源不可用: {e}")
