import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listPlaywrightTests, shardInventory } from "./e2e-shard-inventory";
import { runConfig } from "./run-config";

const shard = Number(process.argv[2]);
const total = Number(process.argv[3]);
const run = runConfig();
const inventory = shardInventory(
  shard,
  total,
  listPlaywrightTests(process.cwd(), { shard, total }),
);
mkdirSync(run.artifacts, { recursive: true });
const path = join(run.artifacts, "shard-inventory.json");
writeFileSync(path, `${JSON.stringify(inventory, null, 2)}\n`);
process.stdout.write(`${path}\n${inventory.tests.length} tests\n`);
