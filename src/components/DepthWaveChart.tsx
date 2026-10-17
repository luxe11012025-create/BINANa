import React, { useState, useMemo } from 'react';
import { OrderBook } from '../types';
import { Layers, Zap, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface DepthWaveChartProps {
  orderBook: OrderBook;
  markPrice: number;
}

export const DepthWaveChart: React.FC<DepthWaveChartProps> = ({ orderBook, markPrice }) => {
  const [zoomRange, setZoomRange] = useState<number>(0.015); // Default 1.5% depth window
  const [hoverData, setHoverData] = useState<{
    price: number;
    volume: number;
    cumulative: number;
    side: 'BID' | 'ASK';
    diffPercent: number;
  } | null>(null);

  // Process Bid and Ask depth curves
  const { bidsCurve, asksCurve, maxDepthVolume, midPrice } = useMemo(() => {
    const activeMid = markPrice > 0 ? markPrice : (orderBook.microPrice > 0 ? orderBook.microPrice : 89500);

    const minPriceLimit = activeMid * (1 - zoomRange);
    const maxPriceLimit = activeMid * (1 + zoomRange);

    // Filter bids within zoom window and compute cumulative totals
    const filteredBids = orderBook.bids
      .filter(b => b.price >= minPriceLimit)
      .sort((a, b) => b.price - a.price); // Descending price (closest to mid first)

    let bidCum = 0;
    const bidsCurve = filteredBids.map(b => {
      bidCum += b.quantity;
      return {
        price: b.price,
        quantity: b.quantity,
        cumulative: bidCum,
      };
    });

    // Filter asks within zoom window and compute cumulative totals
    const filteredAsks = orderBook.asks
      .filter(a => a.price <= maxPriceLimit)
      .sort((a, b) => a.price - b.price); // Ascending price (closest to mid first)

    let askCum = 0;
    const asksCurve = filteredAsks.map(a => {
      askCum += a.quantity;
      return {
        price: a.price,
        quantity: a.quantity,
        cumulative: askCum,
      };
    });

    const maxCum = Math.max(bidCum, askCum, 1);

    return {
      bidsCurve,
      asksCurve,
      maxDepthVolume: maxCum,
      midPrice: activeMid,
    };
  }, [orderBook.bids, orderBook.asks, markPrice, orderBook.microPrice, zoomRange]);

  // SVG Geometry Constants
  const width = 800;
  const height = 320;
  const paddingX = 40;
  const chartWidth = width - paddingX * 2;
  const midX = width / 2;

  const minPriceView = midPrice * (1 - zoomRange);
  const maxPriceView = midPrice * (1 + zoomRange);
  const totalPriceRange = maxPriceView - minPriceView;

  const getX = (price: number) => {
    const ratio = (price - minPriceView) / totalPriceRange;
    return paddingX + ratio * chartWidth;
  };

  const getY = (cumVolume: number) => {
    const ratio = Math.min(1, cumVolume / maxDepthVolume);
    return height - 30 - ratio * (height - 60);
  };

  // Build SVG Path strings for Bids (Green area) and Asks (Red area)
  const bidsPath = useMemo(() => {
    if (bidsCurve.length === 0) return '';
    let path = `M ${midX} ${height - 30}`;
    bidsCurve.forEach(pt => {
      const x = getX(pt.price);
      const y = getY(pt.cumulative);
      path += ` L ${x} ${y}`;
    });
    // Close area to left bottom corner and mid bottom
    const leftmostX = getX(bidsCurve[bidsCurve.length - 1]?.price || minPriceView);
    path += ` L ${leftmostX} ${height - 30} Z`;
    return path;
  }, [bidsCurve, midX, minPriceView, maxDepthVolume]);

  const asksPath = useMemo(() => {
    if (asksCurve.length === 0) return '';
    let path = `M ${midX} ${height - 30}`;
    asksCurve.forEach(pt => {
      const x = getX(pt.price);
      const y = getY(pt.cumulative);
      path += ` L ${x} ${y}`;
    });
    const rightmostX = getX(asksCurve[asksCurve.length - 1]?.price || maxPriceView);
    path += ` L ${rightmostX} ${height - 30} Z`;
    return path;
  }, [asksCurve, midX, maxPriceView, maxDepthVolume]);

  // Find wall spikes (top 5% depth volume levels)
  const bidWall = useMemo(() => {
    if (bidsCurve.length === 0) return null;
    return [...bidsCurve].sort((a, b) => b.quantity - a.quantity)[0];
  }, [bidsCurve]);

  const askWall = useMemo(() => {
    if (asksCurve.length === 0) return null;
    return [...asksCurve].sort((a, b) => b.quantity - a.quantity)[0];
  }, [asksCurve]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-xl shadow-black/30">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
            Biểu Đồ Sóng Độ Sâu Sổ Lệnh Binance (Depth Wave)
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
            <span>0ms WS Depth</span>
          </span>
        </div>

        {/* Zoom Level Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Biên độ sóng:</span>
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            {[
              { label: '±0.5%', val: 0.005 },
              { label: '±1.5%', val: 0.015 },
              { label: '±3.0%', val: 0.030 },
              { label: '±5.0%', val: 0.050 },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setZoomRange(item.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  zoomRange === item.val
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Depth Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3 font-mono text-[11px]">
        <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-lg flex flex-col">
          <span className="text-slate-400 text-[10px]">Tường Mua Lớn Nhất (Bid Wall)</span>
          {bidWall ? (
            <span className="text-emerald-400 font-bold">
              ${bidWall.price.toFixed(1)} ({bidWall.quantity.toFixed(2)} BTC)
            </span>
          ) : (
            <span className="text-slate-500">Đang quét...</span>
          )}
        </div>

        <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-lg flex flex-col">
          <span className="text-slate-400 text-[10px]">Tường Bán Lớn Nhất (Ask Wall)</span>
          {askWall ? (
            <span className="text-rose-400 font-bold">
              ${askWall.price.toFixed(1)} ({askWall.quantity.toFixed(2)} BTC)
            </span>
          ) : (
            <span className="text-slate-500">Đang quét...</span>
          )}
        </div>

        <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-lg flex flex-col">
          <span className="text-slate-400 text-[10px]">Tổng Thanh Khoản Mua (Bids)</span>
          <span className="text-emerald-300 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {bidsCurve[bidsCurve.length - 1]?.cumulative.toFixed(2) || '0.00'} BTC
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-lg flex flex-col">
          <span className="text-slate-400 text-[10px]">Tổng Thanh Khoản Bán (Asks)</span>
          <span className="text-rose-300 font-bold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            {asksCurve[asksCurve.length - 1]?.cumulative.toFixed(2) || '0.00'} BTC
          </span>
        </div>
      </div>

      {/* SVG Depth Wave Area */}
      <div className="relative flex-1 w-full min-h-[260px] bg-slate-950 rounded-lg border border-slate-800/90 overflow-hidden">
        {/* Tooltip Overlay */}
        {hoverData && (
          <div className="absolute top-2 left-2 z-20 px-3 py-1.5 bg-slate-900/95 border border-slate-700 rounded shadow-lg text-[11px] font-mono backdrop-blur">
            <div className="flex items-center gap-2">
              <span className={hoverData.side === 'BID' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                [{hoverData.side === 'BID' ? 'PHE MUA' : 'PHE BÁN'}]
              </span>
              <span>Giá: <strong className="text-white">${hoverData.price.toFixed(1)}</strong></span>
              <span>Khối lượng tịnh: <strong className="text-amber-300">{hoverData.volume.toFixed(3)} BTC</strong></span>
              <span>Tích lũy sóng: <strong className="text-cyan-300">{hoverData.cumulative.toFixed(2)} BTC</strong></span>
              <span className="text-slate-400">({hoverData.diffPercent > 0 ? '+' : ''}{hoverData.diffPercent.toFixed(2)}%)</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          onMouseLeave={() => setHoverData(null)}
        >
          <defs>
            {/* Bid Wave Gradient (Green) */}
            <linearGradient id="bidDepthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>

            {/* Ask Wave Gradient (Red) */}
            <linearGradient id="askDepthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Background Lines */}
          {[0.25, 0.5, 0.75].map((ratio, idx) => {
            const y = height - 30 - ratio * (height - 60);
            const volLabel = (ratio * maxDepthVolume).toFixed(1);
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                <text x={paddingX - 6} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                  {volLabel}
                </text>
              </g>
            );
          })}

          {/* Bid Wave Shape */}
          {bidsPath && (
            <path
              d={bidsPath}
              fill="url(#bidDepthGradient)"
              stroke="#10b981"
              strokeWidth="2"
            />
          )}

          {/* Ask Wave Shape */}
          {asksPath && (
            <path
              d={asksPath}
              fill="url(#askDepthGradient)"
              stroke="#f43f5e"
              strokeWidth="2"
            />
          )}

          {/* Center Mid-Price Axis Line */}
          <line
            x1={midX}
            y1={20}
            x2={midX}
            y2={height - 30}
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <rect
            x={midX - 45}
            y={10}
            width="90"
            height="18"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1"
            rx="4"
          />
          <text
            x={midX}
            y={22}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            ${midPrice.toFixed(1)}
          </text>

          {/* Wall Highlights on Wave Curves */}
          {bidWall && (
            <g>
              <circle
                cx={getX(bidWall.price)}
                cy={getY(bidWall.cumulative)}
                r="4"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <line
                x1={getX(bidWall.price)}
                y1={getY(bidWall.cumulative)}
                x2={getX(bidWall.price)}
                y2={height - 30}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
            </g>
          )}

          {askWall && (
            <g>
              <circle
                cx={getX(askWall.price)}
                cy={getY(askWall.cumulative)}
                r="4"
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <line
                x1={getX(askWall.price)}
                y1={getY(askWall.cumulative)}
                x2={getX(askWall.price)}
                y2={height - 30}
                stroke="#f43f5e"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Interactive Hover Hit Area Boxes */}
          {bidsCurve.map((pt, i) => {
            const x = getX(pt.price);
            const y = getY(pt.cumulative);
            const diffPct = ((pt.price - midPrice) / midPrice) * 100;

            return (
              <rect
                key={`bid-hit-${i}`}
                x={x - 4}
                y={20}
                width={8}
                height={height - 50}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() =>
                  setHoverData({
                    price: pt.price,
                    volume: pt.quantity,
                    cumulative: pt.cumulative,
                    side: 'BID',
                    diffPercent: diffPct,
                  })
                }
              />
            );
          })}

          {asksCurve.map((pt, i) => {
            const x = getX(pt.price);
            const y = getY(pt.cumulative);
            const diffPct = ((pt.price - midPrice) / midPrice) * 100;

            return (
              <rect
                key={`ask-hit-${i}`}
                x={x - 4}
                y={20}
                width={8}
                height={height - 50}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() =>
                  setHoverData({
                    price: pt.price,
                    volume: pt.quantity,
                    cumulative: pt.cumulative,
                    side: 'ASK',
                    diffPercent: diffPct,
                  })
                }
              />
            );
          })}

          {/* X-Axis Price Labels */}
          <line x1={paddingX} y1={height - 30} x2={width - paddingX} y2={height - 30} stroke="#334155" strokeWidth="1" />
          <text x={paddingX} y={height - 14} fill="#10b981" fontSize="10" fontFamily="monospace">
            ${minPriceView.toFixed(0)} (-{(zoomRange * 100).toFixed(1)}%)
          </text>
          <text x={width - paddingX} y={height - 14} fill="#f43f5e" fontSize="10" fontFamily="monospace" textAnchor="end">
            ${maxPriceView.toFixed(0)} (+{(zoomRange * 100).toFixed(1)}%)
          </text>
        </svg>
      </div>

      {/* Footer Info Legend */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Sóng Lệnh Mua (Bids)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Sóng Lệnh Bán (Asks)
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-[10px]">
          <Info className="w-3 h-3" />
          <span>Biểu đồ tự động làm tươi theo chu kỳ 100ms từ Binance Futures WS</span>
        </div>
      </div>
    </div>
  );
};
