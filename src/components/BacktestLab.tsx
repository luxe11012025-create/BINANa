import React, { useState, useMemo } from 'react';
import { Candle, BacktestResult } from '../types';
import { runHistoricalBacktest } from '../services/quantEngine';
import { BarChart2, Play, Sliders, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BacktestLabProps {
  candles: Candle[];
}

export const BacktestLab: React.FC<BacktestLabProps> = ({ candles }) => {
  const [threshold, setThreshold] = useState<number>(0.62);
  const [tpAtr, setTpAtr] = useState<number>(1.6);
  const [slAtr, setSlAtr] = useState<number>(1.1);

  const backtestResult = useMemo(() => {
    return runHistoricalBacktest(candles, threshold, tpAtr, slAtr);
  }, [candles, threshold, tpAtr, slAtr]);

  const { equityCurve, totalTrades, winRate, profitFactor, totalReturnPercent, maxDrawdownPercent, upTrades, downTrades } = backtestResult;

  // Chart geometry
  const chartWidth = 750;
  const chartHeight = 220;

  const { minEq, maxEq, eqRange } = useMemo(() => {
    if (equityCurve.length === 0) return { minEq: 9000, maxEq: 11000, eqRange: 2000 };
    let min = Infinity;
    let max = -Infinity;
    equityCurve.forEach(p => {
      if (p.equity < min) min = p.equity;
      if (p.equity > max) max = p.equity;
    });
    const pad = (max - min) * 0.1 || 100;
    return {
      minEq: min - pad,
      maxEq: max + pad,
      eqRange: (max + pad) - (min - pad) || 1,
    };
  }, [equityCurve]);

  const getEqY = (eq: number) => {
    return chartHeight - ((eq - minEq) / eqRange) * chartHeight;
  };

  const polylinePoints = useMemo(() => {
    if (equityCurve.length === 0) return '';
    const slot = chartWidth / (equityCurve.length - 1 || 1);
    return equityCurve.map((p, i) => `${i * slot},${getEqY(p.equity)}`).join(' ');
  }, [equityCurve, minEq, eqRange]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-6 flex flex-col gap-5 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Historical Backtest & Monte Carlo Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Simulate 5-minute directional execution across {candles.length} historical candles from Binance USDⓈ-M Futures.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          Sample: <strong className="text-white">{candles.length}</strong> bars ({((candles.length * 5) / 60).toFixed(1)} hrs)
        </div>
      </div>

      {/* Control Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
        {/* Confidence Threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Signal Confidence Gate:
            </span>
            <span className="font-bold text-emerald-400">{(threshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.50"
            max="0.75"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5"
          />
          <div className="text-[10px] text-slate-500">Higher = fewer trades, higher precision filter.</div>
        </div>

        {/* TP ATR Multiplier */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Take Profit (TP):</span>
            <span className="font-bold text-sky-400">{tpAtr.toFixed(1)}x ATR</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={tpAtr}
            onChange={(e) => setTpAtr(parseFloat(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-1.5"
          />
          <div className="text-[10px] text-slate-500">Target distance scaled to volatility.</div>
        </div>

        {/* SL ATR Multiplier */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Stop Loss (SL):</span>
            <span className="font-bold text-rose-400">{slAtr.toFixed(1)}x ATR</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.5"
            step="0.1"
            value={slAtr}
            onChange={(e) => setSlAtr(parseFloat(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer h-1.5"
          />
          <div className="text-[10px] text-slate-500">Invalidation boundary distance.</div>
        </div>
      </div>

      {/* Backtest Output Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Win Rate</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            {backtestResult.winCount}W / {backtestResult.lossCount}L
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Total Trades</div>
          <div className="text-xl font-black text-white mt-1">
            {totalTrades}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Filtered from {candles.length} bars
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Profit Factor</div>
          <div className="text-xl font-black text-sky-400 mt-1">
            {profitFactor.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Gross Gain / Gross Loss
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Simulated Return</div>
          <div className={`text-xl font-black mt-1 ${totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Initial: $10,000 USD
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Max Drawdown</div>
          <div className="text-xl font-black text-amber-400 mt-1">
            {maxDrawdownPercent.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Peak to trough
          </div>
        </div>
      </div>

      {/* Equity Curve SVG */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-white font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Simulated Portfolio Equity Curve ($)
          </span>
          <span>Start: $10,000 → End: <strong className="text-emerald-400">${(10000 * (1 + totalReturnPercent / 100)).toFixed(0)}</strong></span>
        </div>

        <div className="relative w-full h-[220px] bg-slate-950 rounded overflow-hidden">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[0.25, 0.5, 0.75].map((r, i) => {
              const y = chartHeight * r;
              const val = maxEq - r * eqRange;
              return (
                <g key={i}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x={chartWidth - 6} y={y - 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    ${val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {equityCurve.length > 1 && (
              <polygon
                fill="url(#eqGrad)"
                points={`0,${chartHeight} ${polylinePoints} ${chartWidth},${chartHeight}`}
              />
            )}

            {/* Line */}
            {equityCurve.length > 1 && (
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points={polylinePoints}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Directional Trade Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-emerald-400 font-bold">▲ LONG Predictions (UP)</div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Wins: {upTrades.win} · Losses: {upTrades.loss}
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-white">{upTrades.winRate}%</div>
            <div className="text-[10px] text-slate-500">Directional Accuracy</div>
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-rose-400 font-bold">▼ SHORT Predictions (DOWN)</div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Wins: {downTrades.win} · Losses: {downTrades.loss}
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-white">{downTrades.winRate}%</div>
            <div className="text-[10px] text-slate-500">Directional Accuracy</div>
          </div>
        </div>
      </div>
    </div>
  );
};
