"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./utils/config");
const stablecoinlist_1 = require("./utils/stablecoinlist");
const writeread_1 = require("./utils/writeread");
const defilamaparser_1 = require("./platforms/defilamaparser");
const aaveparser_1 = require("./platforms/aaveparser");
const compoundparser_1 = require("./platforms/compoundparser");
const straklendparser_1 = require("./platforms/straklendparser");
const morphoparser_1 = require("./platforms/morphoparser");
const curveparser_1 = require("./platforms/curveparser");
const yearnparser_1 = require("./platforms/yearnparser");
const ethenaparser_1 = require("./platforms/ethenaparser");
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const PARSERS = [
    ["Defilama", defilamaparser_1.parseDefiLlamaByStable],
    ["Aave", aaveparser_1.parseAaveByStable],
    ["Compound", compoundparser_1.parseCompoundByStable],
    ["SparkLend", straklendparser_1.parseSparkByStable],
    ["Morpho", morphoparser_1.parseMorphoByStable],
    ["Curve", curveparser_1.parseCurveByStable],
    ["Yearn", yearnparser_1.parseYearnByStable],
    ["Ethena", ethenaparser_1.parseEthenaByStable],
];
async function runForStable(stable) {
    console.log(`[yieldfy] parsing all platforms for ${stable}...`);
    // kick all parsers at once for this stable
    const settled = await Promise.allSettled(PARSERS.map(([, fn]) => fn(stable)));
    // write each parser’s result to its own file
    const writes = [];
    settled.forEach((res, i) => {
        const name = PARSERS[i][0];
        if (res.status === "fulfilled") {
            const data = res.value || {};
            writes.push((0, writeread_1.writeParserFile)(stable, name, data));
        }
        else {
            console.warn(`[yieldfy] ${name} failed for ${stable}:`, res.reason);
        }
    });
    await Promise.allSettled(writes);
    console.log(`[yieldfy] wrote ${stable}* parser files: ${writes.length}/${PARSERS.length} succeeded.`);
}
async function main() {
    // Sequential per stable (simple I/O), each stable runs all parsers in parallel
    for (let i = 0; i < stablecoinlist_1.STABLES.length; i++) {
        await runForStable(stablecoinlist_1.STABLES[i]);
        if (i < stablecoinlist_1.STABLES.length - 1)
            await sleep(config_1.CONFIG.scheduler.parseDelayMs);
    }
}
main().catch((err) => {
    console.error("[yieldfy] fatal:", err);
    process.exit(1);
});
