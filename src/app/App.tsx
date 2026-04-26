import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricCard } from './components/MetricCard';
import { MainChart } from './components/MainChart';
import { AIReport } from './components/AIReport';
import { Bell, LayoutDashboard, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchStockFundamentals, type StockFundamentals } from './services/marketData';

const generatePriceData = (ticker: string, days: number = 120) => {
  const basePrices: Record<string, number> = {
    AAPL: 185, MSFT: 420, GOOGL: 175, AMZN: 195, NVDA: 880, META: 510, TSLA: 245, JPM: 200
  };
  const base = basePrices[ticker] || 180;
  const data: { date: string; price: number }[] = [];
  let price = base + (Math.random() - 0.5) * base * 0.05;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const trend = Math.sin(i / 20) * 0.3;
    const noise = (Math.random() - 0.48) * base * 0.015;
    price += trend + noise;
    price = Math.max(price, base * 0.85);
    data.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2)),
    });
  }
  return data;
};

const calculateMA = (data: { date: string; price: number }[], smaPeriod: number, lmaPeriod: number) => {
  return data.map((item, idx, arr) => {
    const smaSlice = arr.slice(Math.max(0, idx - smaPeriod + 1), idx + 1);
    const lmaSlice = arr.slice(Math.max(0, idx - lmaPeriod + 1), idx + 1);
    return {
      ...item,
      sma: parseFloat((smaSlice.reduce((a, c) => a + c.price, 0) / smaSlice.length).toFixed(2)),
      lma: parseFloat((lmaSlice.reduce((a, c) => a + c.price, 0) / lmaSlice.length).toFixed(2)),
    };
  });
};

const alignSeries = (
  stock: { date: string; close: number }[],
  market: { date: string; close: number }[],
) => {
  const marketMap = new Map(market.map((item) => [item.date, item.close]));
  return stock
    .filter((item) => marketMap.has(item.date))
    .map((item) => ({ date: item.date, stockClose: item.close, marketClose: marketMap.get(item.date)! }));
};

const pctReturns = (values: number[]) =>
  values
    .slice(1)
    .map((value, idx) => (value - values[idx]) / values[idx])
    .filter((r) => Number.isFinite(r));

const calculateBeta = (
  stock: { date: string; close: number }[],
  market: { date: string; close: number }[],
) => {
  const aligned = alignSeries(stock, market);
  if (aligned.length < 50) return 1;

  const stockReturns = pctReturns(aligned.map((item) => item.stockClose));
  const marketReturns = pctReturns(aligned.map((item) => item.marketClose));
  const n = Math.min(stockReturns.length, marketReturns.length);
  if (n < 30) return 1;

  const s = stockReturns.slice(0, n);
  const m = marketReturns.slice(0, n);
  const meanS = s.reduce((sum, item) => sum + item, 0) / n;
  const meanM = m.reduce((sum, item) => sum + item, 0) / n;

  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (s[i] - meanS) * (m[i] - meanM);
    variance += (m[i] - meanM) ** 2;
  }
  if (variance === 0) return 1;
  return covariance / variance;
};

