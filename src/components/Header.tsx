import React from 'react';
import { Activity, Volume2, VolumeX, Download, Terminal, BarChart2, Database, RefreshCw, Zap } from 'lucide-react';
import { MarketStats } from '../types';

interface HeaderProps {
  stats: MarketStats;
  wsConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab: 'terminal' | 'backtest' | 'ledger' | 'python_code' | 'rich_cli';
  onSelectTab: (tab: 'terminal' | 'backtest' | 'ledger' | 'python_code' | 'rich_cli') => void;
  confidenceThreshold: number;
  onChangeThreshold: (val: number) => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  wsConnected,
  soundEnabled,
  onToggleSound,
  activeTab,
  onSelectTab,
  confidenceThreshold,
  onChangeThreshold,
  onRefreshData,
  isRefreshing,
}) => {
  const isPositive24h = stats.change24hPercent >= 0;

  return (
    <header className="border-b border-slate-800/80 bg-[#0B111C]/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Khối bên trái: Logo & Các chỉ số giá thời gian thực */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-black text-sm shadow-md shadow-amber-500/20">
              ₿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-sans">
                  Dự Đoán BTC 5 Phút 2026
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  Binance USDⓈ-M
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>BTCUSDT.P</span>
                <span className="text-slate-600">/</span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  {wsConnected ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span>0ms Latency Stream</span>
                      {stats.latencyMs ? (
                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[10px]">
                          ⚡ {stats.latencyMs}ms
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold">Đang tự động kết nối lại WS...</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Các chỉ số thị trường trực tiếp */}
          <div className="flex items-center gap-4 lg:gap-6 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Giá Mark Price</div>
              <div className="font-bold text-sm lg:text-base text-white tabular-nums">
                ${stats.markPrice > 0 ? stats.markPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Biến Động 24h</div>
              <div className={`font-semibold tabular-nums ${isPositive24h ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive24h ? '+' : ''}{stats.change24hPercent.toFixed(2)}%
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Funding (8h)</div>
              <div className={`font-semibold tabular-nums ${stats.fundingRate >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {(stats.fundingRate * 100).toFixed(4)}%
              </div>
            </div>

            <div className="hidden xl:block">
              <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Hợp Đồng Mở (OI)</div>
              <div className="font-medium text-slate-300 tabular-nums">
                {stats.openInterest > 0 ? `${(stats.openInterest / 1000).toFixed(1)}k BTC` : '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Khối bên phải: Các tab điều hướng & Công cụ nhanh */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          {/* Thanh chuyển tab */}
          <nav className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => onSelectTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'terminal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Terminal Trực Tiếp</span>
            </button>

            <button
              onClick={() => onSelectTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sổ Cái 5 Phút</span>
            </button>

            <button
              onClick={() => onSelectTab('backtest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'backtest'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Phòng Backtest</span>
            </button>

            <button
              onClick={() => onSelectTab('python_code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'python_code'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Mã Python .py</span>
            </button>

            <button
              onClick={() => onSelectTab('rich_cli')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'rich_cli'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Giả Lập CLI</span>
            </button>
          </nav>

          {/* Thanh trượt điều chỉnh ngưỡng độ tin cậy */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
            <span className="text-slate-400 text-[11px] font-sans">Ngưỡng Lọc:</span>
            <input
              type="range"
              min="0.50"
              max="0.80"
              step="0.01"
              value={confidenceThreshold}
              onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
              className="w-16 accent-emerald-400 cursor-pointer h-1"
            />
            <span className="font-bold text-emerald-400 tabular-nums">{(confidenceThreshold * 100).toFixed(0)}%</span>
          </div>

          {/* Nút bật/tắt âm thanh tín hiệu */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Tắt âm thanh thông báo tín hiệu' : 'Bật âm thanh thông báo tín hiệu'}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Nút tải lại dữ liệu & Retrain */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Làm mới dữ liệu nến và huấn luyện lại"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
