import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  isHighlight?: boolean;
  tooltip?: string;
  sparkData?: number[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositive,
  isHighlight = false,
  tooltip,
  sparkData
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Mini sparkline
  const renderSparkline = () => {
    if (!sparkData || sparkData.length < 2) return null;
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const h = 24;
    const w = 60;
    const points = sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={w} height={h} className="opacity-40">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative p-5 rounded-xl border transition-all ${
        isHighlight
          ? 'bg-[#2563eb]/[0.06] border-[#2563eb]/20'
          : 'bg-white/[0.02] border-white/[0.06]'
      } hover:border-white/[0.12]`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5" style={{ fontWeight: 500 }}>
          {label}
          {tooltip && (
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="hover:text-zinc-300 transition-colors"
            >
              <Info size={11} />
            </button>
          )}
        </span>
        {renderSparkline()}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`text-[22px] tracking-tight ${isHighlight ? 'text-[#2563eb]' : 'text-white'}`}
          style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {value}
        </motion.div>
      </AnimatePresence>

      {change && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} style={{ fontWeight: 500 }}>
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {change}
        </div>
      )}

      {/* Tooltip overlay */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-[#111118]/95 backdrop-blur-sm rounded-xl p-4 z-10 flex flex-col"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Info</span>
              <button onClick={() => setShowTooltip(false)} className="text-zinc-500 hover:text-white">
                <X size={12} />
              </button>
            </div>
            <p className="text-[12px] text-zinc-300 leading-relaxed">{tooltip}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