const buildRuleInsight = ({
  intrinsicValue,
  currentPrice,
  beta,
  sma,
  lma,
}: {
  intrinsicValue: number;
  currentPrice: number;
  beta: number;
  sma: number;
  lma: number;
}) => {
  const spreadPct = ((intrinsicValue - currentPrice) / currentPrice) * 100;
  const undervalued = intrinsicValue > currentPrice;
  const riskLevel = beta < 1.0 ? '低' : beta < 1.2 ? '中低' : beta < 1.5 ? '中高' : '高';
  const trend = sma > lma ? '短期趋势偏强（SMA > LMA）' : '短期趋势偏弱（SMA <= LMA）';

  let recommendation = '建议观望';
  if (undervalued && beta < 1.2) recommendation = '具有安全边际，风险可控，建议买入';
  if (undervalued && beta >= 1.2) recommendation = '估值有折价，但波动较高，建议分批介入';
  if (!undervalued && beta >= 1.2) recommendation = '估值偏高且风险偏高，建议减仓或观望';
  if (!undervalued && beta < 1.2) recommendation = '估值略高但风险可控，建议等待更好入场点';

  return {
    recommendation,
    riskLevel,
    valuationText: undervalued ? '低估' : '高估',
    spreadPct,
    trend,
  };
};

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [sma, setSma] = useState(20);
  const [lma, setLma] = useState(100);
  const [growth, setGrowth] = useState(4);
  const [wacc, setWacc] = useState(9);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [isMock, setIsMock] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [rawData, setRawData] = useState<{ date: string; price: number }[]>([]);
  const [fundamentals, setFundamentals] = useState<StockFundamentals | null>(null);
  const [analysisId, setAnalysisId] = useState(10001);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [reportOpen, setReportOpen] = useState(false);
  const cacheRef = useRef<Map<string, StockFundamentals>>(new Map());

  const loadTickerData = useCallback(
    async (targetTicker: string, forceRefresh = false) => {
      const code = targetTicker.trim().toUpperCase();
      if (!code) return;

      const cached = cacheRef.current.get(code);
      if (!forceRefresh && cached) {
        setWarning('');
        setIsMock(false);
        setDataSource(cached.source || '');
        setFundamentals(cached);
        setRawData(cached.prices.map((item) => ({ date: item.date, price: item.close })));
        setLastUpdated(new Date());
        return;
      }

      setIsLoading(true);
      setWarning('');
      setIsMock(false);
      setDataSource('');
      try {
        const response = await fetchStockFundamentals(code, apiKey);
        cacheRef.current.set(code, response);
        setDataSource(response.source || '');
        setFundamentals(response);
        setRawData(response.prices.map((item) => ({ date: item.date, price: item.close })));
        setLastUpdated(new Date());
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_TICKER') {
          setWarning(`⚠️ 警告: 无效的股票代码 [${code}]，请检查输入是否正确。`);
          // 保持之前的数据或者清空，这里选择保留前一次的状态，不更新 rawData
        } else {
          const message = error instanceof Error ? error.message : '数据源不可用';
          setWarning(`⚠️ ${message}`);
          setIsMock(true);
          setDataSource('Sandbox');
          setFundamentals(null);
          setRawData(generatePriceData(code));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickerData(ticker, false);
    }, 350);
    return () => clearTimeout(timer);
  }, [ticker, loadTickerData]);

  const data = useMemo(() => calculateMA(rawData, sma, lma), [rawData, sma, lma]);

  const handleRunAnalysis = useCallback(() => {
    loadTickerData(ticker, true);
    setAnalysisId((prev) => prev + 1);
  }, [ticker, loadTickerData]);

  const currentPrice = data[data.length - 1]?.price || 0;
  const prevPrice = data[data.length - 2]?.price || 0;
  const dayChange = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const startPrice = data[0]?.price || currentPrice;
  const periodReturn = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

  const beta = useMemo(() => {
    if (!fundamentals) return 1.1;
    return calculateBeta(fundamentals.prices, fundamentals.marketPrices);
  }, [fundamentals]);

  const fcfPerShare = useMemo(() => {
    if (!fundamentals || !fundamentals.sharesOutstanding) return currentPrice * 0.06;
    return fundamentals.latestFcf / fundamentals.sharesOutstanding;
  }, [fundamentals, currentPrice]);

  const growthRate = growth / 100;
  const discountRate = wacc / 100;
  const intrinsicValue =
    discountRate > growthRate
      ? parseFloat((fcfPerShare * (1 + growthRate) / (discountRate - growthRate)).toFixed(2))
      : parseFloat((currentPrice * 1.05).toFixed(2));

  const insight = buildRuleInsight({ intrinsicValue, currentPrice, beta, sma, lma });

  const sparkPrices = data.slice(-20).map(d => d.price);
  const sparkBeta = Array.from({ length: 20 }, (_, i) => beta + Math.sin(i) * 0.05);
  const sparkIV = Array.from({ length: 20 }, (_, i) => intrinsicValue + Math.cos(i) * 2);

  return (
    <div className="flex h-screen bg-[#06060a] text-zinc-100 selection:bg-[#2563eb]/30" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar
        ticker={ticker}
        setTicker={setTicker}
        sma={sma}
        setSma={setSma}
        lma={lma}
        setLma={setLma}
        growth={growth}
        setGrowth={setGrowth}
        wacc={wacc}
        setWacc={setWacc}
        apiKey={apiKey}
        setApiKey={setApiKey}
        onRun={handleRunAnalysis}
        isRunning={isLoading}
      />

      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#06060a]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <LayoutDashboard size={15} />
              <span className="text-[12px]" style={{ fontWeight: 500 }}>Dashboard</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <span className="text-[12px] text-white" style={{ fontWeight: 600 }}>{ticker} Overview</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-zinc-600 text-[11px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {isMock && (
                <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 mr-2 flex items-center gap-1" title="无法连接数据源，已静默切换为本地演示沙盒数据。">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Sandbox Mode
                </span>
              )}
              {!isMock && dataSource && (
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mr-2 flex items-center gap-1" title={`当前数据源: ${dataSource}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {dataSource}
                </span>
              )}
              <Clock size={12} />
              {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white transition-all relative">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2563eb] rounded-full" />
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-[1200px] mx-auto w-full">
          {warning && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg flex items-center gap-2 text-[13px] shadow-sm" style={{ fontWeight: 500 }}>
              <AlertTriangle size={16} className="text-amber-400" />
              {warning}
            </div>
          )}

          {/* Project label */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              ACC102 — Individual Project: Interactive Valuation Agent
            </p>
            <p className="text-[10px] text-zinc-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Period Return: <span className={periodReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{periodReturn >= 0 ? '+' : ''}{periodReturn.toFixed(2)}%</span>
            </p>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label={`${ticker} Price`}
              value={`$${currentPrice.toFixed(2)}`}
              change={`${insight.spreadPct >= 0 ? '+' : ''}${insight.spreadPct.toFixed(2)}% vs intrinsic`}
              isPositive={currentPrice <= intrinsicValue}
              tooltip={`Current market price. Day change ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}%。当现价低于内在价值时视为估值更有吸引力。`}
              sparkData={sparkPrices}
            />
            <MetricCard
              label="Beta (β)"
              value={beta.toFixed(3)}
              change={beta > 1 ? `+${((beta - 1) * 100).toFixed(0)}% vs market` : `${((beta - 1) * 100).toFixed(0)}% vs market`}
              isPositive={beta <= 1.2}
              isHighlight
              tooltip="Measures systematic risk relative to the market benchmark (S&P 500). β > 1 indicates higher volatility."
              sparkData={sparkBeta}
            />
            <MetricCard
              label="Intrinsic Value (DCF)"
              value={`$${intrinsicValue.toFixed(2)}`}
              change={intrinsicValue > currentPrice ? `${((intrinsicValue - currentPrice) / currentPrice * 100).toFixed(1)}% upside` : `${((currentPrice - intrinsicValue) / currentPrice * 100).toFixed(1)}% downside`}
              isPositive={intrinsicValue > currentPrice}
              isHighlight
              tooltip={`基于 DCF：FCF/Share=${fcfPerShare.toFixed(2)}，WACC=${wacc.toFixed(1)}%，永续增长=${growth.toFixed(1)}%。`}
              sparkData={sparkIV}
            />
          </div>

          {/* Chart */}
          <MainChart data={data} ticker={ticker} />

          {/* AI Report */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] text-white flex items-center gap-2" style={{ fontWeight: 600 }}>
                AI Risk Analysis & Valuation
              </h2>
              <button
                onClick={() => setReportOpen((prev) => !prev)}
                className="text-[11px] text-zinc-400 hover:text-white transition-colors"
              >
                {reportOpen ? '收起摘要' : '展开摘要'}
              </button>
            </div>
            {reportOpen && (
              <AIReport
                ticker={ticker}
                currentPrice={currentPrice}
                intrinsicValue={intrinsicValue}
                beta={beta}
                sma={sma}
                lma={lma}
                growth={growth}
                wacc={wacc}
                loading={isLoading}
                analysisId={analysisId}
                recommendation={insight.recommendation}
                riskLevel={insight.riskLevel}
                valuationText={insight.valuationText}
                fcfPerShare={fcfPerShare}
              />
            )}
          </div>

          <footer className="pt-6 pb-4 text-center text-[9px] text-zinc-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            ALPHA-STREAM TERMINAL • FOR EDUCATIONAL PURPOSES ONLY • ACC102 PROJECT
          </footer>
        </div>
      </main>
    </div>
  );
}
