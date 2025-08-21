"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STABLES = void 0;
exports.symbolMatchesStable = symbolMatchesStable;
exports.STABLES = ["USDC", "USDT"];
// Helper to decide if a DefiLlama symbol belongs to a given stable
// Accepts wrappers (aUSDC, sUSDC), bridge variants (USDC.e, axlUSDC), and LPs like USDC+USDT.
function symbolMatchesStable(symbol, stable) {
    const sym = symbol.toUpperCase();
    if (sym.includes(stable))
        return true;
    // LP split check: allow only if *all* legs are stables we track (prevents USDC+ETH, etc.)
    const parts = sym.split(/[+\-\/]/).filter(Boolean);
    if (parts.length > 1) {
        return parts.every(p => exports.STABLES.some(s => p.includes(s)));
    }
    return false;
}
