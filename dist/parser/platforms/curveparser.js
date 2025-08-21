"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCurveByStable = parseCurveByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
const CURVE_PLATFORM = "curve";
async function fetchJSON(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
    try {
        const r = await fetch(url, { headers: { "user-agent": "yieldfy/1.0" }, signal: ctrl.signal });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return await r.json();
    }
    finally {
        clearTimeout(t);
    }
}
async function parseCurveByStable(stable) {
    var _a, _b, _c;
    let payload;
    for (const url of config_1.CONFIG.curve.poolsUrls) {
        try {
            payload = await fetchJSON(url);
            if (payload)
                break;
        }
        catch { /* try next */ }
    }
    if (!payload)
        return {};
    const list = (((_a = payload.data) === null || _a === void 0 ? void 0 : _a.poolData) || ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.pools) || payload.pools || []);
    const now = Date.now();
    const rows = [];
    for (const p of list) {
        const symbol = String(p.symbol || ((_c = p.coins) === null || _c === void 0 ? void 0 : _c.join("+")) || "").toUpperCase();
        if (!(0, stablecoinlist_1.symbolMatchesStable)(symbol, stable))
            continue;
        const apyPct = (p.apy || p.baseApy || p.latestDailyApy || p.gaugeCrvApy || 0); // best‑effort
        const apy = typeof apyPct === "number" ? (apyPct > 1 ? apyPct / 100 : apyPct) : undefined;
        const tvl = typeof p.usdTotal === "number" ? p.usdTotal : (typeof p.tvl === "number" ? p.tvl : undefined);
        rows.push({
            poolId: String(p.address || p.id || p.pool || symbol),
            chain: String(p.chain || p.network || "Ethereum"),
            symbol,
            apy,
            apyBase: apy,
            apyReward: undefined,
            tvlUsd: tvl,
            url: p.url || p.poolUrl || "https://curve.fi/",
            timestamp: now
        });
    }
    const out = {};
    if (rows.length)
        out[CURVE_PLATFORM] = rows.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
