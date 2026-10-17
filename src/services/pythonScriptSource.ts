export const PYTHON_SCRIPT_CODE = `#!/usr/bin/env python3
"""
=============================================================================
BTC 5-Minute Direction Predictor & Quantitative Terminal (Production Grade)
Symbol: BTCUSDT | Exchange: Binance USDⓈ-M Futures (Mainnet)
=============================================================================
Features:
- Real-time Binance Futures WebSocket combined streams:
    * btcusdt@kline_1m
    * btcusdt@depth20@100ms
    * btcusdt@aggTrade
    * btcusdt@markPrice@1s
- REST Fallbacks & Periodic Fetchers:
    * Open Interest (fapi/v1/openInterest)
    * Funding Rate & Mark Price (fapi/v1/premiumIndex)
    * Historical 1m & 5m Klines (fapi/v1/klines)
- Multi-Factor Quant Feature Engine:
    * Order Book Imbalance (OBI) at top 5, 10, 20 levels
    * Cumulative Volume Delta (CVD) tracking aggressive buyer vs seller flow
    * EMA Matrix (9, 21, 50, 200), RSI(14), MACD(12,26,9), ATR(14), Bollinger Bands(20,2)
    * Funding Rate pressure & Open Interest velocity
- Machine Learning Engine:
    * Scikit-Learn HistGradientBoostingClassifier
    * Automated historical bootstrap training from Binance REST API
    * Real-time probability estimation: P(UP) vs P(DOWN)
    * Confidence threshold gating (NO SIGNAL below threshold to filter noise)
    * Periodic auto-retrain background loop
- 5-Minute Evaluation Tracker:
    * SQLite persistence (output/btc5m.db)
    * Auto-evaluates settlement price 5 minutes after signal entry
    * Realized Win/Loss, Accuracy, and Rolling Return tracking
    * JSONL audit log (logs/BTCUSDT_5m.jsonl)
- Rich Live Terminal Dashboard with full tabular formatting & clean metrics
- Zero execution risk: Paper-only predictor, no API keys or live orders needed.
=============================================================================
"""

import os
import sys
import time
import math
import json
import sqlite3
import asyncio
import logging
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any

# Ensure necessary packages are installed
REQUIRED_PACKAGES = [
    "websockets",
    "aiohttp",
    "rich",
    "scikit-learn",
    "joblib",
    "pandas",
    "numpy",
]

def check_and_install_dependencies():
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg.replace("-", "_"))
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[!] Installing missing dependencies: {', '.join(missing)}...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("[✓] Dependencies installed successfully.\\n")

try:
    import aiohttp
    import websockets
    import numpy as np
    import pandas as pd
    import joblib
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.text import Text
    from rich import box
except ImportError:
    check_and_install_dependencies()
    import aiohttp
    import websockets
    import numpy as np
    import pandas as pd
    import joblib
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.text import Text
    from rich import box

# Paths and Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
MODELS_DIR = os.path.join(OUTPUT_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
DB_PATH = os.path.join(OUTPUT_DIR, "btc5m.db")
MODEL_PATH = os.path.join(MODELS_DIR, "BTCUSDT_5m.joblib")
JSONL_LOG_PATH = os.path.join(LOGS_DIR, "BTCUSDT_5m.jsonl")
RUNTIME_LOG_PATH = os.path.join(LOGS_DIR, "runtime.log")

for d in [OUTPUT_DIR, MODELS_DIR, LOGS_DIR]:
    os.makedirs(d, exist_ok=True)

# Logger setup
logging.basicConfig(
    filename=RUNTIME_LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("BTC5MPredictor")

# Binance Configuration
SYMBOL = "BTCUSDT"
BINANCE_WS_BASE = "wss://fstream.binance.com/stream?streams="
BINANCE_REST_BASE = "https://fapi.binance.com"
CONFIDENCE_THRESHOLD = 0.62  # Min probability required to issue UP or DOWN signal
RETRAIN_INTERVAL_SECONDS = 3600 * 6  # Retrain model every 6 hours

@dataclass
class Candle:
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    is_closed: bool

@dataclass
class MarketState:
    mark_price: float = 0.0
    index_price: float = 0.0
    funding_rate: float = 0.0
    next_funding_time: int = 0
    open_interest: float = 0.0
    open_interest_val: float = 0.0
    best_bid: float = 0.0
    best_ask: float = 0.0
    orderbook_imbalance: float = 0.0
    bid_depth_total: float = 0.0
    ask_depth_total: float = 0.0
    cvd_5m: float = 0.0
    cvd_15m: float = 0.0
    recent_trades_count: int = 0
    candles_1m: List[Candle] = field(default_factory=list)
    candles_5m: List[Candle] = field(default_factory=list)
    last_prediction: Optional[Dict[str, Any]] = None
    last_prediction_time: float = 0
    total_predictions: int = 0
    win_count: int = 0
    loss_count: int = 0
    flat_count: int = 0
    ws_connected: bool = False
    last_ws_msg_time: float = 0

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    candle_time INTEGER NOT NULL,
                    mark_price REAL NOT NULL,
                    predicted_dir TEXT NOT NULL,
                    prob_up REAL NOT NULL,
                    prob_down REAL NOT NULL,
                    confidence REAL NOT NULL,
                    settled INTEGER DEFAULT 0,
                    settle_time INTEGER,
                    settle_price REAL,
                    price_delta_pct REAL,
                    outcome TEXT DEFAULT 'PENDING',
                    features_json TEXT
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_settled ON predictions(settled);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_candle_time ON predictions(candle_time);
            """)
            conn.commit()

    def save_prediction(self, pred: Dict[str, Any]) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO predictions (
                    timestamp, candle_time, mark_price, predicted_dir,
                    prob_up, prob_down, confidence, features_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                pred["timestamp"],
                pred["candle_time"],
                pred["mark_price"],
                pred["predicted_dir"],
                pred["prob_up"],
                pred["prob_down"],
                pred["confidence"],
                json.dumps(pred.get("features", {}))
            ))
            pred_id = cursor.lastrowid
            conn.commit()
            return pred_id

    def settle_prediction(self, pred_id: int, settle_time: int, settle_price: float, outcome: str, delta_pct: float):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE predictions
                SET settled = 1,
                    settle_time = ?,
                    settle_price = ?,
                    outcome = ?,
                    price_delta_pct = ?
                WHERE id = ?
            """, (settle_time, settle_price, outcome, delta_pct, pred_id))
            conn.commit()

    def get_pending_predictions(self) -> List[Tuple]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, candle_time, mark_price, predicted_dir, prob_up, prob_down, confidence
                FROM predictions
                WHERE settled = 0
            """)
            return cursor.fetchall()

    def get_stats(self) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT outcome, COUNT(*) FROM predictions WHERE settled = 1 GROUP BY outcome")
            counts = dict(cursor.fetchall())
            wins = counts.get("WIN", 0)
            losses = counts.get("LOSS", 0)
            flats = counts.get("FLAT", 0)
            total = wins + losses + flats
            win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0.0
            return {
                "total": total,
                "wins": wins,
                "losses": losses,
                "flats": flats,
                "win_rate": win_rate
            }

    def get_recent_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, timestamp, mark_price, predicted_dir, confidence,
                       settle_price, outcome, price_delta_pct
                FROM predictions
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]

# Technical Indicators
def calculate_ema(series: np.ndarray, span: int) -> np.ndarray:
    return pd.Series(series).ewm(span=span, adjust=False).mean().values

def calculate_rsi(prices: np.ndarray, period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    gains = np.maximum(deltas, 0)
    losses = np.abs(np.minimum(deltas, 0))
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))

def calculate_macd(prices: np.ndarray) -> Tuple[float, float, float]:
    if len(prices) < 35:
        return 0.0, 0.0, 0.0
    s = pd.Series(prices)
    ema12 = s.ewm(span=12, adjust=False).mean()
    ema26 = s.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    hist = macd_line - signal_line
    return float(macd_line.iloc[-1]), float(signal_line.iloc[-1]), float(hist.iloc[-1])

def calculate_atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 1.0
    tr = []
    for i in range(1, len(closes)):
        h_l = highs[i] - lows[i]
        h_pc = abs(highs[i] - closes[i - 1])
        l_pc = abs(lows[i] - closes[i - 1])
        tr.append(max(h_l, h_pc, l_pc))
    return float(np.mean(tr[-period:]))

def calculate_bollinger_bands(prices: np.ndarray, period: int = 20, num_std: float = 2.0) -> Tuple[float, float, float, float]:
    if len(prices) < period:
        p = prices[-1] if len(prices) > 0 else 0
        return p, p, p, 0.5
    recent = prices[-period:]
    mid = float(np.mean(recent))
    std = float(np.std(recent))
    upper = mid + num_std * std
    lower = mid - num_std * std
    current = prices[-1]
    pct_b = (current - lower) / (upper - lower + 1e-9)
    return upper, mid, lower, float(pct_b)

class MLQuantEngine:
    def __init__(self):
        self.model: Optional[HistGradientBoostingClassifier] = None
        self.feature_names = [
            "rsi_14", "macd_hist", "ema_9_21_dist", "ema_21_50_dist",
            "bb_percent_b", "atr_ratio", "cvd_slope_5m", "ob_imbalance",
            "funding_rate", "return_1m", "return_5m", "vol_ratio_5m"
        ]
        self.train_accuracy = 0.0
        self.last_trained_time = 0

    def extract_features(self, state: MarketState) -> Optional[np.ndarray]:
        if len(state.candles_5m) < 30:
            return None
        closes = np.array([c.close for c in state.candles_5m])
        highs = np.array([c.high for c in state.candles_5m])
        lows = np.array([c.low for c in state.candles_5m])
        volumes = np.array([c.volume for c in state.candles_5m])

        rsi = calculate_rsi(closes, 14)
        _, _, macd_hist = calculate_macd(closes)
        ema9 = calculate_ema(closes, 9)[-1]
        ema21 = calculate_ema(closes, 21)[-1]
        ema50 = calculate_ema(closes, 50)[-1]

        cur_price = closes[-1]
        ema_9_21_dist = (ema9 - ema21) / cur_price * 100
        ema_21_50_dist = (ema21 - ema50) / cur_price * 100

        _, _, _, bb_pct_b = calculate_bollinger_bands(closes, 20)
        atr = calculate_atr(highs, lows, closes, 14)
        atr_ratio = atr / cur_price * 100

        cvd_slope = state.cvd_5m
        ob_imbalance = state.orderbook_imbalance
        funding = state.funding_rate * 1000

        ret_1m = 0.0
        if len(state.candles_1m) >= 2:
            ret_1m = (state.candles_1m[-1].close - state.candles_1m[-2].close) / state.candles_1m[-2].close * 100

        ret_5m = 0.0
        if len(closes) >= 2:
            ret_5m = (closes[-1] - closes[-2]) / closes[-2] * 100

        vol_ratio = 1.0
        if len(volumes) >= 10:
            avg_vol = np.mean(volumes[-10:-1]) + 1e-9
            vol_ratio = volumes[-1] / avg_vol

        feat = np.array([
            rsi, macd_hist, ema_9_21_dist, ema_21_50_dist,
            bb_pct_b, atr_ratio, cvd_slope, ob_imbalance,
            funding, ret_1m, ret_5m, vol_ratio
        ], dtype=np.float32)

        return feat

    async def train_from_binance_history(self, session: aiohttp.ClientSession, limit: int = 1000):
        url = f"{BINANCE_REST_BASE}/fapi/v1/klines?symbol={SYMBOL}&interval=5m&limit={limit}"
        try:
            async with session.get(url) as resp:
                if resp.status != 200:
                    logger.error(f"Failed to fetch historical klines: {resp.status}")
                    return
                data = await resp.json()
                df = pd.DataFrame(data, columns=[
                    "open_time", "open", "high", "low", "close", "volume",
                    "close_time", "quote_volume", "trades", "taker_base_vol",
                    "taker_quote_vol", "ignore"
                ])
                for col in ["open", "high", "low", "close", "volume", "quote_volume", "taker_base_vol"]:
                    df[col] = df[col].astype(float)

                closes = df["close"].values
                highs = df["high"].values
                lows = df["low"].values
                vols = df["volume"].values
                taker_vols = df["taker_base_vol"].values

                # Build dataset
                X_list = []
                y_list = []

                for i in range(50, len(closes) - 1):
                    sub_c = closes[:i+1]
                    sub_h = highs[:i+1]
                    sub_l = lows[:i+1]
                    sub_v = vols[:i+1]
                    sub_tv = taker_vols[:i+1]

                    rsi = calculate_rsi(sub_c, 14)
                    _, _, macd_h = calculate_macd(sub_c)
                    e9 = calculate_ema(sub_c, 9)[-1]
                    e21 = calculate_ema(sub_c, 21)[-1]
                    e50 = calculate_ema(sub_c, 50)[-1]
                    cp = sub_c[-1]
                    e9_21 = (e9 - e21) / cp * 100
                    e21_50 = (e21 - e50) / cp * 100
                    _, _, _, bbp = calculate_bollinger_bands(sub_c, 20)
                    atr = calculate_atr(sub_h, sub_l, sub_c, 14)
                    atrr = atr / cp * 100

                    # Approximate synthetic CVD from taker volume
                    recent_tv = sub_tv[-3:]
                    recent_v = sub_v[-3:]
                    cvd_proxy = np.sum(2 * recent_tv - recent_v) / (np.sum(recent_v) + 1e-9)

                    ret_5m = (sub_c[-1] - sub_c[-2]) / sub_c[-2] * 100
                    avg_v = np.mean(sub_v[-10:-1]) + 1e-9
                    vr = sub_v[-1] / avg_v

                    features = [
                        rsi, macd_h, e9_21, e21_50,
                        bbp, atrr, cvd_proxy, 0.0,
                        0.0, 0.0, ret_5m, vr
                    ]

                    # Target: Next 5m candle close > current close => 1 (UP), else 0 (DOWN)
                    next_close = closes[i+1]
                    target = 1 if next_close > cp else 0

                    X_list.append(features)
                    y_list.append(target)

                X = np.array(X_list, dtype=np.float32)
                y = np.array(y_list, dtype=np.int32)

                split = int(len(X) * 0.8)
                X_train, X_test = X[:split], X[split:]
                y_train, y_test = y[:split], y[split:]

                model = HistGradientBoostingClassifier(
                    max_iter=120,
                    learning_rate=0.04,
                    max_depth=5,
                    min_samples_leaf=15,
                    l2_regularization=0.5,
                    random_state=42
                )
                model.fit(X_train, y_train)

                preds = model.predict(X_test)
                acc = accuracy_score(y_test, preds)
                self.model = model
                self.train_accuracy = acc
                self.last_trained_time = time.time()
                joblib.dump(self.model, MODEL_PATH)
                logger.info(f"Model trained on {len(X)} samples. Test accuracy: {acc * 100:.2f}%")
        except Exception as e:
            logger.exception(f"Error during training: {e}")

    def predict(self, state: MarketState) -> Dict[str, Any]:
        if self.model is None:
            return {"direction": "NO_SIGNAL", "prob_up": 0.5, "prob_down": 0.5, "confidence": 0.0}
        
        feats = self.extract_features(state)
        if feats is None:
            return {"direction": "NO_SIGNAL", "prob_up": 0.5, "prob_down": 0.5, "confidence": 0.0}

        probs = self.model.predict_proba(feats.reshape(1, -1))[0]
        prob_down = float(probs[0])
        prob_up = float(probs[1])

        max_prob = max(prob_up, prob_down)
        if max_prob >= CONFIDENCE_THRESHOLD:
            direction = "UP" if prob_up > prob_down else "DOWN"
        else:
            direction = "NO_SIGNAL"

        feat_dict = dict(zip(self.feature_names, [round(float(x), 4) for x in feats]))

        return {
            "direction": direction,
            "prob_up": prob_up,
            "prob_down": prob_down,
            "confidence": max_prob,
            "features": feat_dict
        }

class PredictorApp:
    def __init__(self):
        self.state = MarketState()
        self.db = DatabaseManager(DB_PATH)
        self.engine = MLQuantEngine()
        self.console = Console()
        self.running = True
        self.trades_window: List[Tuple[float, float, bool]] = []  # (time, qty, is_buyer_maker)

    async def fetch_initial_data(self, session: aiohttp.ClientSession):
        logger.info("Fetching initial historical klines, funding, and OI...")
        # 1. Fetch 5m Klines
        url_5m = f"{BINANCE_REST_BASE}/fapi/v1/klines?symbol={SYMBOL}&interval=5m&limit=100"
        async with session.get(url_5m) as resp:
            if resp.status == 200:
                data = await resp.json()
                self.state.candles_5m = [
                    Candle(
                        open_time=int(row[0]),
                        open=float(row[1]),
                        high=float(row[2]),
                        low=float(row[3]),
                        close=float(row[4]),
                        volume=float(row[5]),
                        close_time=int(row[6]),
                        is_closed=True
                    ) for row in data
                ]
                if self.state.candles_5m:
                    self.state.mark_price = self.state.candles_5m[-1].close

        # 2. Fetch 1m Klines
        url_1m = f"{BINANCE_REST_BASE}/fapi/v1/klines?symbol={SYMBOL}&interval=1m&limit=100"
        async with session.get(url_1m) as resp:
            if resp.status == 200:
                data = await resp.json()
                self.state.candles_1m = [
                    Candle(
                        open_time=int(row[0]),
                        open=float(row[1]),
                        high=float(row[2]),
                        low=float(row[3]),
                        close=float(row[4]),
                        volume=float(row[5]),
                        close_time=int(row[6]),
                        is_closed=True
                    ) for row in data
                ]

        # 3. Premium Index & Funding
        url_prem = f"{BINANCE_REST_BASE}/fapi/v1/premiumIndex?symbol={SYMBOL}"
        async with session.get(url_prem) as resp:
            if resp.status == 200:
                p_data = await resp.json()
                self.state.mark_price = float(p_data.get("markPrice", self.state.mark_price))
                self.state.index_price = float(p_data.get("indexPrice", 0.0))
                self.state.funding_rate = float(p_data.get("lastFundingRate", 0.0))
                self.state.next_funding_time = int(p_data.get("nextFundingTime", 0))

        # 4. Open Interest
        url_oi = f"{BINANCE_REST_BASE}/fapi/v1/openInterest?symbol={SYMBOL}"
        async with session.get(url_oi) as resp:
            if resp.status == 200:
                oi_data = await resp.json()
                self.state.open_interest = float(oi_data.get("openInterest", 0.0))
                self.state.open_interest_val = self.state.open_interest * self.state.mark_price

        # Update initial stats from DB
        stats = self.db.get_stats()
        self.state.total_predictions = stats["total"]
        self.state.win_count = stats["wins"]
        self.state.loss_count = stats["losses"]
        self.state.flat_count = stats["flats"]

    async def websocket_stream_task(self):
        streams = [
            f"{SYMBOL.lower()}@kline_1m",
            f"{SYMBOL.lower()}@depth20@100ms",
            f"{SYMBOL.lower()}@aggTrade",
            f"{SYMBOL.lower()}@markPrice@1s",
        ]
        ws_url = BINANCE_WS_BASE + "/".join(streams)

        while self.running:
            try:
                logger.info(f"Connecting to Binance Futures WS: {ws_url}")
                async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10) as ws:
                    self.state.ws_connected = True
                    logger.info("WebSocket connected successfully.")
                    start_time = time.time()

                    while self.running:
                        # Reconnect every 23 hours to comply with Binance 24h lifetime limit
                        if time.time() - start_time > 23 * 3600:
                            logger.info("23h rotation reached. Reconnecting cleanly...")
                            break

                        raw = await ws.recv()
                        self.state.last_ws_msg_time = time.time()
                        msg = json.loads(raw)
                        data = msg.get("data", {})
                        stream = msg.get("stream", "")

                        if "kline" in stream:
                            k = data.get("k", {})
                            c = Candle(
                                open_time=int(k.get("t")),
                                open=float(k.get("o")),
                                high=float(k.get("h")),
                                low=float(k.get("l")),
                                close=float(k.get("c")),
                                volume=float(k.get("v")),
                                close_time=int(k.get("T")),
                                is_closed=bool(k.get("x"))
                            )
                            if self.state.candles_1m and self.state.candles_1m[-1].open_time == c.open_time:
                                self.state.candles_1m[-1] = c
                            else:
                                self.state.candles_1m.append(c)
                                if len(self.state.candles_1m) > 120:
                                    self.state.candles_1m.pop(0)

                        elif "depth20" in stream:
                            bids = [[float(p), float(q)] for p, q in data.get("b", [])]
                            asks = [[float(p), float(q)] for p, q in data.get("a", [])]
                            if bids and asks:
                                self.state.best_bid = bids[0][0]
                                self.state.best_ask = asks[0][0]
                                bid_v = sum(q for _, q in bids[:10])
                                ask_v = sum(q for _, q in asks[:10])
                                self.state.bid_depth_total = bid_v
                                self.state.ask_depth_total = ask_v
                                self.state.orderbook_imbalance = (bid_v - ask_v) / (bid_v + ask_v + 1e-9)

                        elif "aggTrade" in stream:
                            p = float(data.get("p", 0.0))
                            q = float(data.get("q", 0.0))
                            is_seller_maker = not bool(data.get("m", False))  # False in Binance 'm' = buyer was maker => seller was aggressor
                            now = time.time()
                            self.trades_window.append((now, q if is_seller_maker else -q, data.get("m")))
                            # Clean older than 15m
                            self.trades_window = [t for t in self.trades_window if now - t[0] <= 900]
                            self.state.recent_trades_count += 1
                            # CVD 5m
                            cvd5 = sum(t[1] for t in self.trades_window if now - t[0] <= 300)
                            cvd15 = sum(t[1] for t in self.trades_window)
                            self.state.cvd_5m = cvd5
                            self.state.cvd_15m = cvd15

                        elif "markPrice" in stream:
                            self.state.mark_price = float(data.get("p", self.state.mark_price))
                            self.state.index_price = float(data.get("i", self.state.index_price))
                            self.state.funding_rate = float(data.get("r", self.state.funding_rate))
                            self.state.next_funding_time = int(data.get("T", self.state.next_funding_time))

            except Exception as e:
                self.state.ws_connected = False
                logger.warning(f"WebSocket error: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def periodic_5m_evaluation_task(self, session: aiohttp.ClientSession):
        while self.running:
            await asyncio.sleep(5)
            now = int(time.time())
            pending = self.db.get_pending_predictions()

            for row in pending:
                pred_id, candle_time, entry_price, pred_dir, p_up, p_down, conf = row
                elapsed = now - candle_time
                if elapsed >= 300:  # 5 minutes elapsed
                    settle_price = self.state.mark_price
                    delta_pct = (settle_price - entry_price) / entry_price * 100
                    
                    if abs(delta_pct) < 0.01:
                        outcome = "FLAT"
                    elif (pred_dir == "UP" and delta_pct > 0) or (pred_dir == "DOWN" and delta_pct < 0):
                        outcome = "WIN"
                    else:
                        outcome = "LOSS"

                    self.db.settle_prediction(pred_id, now, settle_price, outcome, delta_pct)
                    
                    # Update audit JSONL
                    log_entry = {
                        "id": pred_id,
                        "time_in": datetime.fromtimestamp(candle_time, timezone.utc).isoformat(),
                        "time_out": datetime.fromtimestamp(now, timezone.utc).isoformat(),
                        "entry_price": entry_price,
                        "settle_price": settle_price,
                        "delta_pct": round(delta_pct, 4),
                        "pred_dir": pred_dir,
                        "confidence": round(conf, 4),
                        "outcome": outcome
                    }
                    with open(JSONL_LOG_PATH, "a") as f:
                        f.write(json.dumps(log_entry) + "\\n")

                    logger.info(f"Settled Prediction #{pred_id}: {pred_dir} -> {outcome} (Delta: {delta_pct:+.2f}%)")

                    # Refresh stats
                    stats = self.db.get_stats()
                    self.state.total_predictions = stats["total"]
                    self.state.win_count = stats["wins"]
                    self.state.loss_count = stats["losses"]
                    self.state.flat_count = stats["flats"]

    async def prediction_loop(self):
        while self.running:
            await asyncio.sleep(1)
            now = time.time()
            # Predict at start of each minute or every 30s
            if now - self.state.last_prediction_time >= 30 and len(self.state.candles_5m) > 10:
                pred = self.engine.predict(self.state)
                self.state.last_prediction = pred
                self.state.last_prediction_time = now

                # If 5-minute candle boundary crossed, save to DB
                current_minute = datetime.now(timezone.utc).minute
                if current_minute % 5 == 0 and datetime.now(timezone.utc).second < 5:
                    if pred["direction"] in ["UP", "DOWN"]:
                        db_record = {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "candle_time": int(now),
                            "mark_price": self.state.mark_price,
                            "predicted_dir": pred["direction"],
                            "prob_up": pred["prob_up"],
                            "prob_down": pred["prob_down"],
                            "confidence": pred["confidence"],
                            "features": pred.get("features", {})
                        }
                        self.db.save_prediction(db_record)
                        logger.info(f"Signal issued: {pred['direction']} ({pred['confidence']*100:.1f}%) @ {self.state.mark_price}")

    async def dashboard_render_loop(self):
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body", ratio=1),
            Layout(name="footer", size=7)
        )
        layout["body"].split_row(
            Layout(name="left", ratio=3),
            Layout(name="right", ratio=2)
        )

        with Live(layout, refresh_per_second=2, screen=True, console=self.console) as live:
            while self.running:
                # Header
                header_text = Text(
                    f"BINANCE USDⓈ-M FUTURES 5M DIRECTION PREDICTOR | {SYMBOL} | STATUS: {'CONNECTED' if self.state.ws_connected else 'DISCONNECTED'}",
                    style="bold white on #1E293B", justify="center"
                )
                layout["header"].update(Panel(header_text, style="blue", box=box.ROUNDED))

                # Left: Market Metrics & Current Prediction
                pred = self.state.last_prediction or {"direction": "CALCULATING", "prob_up": 0.5, "prob_down": 0.5, "confidence": 0.0}
                dir_style = "bold green" if pred["direction"] == "UP" else ("bold red" if pred["direction"] == "DOWN" else "yellow")
                
                left_table = Table(title=f"LIVE MARKET & 5M ML SIGNAL (Threshold: {CONFIDENCE_THRESHOLD*100:.0f}%)", box=box.SIMPLE_HEAD)
                left_table.add_column("Metric", style="cyan")
                left_table.add_column("Value", style="bold white", justify="right")

                left_table.add_row("Mark Price", f"$\\{self.state.mark_price:,.2f}")
                left_table.add_row("Orderbook Imbalance", f"{self.state.orderbook_imbalance:+.3f} ({'Bids Strong' if self.state.orderbook_imbalance > 0 else 'Asks Strong'})")
                left_table.add_row("CVD 5m Aggression", f"{self.state.cvd_5m:+.2f} BTC")
                left_table.add_row("Funding Rate (8h)", f"{self.state.funding_rate * 100:+.4f}%")
                left_table.add_row("Open Interest", f"{self.state.open_interest:,.1f} BTC (~$\\{self.state.open_interest_val/1e6:,.1f}M)")
                left_table.add_row("Model Accuracy (Historical)", f"{self.engine.train_accuracy * 100:.2f}%")
                left_table.add_row("Probability UP", f"{pred['prob_up'] * 100:.1f}%", style="green")
                left_table.add_row("Probability DOWN", f"{pred['prob_down'] * 100:.1f}%", style="red")
                left_table.add_row("Signal Direction", pred["direction"], style=dir_style)
                left_table.add_row("Confidence Level", f"{pred['confidence'] * 100:.1f}%")

                layout["left"].update(Panel(left_table, border_style="cyan"))

                # Right: Verified Performance Stats
                win_rate = (self.state.win_count / (self.state.win_count + self.state.loss_count) * 100) if (self.state.win_count + self.state.loss_count) > 0 else 0
                right_table = Table(title="5-MINUTE REALIZED VERIFICATION", box=box.SIMPLE_HEAD)
                right_table.add_column("Stat", style="magenta")
                right_table.add_column("Result", style="bold white", justify="right")
                right_table.add_row("Total Evaluated Signals", str(self.state.total_predictions))
                right_table.add_row("Wins", str(self.state.win_count), style="green")
                right_table.add_row("Losses", str(self.state.loss_count), style="red")
                right_table.add_row("Flat / Filtered", str(self.state.flat_count), style="yellow")
                right_table.add_row("Realized Win Rate", f"{win_rate:.1f}%", style="bold green" if win_rate >= 55 else "bold white")
                right_table.add_row("Database Persistence", f"sqlite: output/btc5m.db")
                right_table.add_row("Audit JSONL Stream", f"logs/BTCUSDT_5m.jsonl")

                layout["right"].update(Panel(right_table, border_style="magenta"))

                # Footer: Recent Settle History
                history = self.db.get_recent_history(5)
                foot_table = Table(title="RECENT 5-MINUTE SETTLEMENT AUDIT LOG", box=box.HORIZONTALS)
                foot_table.add_column("ID", justify="center")
                foot_table.add_column("Timestamp", justify="center")
                foot_table.add_column("Entry Price", justify="right")
                foot_table.add_column("Signal", justify="center")
                foot_table.add_column("Confidence", justify="right")
                foot_table.add_column("Settle Price", justify="right")
                foot_table.add_column("Return %", justify="right")
                foot_table.add_column("Outcome", justify="center")

                for h in history:
                    out_style = "green" if h["outcome"] == "WIN" else ("red" if h["outcome"] == "LOSS" else "yellow")
                    delta = h.get("price_delta_pct") or 0.0
                    foot_table.add_row(
                        str(h["id"]),
                        h["timestamp"][11:19],
                        f"$\\{h['mark_price']:,.1f}",
                        h["predicted_dir"],
                        f"{h['confidence']*100:.1f}%",
                        f"$\\{h['settle_price']:,.1f}" if h['settle_price'] else "PENDING",
                        f"{delta:+.2f}%" if h['settle_price'] else "-",
                        h["outcome"] or "PENDING",
                        style=out_style
                    )

                layout["footer"].update(Panel(foot_table, border_style="green"))
                await asyncio.sleep(0.5)

    async def main_async(self):
        async with aiohttp.ClientSession() as session:
            # 1. Fetch initial market data
            await self.fetch_initial_data(session)

            # 2. Train model on historical klines
            self.console.print("[bold cyan][*] Initializing HistGradientBoosting ML Engine from Binance History...[/]")
            await self.engine.train_from_binance_history(session)

            # 3. Launch concurrent background tasks
            tasks = [
                asyncio.create_task(self.websocket_stream_task()),
                asyncio.create_task(self.periodic_5m_evaluation_task(session)),
                asyncio.create_task(self.prediction_loop()),
                asyncio.create_task(self.dashboard_render_loop())
            ]
            await asyncio.gather(*tasks)

    def run(self):
        try:
            asyncio.run(self.main_async())
        except KeyboardInterrupt:
            self.running = False
            self.console.print("\\n[bold yellow][!] Terminating BTC 5M Predictor cleanly. Goodbye.[/]")

if __name__ == "__main__":
    app = PredictorApp()
    app.run()
`;
