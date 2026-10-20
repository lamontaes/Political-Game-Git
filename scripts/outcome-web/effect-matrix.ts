/**
 * The effect-web wiring matrix: for every researched outcome-web link, the
 * eight points that make a link wired end to end, each with its status, its
 * evidence (file:line or record) and, where it fails, why.
 *
 *   node --import tsx scripts/outcome-web/effect-matrix.ts [--out <file>]
 *
 * The static points are read from the links, the web's settings and the
 * source tree (which files read which outcome through the web's accessors).
 * The played points (did the owning engine's records move, by how much and
 * how unevenly) come from src/core2/outcome-web-twins.test.ts, which writes
 * its findings to the same matrix under `twins`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  causeAvailable,
  derivedOf,
  engineMeasure,
  isLaw,
  keptOutcome,
  linkCoverage,
  WEB_LINKS,
  type WebLink,
} from "../../src/core2/outcome-web-model";
// The web module first: gov-measures reaches it through a cycle.
import "../../src/core2/modules/outcome-web";
import { GOV_MEASURES } from "../../src/core2/gov-measures";

type Status = "pass" | "partial" | "fail" | "n/a";
interface Point {
  readonly status: Status;
  readonly evidence: string;
  readonly why?: string;
}

const ROOT = process.cwd();
/** The new core and its story layers; the old engine (src/simulation) does not count. */
const SRC_DIRS = ["src/core2", "src/director", "src/english"].map((dir) =>
  join(ROOT, dir),
);
/** Files that keep the web itself; a read there is not an engine reading it. */
const WEB_FILES = new Set([
  "src/core2/modules/outcome-web.ts",
  "src/core2/outcome-web-model.ts",
]);
/** Readers that turn an outcome into what people notice and how they vote. */
const KNOWING = /electorate-inputs|views|news|press|director|english/;
const ACCESSORS =
  /outcomeWebFactor|placeOutcome|personWebFactor|webFactorFor|webEffectFor/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "node_modules" || name === "data" ? [] : files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Every measure named as a string in a file that uses the web's accessors, with its line. */
function readers(): Map<string, { file: string; line: number }[]> {
  const found = new Map<string, { file: string; line: number }[]>();
  for (const path of SRC_DIRS.flatMap(files)) {
    const file = relative(ROOT, path);
    if (WEB_FILES.has(file)) continue;
    const text = readFileSync(path, "utf8");
    if (!ACCESSORS.test(text)) continue;
    text.split("\n").forEach((line, at) => {
      for (const match of line.matchAll(/"([a-z][a-z0-9-]*\.[a-z0-9.:-]+)"/g)) {
        const measure = match[1]!;
        if (!keptOutcome(derivedOf(measure)?.measure ?? measure)) continue;
        const list = found.get(measure) ?? [];
        list.push({ file, line: at + 1 });
        found.set(measure, list);
      }
    });
  }
  return found;
}

const READ = readers();
const engineReaders = (measure: string) =>
  (READ.get(measure) ?? []).filter((row) => !KNOWING.test(row.file));
const knowingReaders = (measure: string) =>
  (READ.get(measure) ?? []).filter((row) => KNOWING.test(row.file));
const where = (rows: readonly { file: string; line: number }[]) =>
  rows.map((row) => `${row.file}:${row.line}`).join(", ");
const linksPath = "data/research/outcome-web/links.json";
const linksText = readFileSync(join(ROOT, linksPath), "utf8").split("\n");
const lineOf = (key: string) =>
  linksText.findIndex((line) => line.includes(`"key": "${key}"`)) + 1;

/** How a link's cause is read today. */
function causeKind(measure: string): string {
  if (isLaw(measure)) return "law";
  if (engineMeasure(measure)) return "engine";
  if ((GOV_MEASURES as readonly string[]).includes(measure)) return "gov";
  if (keptOutcome(derivedOf(measure)?.measure ?? measure)) return "web-ledger";
  return "missing";
}

