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
exports.readParserFile = readParserFile;
exports.writeParserFile = writeParserFile;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./config");
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
function filePathFor(stable, parserName) {
    // e.g., USDCDefilama.json, USDTMorpho.json
    return path.join(config_1.CONFIG.outputDir, `${stable}${parserName}.json`);
}
async function readParserFile(stable, parserName) {
    await ensureDir(config_1.CONFIG.outputDir);
    const file = filePathFor(stable, parserName);
    try {
        const raw = await fs_1.promises.readFile(file, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object")
            return parsed;
    }
    catch { /* ignore (missing file) */ }
    return {};
}
function mergePlatformPools(existing = [], incoming) {
    const byPool = new Map();
    for (const p of existing)
        byPool.set(p.poolId, p);
    for (const p of incoming)
        byPool.set(p.poolId, p); // incoming overwrites by poolId
    return Array.from(byPool.values()).sort((a, b) => { var _a, _b; return ((_a = b.apy) !== null && _a !== void 0 ? _a : 0) - ((_b = a.apy) !== null && _b !== void 0 ? _b : 0); });
}
async function writeParserFile(stable, parserName, data) {
    await ensureDir(config_1.CONFIG.outputDir);
    const file = filePathFor(stable, parserName);
    // Merge with existing content for idempotency
    const current = await readParserFile(stable, parserName);
    const merged = { ...current };
    for (const [platform, pools] of Object.entries(data)) {
        merged[platform] = mergePlatformPools(current[platform], pools);
    }
    const tmp = `${file}.tmp`;
    await fs_1.promises.writeFile(tmp, JSON.stringify(merged, null, 2), "utf8");
    await fs_1.promises.rename(tmp, file);
}
