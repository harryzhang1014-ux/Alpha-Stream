import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  Brush
} from 'recharts';

interface ChartData {
  date: string;
  price: number;
  sma: number;
  lma: number;
  signal?: 'buy' | 'sell';
}

interface MainChartProps {
  data: ChartData[];
  ticker: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-lg p-3 shadow-xl" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      <p className="text-[10px] text-zinc-500 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="text-white" style={{ fontWeight: 500 }}>${entry.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

export const MainChart: React.FC<MainChartProps> = ({ data, ticker }) => {
  const [activeLines, setActiveLines] = useState({ price: true, sma: true, lma: true });

  const { buySignals, sellSignals } = useMemo(() => {
    const buys: ChartData[] = [];
    const sells: ChartData[] = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      // Golden cross: SMA crosses above LMA
      if (prev.sma <= prev.lma && curr.sma > curr.lma) {
        buys.push(curr);
      }
      // Death cross: SMA crosses below LMA
      if (prev.sma >= prev.lma && curr.sma < curr.lma) {
        sells.push(curr);
      }
    }
    return { buySignals: buys, sellSignals: sells };
  }, [data]);

  const toggleLine = (key: string) => {
    setActiveLines(prev => ({ ...prev, [key as keyof typeof prev]: !prev[key as keyof typeof prev] }));
  };

  const priceRange = useMemo(() => {
    if (!data.length) return [0, 0];
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [data]);

  return (
    <div
      className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Chart header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[14px] text-white" style={{ fontWeight: 600 }}>{ticker} Price vs. Moving Averages</h3>
          <span className="text-[10px] text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {data.length} data points
          </span>
        </div>
        <div className="flex items-center gap-3">
          {buySignals.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded" style={{ fontWeight: 500 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {buySignals.length} Buy
            </div>
          )}
          {sellSignals.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded" style={{ fontWeight: 500 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              {sellSignals.length} Sell
            </div>
          )}
          {/* Toggle buttons */}
          <div className="flex gap-1 ml-2">
            {[
              { key: 'price', label: 'Price', color: '#2563eb' },
              { key: 'sma', label: 'SMA', color: '#10b981' },
              { key: 'lma', label: 'LMA', color: '#f59e0b' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => toggleLine(item.key)}
                className={`text-[10px] px-2 py-1 rounded border transition-all ${
                  activeLines[item.key as keyof typeof activeLines]
                    ? 'border-white/10 text-white'
                    : 'border-transparent text-zinc-600'
                }`}
                style={{ fontWeight: 500 }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: item.color, opacity: activeLines[item.key as keyof typeof activeLines] ? 1 : 0.3 }} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div className="h-[420px] px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="transparent"
              tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              tickFormatter={(v) => v.split('-').slice(1).join('/')}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={priceRange}
              stroke="transparent"
              tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />

            {activeLines.price && (
              <Area
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
                name="Price"
                animationDuration={800}
              />
            )}
            {activeLines.sma && (
              <Line
                type="monotone"
                dataKey="sma"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                name="SMA"
                animationDuration={800}
              />
            )}
            {activeLines.lma && (
              <Line
                type="monotone"
                dataKey="lma"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="LMA"
                animationDuration={800}
              />
            )}

            {/* Buy signals */}
            {buySignals.map((sig, i) => (
              <ReferenceDot
                key={`buy-${i}`}
                x={sig.date}
                y={sig.price}
                r={5}
                fill="#10b981"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={0.5}
              />
            ))}
            {/* Sell signals */}
            {sellSignals.map((sig, i) => (
              <ReferenceDot
                key={`sell-${i}`}
                x={sig.date}
                y={sig.price}
                r={5}
                fill="#ef4444"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={0.5}
              />
            ))}

            <Brush
              dataKey="date"
              height={20}
              stroke="rgba(255,255,255,0.08)"
              fill="rgba(255,255,255,0.02)"
              tickFormatter={(v) => v.split('-').slice(1).join('/')}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