function cause(link: WebLink): Point {
  const kind = causeKind(link.from);
  if (link.shape.kind === "exposure-years" || link.shape.kind === "acute-decay")
    return {
      status: "fail",
      evidence: `${linksPath}:${lineOf(link.key)}`,
      why: `person-level shape ${link.shape.kind}: each person's own exposure record is needed and no engine keeps one`,
    };
  switch (kind) {
    case "law":
      return {
        status: "pass",
        evidence: "src/core2/modules/outcome-web.ts lawValue (laws module rows in force, lagged)",
      };
    case "engine":
      return {
        status: "pass",
        evidence: `world-metrics months.${engineMeasure(link.from)!.field}, lagged by causeAt (src/core2/modules/outcome-web.ts)`,
      };
    case "gov":
      return {
        status: "pass",
        evidence: `src/core2/gov-measures.ts govMeasure("${link.from}")`,
      };
    case "web-ledger": {
      const base = derivedOf(link.from)?.measure ?? link.from;
      const engine = engineReaders(base);
      return engine.length
        ? {
            status: "pass",
            evidence: `web ledger ${base}, which ${where(engine)} reads into its own records`,
          }
        : {
            status: "partial",
            evidence: `web ledger ${base}`,
            why: `the cause is the web's own number for ${base}, not an engine record: no engine produces ${base} (or reads the web's factor for it), so it holds at its 2024 base apart from other links`,
          };
    }
    default:
      return {
        status: "fail",
        evidence: `${linksPath}:${lineOf(link.key)}`,
        why: `no measure: nothing in the core records ${link.from}`,
      };
  }
}

function size(link: WebLink & { range?: number[]; anchor?: string }): Point {
  const at = `${linksPath}:${lineOf(link.key)}`;
  if (link.size === null)
    return { status: "fail", evidence: at, why: "no size: the link's research has not been sized" };
  if (!link.range)
    return {
      status: "partial",
      evidence: `${at} size ${link.size}`,
      why: "no recorded spread (range) around the size",
    };
  return { status: "pass", evidence: `${at} size ${link.size}, range [${link.range.join(", ")}], ${link.source}` };
}

function reaches(link: WebLink): Point {
  const engine = engineReaders(link.to);
  if (engine.length)
    return { status: "pass", evidence: where(engine) };
  if (!keptOutcome(link.to))
    return {
      status: "fail",
      evidence: "-",
      why: `no measure: the web does not keep ${link.to} and no engine produces it`,
    };
  const knowing = knowingReaders(link.to);
  return {
    status: "fail",
    evidence: knowing.length ? `read only by ${where(knowing)}` : "-",
    why: `engine doesn't read the factor: ${link.to} moves only in the web's monthly ledger; no engine multiplies its own rates by it`,
  };
}

function varied(link: WebLink & { varies?: unknown[] }): Point {
  if (link.varies?.length)
    return { status: "pass", evidence: `${linksPath}:${lineOf(link.key)} varies by ${link.varies.length} moderator(s)` };
  if (link.moderator)
    return {
      status: "partial",
      evidence: `place moderator ${link.moderator.measure}`,
      why: "a place-level moderator only: every person in a place still gets the same proportion",
    };
  return { status: "fail", evidence: "-", why: "no moderator: every place and person moves by the same proportion" };
}

const FROM = new Map<string, WebLink[]>();
for (const link of WEB_LINKS) {
  const base = derivedOf(link.from)?.measure ?? link.from;
  FROM.set(base, [...(FROM.get(base) ?? []), link]);
}

function knockOn(link: WebLink): Point {
  const next = FROM.get(link.to) ?? [];
  if (!next.length) return { status: "n/a", evidence: `no link starts from ${link.to}` };
  const names = next.map((row) => row.key).join(", ");
  if (!engineReaders(link.to).length)
    return {
      status: "partial",
      evidence: `feeds ${names} through the web ledger`,
      why: "chain broken: the next link reads the web's own number, not a record the owning engine wrote",
    };
  return { status: "pass", evidence: `feeds ${names} from engine records` };
}

function timing(link: WebLink & { phaseInMonths?: number; fadeMonths?: number; lagWhy?: string }): Point {
  const at = `${linksPath}:${lineOf(link.key)}`;
  if (link.phaseInMonths !== undefined || link.fadeMonths !== undefined)
    return { status: "pass", evidence: `${at} lag ${link.lagMonths}, phase-in ${link.phaseInMonths ?? 0}, fade ${link.fadeMonths ?? "none"}` };
  return {
    status: "partial",
    evidence: `${at} lag ${link.lagMonths} months${link.lagWhy ? " (researched)" : ""}`,
    why: "a single step after the lag: no researched phase-in or fade",
  };
}

function knowing(link: WebLink): Point {
  const rows = knowingReaders(link.to);
  if (rows.length && engineReaders(link.to).length) return { status: "pass", evidence: where(rows) };
  if (rows.length)
    return {
      status: "partial",
      evidence: where(rows),
      why: "people read the web's number for the place, not their own experience of an engine record",
    };
  return { status: "fail", evidence: "-", why: `nobody notices: no view, news or electorate input reads ${link.to}` };
}

function oneRule(link: WebLink): Point {
  if (link.sizeByPlace)
    return {
      status: "partial",
      evidence: `sizeByPlace for ${Object.keys(link.sizeByPlace).join(", ")}`,
      why: "a per-place size in data (allowed), but places without one take the national size",
    };
  return { status: "pass", evidence: "one code path (src/core2/modules/outcome-web.ts effectOf) for every place" };
}

