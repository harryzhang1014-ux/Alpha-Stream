import React, { useMemo } from 'react';
import { AlertCircle, BarChart3, ShieldCheck, Zap } from 'lucide-react';

interface AIReportProps {
  ticker: string;
  intrinsicValue: number;
  currentPrice: number;
  beta: number;
  sma: number;
  lma: number;
  growth: number;
  wacc: number;
  recommendation: string;
  riskLevel: string;
  valuationText: string;
  fcfPerShare: number;
  loading?: boolean;
  analysisId: number;
}

export const AIReport: React.FC<AIReportProps> = (props) => {
  const { loading, analysisId, ticker, intrinsicValue, currentPrice, beta, sma, lma, growth, wacc, recommendation, riskLevel, valuationText, fcfPerShare } = props;

  const spread = useMemo(
    () => ((intrinsicValue - currentPrice) / currentPrice) * 100,
    [intrinsicValue, currentPrice],
  );

  if (loading) {
    return (
      <div className="w-full bg-[#0a0a0f] border border-white/[0.06] rounded-xl p-8 h-[280px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-zinc-400 text-[13px]" style={{ fontWeight: 500 }}>Running Analysis</p>
            <p className="text-zinc-600 text-[11px] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>正在计算 Beta、DCF 与规则结论...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0a0a0f] border border-white/[0.06] rounded-xl overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={13} className="text-zinc-500" />
          <span className="text-[11px] text-zinc-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            alpha-stream rule-engine
          </span>
        </div>
        <span className="text-[10px] text-zinc-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>report #{analysisId.toString().padStart(5, '0')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
        <ReportItem
          title="结论"
          icon={<ShieldCheck size={14} />}
          text={`${ticker} 当前判定为${valuationText}，偏离内在价值 ${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%，建议：${recommendation}。`}
        />
        <ReportItem
          title="风险"
          icon={<AlertCircle size={14} className="text-rose-400" />}
          text={`Beta=${beta.toFixed(3)}，风险等级=${riskLevel}。Beta>1 表示相对市场波动更大。`}
        />
        <ReportItem
          title="技术面"
          icon={<Zap size={14} className="text-amber-400" />}
          text={`SMA(${sma}) 与 LMA(${lma}) 当前关系：${sma > lma ? '多头趋势（潜在金叉阶段）' : '空头趋势（潜在死叉阶段）'}。`}
        />
        <ReportItem
          title="估值参数"
          icon={<BarChart3 size={14} className="text-blue-400" />}
          text={`DCF 输入：FCF/Share=${fcfPerShare.toFixed(2)}，WACC=${wacc.toFixed(1)}%，永续增长=${growth.toFixed(1)}%，内在价值=${intrinsicValue.toFixed(2)}。`}
        />
      </div>

      <div className="px-5 py-3 border-t border-white/[0.04] flex justify-between items-center">
        <span className="text-[10px] text-zinc-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {'>'} analysis complete. ready for decision.
        </span>
        <span className="text-[10px] text-zinc-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>strategy: rules + metrics</span>
      </div>
    </div>
  );
};

const ReportItem = ({ title, icon, text }: { title: string; icon: React.ReactNode; text: string }) => (
  <div className="border border-white/[0.06] bg-white/[0.02] rounded-lg p-3">
    <div className="flex items-center gap-2 text-[11px] text-[#2563eb] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
      {icon}
      {title}
    </div>
    <p className="text-[12px] text-zinc-300 leading-relaxed">{text}</p>
  </div>
);
