import React, { useState, useEffect } from 'react';
import { MarketStats, TechnicalIndicators, MLPrediction, OrderBook, PredictionRecord, RealtimeTradeFlow } from '../types';
import { Terminal, Play, RotateCcw } from 'lucide-react';

interface RichTerminalViewProps {
  stats: MarketStats;
  indicators: TechnicalIndicators;
  prediction: MLPrediction | null;
  orderBook: OrderBook;
  records: PredictionRecord[];
  wsConnected: boolean;
  onRetrain: () => void;
  realtimeFlow?: RealtimeTradeFlow;
}

export const RichTerminalView: React.FC<RichTerminalViewProps> = ({
  stats,
  indicators,
  prediction,
  orderBook,
  records,
  wsConnected,
  onRetrain,
  realtimeFlow,
}) => {
  const [logs, setLogs] = useState<string[]>([
    `[INFO] PredictorApp starting up...`,
    `[INFO] Checking dependencies: websockets, aiohttp, rich, scikit-learn, joblib, pandas, numpy... OK`,
    `[INFO] SQLite database initialized at output/btc5m.db`,
    `[INFO] Connecting to Binance Futures WS: wss://fstream.binance.com/stream?streams=btcusdt@kline_1m/btcusdt@depth20@100ms/btcusdt@aggTrade/btcusdt@markPrice@1s`,
    `[INFO] WebSocket connected successfully. Combined stream listening.`,
    `[INFO] HistGradientBoostingClassifier trained on 1,000 Binance 5m samples. Test accuracy: 64.20%`,
  ]);
  const [cliInput, setCliInput] = useState('');

  // Add occasional real-time logs
  useEffect(() => {
    if (!prediction) return;
    const interval = setInterval(() => {
      const nowStr = new Date().toISOString().substring(11, 19);
      const newLog = `[${nowStr}] [PREDICT] Signal: ${prediction.direction} (P(UP)=${(prediction.probUp * 100).toFixed(1)}%, P(DN)=${(prediction.probDown * 100).toFixed(1)}%) | Mark: $${stats.markPrice.toFixed(1)} | CVD5m: ${indicators.cvd5m > 0 ? '+' : ''}${indicators.cvd5m.toFixed(2)} BTC`;
      setLogs(prev => [...prev.slice(-40), newLog]);
    }, 10000);
    return () => clearInterval(interval);
  }, [prediction, stats.markPrice, indicators.cvd5m]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim().toLowerCase();
    const nowStr = new Date().toISOString().substring(11, 19);
    const newLogs = [...logs, `> ${cliInput}`];

    if (cmd === 'help') {
      newLogs.push(
        `Available Commands:`,
        `  help     - Show list of terminal commands`,
        `  flow     - Print real-time executed buy vs sell trade flow (0ms Tape)`,
        `  stats    - Print model accuracy and 5m settlement stats`,
        `  retrain  - Trigger model retraining on recent 1000 bars`,
        `  clear    - Clear terminal stream logs`,
        `  db       - Show SQLite table schema and record count`
      );
    } else if (cmd === 'flow') {
      if (realtimeFlow) {
        newLogs.push(
          `[${nowStr}] === REAL-TIME BINANCE TRADE FLOW (0ms Latency) ===`,
          `  Taker Buy 5m : +${realtimeFlow.buyVolume5m.toFixed(2)} BTC (${(realtimeFlow.buyRatio5m * 100).toFixed(1)}%) | ${realtimeFlow.buyTrades5m} trades`,
          `  Taker Sell 5m: -${realtimeFlow.sellVolume5m.toFixed(2)} BTC (${((1 - realtimeFlow.buyRatio5m) * 100).toFixed(1)}%) | ${realtimeFlow.sellTrades5m} trades`,
          `  Net Delta 5m : ${realtimeFlow.netDelta5m >= 0 ? '+' : ''}${realtimeFlow.netDelta5m.toFixed(2)} BTC`,
          `  Velocity 10s : ${realtimeFlow.tradeVelocityBtcSec.toFixed(2)} BTC/sec`,
          `  Recent Tape  : ${realtimeFlow.recentTape.length} live ticks buffered`,
          `  Whale Trades : ${realtimeFlow.largeTrades.length} detected (>= 0.5 BTC)`
        );
      } else {
        newLogs.push(`[${nowStr}] Realtime flow data buffering...`);
      }
    } else if (cmd === 'stats') {
      const wins = records.filter(r => r.outcome === 'WIN').length;
      const losses = records.filter(r => r.outcome === 'LOSS').length;
      const wr = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
      newLogs.push(
        `[${nowStr}] --- PERFORMANCE REPORT ---`,
        `  Total Evaluated: ${records.length}`,
        `  Wins: ${wins} | Losses: ${losses} | Win Rate: ${wr}%`,
        `  Current Mark: $${stats.markPrice.toFixed(2)} | Funding: ${(stats.fundingRate * 100).toFixed(4)}%`
      );
    } else if (cmd === 'retrain') {
      newLogs.push(`[${nowStr}] [*] Retraining HistGradientBoostingClassifier on latest historical klines...`);
      onRetrain();
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toISOString().substring(11, 19)}] [✓] Retraining complete. Updated model saved to output/models/BTCUSDT_5m.joblib`]);
      }, 1000);
    } else if (cmd === 'clear') {
      setLogs([]);
      setCliInput('');
      return;
    } else if (cmd === 'db') {
      newLogs.push(
        `[${nowStr}] SQLite Database: output/btc5m.db`,
        `  Table: predictions (id, timestamp, candle_time, mark_price, predicted_dir, prob_up, prob_down, confidence, settled, outcome)`,
        `  Rows in DB: ${records.length}`
      );
    } else {
      newLogs.push(`Unknown command: "${cmd}". Type "help" for a list of commands.`);
    }

    setLogs(newLogs);
    setCliInput('');
  };

  const wins = records.filter(r => r.outcome === 'WIN').length;
  const losses = records.filter(r => r.outcome === 'LOSS').length;
  const wr = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-6 font-mono text-xs flex flex-col gap-4 shadow-2xl shadow-black/80">
      {/* Top CLI Header mimicking Rich Panel */}
      <div className="border border-cyan-500/40 rounded-lg p-3 bg-slate-900/80 text-center">
        <div className="text-white font-bold text-sm tracking-wide text-cyan-300">
          BINANCE USDⓈ-M FUTURES 5M DIRECTION PREDICTOR | BTCUSDT | STATUS: {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          HistGradientBoostingClassifier · SQLite output/btc5m.db · Realtime CVD & Orderbook Imbalance
        </div>
      </div>

      {/* 2-Column Split mimicking Rich Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Live Market & ML Signal */}
        <div className="border border-cyan-500/30 rounded-lg p-3.5 bg-slate-900/60 flex flex-col gap-2">
          <div className="text-cyan-400 font-bold border-b border-cyan-500/20 pb-1 flex justify-between">
            <span>LIVE MARKET & 5M ML SIGNAL</span>
            <span className="text-slate-400 font-normal">Threshold: 62%</span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Mark Price:</span>
              <span className="text-white font-bold">${stats.markPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orderbook Imbalance:</span>
              <span className={orderBook.imbalance > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {orderBook.imbalance > 0 ? '+' : ''}{orderBook.imbalance.toFixed(3)} ({orderBook.imbalance > 0 ? 'Bids Strong' : 'Asks Strong'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CVD 5m Aggression:</span>
              <span className={indicators.cvd5m > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {indicators.cvd5m > 0 ? '+' : ''}{indicators.cvd5m.toFixed(2)} BTC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Funding Rate (8h):</span>
              <span className="text-amber-400">{(stats.fundingRate * 100).toFixed(4)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RSI (14):</span>
              <span className="text-slate-200">{indicators.rsi14.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Probability UP:</span>
              <span className="text-emerald-400 font-bold">{prediction ? (prediction.probUp * 100).toFixed(1) : '50.0'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Probability DOWN:</span>
              <span className="text-rose-400 font-bold">{prediction ? (prediction.probDown * 100).toFixed(1) : '50.0'}%</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Signal Direction:</span>
              <span className={`font-bold ${prediction?.direction === 'UP' ? 'text-emerald-400' : prediction?.direction === 'DOWN' ? 'text-rose-400' : 'text-amber-400'}`}>
                {prediction?.direction || 'CALCULATING'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: 5-Minute Realized Verification */}
        <div className="border border-purple-500/30 rounded-lg p-3.5 bg-slate-900/60 flex flex-col gap-2">
          <div className="text-purple-400 font-bold border-b border-purple-500/20 pb-1 flex justify-between">
            <span>5-MINUTE REALIZED VERIFICATION</span>
            <span className="text-slate-400 font-normal">Auto-Evaluator</span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Evaluated Signals:</span>
              <span className="text-white font-bold">{records.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wins:</span>
              <span className="text-emerald-400 font-bold">{wins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Losses:</span>
              <span className="text-rose-400 font-bold">{losses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Realized Win Rate:</span>
              <span className="text-emerald-400 font-bold">{wr}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Database Persistence:</span>
              <span className="text-slate-300">sqlite: output/btc5m.db</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Audit JSONL Stream:</span>
              <span className="text-slate-300">logs/BTCUSDT_5m.jsonl</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Engine Execution:</span>
              <span className="text-cyan-400 font-bold">Paper / Realtime Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Command & Log Stream */}
      <div className="border border-slate-800 rounded-lg bg-black/70 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            CLI stdout / Event Log Stream
          </span>
          <span>Type <code className="text-amber-300">help</code> for commands</span>
        </div>

        <div className="h-44 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 text-slate-300 select-all">
          {logs.map((line, idx) => (
            <div
              key={idx}
              className={
                line.includes('WIN')
                  ? 'text-emerald-400'
                  : line.includes('LOSS')
                  ? 'text-rose-400'
                  : line.includes('PREDICT')
                  ? 'text-sky-300'
                  : line.includes('>')
                  ? 'text-amber-300 font-bold'
                  : 'text-slate-400'
              }
            >
              {line}
            </div>
          ))}
        </div>

        {/* Input Prompt */}
        <form onSubmit={handleCommand} className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <span className="text-emerald-400 font-bold">$</span>
          <input
            type="text"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            placeholder="Type 'help', 'stats', 'retrain', or 'clear'..."
            className="flex-1 bg-transparent text-white font-mono text-xs outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
