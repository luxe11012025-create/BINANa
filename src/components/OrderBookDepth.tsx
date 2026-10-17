import React, { useState } from 'react';
import { OrderBook } from '../types';
import { Scale, ArrowUpDown, Layers, ListFilter } from 'lucide-react';
import { DepthWaveChart } from './DepthWaveChart';

interface OrderBookProps {
  orderBook: OrderBook;
  markPrice: number;
}

export const OrderBookDepth: React.FC<OrderBookProps> = ({ orderBook, markPrice }) => {
  const [viewMode, setViewMode] = useState<'table' | 'wave'>('table');

  const bids = orderBook.bids.slice(0, 8);
  const asks = orderBook.asks.slice(0, 8).reverse();

  const maxBidTotal = bids[bids.length - 1]?.total || 1;
  const maxAskTotal = orderBook.asks.slice(0, 8)[orderBook.asks.slice(0, 8).length - 1]?.total || 1;
  const maxDepthTotal = Math.max(maxBidTotal, maxAskTotal, 1);

  const isBidHeavy = orderBook.imbalance > 0;
  const bidRatioPercent = Math.round(((orderBook.imbalance + 1) / 2) * 100);
  const askRatioPercent = 100 - bidRatioPercent;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg shadow-black/20">
      {/* Tiêu đề & Chuyển đổi chế độ xem */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-white font-mono">Thanh Khoản & Sóng Độ Sâu</span>
        </div>

        {/* Segmented View Switcher */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              viewMode === 'table' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3 h-3" />
            <span>Sổ Lệnh</span>
          </button>
          <button
            onClick={() => setViewMode('wave')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              viewMode === 'wave' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>Sóng Depth</span>
          </button>
        </div>
      </div>

      {/* Thước đo lực mua/bán */}
      <div className="py-2.5">
        <div className="flex justify-between items-center text-[11px] font-mono mb-1">
          <span className="text-emerald-400 font-bold">Phe Mua {bidRatioPercent}%</span>
          <span className={`text-[10px] uppercase font-sans font-semibold ${isBidHeavy ? 'text-emerald-400' : 'text-rose-400'}`}>
            OBI: {(orderBook.imbalance * 100).toFixed(1)}%
          </span>
          <span className="text-rose-400 font-bold">Phe Bán {askRatioPercent}%</span>
        </div>

        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${bidRatioPercent}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${askRatioPercent}%` }}
          />
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'wave' ? (
        <div className="flex-1 min-h-[300px]">
          <DepthWaveChart orderBook={orderBook} markPrice={markPrice} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between font-mono text-xs overflow-hidden">
          {/* Phe Bán - Asks (Đỏ) */}
          <div className="flex flex-col gap-0.5">
            <div className="grid grid-cols-3 text-[10px] text-slate-400 font-sans pb-1 border-b border-slate-800/60">
              <span>Giá Bán (USDT)</span>
              <span className="text-right">Khối Lượng</span>
              <span className="text-right">Sóng Tích Lũy</span>
            </div>

            {asks.map((a, idx) => {
              const depthPct = (a.total / maxDepthTotal) * 100;
              return (
                <div key={`ask-${idx}`} className="relative grid grid-cols-3 py-0.5 px-1 hover:bg-slate-800/50 rounded text-[11px]">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none rounded"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="text-rose-400 font-medium z-10">${a.price.toFixed(1)}</span>
                  <span className="text-right text-slate-300 z-10">{a.quantity.toFixed(3)}</span>
                  <span className="text-right text-slate-400 z-10">{a.total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* Thanh giá Mark Price & Giá vi mô trung gian */}
          <div className="my-2 py-1.5 px-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">Mark:</span>
              <strong className="text-white">${markPrice.toFixed(1)}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Micro Price: <strong className="text-cyan-300">${orderBook.microPrice.toFixed(1)}</strong>
            </div>
          </div>

          {/* Phe Mua - Bids (Xanh lá) */}
          <div className="flex flex-col gap-0.5">
            {bids.map((b, idx) => {
              const depthPct = (b.total / maxDepthTotal) * 100;
              return (
                <div key={`bid-${idx}`} className="relative grid grid-cols-3 py-0.5 px-1 hover:bg-slate-800/50 rounded text-[11px]">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none rounded"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="text-emerald-400 font-medium z-10">${b.price.toFixed(1)}</span>
                  <span className="text-right text-slate-300 z-10">{b.quantity.toFixed(3)}</span>
                  <span className="text-right text-slate-400 z-10">{b.total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

