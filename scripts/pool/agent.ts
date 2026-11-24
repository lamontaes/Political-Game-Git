// Who is asking for work (owner, Nov 10, 2026: "I'm not choosing the name"):
// an agent says what it is once, the tool finds its tier in docs/pool/tiers.json,
// gives it a unique name and remembers both in that checkout's git folder.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Tiers {
  /** Tier names, weakest first, each with the highest item level (`model:`) it may build. */
  tiers: { name: string; level: string }[];
  /** The tier of an agent that says nothing, or says something no row knows. */
  unknown: string;
  /** First match wins: one of `any` must be a word of what the agent said. */
  models: { label: string; tier: string; any: string[] }[];
}

/** What the checkout remembers about its agent. */
export interface Identity {
  name: string;
  tier: string;
  /** What the agent said it is, in its own words; empty when it said nothing. */
  as: string;
  at: string;
}

/** The tiers with no tiers.json: the standard's four levels under their own names, and no model rows. */
export const DEFAULT_TIERS: Tiers = {
  tiers: [
    { name: "light", level: "haiku" },
    { name: "mid", level: "sonnet" },
    { name: "top", level: "opus" },
    { name: "lead", level: "fable" },
  ],
  unknown: "mid",
  models: [],
};

/** Reads docs/pool/tiers.json under a pool folder, or the default when it is missing. */
export function readTiers(poolDir: string): Tiers {
  const p = join(poolDir, "tiers.json");
  if (!existsSync(p)) return DEFAULT_TIERS;
  const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Tiers>;
  return {
    tiers: raw.tiers?.length ? raw.tiers : DEFAULT_TIERS.tiers,
    unknown: raw.unknown ?? DEFAULT_TIERS.unknown,
    models: raw.models ?? [],
  };
}

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * The tier and name stem for what an agent says it is. Whole words only, so
 * "gemini" is never read as "mini". Nothing said, or nothing known: the
 * table's `unknown` tier and the stem "agent".
 */
export function tierOf(
  as: string,
  tiers: Tiers,
): { tier: string; label: string } {
  const said = new Set(words(as));
  for (const row of tiers.models)
    if (row.any.some((w) => said.has(w)))
      return { tier: row.tier, label: row.label };
  return { tier: tiers.unknown, label: "agent" };
}

/** The item level a tier may build up to, or a level given by its own name; null when it is neither. */
export function levelOf(
  tierOrLevel: string,
  tiers: Tiers,
  levels: readonly string[],
): string | null {
  const hit = tiers.tiers.find((t) => t.name === tierOrLevel);
  if (hit) return hit.level;
  return levels.includes(tierOrLevel) ? tierOrLevel : null;
}

/** The tier whose level this is: the name an item's `model:` goes by in the index. */
export function tierOfLevel(level: string, tiers: Tiers): string {
  return tiers.tiers.find((t) => t.level === level)?.name ?? level;
}

/** Where the checkout keeps its agent: inside its own git folder, so it is never committed. */
export function identityFile(env: NodeJS.ProcessEnv = process.env): string {
  if (env.POOL_AGENT_FILE) return env.POOL_AGENT_FILE;
  const dir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
  return join(dir, "pool-agent.json");
}

export function readIdentity(file: string): Identity | null {
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Identity>;
    return raw.name && raw.tier
      ? {
          name: raw.name,
          tier: raw.tier,
          as: raw.as ?? "",
          at: raw.at ?? "",
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * The agent of this checkout. A checkout that already has one keeps it, unless
 * the agent now says it is something else. Otherwise it gets a new name, the
 * stem from the table plus four characters nobody else has, and its tier.
 * `write` false (a dry run) leaves the checkout as it was.
 */
export function identify(
  as: string,
  tiers: Tiers,
  file: string,
  now: number,
  write = true,
): Identity & { fresh: boolean } {
  const said = as.replace(/\s+/g, " ").trim();
  const held = readIdentity(file);
  if (held && (!said || said === held.as)) return { ...held, fresh: false };
  const { tier, label } = tierOf(said, tiers);
  const who: Identity = {
    name: `${label}-${randomBytes(2).toString("hex")}`,
    tier,
    as: said,
    at: new Date(now).toISOString(),
  };
  if (write) writeFileSync(file, JSON.stringify(who, null, 2) + "\n");
  return { ...who, fresh: true };
}

/**
 * The branch prefix a tool may push under, without anyone typing it: the one
 * given, else POOL_BRANCH_PREFIX, else `claude/pool-` inside a Claude cloud
 * session (which may push only under `claude/`), else `pool/`.
 */
export function branchPrefix(
  given: string | undefined,
  env: NodeJS.ProcessEnv,
): string {
  if (given) return given;
  if (env.POOL_BRANCH_PREFIX) return env.POOL_BRANCH_PREFIX;
  return env.CLAUDE_CODE_REMOTE === "true" ? "claude/pool-" : "pool/";
}
