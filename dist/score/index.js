"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./utils/config");
const STABLES = ["USDC", "USDT"];
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
function isJsonFileForStable(filename, stable) {
    return new RegExp(`^${stable}.*\\.json$`, "i").test(filename);
}
function parserNameFromFile(stable, filename) {
    // e.g., USDCDefilama.json -> Defilama
    return filename.replace(new RegExp(`^${stable}`), "").replace(/\.json$/i, "");
}
// --- NEW: single-asset stable filter (no LP pairs) ---
function isSingleTokenStableSymbol(symbol, stable) {
    if (!symbol)
        return false;
    const sym = symbol.toUpperCase().replace(/\s+/g, "");
    // reject common LP separators
    if (/[+\-\/]/.test(sym))
        return false;
    // Accept common wrappers/aliases that clearly denote the stable asset.
    // USDC: allow USDC, USDC.E, AXLUSDC, aUSDC, sUSDC, USDbC, etc.
    // USDT: allow USDT, USDT.E, AXLUSDT, aUSDT, sUSDT, etc.
    if (stable === "USDC") {
        // USDC or USDbC anywhere in the string, e.g., aUSDC, sUSDC, axlUSDC, USDC.e
        if (/(USDC|USDBC)/.test(sym))
            return true;
        return false;
    }
    else {
        // USDT and typical wrappers
        if (/USDT/.test(sym))
            return true;
        return false;
    }
}
async function readStableParserFile(fullPath) {
    try {
        const raw = await fs_1.promises.readFile(fullPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object")
            return parsed;
    }
    catch {
        // ignore bad file
    }
    return null;
}
function flattenMap(map, parser, stable) {
    const out = [];
    for (const [platform, pools] of Object.entries(map)) {
        for (const p of pools || []) {
            // must be single-asset for the requested stable
            if (!isSingleTokenStableSymbol(p === null || p === void 0 ? void 0 : p.symbol, stable))
                continue;
            if (p.apy == null || Number.isNaN(p.apy))
                continue; // require APY
            out.push({ ...p, parser, platform });
        }
    }
    return out;
}
function dedupeKeepHighest(rows) {
    var _a, _b;
    // Deduplicate across aggregator/direct by (platform|chain|symbol)
    const best = new Map();
    for (const r of rows) {
        const key = `${r.platform}|${r.chain}|${r.symbol}`;
        const prev = best.get(key);
        if (!prev || ((_a = r.apy) !== null && _a !== void 0 ? _a : 0) > ((_b = prev.apy) !== null && _b !== void 0 ? _b : 0))
            best.set(key, r);
    }
    return Array.from(best.values());
}
function takeTopN(rows) {
    const n = Math.max(1, Math.floor(config_1.SCORE_CONFIG.topN || 10));
    const sorted = rows.sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
    return sorted.slice(0, n);
}
async function computeTopNForStable(stable) {
    const files = await fs_1.promises.readdir(config_1.SCORE_CONFIG.inputDir);
    const mine = files.filter(f => isJsonFileForStable(f, stable));
    const allRows = [];
    for (const file of mine) {
        const parser = parserNameFromFile(stable, file);
        const full = path.join(config_1.SCORE_CONFIG.inputDir, file);
        const map = await readStableParserFile(full);
        if (!map)
            continue;
        allRows.push(...flattenMap(map, parser, stable));
    }
    const deduped = dedupeKeepHighest(allRows);
    return takeTopN(deduped);
}
async function writeTopFile(stable, rows) {
    await ensureDir(config_1.SCORE_CONFIG.outputDir);
    const file = path.join(config_1.SCORE_CONFIG.outputDir, `${stable}TOP${config_1.SCORE_CONFIG.topN}.json`);
    const payload = {
        stable,
        generatedAt: new Date().toISOString(),
        count: rows.length,
        items: rows
    };
    const tmp = `${file}.tmp`;
    await fs_1.promises.writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
    await fs_1.promises.rename(tmp, file);
}
async function main() {
    const n = Math.max(1, Math.floor(config_1.SCORE_CONFIG.topN || 10));
    for (const s of STABLES) {
        console.log(`[score] computing TOP${n} for ${s} (single-asset only)...`);
        const top = await computeTopNForStable(s);
        await writeTopFile(s, top);
        console.log(`[score] wrote ${s}TOP${config_1.SCORE_CONFIG.topN}.json with ${top.length} items.`);
    }
}
main().catch(err => { console.error("[score] fatal:", err); process.exit(1); });
