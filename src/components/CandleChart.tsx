import React, { useState, useRef, useMemo } from 'react';
import { Candle, TechnicalIndicators, MLPrediction } from '../types';
import { calculateEMA, calculateZigZagWaves, calculateWaveTrend } from '../services/quantEngine';

interface CandleChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators;
  prediction: MLPrediction | null;
  timeframe: '1m' | '5m' | '15m';
  onChangeTimeframe: (tf: '1m' | '5m' | '15m') => void;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  prediction,
  timeframe,
  onChangeTimeframe,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showEma, setShowEma] = useState(true);
  const [showZigZag, setShowZigZag] = useState(true);
  const [showWaveTrend, setShowWaveTrend] = useState(true);
  const [showBands, setShowBands] = useState(false);
  const [showCvd, setShowCvd] = useState(true);

  const displayCandles = useMemo(() => {
    return candles.slice(-48); // Show last 48 candles for crisp rendering
  }, [candles]);

  const { minPrice, maxPrice, maxVolume, priceRange } = useMemo(() => {
    if (displayCandles.length === 0) {
      return { minPrice: 0, maxPrice: 1, maxVolume: 1, priceRange: 1 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    displayCandles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    const padding = (max - min) * 0.08 || 10;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol * 1.2 || 1,
      priceRange: (max + padding) - (min - padding) || 1,
    };
  }, [displayCandles]);

  // Compute EMA series for the displayed slice
  const closes = displayCandles.map(c => c.close);
  const ema9Series = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21Series = useMemo(() => calculateEMA(closes, 21), [closes]);
  const ema50Series = useMemo(() => calculateEMA(closes, 50), [closes]);

  // Compute ZigZag Swing Waves & WaveTrend Oscillator
  const zigZagPoints = useMemo(() => calculateZigZagWaves(displayCandles, 2), [displayCandles]);
  const waveTrendSeries = useMemo(() => calculateWaveTrend(displayCandles), [displayCandles]);

  const width = 800;
  const height = 380;
  
  // Calculate heights for sub-panels
  const cvdHeight = showCvd ? 60 : 0;
  const wtHeight = showWaveTrend ? 60 : 0;
  const mainChartHeight = height - cvdHeight - wtHeight - 10;

  const candleCount = displayCandles.length;
  const candleWidth = candleCount > 0 ? (width / candleCount) * 0.65 : 8;
  const slotWidth = candleCount > 0 ? width / candleCount : 10;

  const getY = (price: number) => {
    return mainChartHeight - ((price - minPrice) / priceRange) * mainChartHeight;
  };

  const hoveredCandle = hoverIndex !== null && displayCandles[hoverIndex] ? displayCandles[hoverIndex] : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg shadow-black/20">
      {/* Chart Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-white font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            BTCUSDT.P Pro Waves Chart
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1m', '5m', '15m'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  timeframe === tf ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setShowZigZag(!showZigZag)}
            className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
              showZigZag ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            🌊 Sóng ZigZag
          </button>
          <button
            onClick={() => setShowWaveTrend(!showWaveTrend)}
            className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
              showWaveTrend ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            📊 Sóng WaveTrend
          </button>
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
              showEma ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            EMA (9/21/50)
          </button>
          <button
            onClick={() => setShowCvd(!showCvd)}
            className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
              showCvd ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            CVD Delta Flow
          </button>
        </div>
      </div>

      {/* Hover Information Header */}
      <div className="h-6 flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 px-1">
        {hoveredCandle ? (
          <div className="flex flex-wrap items-center gap-3">
            <span>O: <strong className="text-white">${hoveredCandle.open.toFixed(1)}</strong></span>
            <span>H: <strong className="text-white">${hoveredCandle.high.toFixed(1)}</strong></span>
            <span>L: <strong className="text-white">${hoveredCandle.low.toFixed(1)}</strong></span>
            <span>C: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>${hoveredCandle.close.toFixed(1)}</strong></span>
            <span>Vol: <strong className="text-slate-300">{hoveredCandle.volume.toFixed(2)} BTC</strong></span>
            <span>Time: <strong className="text-slate-300">{new Date(hoveredCandle.time).toLocaleTimeString()}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
            <span>Last: <strong className="text-white">${displayCandles[displayCandles.length - 1]?.close.toFixed(1) || '0'}</strong></span>
            <span className="text-indigo-300">EMA9: ${indicators.ema9.toFixed(1)}</span>
            <span className="text-amber-300">EMA21: ${indicators.ema21.toFixed(1)}</span>
            <span className="text-cyan-300">EMA50: ${indicators.ema50.toFixed(1)}</span>
            <span className="text-purple-300">WaveTrend: {waveTrendSeries[waveTrendSeries.length - 1]?.wt1.toFixed(1) || '0'}</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full min-h-[310px] mt-1 bg-slate-950/90 rounded-lg overflow-hidden border border-slate-800/80">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="zigZagGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const y = mainChartHeight * ratio;
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={i}>
                <line x1="0" y1={y} x2={width} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                <text x={width - 6} y={y - 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Volume Bars */}
          {displayCandles.map((c, i) => {
            const x = i * slotWidth + slotWidth / 2;
            const volHeight = (c.volume / maxVolume) * (mainChartHeight * 0.22);
            const isGreen = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - candleWidth / 2}
                y={mainChartHeight - volHeight}
                width={candleWidth}
                height={volHeight}
                fill={isGreen ? '#10b981' : '#f43f5e'}
                opacity="0.18"
              />
            );
          })}

          {/* Candlesticks */}
          {displayCandles.map((c, i) => {
            const x = i * slotWidth + slotWidth / 2;
            const isGreen = c.close >= c.open;
            const candleColor = isGreen ? '#10b981' : '#f43f5e';
            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            return (
              <g
                key={`candle-${i}`}
                onMouseEnter={() => setHoverIndex(i)}
                className="cursor-crosshair"
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="1"
                />
              </g>
            );
          })}

          {/* EMA Lines */}
          {showEma && (
            <>
              <polyline
                fill="none"
                stroke="#818cf8"
                strokeWidth="1.5"
                points={ema9Series.map((v, i) => `${i * slotWidth + slotWidth / 2},${getY(v)}`).join(' ')}
              />
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                points={ema21Series.map((v, i) => `${i * slotWidth + slotWidth / 2},${getY(v)}`).join(' ')}
              />
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                points={ema50Series.map((v, i) => `${i * slotWidth + slotWidth / 2},${getY(v)}`).join(' ')}
              />
            </>
          )}

          {/* Sóng Swing ZigZag Polyline Overlay */}
          {showZigZag && zigZagPoints.length >= 2 && (
            <g>
              <polyline
                fill="none"
                stroke="url(#zigZagGlow)"
                strokeWidth="2.5"
                strokeDasharray="0"
                points={zigZagPoints
                  .map(pt => `${pt.index * slotWidth + slotWidth / 2},${getY(pt.price)}`)
                  .join(' ')}
              />
              {/* Swing High / Low Pivot Nodes */}
              {zigZagPoints.map((pt, idx) => {
                const x = pt.index * slotWidth + slotWidth / 2;
                const y = getY(pt.price);
                const isHigh = pt.type === 'HIGH';
                return (
                  <g key={`zigzag-${idx}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={isHigh ? '#f43f5e' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={x - 12}
                      y={isHigh ? y - 18 : y + 6}
                      width="24"
                      height="13"
                      fill="#0f172a"
                      stroke={isHigh ? '#f43f5e' : '#10b981'}
                      strokeWidth="0.8"
                      rx="3"
                    />
                    <text
                      x={x}
                      y={isHigh ? y - 9 : y + 15}
                      fill={isHigh ? '#f43f5e' : '#10b981'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.label || (isHigh ? 'H' : 'L')}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Target TP & SL horizontal guides */}
          {prediction && prediction.direction !== 'NO_SIGNAL' && (
            <g>
              <line
                x1="0"
                y1={getY(prediction.targetPrice)}
                x2={width}
                y2={getY(prediction.targetPrice)}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text x={8} y={getY(prediction.targetPrice) - 4} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                TP: ${prediction.targetPrice.toFixed(1)}
              </text>

              <line
                x1="0"
                y1={getY(prediction.stopPrice)}
                x2={width}
                y2={getY(prediction.stopPrice)}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text x={8} y={getY(prediction.stopPrice) - 4} fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">
                SL: ${prediction.stopPrice.toFixed(1)}
              </text>
            </g>
          )}

          {/* Crosshair on hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={hoverIndex * slotWidth + slotWidth / 2}
                y1="0"
                x2={hoverIndex * slotWidth + slotWidth / 2}
                y2={height}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Sub-Panel 1: WaveTrend Oscillator Panel */}
          {showWaveTrend && (
            <g transform={`translate(0, ${mainChartHeight + 5})`}>
              <rect x="0" y="0" width={width} height={wtHeight} fill="#090d16" />
              <line x1="0" y1="0" x2={width} y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1={wtHeight / 2} x2={width} y2={wtHeight / 2} stroke="#334155" strokeDasharray="2 2" strokeWidth="0.8" />
              
              {/* Overbought / Oversold threshold lines */}
              <line x1="0" y1={wtHeight * 0.2} x2={width} y2={wtHeight * 0.2} stroke="#f43f5e" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />
              <line x1="0" y1={wtHeight * 0.8} x2={width} y2={wtHeight * 0.8} stroke="#10b981" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />

              <text x="8" y="14" fill="#a855f7" fontSize="9" fontFamily="monospace" fontWeight="bold">
                Sóng WaveTrend Momentum (WT1/WT2)
              </text>

              {/* WT1 Line (Purple) */}
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.5"
                points={waveTrendSeries.map((wt, idx) => {
                  const x = idx * slotWidth + slotWidth / 2;
                  const clampedWT = Math.max(-60, Math.min(60, wt.wt1));
                  const y = wtHeight / 2 - (clampedWT / 60) * (wtHeight / 2 - 4);
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* WT2 Line (Cyan) */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={waveTrendSeries.map((wt, idx) => {
                  const x = idx * slotWidth + slotWidth / 2;
                  const clampedWT = Math.max(-60, Math.min(60, wt.wt2));
                  const y = wtHeight / 2 - (clampedWT / 60) * (wtHeight / 2 - 4);
                  return `${x},${y}`;
                }).join(' ')}
              />
            </g>
          )}

          {/* Sub-Panel 2: CVD Delta Sub-Panel */}
          {showCvd && (
            <g transform={`translate(0, ${mainChartHeight + (showWaveTrend ? wtHeight : 0) + 5})`}>
              <rect x="0" y="0" width={width} height={cvdHeight} fill="#090d16" />
              <line x1="0" y1="0" x2={width} y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1={cvdHeight / 2} x2={width} y2={cvdHeight / 2} stroke="#334155" strokeDasharray="2 2" strokeWidth="0.8" />
              <text x="8" y="14" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                CVD (5m Taker Delta): {indicators.cvd5m > 0 ? '+' : ''}{indicators.cvd5m.toFixed(2)} BTC
              </text>

              {/* CVD Histogram bars */}
              {displayCandles.map((c, i) => {
                const x = i * slotWidth + slotWidth / 2;
                const isGreen = c.close >= c.open;
                const deltaProxy = (c.close - c.open) * (c.volume / (maxPrice - minPrice + 1));
                const midY = cvdHeight / 2;
                const barHeight = Math.min(cvdHeight / 2 - 4, Math.abs(deltaProxy) * 4);
                const barY = isGreen ? midY - barHeight : midY;

                return (
                  <rect
                    key={`cvd-${i}`}
                    x={x - candleWidth / 2}
                    y={barY}
                    width={candleWidth}
                    height={Math.max(1, barHeight)}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    rx="1"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

