import React, { useState } from 'react';
import { RealtimeTradeFlow, LargeTradeAlert, AggTrade } from '../types';
import { Activity, Zap, TrendingUp, TrendingDown, ShieldAlert, Radio, Volume2 } from 'lucide-react';

interface LiveTradeFlowTapeProps {
  tradeFlow: RealtimeTradeFlow;
  markPrice: number;
  latencyMs?: number;
}

export const LiveTradeFlowTape: React.FC<LiveTradeFlowTapeProps> = ({
  tradeFlow,
  markPrice,
  latencyMs = 12,
}) => {
  const [tapeView, setTapeView] = useState<'tape' | 'whales'>('tape');

  const buyPercent = Math.round(tradeFlow.buyRatio5m * 100);
  const sellPercent = 100 - buyPercent;
  const isBuyerDominant = tradeFlow.netDelta5m >= 0;

  const buyUsdt = tradeFlow.buyVolume5m * markPrice;
  const sellUsdt = tradeFlow.sellVolume5m * markPrice;
  const netDeltaUsdt = Math.abs(tradeFlow.netDelta5m) * markPrice;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl shadow-black/30">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Lượng Mua Bán Thực Tế Thời Gian Thực (0ms Latency)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Binance Tape
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Đo lường 100% khớp lệnh Taker Buy vs Taker Sell trực tiếp qua WebSocket
            </div>
          </div>
        </div>

        {/* Latency & Velocity Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-slate-400">Độ trễ:</span>
            <strong className="text-emerald-400 font-bold">{latencyMs}ms</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10px] text-slate-400">Tốc độ:</span>
            <strong className="text-cyan-300 font-bold">{tradeFlow.tradeVelocityBtcSec.toFixed(2)} BTC/s</strong>
          </div>
        </div>
      </div>

      {/* Primary Buy vs Sell Volume Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
        {/* Khối Lượng Mua Thực Tế (Taker Buy) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <TrendingUp className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Tổng Lượng Mua Thực Tế (Taker Buy)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
              {buyPercent}%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
              +{tradeFlow.buyVolume5m.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-300 font-bold">BTC</span>
            <span className="text-xs text-slate-400 ml-auto font-sans">
              ≈ ${(buyUsdt / 1_000_000).toFixed(2)}M USDT
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
            <span>Số lệnh mua quét Ask: <strong className="text-emerald-300">{tradeFlow.buyTrades5m.toLocaleString()}</strong></span>
            <span>Khớp 1m: <strong className="text-emerald-400">+{tradeFlow.buyVolume1m.toFixed(2)} BTC</strong></span>
          </div>
        </div>

        {/* Khối Lượng Bán Thực Tế (Taker Sell) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 border border-rose-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <TrendingDown className="w-24 h-24 text-rose-400" />
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-rose-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Tổng Lượng Bán Thực Tế (Taker Sell)
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30">
              {sellPercent}%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl lg:text-3xl font-black text-rose-400 tracking-tight">
              -{tradeFlow.sellVolume5m.toFixed(2)}
            </span>
            <span className="text-xs text-rose-300 font-bold">BTC</span>
            <span className="text-xs text-slate-400 ml-auto font-sans">
              ≈ ${(sellUsdt / 1_000_000).toFixed(2)}M USDT
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
            <span>Số lệnh bán xả Bid: <strong className="text-rose-300">{tradeFlow.sellTrades5m.toLocaleString()}</strong></span>
            <span>Khớp 1m: <strong className="text-rose-400">-{tradeFlow.sellVolume1m.toFixed(2)} BTC</strong></span>
          </div>
        </div>
      </div>

      {/* Dual Volume Flow Meter & CVD Delta Bar */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Chênh Lệch Lượng Mua - Bán Ròng (CVD Real-Time):</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs border ${
              isBuyerDominant
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {tradeFlow.netDelta5m >= 0 ? '+' : ''}{tradeFlow.netDelta5m.toFixed(2)} BTC 
              ({isBuyerDominant ? 'MUA ÁP ĐẢO' : 'BÁN ÁP ĐẢO'})
            </span>
          </div>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Tổng 5m: <strong className="text-white">{tradeFlow.totalVolume5m.toFixed(2)} BTC</strong>
          </span>
        </div>

        {/* Visual Dual Progress Bar */}
        <div className="h-4 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 h-full rounded-l-full transition-all duration-150 flex items-center justify-start pl-2 text-[9px] font-bold text-slate-950 shadow-lg shadow-emerald-500/20"
            style={{ width: `${Math.max(12, Math.min(88, buyPercent))}%` }}
          >
            MUA {buyPercent}%
          </div>
          <div
            className="bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 h-full rounded-r-full transition-all duration-150 flex items-center justify-end pr-2 text-[9px] font-bold text-white shadow-lg shadow-rose-500/20"
            style={{ width: `${Math.max(12, Math.min(88, sellPercent))}%` }}
          >
            BÁN {sellPercent}%
          </div>
        </div>
      </div>

      {/* Live Trade Tape & Whale Alerts Tabs */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden font-mono">
        <div className="flex items-center justify-between p-2.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTapeView('tape')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                tapeView === 'tape'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Dòng Lệnh Khớp Tức Thì (Tape 0ms)</span>
              <span className="px-1 py-0.2 rounded bg-slate-950 text-[10px] text-slate-300">
                {tradeFlow.recentTape.length}
              </span>
            </button>

            <button
              onClick={() => setTapeView('whales')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                tapeView === 'whales'
                  ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Lệnh Cá Voi Khớp Lớn (≥ 0.5 BTC)</span>
              <span className="px-1 py-0.2 rounded bg-slate-950 text-[10px] text-amber-300">
                {tradeFlow.largeTrades.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Khớp lệnh trực tiếp Binance Futures
          </span>
        </div>

        {/* Content View */}
        <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-800/40 text-xs">
          {tapeView === 'tape' ? (
            tradeFlow.recentTape.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                Đang chờ lệnh khớp thời gian thực từ WebSocket...
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-slate-900">
                {tradeFlow.recentTape.slice(0, 15).map((t, idx) => {
                  const isBuy = !t.isBuyerMaker;
                  const dateStr = new Date(t.time).toLocaleTimeString('vi-VN', { hour12: false }) + '.' + String(t.time % 1000).padStart(3, '0');
                  const value = t.price * t.quantity;
                  const isLarge = t.quantity >= 0.5;

                  return (
                    <div
                      key={`tape-${t.id || idx}`}
                      className={`px-3 py-1.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors ${
                        isLarge ? (isBuy ? 'bg-emerald-950/20' : 'bg-rose-950/20') : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{dateStr}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isBuy ? 'MUA' : 'BÁN'}
                        </span>
                        {isLarge && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                            WHALE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-200 font-semibold">${t.price.toFixed(1)}</span>
                        <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.quantity.toFixed(3)} BTC
                        </span>
                        <span className="text-slate-400 text-[11px] w-20 text-right">
                          ${(value / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            tradeFlow.largeTrades.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                Chưa có giao dịch cá voi ≥ 0.5 BTC nào trong các nến gần đây. Đang quét...
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {tradeFlow.largeTrades.map((lt, idx) => (
                  <div
                    key={`whale-${lt.id || idx}`}
                    className="px-3 py-2 flex items-center justify-between hover:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">
                        {new Date(lt.time).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lt.isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {lt.isBuy ? 'CÁ VOI MUA (TAKER LONG)' : 'CÁ VOI XẢ (TAKER SHORT)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">${lt.price.toFixed(1)}</span>
                      <span className={`font-black text-sm ${lt.isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {lt.quantity.toFixed(3)} BTC
                      </span>
                      <span className="text-amber-300 text-xs font-semibold">
                        ${(lt.valueUsdt / 1000).toFixed(1)}k USDT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
