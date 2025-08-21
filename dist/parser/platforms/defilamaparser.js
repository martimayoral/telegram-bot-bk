"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDefiLlamaByStable = parseDefiLlamaByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
// Minimal fetch with timeout + retries
async function fetchWithRetry(url, opts, tries = config_1.CONFIG.http.retries) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
        try {
            const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'user-agent': 'yieldfy/1.0', ...(opts.headers || {}) } });
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
async function parseDefiLlamaByStable(stable) {
    var _a, _b, _c, _d, _e;
    const res = await fetchWithRetry(config_1.CONFIG.llama.poolsUrl, { method: 'GET' });
    const json = await res.json();
    const now = Date.now();
    const platformMap = {};
    for (const p of json.data || []) {
        if (!p.symbol)
            continue;
        if (!(0, stablecoinlist_1.symbolMatchesStable)(p.symbol, stable))
            continue;
        const pool = {
            poolId: p.pool,
            chain: p.chain,
            symbol: p.symbol,
            apy: ((_a = p.apy) !== null && _a !== void 0 ? _a : undefined) != null ? (Number(p.apy) / 100) : undefined,
            apyBase: ((_b = p.apyBase) !== null && _b !== void 0 ? _b : undefined) != null ? (Number(p.apyBase) / 100) : undefined,
            apyReward: ((_c = p.apyReward) !== null && _c !== void 0 ? _c : undefined) != null ? (Number(p.apyReward) / 100) : undefined,
            tvlUsd: ((_d = p.tvlUsd) !== null && _d !== void 0 ? _d : undefined) != null ? Number(p.tvlUsd) : undefined,
            url: (_e = p.url) !== null && _e !== void 0 ? _e : undefined,
            timestamp: now
        };
        const key = p.project || "unknown";
        if (!platformMap[key])
            platformMap[key] = [];
        platformMap[key].push(pool);
    }
    return platformMap;
}
