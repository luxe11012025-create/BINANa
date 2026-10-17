import React from 'react';
import { TechnicalIndicators, MarketStats } from '../types';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';

interface IndicatorMatrixProps {
  indicators: TechnicalIndicators;
  stats: MarketStats;
}

export const IndicatorMatrix: React.FC<IndicatorMatrixProps> = ({ indicators, stats }) => {
  const isEmaBullish = indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50;
  const isEmaBearish = indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50;

  const rsiZone = indicators.rsi14 >= 70 ? 'Vùng Quá Mua' : indicators.rsi14 <= 30 ? 'Vùng Quá Bán' : 'Vùng Trung Tính';
  const rsiColor = indicators.rsi14 >= 70 ? 'text-amber-400' : indicators.rsi14 <= 30 ? 'text-cyan-400' : 'text-emerald-400';

  const rangePercent = stats.high24h > stats.low24h && stats.markPrice >= stats.low24h
    ? ((stats.markPrice - stats.low24h) / (stats.high24h - stats.low24h)) * 100
    : 50;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Tiêu đề phần chỉ báo */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white font-mono">Ma Trận Chỉ Báo Định Lượng Quant</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Thời gian thực đa khung nến</span>
      </div>

      {/* Lưới 8 khối chỉ báo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        {/* RSI 14 */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>RSI (14 Chu Kỳ)</span>
            <span className={`text-[9px] uppercase font-semibold ${rsiColor}`}>{rsiZone}</span>
          </div>
          <div className={`text-base font-bold mt-1 ${rsiColor}`}>
            {indicators.rsi14.toFixed(1)}
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${indicators.rsi14 >= 70 ? 'bg-amber-400' : indicators.rsi14 <= 30 ? 'bg-cyan-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, indicators.rsi14))}%` }}
            />
          </div>
        </div>

        {/* Histogram MACD */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Histogram MACD</span>
            <span className="text-[9px] text-slate-500 font-mono">12,26,9</span>
          </div>
          <div className={`text-base font-bold mt-1 ${indicators.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {indicators.macdHist >= 0 ? '+' : ''}{indicators.macdHist.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            Đường tín hiệu: {indicators.macdSignal.toFixed(1)}
          </div>
        </div>

        {/* Cấu trúc EMA */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Xếp Lớp EMA</span>
            <span className="text-[9px] text-slate-500">9/21/50</span>
          </div>
          <div className={`text-sm font-bold mt-1 flex items-center gap-1 ${isEmaBullish ? 'text-emerald-400' : isEmaBearish ? 'text-rose-400' : 'text-amber-400'}`}>
            {isEmaBullish ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" /> Xu Hướng Tăng
              </>
            ) : isEmaBearish ? (
              <>
                <TrendingDown className="w-3.5 h-3.5" /> Xu Hướng Giảm
              </>
            ) : (
              'Đi Ngang / Hỗn Hợp'
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            EMA9: ${indicators.ema9.toFixed(0)}
          </div>
        </div>

        {/* Biến động ATR 14 */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Biến Động ATR (14)</span>
            <span className="text-[9px] text-slate-500 font-mono">Biên độ</span>
          </div>
          <div className="text-base font-bold text-slate-200 mt-1">
            ${indicators.atr14.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.markPrice > 0 ? `${((indicators.atr14 / stats.markPrice) * 100).toFixed(2)}% giá trị` : '--'}
          </div>
        </div>

        {/* Dải Bollinger Bands */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Dải Bollinger Bands</span>
            <span className="text-[9px] text-slate-500 font-mono">20,2</span>
          </div>
          <div className="text-sm font-bold text-sky-400 mt-1">
            %B: {(indicators.bbPercentB * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            Độ rộng: {indicators.bbBandwidth.toFixed(2)}%
          </div>
        </div>

        {/* Dòng tiền CVD 5m / 15m */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Dòng Tiền CVD 5m</span>
            <span className="text-[9px] text-slate-500 font-mono">Khớp chủ động</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${indicators.cvd5m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {indicators.cvd5m >= 0 ? '+' : ''}{indicators.cvd5m.toFixed(2)} BTC
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            15m: {indicators.cvd15m >= 0 ? '+' : ''}{indicators.cvd15m.toFixed(1)} BTC
          </div>
        </div>

        {/* Giá bình quân VWAP */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Giá Bình Quân VWAP</span>
            <span className="text-[9px] text-slate-500 font-mono">Theo khối lượng</span>
          </div>
          <div className="text-sm font-bold text-slate-200 mt-1">
            ${indicators.vwap.toFixed(1)}
          </div>
          <div className={`text-[10px] mt-1 ${stats.markPrice >= indicators.vwap ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.markPrice >= indicators.vwap ? 'Nằm trên VWAP (Tích cực)' : 'Nằm dưới VWAP (Tiêu cực)'}
          </div>
        </div>

        {/* Biên độ cao nhất / thấp nhất 24h */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Biên Độ 24h</span>
            <span className="text-[9px] text-slate-500 font-mono">{rangePercent.toFixed(0)}%</span>
          </div>
          <div className="text-xs font-semibold text-slate-300 mt-1 flex justify-between">
            <span>Thấp: ${stats.low24h.toFixed(0)}</span>
            <span>Cao: ${stats.high24h.toFixed(0)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
              style={{ width: `${Math.min(100, Math.max(0, rangePercent))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
