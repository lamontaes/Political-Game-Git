import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIST_LINE = /^\s+\[[^\]]+\] › (.+)$/;

export type ShardInventory = {
  readonly shard: number;
  readonly total: number;
  readonly tests: readonly string[];
};

export function parsePlaywrightList(output: string): string[] {
  const ids: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = LIST_LINE.exec(line);
    if (match) ids.push(match[1]);
  }
  return ids;
}

export function shardInventory(
  shard: number,
  total: number,
  tests: readonly string[],
): ShardInventory {
  if (
    !Number.isInteger(shard) ||
    !Number.isInteger(total) ||
    total < 1 ||
    shard < 1 ||
    shard > total
  )
    throw new Error(`Invalid shard ${shard}/${total}`);
  if (tests.length === 0)
    throw new Error(`Shard ${shard}/${total} enumerated zero tests`);
  return { shard, total, tests: [...tests] };
}

export function assertShardUnion(
  baseline: readonly string[],
  inventories: readonly ShardInventory[],
): void {
  if (inventories.length === 0)
    throw new Error("No shard inventories were supplied");
  const total = inventories[0]?.total;
  if (total === undefined)
    throw new Error("No shard inventories were supplied");
  if (inventories.some((inventory) => inventory.total !== total))
    throw new Error("Shard inventories disagree about the shard total");
  if (inventories.length !== total)
    throw new Error(
      `Expected ${total} shard inventories, received ${inventories.length}`,
    );

  const owner = new Map<string, number>();
  const seenShards = new Set<number>();
  for (const inventory of inventories) {
    shardInventory(inventory.shard, inventory.total, inventory.tests);
    if (seenShards.has(inventory.shard))
      throw new Error(`Shard ${inventory.shard} was enumerated more than once`);
    seenShards.add(inventory.shard);
    for (const id of inventory.tests) {
      const previous = owner.get(id);
      if (previous !== undefined)
        throw new Error(
          `Test enumerated in more than one shard (${previous} and ${inventory.shard}): ${id}`,
        );
      owner.set(id, inventory.shard);
    }
  }
  for (let shard = 1; shard <= total; shard += 1) {
    if (!seenShards.has(shard))
      throw new Error(`Missing inventory for shard ${shard}/${total}`);
  }

  const baselineSet = new Set(baseline);
  if (baselineSet.size !== baseline.length)
    throw new Error("Baseline Playwright list contains duplicated test ids");
  const extras = [...owner.keys()].filter((id) => !baselineSet.has(id));
  const missing = [...baselineSet].filter((id) => !owner.has(id));
  if (extras.length > 0 || missing.length > 0)
    throw new Error(
      `Shard union does not match the baseline suite (extra ${extras.length}, missing ${missing.length})`,
    );
}

export function listPlaywrightTests(
  root = process.cwd(),
  shard?: { shard: number; total: number },
): string[] {
  const args = ["test", "--list"];
  if (shard) args.push(`--shard=${shard.shard}/${shard.total}`);
  const output = execFileSync(
    process.execPath,
    [join(root, "node_modules/playwright/cli.js"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20_000_000,
      env: process.env,
    },
  );
  return parsePlaywrightList(output);
}

export function readShardInventories(directory: string): ShardInventory[] {
  const inventories: ShardInventory[] = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (!entry.name.endsWith(".json")) continue;
      const parsed = JSON.parse(readFileSync(path, "utf8")) as ShardInventory;
      inventories.push(
        shardInventory(parsed.shard, parsed.total, parsed.tests),
      );
    }
  }
  return inventories;
}
