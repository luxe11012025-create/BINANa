export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
  trades?: number;
  quoteVolume?: number;
  takerBuyBaseVolume?: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  imbalance: number; // -1 (max ask pressure) to +1 (max bid pressure)
  bidVolumeTotal: number;
  askVolumeTotal: number;
  spread: number;
  spreadBps: number;
  microPrice: number;
}

export interface AggTrade {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean; // true = aggressive sell (Taker Sell), false = aggressive buy (Taker Buy)
}

export interface LargeTradeAlert {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuy: boolean;
  valueUsdt: number;
}

export interface RealtimeTradeFlow {
  buyVolume5m: number;         // Tổng BTC mua chủ động thực tế trong 5 phút
  sellVolume5m: number;        // Tổng BTC bán chủ động thực tế trong 5 phút
  totalVolume5m: number;       // Tổng khối lượng BTC khớp trong 5 phút
  buyRatio5m: number;          // Tỉ lệ mua thực tế (0 - 1)
  netDelta5m: number;          // Chênh lệch ròng mua - bán (CVD 5m)
  buyTrades5m: number;         // Số lượng lệnh mua khớp
  sellTrades5m: number;        // Số lượng lệnh bán khớp
  buyVolume1m: number;         // Tổng BTC mua chủ động trong 1 phút
  sellVolume1m: number;        // Tổng BTC bán chủ động trong 1 phút
  buyRatio1m: number;          // Tỉ lệ mua 1m
  netDelta1m: number;          // Delta 1m
  largeTrades: LargeTradeAlert[]; // Danh sách lệnh cá voi (>= 0.5 BTC)
  recentTape: AggTrade[];      // 30 lệnh khớp thời gian thực gần nhất
  tradeVelocityBtcSec: number; // Tốc độ khớp lệnh BTC/giây
}

export interface TechnicalIndicators {
  rsi14: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  atr14: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPercentB: number;
  bbBandwidth: number;
  cvd5m: number;
  cvd15m: number;
  cvdSlope: number; // positive = buy aggression, negative = sell aggression
  momentum5m: number;
  vwap: number;
}

export type SignalDirection = 'UP' | 'DOWN' | 'NO_SIGNAL';

export interface MLPrediction {
  timestamp: number;
  candleTime: number;
  direction: SignalDirection;
  probUp: number;
  probDown: number;
  confidence: number; // 0.0 to 1.0
  thresholdUsed: number;
  features: {
    name: string;
    value: number | string;
    impact: number; // -1 to +1 relative impact
    description: string;
  }[];
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  expectedMovePercent: number;
  takerBuyRatio?: number;
  executionConvergenceRate?: number;
  orderFlowVerdict?: string;
  realtimeFlow?: RealtimeTradeFlow;
}

export interface PredictionRecord {
  id: string;
  timestamp: number;
  candleCloseTime: number;
  evaluationTime: number;
  predictedDirection: 'UP' | 'DOWN';
  probUp: number;
  probDown: number;
  confidence: number;
  entryPrice: number;
  settlementPrice?: number;
  priceChangePercent?: number;
  outcome?: 'WIN' | 'LOSS' | 'PENDING' | 'FLAT';
  settled: boolean;
  targetPrice: number;
  stopPrice: number;
  indicatorsAtEntry: {
    rsi: number;
    cvd: number;
    imbalance: number;
    fundingRate: number;
  };
}

export interface MarketStats {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  openInterest: number;
  openInterestValue: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  change24hPercent: number;
  latencyMs?: number;
  wsEndpoint?: string;
}

export interface BacktestResult {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  equityCurve: { time: number; equity: number; price: number }[];
  upTrades: { win: number; loss: number; winRate: number };
  downTrades: { win: number; loss: number; winRate: number };
}
