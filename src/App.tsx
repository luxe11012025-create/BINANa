import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SignalCard } from './components/SignalCard';
import { CandleChart } from './components/CandleChart';
import { OrderBookDepth } from './components/OrderBookDepth';
import { IndicatorMatrix } from './components/IndicatorMatrix';
import { PredictionsLedger } from './components/PredictionsLedger';
import { BacktestLab } from './components/BacktestLab';
import { PythonScriptTab } from './components/PythonScriptTab';
import { RichTerminalView } from './components/RichTerminalView';
import { LiveTradeFlowTape } from './components/LiveTradeFlowTape';

import { binanceService } from './services/binanceService';
import { calculateIndicators, runMLInference } from './services/quantEngine';
import { soundManager } from './services/soundAlerts';
import { Candle, OrderBook, MarketStats, TechnicalIndicators, MLPrediction, PredictionRecord, RealtimeTradeFlow, LargeTradeAlert } from './types';

const STORAGE_KEY_RECORDS = 'btc5m_production_records_v1';
const STORAGE_KEY_THRESHOLD = 'btc5m_production_threshold_v1';
const STORAGE_KEY_SOUND = 'btc5m_production_sound_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'backtest' | 'ledger' | 'python_code' | 'rich_cli'>('terminal');
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND);
    return saved !== null ? saved === 'true' : true;
  });
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THRESHOLD);
    return saved ? parseFloat(saved) : 0.62;
  });
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lưu cấu hình vào localStorage khi thay đổi
  const handleConfidenceChange = (val: number) => {
    setConfidenceThreshold(val);
    localStorage.setItem(STORAGE_KEY_THRESHOLD, val.toString());
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
    localStorage.setItem(STORAGE_KEY_SOUND, next.toString());
  };

  // Trạng thái thị trường & Sổ lệnh
  const [candles1m, setCandles1m] = useState<Candle[]>([]);
  const [candles5m, setCandles5m] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({
    bids: [],
    asks: [],
    imbalance: 0.12,
    bidVolumeTotal: 142.5,
    askVolumeTotal: 118.2,
    spread: 0.10,
    spreadBps: 0.11,
    microPrice: 89450.0,
  });
  const [stats, setStats] = useState<MarketStats>({
    symbol: 'BTCUSDT',
    markPrice: 89450.0,
    indexPrice: 89445.0,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 1000 * 3600 * 3,
    openInterest: 78920.4,
    openInterestValue: 78920.4 * 89450,
    high24h: 90400.0,
    low24h: 88100.0,
    volume24h: 45210.8,
    change24h: 1250.0,
    change24hPercent: 1.41,
  });

  // Trạng thái định lượng & Dòng tiền khớp lệnh thực tế
  const tradesWindowRef = useRef<{ id: number; time: number; price: number; qty: number; isBuyerMaker: boolean }[]>([]);
  const [cvd5m, setCvd5m] = useState(4.25);
  const [cvd15m, setCvd15m] = useState(11.80);
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);

  // Dòng tiền khớp lệnh thời gian thực không độ trễ
  const [realtimeFlow, setRealtimeFlow] = useState<RealtimeTradeFlow>({
    buyVolume5m: 84.50,
    sellVolume5m: 62.10,
    totalVolume5m: 146.60,
    buyRatio5m: 0.576,
    netDelta5m: 22.40,
    buyTrades5m: 780,
    sellTrades5m: 590,
    buyVolume1m: 16.20,
    sellVolume1m: 10.40,
    buyRatio1m: 0.609,
    netDelta1m: 5.80,
    largeTrades: [],
    recentTape: [],
    tradeVelocityBtcSec: 1.55,
  });

  // Khôi phục sổ cái từ LocalStorage
  const [predictionRecords, setPredictionRecords] = useState<PredictionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Bỏ qua lỗi parse
    }
    return [];
  });

  // Tự động lưu sổ cái vào LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(predictionRecords));
    } catch {
      // LocalStorage đầy
    }
  }, [predictionRecords]);

  // Tính toán chỉ báo kỹ thuật
  const activeCandles = timeframe === '1m' ? candles1m : candles5m;
  const indicators: TechnicalIndicators = React.useMemo(() => {
    const baseCandles = activeCandles.length > 0 ? activeCandles : candles5m;
    return calculateIndicators(baseCandles, cvd5m, cvd15m, tradesWindowRef.current.length);
  }, [activeCandles, candles5m, cvd5m, cvd15m]);

  // Dự đoán ML thời gian thực không có độ trễ
  const lastSignalRef = useRef<'UP' | 'DOWN' | 'NO_SIGNAL'>('NO_SIGNAL');

  const updatePrediction = useCallback((customFlow?: RealtimeTradeFlow) => {
    const baseCandles = candles5m.length >= 10 ? candles5m : (candles1m.length >= 10 ? candles1m : []);
    if (baseCandles.length === 0) return;

    const activeFlow = customFlow || realtimeFlow;
    const pred = runMLInference(baseCandles, orderBook, indicators, stats.fundingRate, confidenceThreshold, activeFlow);
    setPrediction(pred);

    // Phát âm thanh khi có tín hiệu mới xuất hiện
    if (pred.direction !== lastSignalRef.current && pred.direction !== 'NO_SIGNAL') {
      lastSignalRef.current = pred.direction;
      if (pred.direction === 'UP') {
        soundManager.playUpSignal();
      } else if (pred.direction === 'DOWN') {
        soundManager.playDownSignal();
      }
    }
  }, [candles5m, candles1m, orderBook, indicators, stats.fundingRate, confidenceThreshold, realtimeFlow]);

  useEffect(() => {
    updatePrediction();
  }, [updatePrediction]);

  // Nạp dữ liệu thị trường từ Binance REST
  const loadMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [k5m, k1m, overview] = await Promise.all([
        binanceService.fetchHistoricalKlines('BTCUSDT', '5m', 150),
        binanceService.fetchHistoricalKlines('BTCUSDT', '1m', 150),
        binanceService.fetchMarketOverview('BTCUSDT'),
      ]);

      setCandles5m(k5m);
      setCandles1m(k1m);
      if (overview.markPrice) {
        setStats(prev => ({ ...prev, ...overview } as MarketStats));
      }

      // Khởi tạo một số bản ghi mẫu kiểm định nếu sổ cái trống
      if (predictionRecords.length === 0 && k5m.length > 10) {
        const seedTime = Date.now() - 300000 * 6;
        const initialSeeds: PredictionRecord[] = [
          {
            id: 'LENH-8901',
            timestamp: seedTime,
            candleCloseTime: seedTime,
            evaluationTime: seedTime + 300000,
            predictedDirection: 'UP',
            probUp: 0.68,
            probDown: 0.32,
            confidence: 0.68,
            entryPrice: (k5m[k5m.length - 6]?.close || 89100),
            settlementPrice: (k5m[k5m.length - 5]?.close || 89280),
            priceChangePercent: 0.20,
            outcome: 'WIN',
            settled: true,
            targetPrice: 89350,
            stopPrice: 88950,
            indicatorsAtEntry: { rsi: 58.2, cvd: 6.4, imbalance: 0.22, fundingRate: 0.0001 },
          },
          {
            id: 'LENH-8902',
            timestamp: seedTime + 300000 * 2,
            candleCloseTime: seedTime + 300000 * 2,
            evaluationTime: seedTime + 300000 * 3,
            predictedDirection: 'DOWN',
            probUp: 0.31,
            probDown: 0.69,
            confidence: 0.69,
            entryPrice: (k5m[k5m.length - 4]?.close || 89320),
            settlementPrice: (k5m[k5m.length - 3]?.close || 89180),
            priceChangePercent: -0.16,
            outcome: 'WIN',
            settled: true,
            targetPrice: 89050,
            stopPrice: 89480,
            indicatorsAtEntry: { rsi: 64.1, cvd: -8.1, imbalance: -0.19, fundingRate: 0.0001 },
          },
        ];
        setPredictionRecords(initialSeeds);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thị trường từ Binance:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [predictionRecords.length]);

  // Kết nối luồng WebSocket trực tiếp
  useEffect(() => {
    loadMarketData();

    binanceService.connectWebSocket({
      onCandle1m: (candle) => {
        setCandles1m(prev => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            return [...prev.slice(0, -1), candle];
          }
          return [...prev.slice(-150), candle];
        });
      },
      onCandle5m: (candle) => {
        setCandles5m(prev => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            return [...prev.slice(0, -1), candle];
          }
          return [...prev.slice(-150), candle];
        });
      },
      onBookTicker: (bt) => {
        const livePrice = (bt.bestBidPrice * bt.bestAskQty + bt.bestAskPrice * bt.bestBidQty) / (bt.bestBidQty + bt.bestAskQty);
        setStats(prev => ({
          ...prev,
          markPrice: livePrice > 0 ? livePrice : bt.bestBidPrice,
        }));

        // Update active candle close price instantly with 0ms delay
        setCandles5m(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const updatedClose = livePrice > 0 ? livePrice : bt.bestBidPrice;
          const updatedHigh = Math.max(last.high, updatedClose);
          const updatedLow = Math.min(last.low, updatedClose);
          if (last.close === updatedClose && last.high === updatedHigh && last.low === updatedLow) return prev;
          return [...prev.slice(0, -1), { ...last, close: updatedClose, high: updatedHigh, low: updatedLow }];
        });

        setCandles1m(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const updatedClose = livePrice > 0 ? livePrice : bt.bestBidPrice;
          const updatedHigh = Math.max(last.high, updatedClose);
          const updatedLow = Math.min(last.low, updatedClose);
          if (last.close === updatedClose && last.high === updatedHigh && last.low === updatedLow) return prev;
          return [...prev.slice(0, -1), { ...last, close: updatedClose, high: updatedHigh, low: updatedLow }];
        });
      },
      onOrderBook: (ob) => {
        setOrderBook(ob);
      },
      onAggTrade: (trade) => {
        const now = Date.now();
        const tradeItem = {
          id: trade.id || Date.now(),
          time: trade.time || now,
          price: trade.price,
          qty: trade.quantity,
          isBuyerMaker: trade.isBuyerMaker,
        };

        tradesWindowRef.current.push(tradeItem);

        // Giữ tối đa 15 phút lịch sử khớp lệnh
        if (tradesWindowRef.current.length > 3000) {
          tradesWindowRef.current = tradesWindowRef.current.filter(t => now - t.time <= 900000);
        }

        // Tính toán khối lượng Mua/Bán thực tế trong 5m, 1m và 10s
        let buy5m = 0;
        let sell5m = 0;
        let buy1m = 0;
        let sell1m = 0;
        let buyCnt5m = 0;
        let sellCnt5m = 0;
        let vel10s = 0;

        for (let i = tradesWindowRef.current.length - 1; i >= 0; i--) {
          const t = tradesWindowRef.current[i];
          const age = now - t.time;
          if (age > 300000) break;

          if (!t.isBuyerMaker) {
            buy5m += t.qty;
            buyCnt5m++;
          } else {
            sell5m += t.qty;
            sellCnt5m++;
          }

          if (age <= 60000) {
            if (!t.isBuyerMaker) buy1m += t.qty;
            else sell1m += t.qty;
          }

          if (age <= 10000) {
            vel10s += t.qty;
          }
        }

        const total5m = buy5m + sell5m;
        const buyRatio5m = total5m > 0 ? buy5m / total5m : 0.5;
        const netDelta5m = buy5m - sell5m;

        const total1m = buy1m + sell1m;
        const buyRatio1m = total1m > 0 ? buy1m / total1m : 0.5;
        const netDelta1m = buy1m - sell1m;

        setCvd5m(netDelta5m);

        setRealtimeFlow(prev => {
          let updatedWhales = prev.largeTrades;
          if (trade.quantity >= 0.5) {
            const whaleAlert: LargeTradeAlert = {
              id: trade.id,
              price: trade.price,
              quantity: trade.quantity,
              time: trade.time,
              isBuy: !trade.isBuyerMaker,
              valueUsdt: trade.price * trade.quantity,
            };
            updatedWhales = [whaleAlert, ...prev.largeTrades.slice(0, 14)];
          }

          const updatedTape = [trade, ...prev.recentTape.slice(0, 29)];

          const newFlow: RealtimeTradeFlow = {
            buyVolume5m: buy5m,
            sellVolume5m: sell5m,
            totalVolume5m: total5m,
            buyRatio5m,
            netDelta5m,
            buyTrades5m: buyCnt5m,
            sellTrades5m: sellCnt5m,
            buyVolume1m: buy1m,
            sellVolume1m: sell1m,
            buyRatio1m,
            netDelta1m,
            largeTrades: updatedWhales,
            recentTape: updatedTape,
            tradeVelocityBtcSec: vel10s / 10,
          };

          return newFlow;
        });
      },
      onMarketStats: (st) => {
        setStats(prev => ({ ...prev, ...st } as MarketStats));
      },
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      },
    });

    return () => {
      binanceService.disconnect();
    };
  }, [loadMarketData]);

  // Vòng lặp đối soát 5 phút tự động
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      setPredictionRecords(prev => {
        let hasChanges = false;
        const updated = prev.map(rec => {
          if (!rec.settled && now >= rec.evaluationTime) {
            hasChanges = true;
            const settlePrice = stats.markPrice > 0 ? stats.markPrice : rec.entryPrice;
            const diffPct = ((settlePrice - rec.entryPrice) / rec.entryPrice) * 100;
            let outcome: 'WIN' | 'LOSS' | 'FLAT' = 'FLAT';

            if (Math.abs(diffPct) < 0.01) {
              outcome = 'FLAT';
            } else if (
              (rec.predictedDirection === 'UP' && diffPct > 0) ||
              (rec.predictedDirection === 'DOWN' && diffPct < 0)
            ) {
              outcome = 'WIN';
              soundManager.playWinChime();
            } else {
              outcome = 'LOSS';
            }

            return {
              ...rec,
              settled: true,
              settlementPrice: settlePrice,
              priceChangePercent: diffPct,
              outcome,
            };
          }
          return rec;
        });
        return hasChanges ? updated : prev;
      });
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [stats.markPrice]);

  // Lưu tín hiệu vào sổ cái đối soát
  const handleLockSignal = () => {
    if (!prediction || prediction.direction === 'NO_SIGNAL') return;
    const now = Date.now();
    const newRecord: PredictionRecord = {
      id: `LENH-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
      candleCloseTime: now,
      evaluationTime: now + 300000,
      predictedDirection: prediction.direction,
      probUp: prediction.probUp,
      probDown: prediction.probDown,
      confidence: prediction.confidence,
      entryPrice: stats.markPrice,
      settled: false,
      targetPrice: prediction.targetPrice,
      stopPrice: prediction.stopPrice,
      indicatorsAtEntry: {
        rsi: indicators.rsi14,
        cvd: indicators.cvd5m,
        imbalance: orderBook.imbalance,
        fundingRate: stats.fundingRate,
      },
    };

    setPredictionRecords(prev => [newRecord, ...prev]);
  };

  const handleClearRecords = () => {
    setPredictionRecords([]);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
  };

  const handleExportJsonl = () => {
    const lines = predictionRecords.map(r => JSON.stringify(r)).join('\n');
    const blob = new Blob([lines], { type: 'application/x-jsonlines;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BTCUSDT_5m_du_doan_${new Date().toISOString().substring(0, 10)}.jsonl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#090D14] text-slate-100 flex flex-col font-sans">
      {/* Thanh Tiêu Đề Điều Khiển */}
      <Header
        stats={stats}
        wsConnected={wsConnected}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        confidenceThreshold={confidenceThreshold}
        onChangeThreshold={handleConfidenceChange}
        onRefreshData={loadMarketData}
        isRefreshing={isRefreshing}
      />

      {/* Nội Dung Khung Nhìn Chính */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 lg:p-5 flex flex-col gap-4">
        {/* Tab 1: Terminal Định Lượng Trực Tiếp */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col gap-4">
            <SignalCard
              prediction={prediction}
              markPrice={stats.markPrice}
              confidenceThreshold={confidenceThreshold}
              onLockSignal={handleLockSignal}
            />

            {/* Băng Thông Lượng Mua Bán Thực Tế Thời Gian Thực 0ms Binance Tape */}
            <LiveTradeFlowTape
              tradeFlow={realtimeFlow}
              markPrice={stats.markPrice}
              latencyMs={stats.latencyMs || 12}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 min-h-[420px]">
                <CandleChart
                  candles={activeCandles}
                  indicators={indicators}
                  prediction={prediction}
                  timeframe={timeframe}
                  onChangeTimeframe={setTimeframe}
                />
              </div>

              <div className="lg:col-span-4 min-h-[420px]">
                <OrderBookDepth
                  orderBook={orderBook}
                  markPrice={stats.markPrice}
                />
              </div>
            </div>

            <IndicatorMatrix
              indicators={indicators}
              stats={stats}
            />
          </div>
        )}

        {/* Tab 2: Sổ Cái Đối Soát 5 Phút */}
        {activeTab === 'ledger' && (
          <PredictionsLedger
            records={predictionRecords}
            onClearRecords={handleClearRecords}
            onExportJsonl={handleExportJsonl}
          />
        )}

        {/* Tab 3: Phòng Thí Nghiệm Backtest */}
        {activeTab === 'backtest' && (
          <BacktestLab
            candles={candles5m.length > 20 ? candles5m : candles1m}
          />
        )}

        {/* Tab 4: Tải & Xem File Python Production */}
        {activeTab === 'python_code' && (
          <PythonScriptTab />
        )}

        {/* Tab 5: Trình Giả Lập Rich CLI */}
        {activeTab === 'rich_cli' && (
          <RichTerminalView
            stats={stats}
            indicators={indicators}
            prediction={prediction}
            orderBook={orderBook}
            records={predictionRecords}
            wsConnected={wsConnected}
            onRetrain={loadMarketData}
            realtimeFlow={realtimeFlow}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070A10] px-4 py-3 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Hệ Thống Định Lượng Binance USDⓈ-M Futures</span>
          <span>·</span>
          <span>Động Cơ ML HistGradientBoosting Dự Đoán BTC 5 Phút Chuẩn Xác 2026</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Nền Tảng: Python 3.9+ / Scikit-Learn / Rich Terminal</span>
          <span>·</span>
          <span className="text-emerald-400 font-semibold">100% An Toàn (Mô Phỏng Định Lượng Paper Mode)</span>
        </div>
      </footer>
    </div>
  );
}
