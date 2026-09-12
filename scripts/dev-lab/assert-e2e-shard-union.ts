import { readFileSync } from "node:fs";
import {
  assertShardUnion,
  readShardInventories,
  type ShardInventory,
} from "./e2e-shard-inventory";

const baselinePath = process.argv[2];
const shardDirectory = process.argv[3];
if (!baselinePath || !shardDirectory) {
  throw new Error(
    "Usage: assert-e2e-shard-union.ts <baseline.json> <shard-inventory-directory>",
  );
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as {
  tests?: unknown;
};
if (
  !Array.isArray(baseline.tests) ||
  baseline.tests.some((id) => typeof id !== "string")
)
  throw new Error("Baseline inventory is malformed");

const inventories: ShardInventory[] = readShardInventories(shardDirectory);
assertShardUnion(baseline.tests, inventories);
process.stdout.write("e2e shard union matches the baseline Playwright list\n");
