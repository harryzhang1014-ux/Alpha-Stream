import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Search, Play, TrendingUp, ChevronDown, BarChart3, Settings2 } from 'lucide-react';

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM'];

interface SidebarProps {
  ticker: string;
  setTicker: (v: string) => void;
  sma: number;
  setSma: (v: number) => void;
  lma: number;
  setLma: (v: number) => void;
  growth: number;
  setGrowth: (v: number) => void;
  wacc: number;
  setWacc: (v: number) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  ticker, setTicker,
  sma, setSma,
  lma, setLma,
  growth, setGrowth,
  wacc, setWacc,
  apiKey, setApiKey,
  onRun,
  isRunning
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchInput, setSearchInput] = useState(ticker);
  const [isDropdownClicked, setIsDropdownClicked] = useState(false);

  const filteredTickers = isDropdownClicked
    ? POPULAR_TICKERS
    : POPULAR_TICKERS.filter(t => t.includes(searchInput.toUpperCase()));

  return (
    <aside className="w-[300px] h-screen bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col shrink-0" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2563eb] rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-[15px] text-white tracking-tight" style={{ fontWeight: 600 }}>Alpha-Stream</h1>
            <p className="text-[10px] text-zinc-500 tracking-wide uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Quant Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Ticker Search */}
        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontWeight: 500 }}>
            <Search size={12} /> Asset Ticker
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value.toUpperCase());
                setIsDropdownClicked(false);
                setShowDropdown(true);
              }}
              onFocus={() => {
                setIsDropdownClicked(false);
                setShowDropdown(true);
              }}
              onBlur={() => setTimeout(() => {
                setShowDropdown(false);
                setIsDropdownClicked(false);
              }, 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setTicker(searchInput.toUpperCase());
                  setShowDropdown(false);
                  setIsDropdownClicked(false);
                }
              }}
              placeholder="Search ticker..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-3 pr-8 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#2563eb]/50 transition-colors"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            <button
              className="absolute right-0 top-0 bottom-0 px-3 text-zinc-500 hover:text-zinc-300 flex items-center justify-center"
              onClick={() => {
                setIsDropdownClicked(!showDropdown);
                setShowDropdown(!showDropdown);
              }}
              onBlur={() => setTimeout(() => {
                setShowDropdown(false);
                setIsDropdownClicked(false);
              }, 200)}
            >
              <ChevronDown size={14} />
            </button>

            {showDropdown && filteredTickers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111118] border border-white/[0.08] rounded-lg overflow-hidden z-50 shadow-xl max-h-48 overflow-y-auto">
                {filteredTickers.map(t => (
                  <button
                    key={t}
                    onMouseDown={() => {
                      setSearchInput(t);
                      setTicker(t);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.04] transition-colors flex items-center justify-between ${t === ticker ? 'text-[#2563eb]' : 'text-zinc-400'}`}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <span>{t}</span>
                    {t === ticker && <BarChart3 size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontWeight: 500 }}>
            <Settings2 size={12} /> Model Parameters
          </label>
          <div className="space-y-6 pt-2 pb-2">
            <ControlSlider label="SMA Period" value={sma} min={5} max={50} unit="D" onChange={(v: number[]) => setSma(v[0])} />
            <ControlSlider label="LMA Period" value={lma} min={50} max={200} unit="D" onChange={(v: number[]) => setLma(v[0])} />
            <ControlSlider label="Terminal Growth" value={growth} min={0} max={8} unit="%" onChange={(v: number[]) => setGrowth(v[0])} step={0.5} />
            <ControlSlider label="WACC" value={wacc} min={5} max={15} unit="%" onChange={(v: number[]) => setWacc(v[0])} step={0.5} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 500 }}>
            Alpha Vantage API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="可选：填入后支持 AAPL 等实时数据"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#2563eb]/50 transition-colors"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          />
          <p className="text-[10px] text-zinc-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            无 Key 时仅 MSFT 可用 demo 实时数据
          </p>
        </div>

        {/* Quick presets */}
        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 500 }}>Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Conservative', sma: 10, lma: 100, g: 2, w: 10 },
              { name: 'Moderate', sma: 20, lma: 100, g: 4, w: 9 },
              { name: 'Aggressive', sma: 5, lma: 50, g: 6, w: 8 },
              { name: 'Long-term', sma: 30, lma: 200, g: 3, w: 11 },
            ].map(preset => (
              <button
                key={preset.name}
                onClick={() => { setSma(preset.sma); setLma(preset.lma); setGrowth(preset.g); setWacc(preset.w); }}
                className="px-3 py-2 text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.06] hover:text-white transition-all"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Run Button */}
      <div className="px-6 pb-6 pt-3 border-t border-white/[0.06]">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ fontSize: '13px', fontWeight: 600 }}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              Run AI Analysis
            </>
          )}
        </button>
        <p className="mt-3 text-[9px] text-zinc-600 text-center tracking-wide" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          ACC102 — Individual Project<br />Interactive Valuation Agent
        </p>
      </div>
    </aside>
  );
};

const ControlSlider = ({ label, value, min, max, unit, onChange, step = 1 }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-zinc-400">{label}</span>
      <span className="text-[12px] text-white px-2 py-0.5 bg-[#2563eb]/20 text-[#60a5fa] rounded border border-[#2563eb]/30" style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
        {value}{unit}
      </span>
    </div>
    <Slider.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      value={[value]}
      max={max}
      min={min}
      step={step}
      onValueChange={onChange}
    >
      <Slider.Track className="bg-white/[0.06] relative grow rounded-full h-[4px]">
        <Slider.Range className="absolute bg-[#2563eb] rounded-full h-full" />
      </Slider.Track>
      <Slider.Thumb
        className="block w-4 h-4 bg-white rounded-full hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#2563eb]/30 transition-all cursor-grab active:cursor-grabbing shadow-lg"
        aria-label={label}
      />
    </Slider.Root>
    <div className="flex justify-between text-[10px] text-zinc-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);
