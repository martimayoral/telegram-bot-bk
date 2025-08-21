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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const run_1 = require("./utils/run");
const config_1 = require("../score/utils/config");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const STABLES = new Set(["USDC", "USDT"]);
function topFilePath(stable) {
    return path.join(config_1.SCORE_CONFIG.outputDir, `${stable}TOP${config_1.SCORE_CONFIG.topN}.json`);
}
async function readTop(stable) {
    try {
        const raw = await fs_1.promises.readFile(topFilePath(stable), "utf8");
        const json = JSON.parse(raw);
        if (json && Array.isArray(json.items))
            return json;
    }
    catch { }
    return null;
}
// POST /api/top?stable=USDC  -> runs parser + score, returns rank→name dict
app.post("/api/top", async (req, res) => {
    try {
        const stable = String(req.query.stable || "").toUpperCase();
        if (!STABLES.has(stable))
            return res.status(400).json({ error: "stable must be USDC or USDT" });
        // 1) run parser (all platforms)
        await (0, run_1.runTsScript)("src/parser/index.ts");
        // 2) run score (respects SCORE_CONFIG.topN)
        await (0, run_1.runTsScript)("src/score/index.ts");
        // 3) read the freshly written TOP file
        const top = await readTop(stable);
        if (!top)
            return res.status(500).json({ error: "TOP file not found after scoring" });
        // build rank→platform-name dict
        const dict = {};
        top.items.forEach((it, idx) => {
            dict[String(idx + 1)] = String(it.platform);
        });
        return res.json(dict);
    }
    catch (e) {
        return res.status(500).json({ error: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
    }
});
// GET /api/describe?stable=USDC&platform=yearn-finance
// Returns the raw JSON item details (no human text)
app.get("/api/describe", async (req, res) => {
    var _a;
    try {
        const stable = String(req.query.stable || "").toUpperCase();
        const platform = String(req.query.platform || "");
        if (!STABLES.has(stable))
            return res.status(400).json({ error: "stable must be USDC or USDT" });
        if (!platform)
            return res.status(400).json({ error: "platform is required" });
        const top = await readTop(stable);
        if (!top)
            return res.status(404).json({ error: "TOP file not found. Run /api/top first." });
        const item = top.items.find((it) => String(it.platform).toLowerCase() === platform.toLowerCase());
        if (!item)
            return res.status(404).json({ error: `platform '${platform}' not found in TOP${config_1.SCORE_CONFIG.topN}` });
        // return the raw item (plus url if missing -> null for consistency)
        return res.json({
            poolId: item.poolId,
            chain: item.chain,
            symbol: item.symbol,
            apy: item.apy,
            apyBase: item.apyBase,
            apyReward: item.apyReward,
            tvlUsd: item.tvlUsd,
            timestamp: item.timestamp,
            parser: item.parser,
            platform: item.platform,
            url: (_a = item.url) !== null && _a !== void 0 ? _a : null
        });
    }
    catch (e) {
        return res.status(500).json({ error: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
    }
});
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
});
