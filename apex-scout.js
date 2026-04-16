// ============================================================
// APEX SCOUT — Confluence Signal Scoring Engine
// For day-trading MBT, MET, MES, MNQ futures
// Drop into /root/api/ and require from index.js
// ============================================================

const Database = require('better-sqlite3');
const axios = require('axios');

module.exports = function(app, mainDb) {

  // ============================================================
  // DATABASE SETUP
  // ============================================================
  const db = new Database('/root/api/apex-scout.db');

  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT DEFAULT (datetime('now')),
      symbol TEXT NOT NULL,
      price REAL,
      score INTEGER,
      direction TEXT,
      breakdown TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS paper_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id INTEGER,
      ts TEXT DEFAULT (datetime('now')),
      symbol TEXT NOT NULL,
      direction TEXT,
      entry REAL,
      stop REAL,
      target REAL,
      size INTEGER DEFAULT 1,
      exit REAL,
      exit_ts TEXT,
      outcome TEXT,
      pnl REAL,
      notes TEXT,
      score_at_entry INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol, ts);
    CREATE INDEX IF NOT EXISTS idx_trades_outcome ON paper_trades(symbol, outcome);
  `);

  // ============================================================
  // PRICE DATA FETCHERS (all free sources)
  // ============================================================

  // Simple in-memory cache to avoid rate limits
  const cache = { data: {}, ts: {} };
  const CACHE_TTL = 15000; // 15 seconds

  async function getCached(key, fetcher) {
    if (cache.data[key] && Date.now() - cache.ts[key] < CACHE_TTL) {
      return cache.data[key];
    }
    try {
      const d = await fetcher();
      cache.data[key] = d;
      cache.ts[key] = Date.now();
      return d;
    } catch (e) {
      // Return stale on error
      return cache.data[key] || null;
    }
  }

  // BTC price + 24h stats from CoinGecko
  async function getBTC() {
    return getCached('btc', async () => {
      const r = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin', {
        params: { localization: false, tickers: false, community_data: false, developer_data: false },
        timeout: 8000
      });
      const m = r.data.market_data;
      return {
        price: m.current_price.usd,
        change24h: m.price_change_percentage_24h,
        high24h: m.high_24h.usd,
        low24h: m.low_24h.usd,
        volume24h: m.total_volume.usd
      };
    });
  }

  async function getETH() {
    return getCached('eth', async () => {
      const r = await axios.get('https://api.coingecko.com/api/v3/coins/ethereum', {
        params: { localization: false, tickers: false, community_data: false, developer_data: false },
        timeout: 8000
      });
      const m = r.data.market_data;
      return {
        price: m.current_price.usd,
        change24h: m.price_change_percentage_24h,
        high24h: m.high_24h.usd,
        low24h: m.low_24h.usd,
        volume24h: m.total_volume.usd
      };
    });
  }

  // Historical price bars for TA (CoinGecko hourly)
  async function getCryptoBars(coinId, hours = 24) {
    return getCached(`bars-${coinId}-${hours}`, async () => {
      const r = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
        params: { vs_currency: 'usd', days: Math.ceil(hours/24) },
        timeout: 8000
      });
      // prices are [[ts, price], ...]
      return r.data.prices.slice(-hours);
    });
  }

  // Index futures via Yahoo (delayed ~15 min, free)
  async function getYahooQuote(ticker) {
    return getCached(`yahoo-${ticker}`, async () => {
      const r = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
        {
          params: { range: '1d', interval: '5m' },
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
      const result = r.data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const closes = quotes.close.filter(v => v !== null);
      const highs = quotes.high.filter(v => v !== null);
      const lows = quotes.low.filter(v => v !== null);
      const volumes = quotes.volume.filter(v => v !== null);
      return {
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        dayHigh: Math.max(...highs),
        dayLow: Math.min(...lows),
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        closes: closes.slice(-60),  // last 5 hours of 5-min bars
        highs: highs.slice(-60),
        lows: lows.slice(-60),
        volumes: volumes.slice(-60)
      };
    });
  }

  // ============================================================
  // BTC WHALE DATA (from your local Bitcoin node)
  // ============================================================
  async function getBTCWhaleActivity() {
    try {
      const auth = { username: 'bitcoinrpc', password: 'Summertime2026!' };
      const rpc = async (method, params = []) => {
        const r = await axios.post('http://127.0.0.1:8332/', {
          jsonrpc: '1.0', method, params, id: 'apex'
        }, { auth, timeout: 8000 });
        return r.data.result;
      };

      const mempool = await rpc('getrawmempool', [false]);
      const sample = mempool.slice(0, 30);
      let whaleCount = 0;
      let whaleVolume = 0;
      let mediumCount = 0;

      for (const txid of sample) {
        try {
          const tx = await rpc('getrawtransaction', [txid, true]);
          const total = (tx.vout || []).reduce((s, o) => s + parseFloat(o.value || 0), 0);
          if (total >= 100) { whaleCount++; whaleVolume += total; }
          else if (total >= 10) mediumCount++;
        } catch (e) { /* skip */ }
      }

      return {
        mempoolSize: mempool.length,
        whaleCount,
        mediumCount,
        whaleVolume: whaleVolume.toFixed(4),
        whalePressure: whaleCount >= 3 ? 'HIGH' : whaleCount >= 1 ? 'MEDIUM' : 'LOW'
      };
    } catch (e) {
      return { error: e.message, whalePressure: 'UNKNOWN' };
    }
  }

  // ============================================================
  // ETH WHALE DATA (free — Etherscan doesn't need key for this)
  // ============================================================
  async function getETHWhaleActivity() {
    return getCached('eth-whales', async () => {
      try {
        // Get latest block
        const latest = await axios.get('https://api.etherscan.io/api', {
          params: { module: 'proxy', action: 'eth_blockNumber' },
          timeout: 8000
        });
        const blockNum = parseInt(latest.data.result, 16);

        // Get the block with transactions
        const block = await axios.get('https://api.etherscan.io/api', {
          params: {
            module: 'proxy',
            action: 'eth_getBlockByNumber',
            tag: '0x' + blockNum.toString(16),
            boolean: 'true'
          },
          timeout: 10000
        });

        const txs = (block.data.result?.transactions || []).slice(0, 50);
        let whaleCount = 0;
        let whaleVolume = 0;

        for (const tx of txs) {
          const value = parseInt(tx.value, 16) / 1e18;
          if (value >= 100) { whaleCount++; whaleVolume += value; }
        }

        return {
          blockNumber: blockNum,
          txCount: txs.length,
          whaleCount,
          whaleVolume: whaleVolume.toFixed(2),
          whalePressure: whaleCount >= 5 ? 'HIGH' : whaleCount >= 2 ? 'MEDIUM' : 'LOW'
        };
      } catch (e) {
        return { error: e.message, whalePressure: 'UNKNOWN' };
      }
    });
  }

  // ============================================================
  // TECHNICAL INDICATORS
  // ============================================================

  function rsi(closes, period = 14) {
    if (closes.length < period + 1) return null;
    const recent = closes.slice(-(period + 1));
    let gains = 0, losses = 0;
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  function ema(values, period) {
    if (values.length < period) return null;
    const k = 2 / (period + 1);
    let e = values.slice(0, period).reduce((a, b) => a + b) / period;
    for (let i = period; i < values.length; i++) {
      e = values[i] * k + e * (1 - k);
    }
    return e;
  }

  function volumeSpike(volumes) {
    if (!volumes || volumes.length < 20) return 0;
    const recent = volumes[volumes.length - 1];
    const avg = volumes.slice(-21, -1).reduce((a, b) => a + b) / 20;
    return avg > 0 ? recent / avg : 0;
  }

  function atr(highs, lows, closes, period = 14) {
    if (highs.length < period) return null;
    const trs = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }
    const recent = trs.slice(-period);
    return recent.reduce((a, b) => a + b) / period;
  }

  // ============================================================
  // CONFLUENCE SCORING
  // ============================================================

  function scoreCrypto(data, whales) {
    const signals = [];
    let score = 0;

    // Pull out closes
    const closes = data.bars.map(b => b[1]);
    const current = closes[closes.length - 1];

    // 1. RSI signal (0-20 points)
    const rsiVal = rsi(closes, 14);
    if (rsiVal !== null) {
      if (rsiVal < 30) { score += 20; signals.push({ name: 'RSI Oversold', value: rsiVal.toFixed(1), points: 20, direction: 'LONG' }); }
      else if (rsiVal < 40) { score += 12; signals.push({ name: 'RSI Low', value: rsiVal.toFixed(1), points: 12, direction: 'LONG' }); }
      else if (rsiVal > 70) { score += 20; signals.push({ name: 'RSI Overbought', value: rsiVal.toFixed(1), points: 20, direction: 'SHORT' }); }
      else if (rsiVal > 60) { score += 12; signals.push({ name: 'RSI High', value: rsiVal.toFixed(1), points: 12, direction: 'SHORT' }); }
      else { signals.push({ name: 'RSI Neutral', value: rsiVal.toFixed(1), points: 0 }); }
    }

    // 2. EMA ribbon (0-15 points)
    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    if (ema9 && ema21) {
      if (current > ema9 && ema9 > ema21) { score += 15; signals.push({ name: 'EMA Ribbon Bullish', value: 'price > 9 > 21', points: 15, direction: 'LONG' }); }
      else if (current < ema9 && ema9 < ema21) { score += 15; signals.push({ name: 'EMA Ribbon Bearish', value: 'price < 9 < 21', points: 15, direction: 'SHORT' }); }
      else { signals.push({ name: 'EMA Mixed', value: 'no alignment', points: 0 }); }
    }

    // 3. Whale activity (0-25 points — your edge)
    if (whales && whales.whalePressure) {
      if (whales.whalePressure === 'HIGH') { score += 25; signals.push({ name: 'Whale Activity HIGH', value: `${whales.whaleCount} whales`, points: 25, direction: 'WATCH' }); }
      else if (whales.whalePressure === 'MEDIUM') { score += 12; signals.push({ name: 'Whale Activity MEDIUM', value: `${whales.whaleCount} whales`, points: 12, direction: 'WATCH' }); }
      else { signals.push({ name: 'Whale Activity LOW', value: 'quiet', points: 0 }); }
    }

    // 4. 24h momentum (0-15 points)
    const change = data.change24h;
    if (Math.abs(change) > 3) { score += 15; signals.push({ name: 'Strong 24h Move', value: `${change.toFixed(2)}%`, points: 15, direction: change > 0 ? 'LONG' : 'SHORT' }); }
    else if (Math.abs(change) > 1.5) { score += 8; signals.push({ name: 'Moderate 24h Move', value: `${change.toFixed(2)}%`, points: 8, direction: change > 0 ? 'LONG' : 'SHORT' }); }
    else { signals.push({ name: 'Weak 24h Move', value: `${change.toFixed(2)}%`, points: 0 }); }

    // 5. Position in 24h range (0-15 points)
    const rangePos = (current - data.low24h) / (data.high24h - data.low24h);
    if (rangePos < 0.2) { score += 15; signals.push({ name: 'Near 24h Low', value: `${(rangePos * 100).toFixed(0)}% of range`, points: 15, direction: 'LONG' }); }
    else if (rangePos > 0.8) { score += 15; signals.push({ name: 'Near 24h High', value: `${(rangePos * 100).toFixed(0)}% of range`, points: 15, direction: 'SHORT' }); }
    else { signals.push({ name: 'Mid-Range', value: `${(rangePos * 100).toFixed(0)}% of range`, points: 0 }); }

    // 6. Session filter (0-10 points) — prefer US session for Apex
    const hour = new Date().getUTCHours();
    const inUsSession = hour >= 13 && hour <= 21; // 9am-5pm EST
    if (inUsSession) { score += 10; signals.push({ name: 'US Session Active', value: `${hour}:00 UTC`, points: 10 }); }
    else { signals.push({ name: 'Off-Hours', value: `${hour}:00 UTC`, points: 0, warning: 'low liquidity' }); }

    // Determine overall direction (most votes wins)
    const longPoints = signals.filter(s => s.direction === 'LONG').reduce((a, s) => a + s.points, 0);
    const shortPoints = signals.filter(s => s.direction === 'SHORT').reduce((a, s) => a + s.points, 0);
    let direction = 'NEUTRAL';
    if (longPoints > shortPoints + 10) direction = 'LONG';
    else if (shortPoints > longPoints + 10) direction = 'SHORT';
    else if (longPoints > shortPoints) direction = 'LONG_WEAK';
    else if (shortPoints > longPoints) direction = 'SHORT_WEAK';

    return { score, direction, signals, longPoints, shortPoints };
  }

  function scoreIndex(data) {
    const signals = [];
    let score = 0;

    const closes = data.closes;
    const current = closes[closes.length - 1];

    // 1. RSI
    const rsiVal = rsi(closes, 14);
    if (rsiVal !== null) {
      if (rsiVal < 30) { score += 20; signals.push({ name: 'RSI Oversold', value: rsiVal.toFixed(1), points: 20, direction: 'LONG' }); }
      else if (rsiVal < 40) { score += 12; signals.push({ name: 'RSI Low', value: rsiVal.toFixed(1), points: 12, direction: 'LONG' }); }
      else if (rsiVal > 70) { score += 20; signals.push({ name: 'RSI Overbought', value: rsiVal.toFixed(1), points: 20, direction: 'SHORT' }); }
      else if (rsiVal > 60) { score += 12; signals.push({ name: 'RSI High', value: rsiVal.toFixed(1), points: 12, direction: 'SHORT' }); }
      else { signals.push({ name: 'RSI Neutral', value: rsiVal.toFixed(1), points: 0 }); }
    }

    // 2. EMA ribbon
    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    if (ema9 && ema21) {
      if (current > ema9 && ema9 > ema21) { score += 15; signals.push({ name: 'EMA Bullish', value: 'price > 9 > 21', points: 15, direction: 'LONG' }); }
      else if (current < ema9 && ema9 < ema21) { score += 15; signals.push({ name: 'EMA Bearish', value: 'price < 9 < 21', points: 15, direction: 'SHORT' }); }
      else { signals.push({ name: 'EMA Mixed', points: 0 }); }
    }

    // 3. Volume spike
    const vSpike = volumeSpike(data.volumes);
    if (vSpike >= 2) { score += 20; signals.push({ name: 'Volume Surge', value: `${vSpike.toFixed(2)}x avg`, points: 20, direction: 'WATCH' }); }
    else if (vSpike >= 1.5) { score += 10; signals.push({ name: 'Elevated Volume', value: `${vSpike.toFixed(2)}x avg`, points: 10 }); }
    else { signals.push({ name: 'Normal Volume', value: `${vSpike.toFixed(2)}x avg`, points: 0 }); }

    // 4. Day change magnitude
    const dayChange = data.changePercent;
    if (Math.abs(dayChange) > 1) { score += 15; signals.push({ name: 'Big Day Move', value: `${dayChange.toFixed(2)}%`, points: 15, direction: dayChange > 0 ? 'LONG' : 'SHORT' }); }
    else if (Math.abs(dayChange) > 0.5) { score += 8; signals.push({ name: 'Moderate Move', value: `${dayChange.toFixed(2)}%`, points: 8, direction: dayChange > 0 ? 'LONG' : 'SHORT' }); }
    else { signals.push({ name: 'Quiet Day', value: `${dayChange.toFixed(2)}%`, points: 0 }); }

    // 5. Position in day range
    const rangePos = (current - data.dayLow) / (data.dayHigh - data.dayLow);
    if (rangePos < 0.2) { score += 15; signals.push({ name: 'Near Day Low', value: `${(rangePos * 100).toFixed(0)}%`, points: 15, direction: 'LONG' }); }
    else if (rangePos > 0.8) { score += 15; signals.push({ name: 'Near Day High', value: `${(rangePos * 100).toFixed(0)}%`, points: 15, direction: 'SHORT' }); }
    else { signals.push({ name: 'Mid-Range', value: `${(rangePos * 100).toFixed(0)}%`, points: 0 }); }

    // 6. ATR volatility (context, not directional)
    const atrVal = atr(data.highs, data.lows, closes, 14);
    if (atrVal) {
      const atrPct = (atrVal / current) * 100;
      signals.push({ name: 'ATR Volatility', value: `${atrPct.toFixed(3)}%`, points: 0, context: 'sizing info' });
    }

    // 7. Session filter
    const hour = new Date().getUTCHours();
    const minute = new Date().getUTCMinutes();
    const inPrime = (hour === 13 && minute >= 30) || (hour >= 14 && hour <= 20); // 9:30am-4pm EST
    if (inPrime) { score += 15; signals.push({ name: 'RTH Prime Hours', value: `${hour}:${minute}`, points: 15 }); }
    else { signals.push({ name: 'Off RTH', value: `${hour}:${minute}`, points: 0, warning: 'thinner liquidity' }); }

    const longPoints = signals.filter(s => s.direction === 'LONG').reduce((a, s) => a + s.points, 0);
    const shortPoints = signals.filter(s => s.direction === 'SHORT').reduce((a, s) => a + s.points, 0);
    let direction = 'NEUTRAL';
    if (longPoints > shortPoints + 10) direction = 'LONG';
    else if (shortPoints > longPoints + 10) direction = 'SHORT';
    else if (longPoints > shortPoints) direction = 'LONG_WEAK';
    else if (shortPoints > longPoints) direction = 'SHORT_WEAK';

    return { score, direction, signals, longPoints, shortPoints };
  }

  // ============================================================
  // API ENDPOINTS
  // ============================================================

  // GET /api/v1/apex/scan — all 4 instruments at once
  app.get('/api/v1/apex/scan', async (req, res) => {
    try {
      const [btc, eth, es, nq, btcWhales, ethWhales] = await Promise.all([
        getBTC().catch(e => null),
        getETH().catch(e => null),
        getYahooQuote('ES=F').catch(e => null),
        getYahooQuote('NQ=F').catch(e => null),
        getBTCWhaleActivity().catch(e => null),
        getETHWhaleActivity().catch(e => null)
      ]);

      const btcBars = btc ? await getCryptoBars('bitcoin', 24).catch(e => []) : [];
      const ethBars = eth ? await getCryptoBars('ethereum', 24).catch(e => []) : [];

      const result = { timestamp: new Date().toISOString() };

      if (btc && btcBars.length > 0) {
        const scored = scoreCrypto({ ...btc, bars: btcBars }, btcWhales);
        result.MBT = { symbol: 'MBT', underlying: 'BTC', price: btc.price, ...scored, whales: btcWhales };
      }

      if (eth && ethBars.length > 0) {
        const scored = scoreCrypto({ ...eth, bars: ethBars }, ethWhales);
        result.MET = { symbol: 'MET', underlying: 'ETH', price: eth.price, ...scored, whales: ethWhales };
      }

      if (es) {
        const scored = scoreIndex(es);
        result.MES = { symbol: 'MES', underlying: 'S&P 500 Futures', price: es.price, ...scored };
      }

      if (nq) {
        const scored = scoreIndex(nq);
        result.MNQ = { symbol: 'MNQ', underlying: 'Nasdaq Futures', price: nq.price, ...scored };
      }

      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/v1/apex/log — save a signal snapshot
  app.post('/api/v1/apex/log', express_json_parser, (req, res) => {
    try {
      const { symbol, price, score, direction, breakdown, notes } = req.body;
      const stmt = db.prepare(`INSERT INTO signals (symbol, price, score, direction, breakdown, notes) VALUES (?, ?, ?, ?, ?, ?)`);
      const r = stmt.run(symbol, price, score, direction, JSON.stringify(breakdown || []), notes || '');
      res.json({ success: true, id: r.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/v1/apex/paper-trade — log an intended trade
  app.post('/api/v1/apex/paper-trade', express_json_parser, (req, res) => {
    try {
      const { signal_id, symbol, direction, entry, stop, target, size, notes, score_at_entry } = req.body;
      const stmt = db.prepare(`INSERT INTO paper_trades (signal_id, symbol, direction, entry, stop, target, size, notes, score_at_entry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const r = stmt.run(signal_id || null, symbol, direction, entry, stop, target, size || 1, notes || '', score_at_entry || 0);
      res.json({ success: true, id: r.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/v1/apex/close-trade — mark trade closed
  app.post('/api/v1/apex/close-trade', express_json_parser, (req, res) => {
    try {
      const { id, exit, outcome, notes } = req.body;
      const trade = db.prepare('SELECT * FROM paper_trades WHERE id = ?').get(id);
      if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });

      const pnl = trade.direction === 'LONG'
        ? (exit - trade.entry) * trade.size
        : (trade.entry - exit) * trade.size;

      db.prepare(`UPDATE paper_trades SET exit = ?, exit_ts = datetime('now'), outcome = ?, pnl = ?, notes = ? WHERE id = ?`)
        .run(exit, outcome, pnl, notes || trade.notes || '', id);

      res.json({ success: true, pnl });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/v1/apex/trades — list paper trades
  app.get('/api/v1/apex/trades', (req, res) => {
    try {
      const trades = db.prepare('SELECT * FROM paper_trades ORDER BY ts DESC LIMIT 200').all();
      res.json({ success: true, count: trades.length, data: trades });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/v1/apex/stats — your performance by score threshold
  app.get('/api/v1/apex/stats', (req, res) => {
    try {
      const closed = db.prepare(`SELECT * FROM paper_trades WHERE outcome IS NOT NULL`).all();

      const buckets = {
        '80+': { trades: [], wins: 0, losses: 0, totalPnl: 0 },
        '60-79': { trades: [], wins: 0, losses: 0, totalPnl: 0 },
        '40-59': { trades: [], wins: 0, losses: 0, totalPnl: 0 },
        '<40': { trades: [], wins: 0, losses: 0, totalPnl: 0 }
      };

      for (const t of closed) {
        const s = t.score_at_entry || 0;
        const bucket = s >= 80 ? '80+' : s >= 60 ? '60-79' : s >= 40 ? '40-59' : '<40';
        buckets[bucket].trades.push(t);
        if (t.outcome === 'WIN') buckets[bucket].wins++;
        else if (t.outcome === 'LOSS') buckets[bucket].losses++;
        buckets[bucket].totalPnl += t.pnl || 0;
      }

      const summary = {};
      for (const [k, v] of Object.entries(buckets)) {
        const total = v.wins + v.losses;
        summary[k] = {
          trades: total,
          wins: v.wins,
          losses: v.losses,
          winRate: total > 0 ? ((v.wins / total) * 100).toFixed(1) + '%' : 'N/A',
          totalPnl: v.totalPnl.toFixed(2)
        };
      }

      res.json({ success: true, data: summary, totalTrades: closed.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/v1/apex/signals — signal history
  app.get('/api/v1/apex/signals', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const rows = db.prepare('SELECT * FROM signals ORDER BY ts DESC LIMIT ?').all(limit);
      res.json({ success: true, count: rows.length, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  console.log('[Apex Scout] Module loaded — endpoints: /api/v1/apex/scan, /log, /paper-trade, /close-trade, /trades, /stats, /signals');
};

// helper for JSON body parsing when used standalone
const express_json_parser = (req, res, next) => {
  if (req.body && typeof req.body === 'object') return next();
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    try { req.body = JSON.parse(data); } catch (e) { req.body = {}; }
    next();
  });
};
