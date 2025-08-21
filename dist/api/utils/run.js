"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTsScript = runTsScript;
const child_process_1 = require("child_process");
function runTsScript(scriptPath) {
    return new Promise((resolve, reject) => {
        // Use npx ts-node to execute TS files without prebuild
        const child = (0, child_process_1.spawn)(process.platform === "win32" ? "npx.cmd" : "npx", [
            "ts-node",
            scriptPath
        ], { stdio: "inherit" });
        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`${scriptPath} exited with code ${code}`));
        });
    });
}
