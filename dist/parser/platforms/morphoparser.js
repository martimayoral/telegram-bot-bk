"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMorphoByStable = parseMorphoByStable;
const config_1 = require("../utils/config");
const stablecoinlist_1 = require("../utils/stablecoinlist");
const MORPHO_PLATFORM = "morpho";
// Query adapted from Morpho docs: https://docs.morpho.org/tools/offchain/api/morpho/
// We ask for market APYs, rewards, and USD supplies. Items do not expose chainId directly,
// but rewards.asset.chain.id is present when rewards exist. We default to Ethereum when absent.
const QUERY = `
  query Markets($first: Int = 500, $chains: [Int!]) {
    markets(
      first: $first
      orderBy: SupplyAssetsUsd
      orderDirection: Desc
      where: { chainId_in: $chains }
    ) {
      items {
        uniqueKey
        loanAsset { address symbol decimals }
        collateralAsset { address symbol decimals }
        state {
          supplyApy
          avgSupplyApy
          avgNetSupplyApy
          supplyAssetsUsd
          utilization
          rewards {
            supplyApr
            borrowApr
            asset { address chain { id } }
          }
        }
      }
    }
  }
`;
const CHAIN_NAME = {
    1: "Ethereum",
    10: "Optimism",
    137: "Polygon",
    42161: "Arbitrum",
    43114: "Avalanche",
    8453: "Base",
};
async function gfetch(url, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), config_1.CONFIG.http.timeoutMs);
    try {
        const r = await fetch(url, {
            method: "POST",
            body: JSON.stringify(body),
            signal: ctrl.signal,
            headers: { "content-type": "application/json", "user-agent": "yieldfy/1.0" },
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return (await r.json());
    }
    finally {
        clearTimeout(t);
    }
}
async function parseMorphoByStable(stable) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    // Query popular chains; adjust as you extend coverage
    const chains = [1, 8453, 42161, 10, 137, 43114];
    const json = await gfetch(config_1.CONFIG.morpho.graphqlUrl, { query: QUERY, variables: { first: 500, chains } });
    const now = Date.now();
    const rows = [];
    for (const m of ((_b = (_a = json.data) === null || _a === void 0 ? void 0 : _a.markets) === null || _b === void 0 ? void 0 : _b.items) || []) {
        const sym = (((_c = m.loanAsset) === null || _c === void 0 ? void 0 : _c.symbol) || "").toUpperCase();
        if (!(0, stablecoinlist_1.symbolMatchesStable)(sym, stable))
            continue;
        // Prefer avgNetSupplyApy (includes rewards & fees over 6h) then avgSupplyApy then supplyApy.
        const apy = [(_d = m.state) === null || _d === void 0 ? void 0 : _d.avgNetSupplyApy, (_e = m.state) === null || _e === void 0 ? void 0 : _e.avgSupplyApy, (_f = m.state) === null || _f === void 0 ? void 0 : _f.supplyApy]
            .map(v => (typeof v === "number" ? v : undefined))
            .find(v => v != null);
        // Sum rewards supply APRs if present (already decimal per docs).
        const rewardApr = (((_g = m.state) === null || _g === void 0 ? void 0 : _g.rewards) || [])
            .map(r => (typeof (r === null || r === void 0 ? void 0 : r.supplyApr) === "number" ? r.supplyApr : 0))
            .reduce((a, b) => a + b, 0);
        // Best-effort chain id from first rewards entry; default to Ethereum if absent
        const chainId = (_o = (_m = (_l = (_k = (_j = (_h = m.state) === null || _h === void 0 ? void 0 : _h.rewards) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.asset) === null || _l === void 0 ? void 0 : _l.chain) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : 1;
        rows.push({
            poolId: m.uniqueKey,
            chain: CHAIN_NAME[chainId] || String(chainId),
            symbol: sym,
            apy: apy,
            apyBase: apy != null ? apy - rewardApr : undefined,
            apyReward: rewardApr || undefined,
            tvlUsd: typeof ((_p = m.state) === null || _p === void 0 ? void 0 : _p.supplyAssetsUsd) === "number" ? m.state.supplyAssetsUsd : undefined,
            url: "https://app.morpho.org/",
            timestamp: now,
        });
    }
    const out = {};
    if (rows.length)
        out[MORPHO_PLATFORM] = rows.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return out;
}
