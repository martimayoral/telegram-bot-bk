"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCompoundByStable = parseCompoundByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
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
const PLATFORM = "compound-v3";
// Flexible query against community Compound v3 subgraphs.
// Different deployments may expose different field names; we request a minimal, widely supported set.
const QUERY = `
  query Pools {
    markets(first: 1000) {
      id
      chainId
      baseToken { symbol address }
      marketInfo { supplyApy }
      totals { totalSupplyUsd }
    }
  }
`;
async function parseCompoundByStable(stable) {
    var _a, _b, _c, _d;
    const urls = Object.values(config_1.CONFIG.compound.subgraphs).filter(Boolean);
    if (!urls.length)
        return {};
    const now = Date.now();
    const out = {};
    // race the configured subgraphs, first to succeed wins
    let resp;
    for (const url of urls) {
        try {
            resp = await fetchWithRetry(url, { method: "POST", body: JSON.stringify({ query: QUERY }) });
            break;
        }
        catch { /* try next */ }
    }
    if (!resp)
        return {};
    let json;
    try {
        json = await resp.json();
    }
    catch {
        return {};
    }
    const pools = [];
    for (const m of ((_a = json === null || json === void 0 ? void 0 : json.data) === null || _a === void 0 ? void 0 : _a.markets) || []) {
        const sym = (((_b = m.baseToken) === null || _b === void 0 ? void 0 : _b.symbol) || "").toUpperCase();
        if (!(0, stablecoinlist_1.symbolMatchesStable)(sym, stable))
            continue;
        const apy = typeof ((_c = m.marketInfo) === null || _c === void 0 ? void 0 : _c.supplyApy) === "number" ? m.marketInfo.supplyApy : undefined; // already decimal [0,1]
        pools.push({
            poolId: m.id,
            chain: String(m.chainId),
            symbol: sym,
            apy,
            apyBase: apy,
            apyReward: 0,
            tvlUsd: (_d = m.totals) === null || _d === void 0 ? void 0 : _d.totalSupplyUsd,
            url: "https://app.compound.finance",
            timestamp: now
        });
    }
    if (pools.length)
        out[PLATFORM] = pools.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
