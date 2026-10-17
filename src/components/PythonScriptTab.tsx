import React, { useState } from 'react';
import { PYTHON_SCRIPT_CODE } from '../services/pythonScriptSource';
import { Download, Copy, Check, Terminal, FileCode, FolderTree, Play, ShieldAlert, Cpu } from 'lucide-react';

export const PythonScriptTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([PYTHON_SCRIPT_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'btc_5m_predictor_production.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-6 flex flex-col gap-6 shadow-lg shadow-black/20">
      {/* Top Banner & Quick Download Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <FileCode className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-mono">
                btc_5m_predictor_production.py
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                All-in-One Production Script
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans mt-1 max-w-2xl leading-relaxed">
              Complete standalone Python script with Binance Futures combined WebSockets, HistGradientBoosting classifier, Orderbook imbalance, CVD flow, SQLite persistence, and Rich CLI dashboard.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download .py File</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Execution Guide & Directory Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Run Commands Box */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold pb-1 border-b border-slate-800">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Execution in 1 Command</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            The script automatically detects missing packages, creates the virtual environment, and installs dependencies:
          </p>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 select-all font-bold">
            python3 btc_5m_predictor_production.py
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Requires Python 3.9+. No Binance API key or credentials required (Paper predictor).
          </div>
        </div>

        {/* Directory Output Structure */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold pb-1 border-b border-slate-800">
            <FolderTree className="w-4 h-4 text-sky-400" />
            <span>Automatic Directory Tree Created</span>
          </div>
          <pre className="text-[11px] text-slate-300 leading-tight">
{`.venv/
output/
├── btc5m.db          (SQLite verified predictions)
└── models/
    └── BTCUSDT_5m.joblib (Trained ML model)

logs/
├── runtime.log       (Background engine diagnostics)
└── BTCUSDT_5m.jsonl  (Realtime 5m settlement stream)`}
          </pre>
        </div>
      </div>

      {/* Code Inspection Container */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-200">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Source Code Preview (Single-file Production Script)
          </span>
          <span>{PYTHON_SCRIPT_CODE.split('\n').length} lines · ~21 KB</span>
        </div>

        <div className="relative rounded-lg border border-slate-800 bg-slate-950/90 max-h-[500px] overflow-y-auto font-mono text-xs p-4 text-slate-300 selection:bg-emerald-500/20">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">
            {PYTHON_SCRIPT_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};
