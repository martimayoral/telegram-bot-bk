"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEthenaByStable = parseEthenaByStable;
const config_1 = require("../utils/config");
const ETHENA_PLATFORM = "ethena";
// Minimal parser — Ethena's public APIs for APY require whitelisting.
// If EC.ethena.apyUrl is provided and returns a known structure, we parse it.
// Otherwise, we no‑op gracefully.
async function parseEthenaByStable(stable) {
    var _a, _b, _c;
    if (!config_1.CONFIG.ethena.apyUrl)
        return {};
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
        const r = await fetch(config_1.CONFIG.ethena.apyUrl, { signal: ctrl.signal, headers: { "user-agent": "yieldfy/1.0" } });
        clearTimeout(t);
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        const now = Date.now();
        // Expecting something like { susdeApy: 0.12 } or { data: { apy: 12.3 } }
        const apyRaw = (_c = (_a = json === null || json === void 0 ? void 0 : json.susdeApy) !== null && _a !== void 0 ? _a : (_b = json === null || json === void 0 ? void 0 : json.data) === null || _b === void 0 ? void 0 : _b.apy) !== null && _c !== void 0 ? _c : json === null || json === void 0 ? void 0 : json.apy;
        const apy = typeof apyRaw === "number" ? (apyRaw > 1 ? apyRaw / 100 : apyRaw) : (typeof apyRaw === "string" ? (parseFloat(apyRaw) / 100) : undefined);
        if (apy == null)
            return {};
        const pool = {
            poolId: "ethena:susde",
            chain: "Ethereum",
            symbol: stable, // only include if querying USDC/USDT and you want to display sUSDe integrations later
            apy,
            apyBase: apy,
            apyReward: 0,
            tvlUsd: undefined,
            url: "https://app.ethena.fi/dashboards/apy",
            timestamp: now
        };
        return { [ETHENA_PLATFORM]: [pool] };
    }
    catch {
        return {};
    }
}
