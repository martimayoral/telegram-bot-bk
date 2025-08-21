"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSparkByStable = parseSparkByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
const SPARK_PLATFORM = "spark-lend";
const SPARK_QUERY = `
  query SparkSupplyReserves {
    markets {
      supplyReserves {
        market { address chainId }
        underlyingToken { symbol address }
        aToken { symbol address }
        supplyInfo { apy }
      }
    }
  }
`;
async function fetchRetry(url, opts, tries = config_1.CONFIG.http.retries) {
    let e;
    for (let i = 0; i < tries; i++) {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), config_1.CONFIG.http.timeoutMs);
        try {
            const r = await fetch(url, { ...opts, signal: c.signal, headers: { "content-type": "application/json", "user-agent": "yieldfy/1.0", ...(opts.headers || {}) } });
            clearTimeout(t);
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            return r;
        }
        catch (err) {
            e = err;
            await new Promise(r => setTimeout(r, config_1.CONFIG.http.backoffMs * (i + 1)));
        }
    }
    throw e;
}
function normApy(raw) { if (raw == null)
    return undefined; if (typeof raw === "number")
    return raw > 1 ? raw / 100 : raw; if (typeof raw === "string") {
    const v = parseFloat(raw.replace("%", ""));
    return Number.isFinite(v) ? (v > 1 ? v / 100 : v) : undefined;
} if (typeof raw === "object") {
    const v = (typeof raw.percentage === "number" ? raw.percentage : (typeof raw.value === "number" ? raw.value : (typeof raw.value === "string" ? parseFloat(raw.value) : undefined)));
    return v != null ? (v > 1 ? v / 100 : v) : undefined;
} return undefined; }
async function parseSparkByStable(stable) {
    var _a, _b, _c;
    const url = config_1.CONFIG.spark.mainnetSubgraph;
    if (!url)
        return {};
    const resp = await fetchRetry(url, { method: "POST", body: JSON.stringify({ query: SPARK_QUERY }) });
    const json = await resp.json();
    const now = Date.now();
    const arr = [];
    for (const m of ((_a = json.data) === null || _a === void 0 ? void 0 : _a.markets) || []) {
        for (const r of m.supplyReserves || []) {
            const sym = (((_b = r.underlyingToken) === null || _b === void 0 ? void 0 : _b.symbol) || "").toUpperCase();
            if (!(0, stablecoinlist_1.symbolMatchesStable)(sym, stable))
                continue;
            const apy = normApy((_c = r.supplyInfo) === null || _c === void 0 ? void 0 : _c.apy);
            arr.push({
                poolId: `${r.market.address}:${r.underlyingToken.address}`.toLowerCase(),
                chain: String(r.market.chainId),
                symbol: sym,
                apy,
                apyBase: apy,
                apyReward: 0,
                tvlUsd: undefined,
                url: "https://spark.fi/",
                timestamp: now
            });
        }
    }
    const out = {};
    if (arr.length)
        out[SPARK_PLATFORM] = arr.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
