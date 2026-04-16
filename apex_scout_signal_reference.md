[APEX_SCOUT_SIGNAL_REFERENCE (1).md](https://github.com/user-attachments/files/26786945/APEX_SCOUT_SIGNAL_REFERENCE.1.md)
# Apex Scout Signal Reference
## What every signal means and how to use it

Last updated: April 16, 2026

---

## 🎯 HOW THE CONFLUENCE SCORE WORKS

Each signal adds points to a **0-100 total**. The more signals align, the higher the score. The score is also **directional** — some signals vote LONG, some SHORT, some just add context.

### Score interpretation:

| Score Range | Meaning | Action |
|-------------|---------|--------|
| **85-100** 🔥 | Extreme confluence — rare, A++ setup | Strongest signal, consider trading |
| **70-84** 🟠 | Strong confluence — multiple signals aligned | A-grade setup, trade-worthy |
| **50-69** 🟡 | Moderate — some alignment but mixed | B-grade, watch closely but be cautious |
| **30-49** ⚪ | Weak — mostly noise, signals disagree | Skip, wait for better |
| **0-29** ⚫ | No setup — pure chop | Don't trade |

**Key principle:** Score alone doesn't tell you to trade. It tells you **quality of setup**. YOU still decide entry, stop, and target based on price action.

---

## 📊 SIGNAL 1: RSI (Relative Strength Index)

**What it measures:** How "oversold" or "overbought" the market is right now.

**How we score:**

| RSI Value | Points | Direction | Meaning |
|-----------|--------|-----------|---------|
| < 30 | +20 | LONG | Oversold — likely bounce coming |
| 30-40 | +12 | LONG | Weak, leaning bullish |
| 40-60 | 0 | — | Neutral |
| 60-70 | +12 | SHORT | Elevated, leaning bearish |
| > 70 | +20 | SHORT | Overbought — likely pullback coming |

**How to use it:** RSI extremes are mean-reversion signals. When RSI hits 30 or below, the market has been sold heavily and usually bounces. When it hits 70+, too many people are buying and a pullback is likely.

**Watch out for:** In strong trends, RSI can STAY overbought/oversold for a long time. Don't short just because RSI is 72 in a raging bull market. Use it with trend signals (EMA).

---

## 📊 SIGNAL 2: EMA Ribbon (9/21 alignment)

**What it measures:** The trend direction and strength.

**How we score:**

| Pattern | Points | Direction | Meaning |
|---------|--------|-----------|---------|
| Price > EMA9 > EMA21 | +15 | LONG | Bullish ribbon — trend up |
| Price < EMA9 < EMA21 | +15 | SHORT | Bearish ribbon — trend down |
| Mixed | 0 | — | No clear trend |

**How to use it:** The EMA9 and EMA21 are short-term and medium-term moving averages. When price is above both AND the 9 is above the 21, you have a clear uptrend. Reverse for downtrend.

**The magic:** If RSI says "oversold" (LONG) AND EMA ribbon says "bullish" (LONG), that's two signals agreeing. That's confluence. The score compounds.

---

## 📊 SIGNAL 3: Whale Activity (BTC/ETH only) — YOUR EDGE

**What it measures:** Large transactions in the BTC/ETH mempool/blocks (real-time).

**How we score:**

| Whale Pressure | Points | Meaning |
|----------------|--------|---------|
| HIGH (3+ BTC whales or 5+ ETH whales) | +25 | Big players moving right now |
| MEDIUM (1-2 BTC or 2-4 ETH whales) | +12 | Some accumulation/distribution |
| LOW (quiet mempool) | 0 | No unusual activity |

**How to use it:** Whales moving = something is about to happen. Could be exchange deposits (bearish — they want to sell) or withdrawals (bullish — they're hoarding). The tool can't tell direction yet, but it tells you **SOMETHING** is happening.

**This is your unique edge.** Most retail traders don't have a Bitcoin full node feeding them real-time mempool data. You do.

**Future improvement:** We can enhance this to detect whale INTENT (exchange inflows vs outflows) — tell me when you want that added.

---

## 📊 SIGNAL 4: 24-Hour Momentum (crypto)

**What it measures:** How much price has moved in the last 24 hours.

**How we score:**

| 24h Change | Points | Direction |
|------------|--------|-----------|
| > +3% | +15 | LONG (strong up move) |
| > +1.5% | +8 | LONG (moderate up) |
| -1.5% to +1.5% | 0 | — (quiet) |
| < -1.5% | +8 | SHORT (moderate down) |
| < -3% | +15 | SHORT (strong down) |

**How to use it:** Strong momentum often continues. A 3%+ BTC move usually means the direction has legs for a few more hours.

**Watch out for:** Exhaustion moves. If BTC is up 8% in 24h, momentum signal says LONG — but RSI probably says SHORT (overbought). That disagreement is valuable info.

---

## 📊 SIGNAL 5: Position in 24h Range

**What it measures:** Where the current price sits between the 24h high and low.

**How we score:**

| Range Position | Points | Direction | Meaning |
|----------------|--------|-----------|---------|
| Bottom 20% of range | +15 | LONG | Testing support — bounce setup |
| 20-80% | 0 | — | Mid-range — no edge |
| Top 80% | +15 | SHORT | Testing resistance — rejection setup |

**How to use it:** Price at extremes of the day's range often reverses, especially at round numbers or known support/resistance. This is a classic mean-reversion setup.

---

## 📊 SIGNAL 6: Volume Spike (indices only)

**What it measures:** Current 5-min volume vs the 20-period average.

**How we score:**

| Volume Multiple | Points |
|-----------------|--------|
| 2x+ average | +20 |
| 1.5-2x average | +10 |
| < 1.5x | 0 |

**How to use it:** Big volume = conviction. A volume spike at support/resistance is much more meaningful than a quiet-volume touch. Volume confirms price action.

---

## 📊 SIGNAL 7: Session Filter

**What it measures:** Whether you're in the most liquid trading hours.

**How we score:**

| Session | Points | Why it matters |
|---------|--------|----------------|
| **RTH Prime Hours** (9:30am-4pm EST) | +15 | Deepest liquidity, tightest spreads |
| **US Crypto Session** (9am-5pm EST) | +10 | Most US crypto trading activity |
| **Off-hours** | 0 | Thin liquidity = whipsaws |

**How to use it:** Day trading is MUCH easier during RTH. Overnight futures get hunted by stops. Apex evaluations tend to blow up during thin-liquidity hours because of random spikes. The signal flags this automatically.

**Pro tip:** If you see a 75+ score at 3am, be SKEPTICAL. It's probably a low-liquidity fakeout.

---

## 📊 SIGNAL 8: ATR (Average True Range) — Context Only

**What it measures:** Average volatility over the last 14 periods.

**How we use it:** Doesn't add points, but tells you the expected movement size. Use for:
- **Stop placement:** 1.5-2x ATR is a sane stop distance
- **Target placement:** 3x ATR hits your 1:3 R:R cleanly
- **Position sizing:** High ATR = smaller position, low ATR = larger

---

## 🎯 HOW TO READ A FULL CARD

**Example from your dashboard:**

```
MBT (BTC)
Price: $74,826
Score: 37
Direction: LONG_WEAK

Signals:
- RSI High           68.9           +12   [SHORT vote]
- EMA Ribbon Bullish price > 9 > 21 +15   [LONG vote]
- Whale Activity LOW quiet           0
- Weak 24h Move      0.45%           0
- Mid-Range          45%             0
- US Session Active  13:00           +10
```

**Interpretation:**
- Score 37 = weak setup, skip
- RSI says bearish, but trend says bullish — **mixed signals**
- No whale activity, no strong move, mid-range = pure chop
- US session is active, which is the only positive
- **Verdict:** Wait for more confluence. This is the "noise" score.

---

## 🔥 WHAT A 70+ SETUP LOOKS LIKE

For a HIGH-confidence trade, you want something like:

```
MBT (BTC)
Price: $73,200
Score: 82
Direction: LONG

Signals:
- RSI Oversold       28.4           +20   [LONG]
- EMA Ribbon Bullish price > 9 > 21 +15   [LONG]
- Whale Activity HIGH 4 whales       +25   [WATCH]
- Strong 24h Move    -3.2%           +15   [SHORT]
- Near 24h Low       8% of range     +15   [LONG]
- US Session Active  14:00           +10
```

**Interpretation:**
- Score 82 = **high-conviction setup**
- Multiple signals agreeing on LONG: RSI oversold + EMA bullish + Near 24h Low
- Whale activity HIGH = someone's accumulating
- Session is active (real liquidity)
- **Verdict:** This is a textbook bounce setup. Log a paper trade — LONG at market, stop below the 24h low, target 3x the stop distance.

---

## ⚠️ DIRECTIONAL TAGS EXPLAINED

- **LONG** — Strong bullish bias (longPoints > shortPoints + 10)
- **LONG_WEAK** — Leaning bullish but not convincing
- **NEUTRAL** — Equal pressure both sides, no bias
- **SHORT_WEAK** — Leaning bearish but mixed
- **SHORT** — Strong bearish bias

**Rule:** Only trade direction tags without the "_WEAK" suffix. Weak = noise.

---

## 🎯 YOUR TRADING RULES (LOCKED IN)

Based on what we built, here are the rules:

1. **Score must be 70+ for a live trade** (paper trade anything 50+ to build data)
2. **Direction must be LONG or SHORT** — never trade _WEAK or NEUTRAL
3. **Session must be Active** — no overnight trades
4. **1:3 R:R minimum** on every trade
5. **Max 1-2 trades per day** — quality over quantity
6. **Paper trade 20-30 signals first** — build your real win-rate data before going live

---

## 🔧 HOW TO ADJUST WEIGHTS

If you find a signal is firing too often or missing setups, the point values can be tuned in `/root/api/apex-scout.js`. Look for the `scoreCrypto()` and `scoreIndex()` functions and adjust the numbers.

**Common adjustments:**
- Too many 60-70 scores = lower point values across the board
- Missing obvious bounce trades = boost RSI points
- Whale signal never fires = lower the HIGH/MEDIUM thresholds

Don't tune yet — let the default run for 30 trades first to see what the data says.

---

## 📚 SIGNAL CHEAT SHEET (print this)

| Signal | Max Points | What it tells you |
|--------|-----------|-------------------|
| RSI | 20 | Oversold/overbought |
| EMA Ribbon | 15 | Trend direction |
| Whale Activity | 25 | Big players moving |
| 24h Momentum | 15 | Move strength |
| Range Position | 15 | At extreme vs middle |
| Volume Spike | 20 | Conviction level |
| Session Filter | 10-15 | Liquidity quality |
| ATR | 0 (context) | Volatility sizing |

**Max crypto score:** 100 (RSI + EMA + Whale + Momentum + Range + Session)
**Max index score:** 100 (RSI + EMA + Volume + Momentum + Range + Session)

---

Built on MaxResults4U Business Solutions infrastructure
