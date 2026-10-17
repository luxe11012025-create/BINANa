import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldAlert, Sparkles, Clock, Target, Shield, Gauge } from 'lucide-react';
import { MLPrediction } from '../types';

interface SignalCardProps {
  prediction: MLPrediction | null;
  markPrice: number;
  confidenceThreshold: number;
  onLockSignal: () => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  prediction,
  markPrice,
  confidenceThreshold,
  onLockSignal,
}) => {
  const [countdown, setCountdown] = useState<string>('00:00');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const next5m = Math.ceil(now / 300000) * 300000;
      const diffSec = Math.max(0, Math.floor((next5m - now) / 1000));
      setSecondsLeft(diffSec);
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!prediction) {
    return (
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
        <div className="flex items-center gap-3 text-slate-400 font-mono text-sm">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tính toán xác suất định lượng Gradient Boosting thời gian thực...</span>
        </div>
      </div>
    );
  }

  const isUp = prediction.direction === 'UP';
  const isDown = prediction.direction === 'DOWN';
  const isNoSignal = prediction.direction === 'NO_SIGNAL';
  const probUpPercent = Math.round(prediction.probUp * 100);
  const probDownPercent = Math.round(prediction.probDown * 100);

  return (
    <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 lg:p-5 shadow-lg shadow-black/30">
      {/* Hiệu ứng màu nền định hướng */}
      {isUp && <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />}
      {isDown && <div className="absolute -right-16 -top-16 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />}

      {/* Tiêu đề thẻ & Đồng hồ đếm ngược nến 5m */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Động Cơ Đề Xuất Dựa Trên Lượng Mua Bán Khớp Lệnh Thực Tế (Execution Grounded AI)</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                100% Khớp Lệnh Binance
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Không Suy Đoán · Lọc Nhiễu Độ Tin Cậy {(confidenceThreshold * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Đếm ngược nến 5 phút kế tiếp */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px]">Nến 5m Kế Tiếp:</span>
          <span className={`font-bold tabular-nums ${secondsLeft <= 30 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
            {countdown}
          </span>
        </div>
      </div>

      {/* Khối hiển thị tín hiệu chính */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 items-center">
        {/* Hướng dự đoán */}
        <div className="md:col-span-4 flex flex-col justify-center">
          <div className="text-[10px] uppercase font-sans tracking-wider text-slate-400 mb-1">
            Đề Xuất Xu Hướng 5 Phút
          </div>

          {isUp && (
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ArrowUpRight className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight flex items-center gap-2">
                  TĂNG / LONG
                  <span className="text-xs font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-sans">Dòng tiền CVD mua chủ động & sổ lệnh Bid áp đảo</div>
              </div>
            </div>
          )}

          {isDown && (
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <ArrowDownRight className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-2xl font-black text-rose-400 font-mono tracking-tight flex items-center gap-2">
                  GIẢM / SHORT
                  <span className="text-xs font-normal px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-sans">Áp lực đè bán chiếm ưu thế & thủng ma trận EMA</div>
              </div>
            </div>
          )}

          {isNoSignal && (
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-7 h-7 stroke-[2]" />
              </div>
              <div>
                <div className="text-xl font-bold text-amber-300 font-mono tracking-tight">
                  KHÔNG CÓ TÍN HIỆU (ĐI NGANG)
                </div>
                <div className="text-xs text-slate-400 font-sans">
                  Độ tin cậy &lt; {(confidenceThreshold * 100).toFixed(0)}% (Hệ thống tự lọc bỏ nhiễu)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thanh phân phối xác suất */}
        <div className="md:col-span-5 px-0 md:px-3">
          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
            <span className="text-emerald-400 font-bold">Xác Suất TĂNG: {probUpPercent}%</span>
            <span className="text-slate-400 text-[11px]">Phân Phối Nhị Phân</span>
            <span className="text-rose-400 font-bold">Xác Suất GIẢM: {probDownPercent}%</span>
          </div>

          <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 relative"
              style={{ width: `${probUpPercent}%` }}
            >
              {probUpPercent >= 20 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-slate-950">
                  {probUpPercent}%
                </span>
              )}
            </div>
            <div
              className="bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500 relative"
              style={{ width: `${probDownPercent}%` }}
            >
              {probDownPercent >= 20 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-slate-950">
                  {probDownPercent}%
                </span>
              )}
            </div>
          </div>

          {/* Giá tham chiếu & kỳ vọng */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2">
            <span>Giá Vào Tham Chiếu: <strong className="text-white">${markPrice.toFixed(1)}</strong></span>
            <span>Biến Động Kỳ Vọng: <strong className="text-emerald-400">±{prediction.expectedMovePercent.toFixed(2)}%</strong></span>
          </div>
        </div>

        {/* Mục tiêu TP & Cắt lỗ SL */}
        <div className="md:col-span-3 flex flex-col justify-center gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Mục Tiêu (Chốt Lời TP):
            </span>
            <span className="text-emerald-400 font-bold tabular-nums">
              ${prediction.targetPrice.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              Ngưỡng Cắt Lỗ (SL):
            </span>
            <span className="text-rose-400 font-bold tabular-nums">
              ${prediction.stopPrice.toFixed(1)}
            </span>
          </div>

          <button
            onClick={onLockSignal}
            disabled={isNoSignal}
            className={`w-full py-1.5 px-3 rounded text-xs font-sans font-medium transition-all ${
              isNoSignal
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            + Lưu Vào Sổ Cái Đối Soát 5 Phút
          </button>
        </div>
      </div>

      {/* Banner Kết Luận Dòng Tiền Khớp Lệnh Thực Tế */}
      {prediction.orderFlowVerdict && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isUp ? 'bg-emerald-400 animate-ping' : isDown ? 'bg-rose-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">Khớp Lệnh Thực Tế 0ms:</span>
              <strong className={isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-300'}>
                {prediction.orderFlowVerdict}
              </strong>
            </div>
            {prediction.executionConvergenceRate !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
                Đồng Thuận: {(prediction.executionConvergenceRate * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Quick Real-Time Flow Stats Bar */}
          {prediction.realtimeFlow && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Mua Thực Tế (5m):</span>
                <strong className="text-emerald-400">+{prediction.realtimeFlow.buyVolume5m.toFixed(2)} BTC</strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Bán Thực Tế (5m):</span>
                <strong className="text-rose-400">-{prediction.realtimeFlow.sellVolume5m.toFixed(2)} BTC</strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>CVD Delta Ròng:</span>
                <strong className={prediction.realtimeFlow.netDelta5m >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {prediction.realtimeFlow.netDelta5m >= 0 ? '+' : ''}{prediction.realtimeFlow.netDelta5m.toFixed(2)} BTC
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Tốc Độ Khớp Lệnh:</span>
                <strong className="text-amber-300">{prediction.realtimeFlow.tradeVelocityBtcSec.toFixed(2)} BTC/s</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách phân rã trọng số định lượng */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Dữ Liệu Khớp Lệnh & Khối Lượng Thực Tế Binance (Grounded Trade Metrics):</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {prediction.features.map((f, idx) => {
            const isBullish = f.impact > 0;
            return (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/90 text-xs"
                title={f.description}
              >
                <div className="text-[10px] text-slate-400 truncate">{f.name}</div>
                <div className="font-mono font-semibold text-white text-xs mt-0.5 truncate">
                  {f.value}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isBullish ? '▲ Tăng (Ủng hộ)' : '▼ Giảm (Áp lực)'} ({Math.abs(f.impact).toFixed(2)})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
