"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYearnByStable = parseYearnByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
const YEARN_PLATFORM = "yearn-v3";
async function yget(path) {
    const url = `${config_1.CONFIG.yearn.ydaemonBase}/1/vaults/all`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
    try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "yieldfy/1.0" } });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return await r.json();
    }
    finally {
        clearTimeout(t);
    }
}
async function parseYearnByStable(stable) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const data = await yget("/1/vaults/all");
    const now = Date.now();
    const rows = [];
    for (const v of data) {
        const sym = String(((_a = v === null || v === void 0 ? void 0 : v.token) === null || _a === void 0 ? void 0 : _a.symbol) || ((_b = v === null || v === void 0 ? void 0 : v.underlyingToken) === null || _b === void 0 ? void 0 : _b.symbol) || (v === null || v === void 0 ? void 0 : v.symbol) || "").toUpperCase();
        if (!(0, stablecoinlist_1.symbolMatchesStable)(sym, stable))
            continue;
        // yDaemon exposes apy fields usually under v.apy.net_apy; sometimes under v.apy.netApy
        const apyRaw = (_h = (_f = (_d = (_c = v === null || v === void 0 ? void 0 : v.apy) === null || _c === void 0 ? void 0 : _c.net_apy) !== null && _d !== void 0 ? _d : (_e = v === null || v === void 0 ? void 0 : v.apy) === null || _e === void 0 ? void 0 : _e.netApy) !== null && _f !== void 0 ? _f : (_g = v === null || v === void 0 ? void 0 : v.apy) === null || _g === void 0 ? void 0 : _g.net) !== null && _h !== void 0 ? _h : undefined;
        const apy = typeof apyRaw === "number" ? apyRaw : (typeof apyRaw === "string" ? parseFloat(apyRaw) : undefined);
        rows.push({
            poolId: String((v === null || v === void 0 ? void 0 : v.address) || ((_j = v === null || v === void 0 ? void 0 : v.vault) === null || _j === void 0 ? void 0 : _j.address) || (v === null || v === void 0 ? void 0 : v.id) || sym).toLowerCase(),
            chain: "1",
            symbol: sym,
            apy,
            apyBase: apy,
            apyReward: 0,
            tvlUsd: typeof ((_k = v === null || v === void 0 ? void 0 : v.tvl) === null || _k === void 0 ? void 0 : _k.tvl) === "number" ? v.tvl.tvl : (typeof (v === null || v === void 0 ? void 0 : v.tvl) === "number" ? v.tvl : undefined),
            url: ((_o = (_m = (_l = v === null || v === void 0 ? void 0 : v.details) === null || _l === void 0 ? void 0 : _l.apy) === null || _m === void 0 ? void 0 : _m.metadata) === null || _o === void 0 ? void 0 : _o.displayName) ? `https://yearn.fi/vaults/${v.address}` : "https://yearn.fi/",
            timestamp: now
        });
    }
    const out = {};
    if (rows.length)
        out[YEARN_PLATFORM] = rows.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
