"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pct = pct;
exports.usd = usd;
function pct(dec) {
    if (dec == null || Number.isNaN(dec))
        return "-";
    return `${(dec * 100).toFixed(2)}%`;
}
function usd(n) {
    if (n == null || Number.isNaN(n))
        return "-";
    const abs = Math.abs(n);
    if (abs >= 1000000000)
        return `$${(n / 1000000000).toFixed(2)}B`;
    if (abs >= 1000000)
        return `$${(n / 1000000).toFixed(2)}M`;
    if (abs >= 1000)
        return `$${(n / 1000).toFixed(2)}k`;
    return `$${n.toFixed(2)}`;
}
