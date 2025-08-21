"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAaveByStable = parseAaveByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
// minimal retrying fetch (mirrors defilama)
async function fetchWithRetry(url, opts, tries = config_1.CONFIG.http.retries) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
        try {
            const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { "content-type": "application/json", "user-agent": "yieldfy/1.0", ...(opts.headers || {}) } });
            clearTimeout(t);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            return res;
        }
        catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, config_1.CONFIG.http.backoffMs * (i + 1)));
        }
    }
    throw lastErr;
}
// map common chainIds to human labels for display
const CHAIN_NAME = {
    1: "Ethereum",
    10: "Optimism",
    137: "Polygon",
    42161: "Arbitrum",
    43114: "Avalanche",
    8453: "Base",
    11155111: "Sepolia"
};
// defensive APY normalizer (PercentValue may come as number|string|object)
function normApy(raw) {
    if (raw == null)
        return undefined;
    const take = (v) => (v > 1 ? v / 100 : v); // if 3.5 → 0.035 ; if 0.035 → 0.035
    if (typeof raw === "number")
        return take(raw);
    if (typeof raw === "string") {
        const v = parseFloat(raw.replace("%", ""));
        return Number.isFinite(v) ? take(v) : undefined;
    }
    if (typeof raw === "object") {
        if (typeof raw.percentage === "number")
            return take(raw.percentage);
        if (typeof raw.value === "number")
            return take(raw.value);
        if (typeof raw.value === "string") {
            const v = parseFloat(raw.value);
            return Number.isFinite(v) ? take(v) : undefined;
        }
    }
    return undefined;
}
// GraphQL: list markets → their supply reserves (we filter to USDC/USDT client-side)
const QUERY = `
  query AaveSupplyReserves {
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
async function parseAaveByStable(stable) {
    var _a, _b, _c;
    const resp = await fetchWithRetry(config_1.CONFIG.aave.graphqlUrl, {
        method: "POST",
        body: JSON.stringify({ query: QUERY })
    });
    const json = (await resp.json());
    const now = Date.now();
    const out = {};
    const PLATFORM = "aave-v3";
    for (const m of ((_a = json.data) === null || _a === void 0 ? void 0 : _a.markets) || []) {
        for (const r of m.supplyReserves || []) {
            const sym = (((_b = r.underlyingToken) === null || _b === void 0 ? void 0 : _b.symbol) || "").toUpperCase();
            if (!(0, stablecoinlist_1.symbolMatchesStable)(sym, stable))
                continue;
            const apy = normApy((_c = r.supplyInfo) === null || _c === void 0 ? void 0 : _c.apy);
            const pool = {
                poolId: `${r.market.address}:${r.underlyingToken.address}`.toLowerCase(),
                chain: CHAIN_NAME[r.market.chainId] || String(r.market.chainId),
                symbol: sym, // e.g. "USDC" | "USDT"
                apy, // base APY (Aave supply APY)
                apyBase: apy,
                apyReward: 0,
                tvlUsd: undefined, // can be added later via market size if needed
                url: "https://app.aave.com/markets",
                timestamp: now
            };
            if (!out[PLATFORM])
                out[PLATFORM] = [];
            out[PLATFORM].push(pool);
        }
    }
    // Sort highest APY first inside the platform
    if (out[PLATFORM])
        out[PLATFORM].sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