export interface MatrixRow {
  readonly key: string;
  readonly from: string;
  readonly to: string;
  readonly causeKind: string;
  readonly lawLink: boolean;
  readonly webCoverage: "wired" | "waiting";
  readonly points: Record<string, Point>;
  readonly wiredPoints: number;
}

export function matrix(): { links: MatrixRow[]; measures: Record<string, unknown>[] } {
  const links = WEB_LINKS.map((link) => {
    const points = {
      cause: cause(link),
      size: size(link),
      reaches: reaches(link),
      varied: varied(link),
      knockOn: knockOn(link),
      timing: timing(link),
      knowing: knowing(link),
      oneRule: oneRule(link),
    };
    return {
      key: link.key,
      from: link.from,
      to: link.to,
      causeKind: causeKind(link.from),
      lawLink: isLaw(link.from),
      webCoverage: linkCoverage(link).wired ? ("wired" as const) : ("waiting" as const),
      points,
      wiredPoints: Object.values(points).filter((p) => p.status === "pass" || p.status === "n/a").length,
    };
  });
  // One row per wanted measure: every cause or outcome a link names.
  const wanted = new Map<string, { asCause: string[]; asOutcome: string[] }>();
  for (const link of WEB_LINKS) {
    for (const [measure, role] of [
      [derivedOf(link.from)?.measure ?? link.from, "asCause"],
      [link.to, "asOutcome"],
      ...(link.moderator ? [[link.moderator.measure, "asCause"]] : []),
    ] as const) {
      if (isLaw(measure)) continue;
      const row = wanted.get(measure) ?? { asCause: [], asOutcome: [] };
      row[role].push(link.key);
      wanted.set(measure, row);
    }
  }
  const measures = [...wanted]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([measure, row]) => {
      const engine = engineReaders(measure);
      const kept = keptOutcome(measure);
      const recorded = engineMeasure(measure) || (GOV_MEASURES as readonly string[]).includes(measure);
      const status = recorded
        ? "engine-record"
        : engine.length
          ? "engine-reads-web"
          : kept
            ? "web-ledger-only"
            : causeAvailable(measure)
              ? "readable"
              : "missing";
      const twice = recorded && kept;
      return {
        measure,
        status,
        evidence: recorded
          ? engineMeasure(measure)
            ? `world-metrics months.${engineMeasure(measure)!.field}`
            : "src/core2/gov-measures.ts"
          : engine.length
            ? where(engine)
            : kept
              ? "web ledger (src/core2/modules/outcome-web.ts)"
              : "-",
        why:
          status === "missing"
            ? "no measure: no engine records it and the web does not keep it"
            : status === "web-ledger-only"
              ? "the web keeps it at its base times its links; no engine produces it or reads it"
              : twice
                ? "measure counted twice: an engine records it and the web also keeps it"
                : undefined,
        countedTwice: twice,
        asCause: row.asCause,
        asOutcome: row.asOutcome,
      };
    });
  return { links, measures };
}

function summary(rows: readonly MatrixRow[]) {
  const all = (row: MatrixRow) => row.wiredPoints === 8;
  const by = (filter: (row: MatrixRow) => boolean) => rows.filter(filter).length;
  const points = Object.keys(rows[0]!.points);
  return {
    links: rows.length,
    lawLinks: by((row) => row.lawLink),
    webCoverageWired: by((row) => row.webCoverage === "wired"),
    allEightPoints: by(all),
    reachesTheWorld: by((row) => row.points.reaches!.status === "pass"),
    withAnyModerator: by((row) => row.points.varied!.status !== "fail"),
    byPoint: Object.fromEntries(
      points.map((point) => [
        point,
        Object.fromEntries(
          (["pass", "partial", "fail", "n/a"] as const).map((s) => [
            s,
            by((row) => row.points[point]!.status === s),
          ]),
        ),
      ]),
    ),
  };
}

if (process.argv[1]?.endsWith("effect-matrix.ts")) {
  const out =
    process.argv[process.argv.indexOf("--out") + 1] && process.argv.includes("--out")
      ? process.argv[process.argv.indexOf("--out") + 1]!
      : "docs/reports/effect-web-matrix-2026-10-20.json";
  const table = matrix();
  let twins: unknown;
  try {
    twins = JSON.parse(readFileSync(out, "utf8")).twins;
  } catch {
    twins = undefined;
  }
  const result = { generatedBy: "scripts/outcome-web/effect-matrix.ts", summary: summary(table.links), ...table, ...(twins ? { twins } : {}) };
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result.summary, null, 2));
}
