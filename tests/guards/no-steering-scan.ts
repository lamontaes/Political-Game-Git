import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

/** The scanner behind tests/guards/no-steering.test.ts (and the script that writes its baseline). */

const ROOT = path.resolve(import.meta.dirname, "../..");

/** The roles a parameter row may carry. */
export const ROLES = ["coefficient", "level", "opening", "law"] as const;

/** Step code: shipped core2 code that runs on the calendar, not tests, types, tooling or data. */
export function isStepCode(file: string): boolean {
  return (
    /^src\/core2\/.*\.ts$/.test(file) &&
    !/\.(test|spec)\.ts$/.test(file) &&
    !/\.d\.ts$/.test(file) &&
    !file.includes("/tooling/") &&
    !file.includes("/data/")
  );
}

const IDENT = "[\\w.$]+(?:\\([^()]*\\))?(?:\\[[^\\]]*\\])?";
const OUTCOME =
  "(?:unemployment|inflation|growth|gdp|output|wage|price|rate|jobs|income)\\w*";

/** The shapes of steering, each with the word the baseline files it under. */
export const SHAPES: readonly { name: string; pattern: RegExp }[] = [
  {
    // L + k * (x - L): the next value is the level plus a share of the distance from it.
    name: "pull toward a level (L + k*(x-L))",
    pattern: new RegExp(
      `\\b(${IDENT})\\s*\\+\\s*${IDENT}\\s*\\*\\s*\\(\\s*${IDENT}\\s*-\\s*\\1\\s*\\)`,
      "g",
    ),
  },
  {
    // x - (x - L) * k and x - gap / k: close a gap by a share each step.
    name: "closes a gap (x - gap/k)",
    pattern: new RegExp(
      `\\b${IDENT}\\s*-\\s*\\(?\\s*\\w*[gG]ap\\w*\\s*\\)?\\s*\\/\\s*${IDENT}`,
      "g",
    ),
  },
  {
    // k * (target - own): a correction proportional to the distance from a target.
    name: "correction toward a target (k*(T-own))",
    pattern:
      /\*\s*\(\s*(?:target|natural|neutral|trend|mean|long\w*|level)\w*\s*-\s*[\w.$]+\s*\)/g,
  },
  {
    // x - p("...Natural/Neutral/Anchor/Mean/Trend/Target..."): the distance from a researched level.
    name: "distance from a researched level (x - p(level))",
    pattern:
      /[\w.$)\]]\s*-\s*p\("[A-Za-z]*(?:Natural|Neutral|Anchor|Mean|Trend|Target)[A-Za-z]*"\)/g,
  },
  {
    // (x - something.opening...): the distance from where the measure began.
    name: "distance from the opening level (x - opening)",
    pattern: /-\s*[\w.$]*[oO]pening\w*\s*\)/g,
  },
  {
    // A clamp on an outcome: Math.max(lo, Math.min(hi, outcome)).
    name: "clamp on an outcome",
    pattern: new RegExp(
      `Math\\.(?:max|min)\\([^;\\n]*Math\\.(?:min|max)\\([^;\\n]*\\b${OUTCOME}\\b[^;\\n]*\\)`,
      "gi",
    ),
  },
];

/**
 * A line that is a person's own perception, not a measure moved by the step,
 * carries a `// perception: <reason>` comment on the line above it (owner,
 * Nov 8, 10:20 a.m.: candidates run because they think they have a chance). The
 * marked line is left out of the count; the comment must say why.
 */
const PERCEPTION = /^[ \t]*\/\/ perception: \S.*\n[^\n]*\n/gm;

/** Steering shapes in one file's source, comments removed. */
export function steeringCount(source: string): number {
  const code = source
    .replace(PERCEPTION, "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  return SHAPES.reduce(
    (sum, { pattern }) => sum + (code.match(pattern)?.length ?? 0),
    0,
  );
}

type Row = { role?: unknown; tag?: unknown; value?: unknown };

/** Numeric parameter rows in one parsed data file: the row and whether it has a valid role. */
export function parameterRows(value: unknown): { labeled: boolean }[] {
  const out: { labeled: boolean }[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const row = node as Row;
    if (
      typeof row.value === "number" &&
      (row.tag === "SOURCED" ||
        row.tag === "ESTIMATED" ||
        row.tag === "TUNABLE")
    )
      out.push({
        labeled:
          typeof row.role === "string" &&
          (ROLES as readonly string[]).includes(row.role),
      });
    Object.values(node).forEach(walk);
  };
  walk(value);
  return out;
}

function trackedFiles(pattern: string): string[] {
  return execFileSync("git", ["ls-files", pattern], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

export function stepCounts(): Map<string, number> {
  const out = new Map<string, number>();
  for (const file of trackedFiles("src/core2").filter(isStepCode)) {
    const n = steeringCount(readFileSync(path.join(ROOT, file), "utf8"));
    if (n > 0) out.set(file, n);
  }
  return out;
}

export function unlabeledCounts(): Map<string, number> {
  const out = new Map<string, number>();
  for (const file of trackedFiles("src/core2/data").filter((f) =>
    f.endsWith(".json"),
  )) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
    } catch {
      continue;
    }
    const n = parameterRows(parsed).filter((row) => !row.labeled).length;
    if (n > 0) out.set(file, n);
  }
  return out;
}
