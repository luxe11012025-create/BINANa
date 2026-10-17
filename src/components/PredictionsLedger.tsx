import React, { useState } from 'react';
import { PredictionRecord } from '../types';
import { Database, Download, CheckCircle2, XCircle, Clock, Trash2, Filter } from 'lucide-react';

interface PredictionsLedgerProps {
  records: PredictionRecord[];
  onClearRecords: () => void;
  onExportJsonl: () => void;
}

export const PredictionsLedger: React.FC<PredictionsLedgerProps> = ({
  records,
  onClearRecords,
  onExportJsonl,
}) => {
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS' | 'PENDING'>('ALL');

  const settledRecords = records.filter(r => r.settled);
  const wins = settledRecords.filter(r => r.outcome === 'WIN').length;
  const losses = settledRecords.filter(r => r.outcome === 'LOSS').length;
  const flats = settledRecords.filter(r => r.outcome === 'FLAT').length;
  const pending = records.filter(r => !r.settled).length;

  const totalEvaluated = wins + losses;
  const winRate = totalEvaluated > 0 ? (wins / totalEvaluated) * 100 : 0;

  // Cumulative PnL calculation
  let cumReturn = 0;
  settledRecords.forEach(r => {
    if (r.priceChangePercent) {
      const isUp = r.predictedDirection === 'UP';
      const sign = isUp ? 1 : -1;
      cumReturn += r.priceChangePercent * sign;
    }
  });

  const filteredList = records.filter(r => {
    if (filterOutcome === 'ALL') return true;
    if (filterOutcome === 'WIN') return r.outcome === 'WIN';
    if (filterOutcome === 'LOSS') return r.outcome === 'LOSS';
    if (filterOutcome === 'PENDING') return !r.settled;
    return true;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-6 flex flex-col gap-5 shadow-lg shadow-black/20">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-mono">
              5-Minute Prediction Settlement Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Auto-evaluates Mark Price precisely 5 minutes after signal issuance · SQLite schema (<code className="text-slate-300">output/btc5m.db</code>)
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={onExportJsonl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSONL</span>
          </button>
          <button
            onClick={onClearRecords}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
            title="Clear ledger history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realized Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Win Rate</div>
          <div className={`text-xl font-black mt-1 ${winRate >= 55 ? 'text-emerald-400' : 'text-slate-200'}`}>
            {totalEvaluated > 0 ? `${winRate.toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            {wins}W / {losses}L / {flats}F
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Total Signals</div>
          <div className="text-xl font-black text-white mt-1">
            {records.length}
          </div>
          <div className="text-[10px] text-amber-400 mt-0.5 font-sans">
            {pending} currently pending
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Wins</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {wins}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5 font-sans">
            Successful 5m runs
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Losses</div>
          <div className="text-xl font-black text-rose-400 mt-1">
            {losses}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-0.5 font-sans">
            Adverse price delta
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Net Cumulative %</div>
          <div className={`text-xl font-black mt-1 ${cumReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cumReturn >= 0 ? '+' : ''}{cumReturn.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Sum of price moves
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div className="text-[10px] text-slate-400 font-sans uppercase">Audit Mode</div>
          <div className="text-sm font-bold text-amber-300 mt-1 truncate">
            Deterministic
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
            Post-candle mark price
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 w-fit text-xs font-mono">
        <span className="px-2 text-slate-500 flex items-center gap-1">
          <Filter className="w-3 h-3" />
        </span>
        {(['ALL', 'WIN', 'LOSS', 'PENDING'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterOutcome(f)}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterOutcome === f
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f === 'ALL' ? `All (${records.length})` : f === 'WIN' ? `Wins (${wins})` : f === 'LOSS' ? `Losses (${losses})` : `Pending (${pending})`}
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900/90 text-[11px] text-slate-400 border-b border-slate-800 uppercase font-sans">
              <tr>
                <th className="py-2.5 px-3">Signal ID</th>
                <th className="py-2.5 px-3">Time Issued</th>
                <th className="py-2.5 px-3">Signal</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3 text-right">Entry Price</th>
                <th className="py-2.5 px-3 text-right">Settle Price (5m)</th>
                <th className="py-2.5 px-3 text-right">Delta %</th>
                <th className="py-2.5 px-3 text-center">Status / Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No prediction records found for this filter. Signals trigger at 5m boundaries or via manual log button.
                  </td>
                </tr>
              ) : (
                filteredList.map((r) => {
                  const isWin = r.outcome === 'WIN';
                  const isLoss = r.outcome === 'LOSS';
                  const isPending = !r.settled;

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">{r.id}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.predictedDirection === 'UP'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.predictedDirection}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-medium">
                        ${r.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {r.settlementPrice
                          ? `$${r.settlementPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                          : <span className="text-amber-400/80 flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> In Progress</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.priceChangePercent !== undefined ? (
                          <span
                            className={`font-bold ${
                              r.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {r.priceChangePercent >= 0 ? '+' : ''}
                            {r.priceChangePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            <Clock className="w-3 h-3 animate-spin" /> PENDING
                          </span>
                        )}
                        {isWin && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> WIN
                          </span>
                        )}
                        {isLoss && (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> LOSS
                          </span>
                        )}
                        {r.outcome === 'FLAT' && (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] px-2 py-0.5 rounded bg-slate-800">
                            FLAT
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
