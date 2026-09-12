import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listPlaywrightTests } from "./e2e-shard-inventory";
import { runConfig } from "./run-config";

const tests = listPlaywrightTests();
if (tests.length === 0) throw new Error("Baseline Playwright list is empty");
const run = runConfig();
mkdirSync(run.artifacts, { recursive: true });
const path = join(run.artifacts, "baseline-inventory.json");
writeFileSync(path, `${JSON.stringify({ tests }, null, 2)}\n`);
process.stdout.write(`${path}\n${tests.length} tests\n`);
