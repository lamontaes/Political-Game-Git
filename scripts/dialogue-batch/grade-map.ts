/**
 * Builds the owner's grade heat map (`src/english/grade-map.ts`) from every
 * grade on disk and the writing rules, scores every bank piece, and writes
 * data/english/grade-map.json, which the English engine reads.
 *
 *   node --import tsx scripts/dialogue-batch/grade-map.ts
 *
 * `apply-grades.ts` runs it after it folds the ledger, so one command updates
 * both. The grades it reads:
 *
 *   the ledger    every whole-line grade (data/english/part-grades.json): a
 *                 line graded good is one span over the whole line at +1, bad
 *                 or fix at -1, a grade shared with other parts at half;
 *   span grades   rows in data/english/grades/*.json that carry `spans`, each
 *                 `{ start, end, strength }` (strength -1 to 1, 0.5 for "I
 *                 liked half of that") or `{ start, end, grade }`, and rows
 *                 with a whole-line `strength`; every row names its `key`.
 *
 * A development tool. It never words anything.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { CalibrationTable } from "../../src/english/calibration";
import type { PartGradeLedger } from "../../src/english/english-grades";
import {
  buildGradeMap,
  type GradeMap,
  type LineGrade,
  type MapParameters,
  type MapPiece,
  type RuleLesson,
  type SpanGrade,
} from "../../src/english/grade-map";
import { netOf } from "../../src/english/grade-reach";

export const MAP_FILE = "data/english/grade-map.json";
/** The whole-line strength a voice grade needs to count as a verdict in the ledger (apply-grades.ts). */
export const VOICE_VERDICT = 0.25;
export const RULES_FILE = "data/english/writing-rules.json";
const PARTS_DIR = "data/english/parts";
const GRADE_DIR = "data/english/grades";
const CALIBRATION_FILE = "data/english/calibration.json";
const LEDGER_FILE = "data/english/part-grades.json";
const REWRITTEN_FILE = "data/english/rewritten-after-grading.json";
/** Keys of lines the owner graded that a later pass deleted outright. */
const gradedThenRemoved = new Set(
  (JSON.parse(readFileSync(REWRITTEN_FILE, "utf8")) as { deleted?: string[] })
    .deleted ?? [],
);

/** Every bank piece with its text, bearing and the kinds of scene it plays in. */
export function readMapPieces(
  sceneClasses: Readonly<Record<string, string>>,
  dir = PARTS_DIR,
): Map<string, MapPiece> {
  const pieces = new Map<string, MapPiece>();
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const bank = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      parts?: {
        key: string;
        text: string;
        bearing?: string;
        uses?: { purpose?: string }[];
      }[];
    };
    for (const part of bank.parts ?? []) {
      const scenes = [
        ...new Set(
          (part.uses ?? [])
            .map((use) => (use.purpose ? sceneClasses[use.purpose] : undefined))
            .filter((scene): scene is string => scene !== undefined),
        ),
      ].sort();
      pieces.set(part.key, {
        bank: basename(name, ".json"),
        text: part.text,
        ...(part.bearing ? { bearing: part.bearing } : {}),
        scenes,
      });
    }
  }
  return pieces;
}

const STRENGTH_OF_GRADE: Readonly<Record<string, number>> = {
  good: 1,
  pass: 1,
  bad: -1,
  kill: -1,
  fail: -1,
  fix: -1,
  rewrite: -1,
};

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/** Whole-line grades from the ledger, one span over the line. */
export function ledgerGrades(
  ledger: PartGradeLedger,
  pieces: ReadonlyMap<string, MapPiece>,
): LineGrade[] {
  const out: LineGrade[] = [];
  for (const [key, counts] of Object.entries(ledger.parts)) {
    const piece = pieces.get(key);
    const net = netOf(counts);
    if (!piece || net === 0) continue;
    out.push({
      key,
      spans: [{ start: 0, end: piece.text.length, strength: clamp(net) }],
      from: "ledger",
    });
  }
  return out;
}

interface SpanRow {
  readonly key?: string;
  readonly strength?: number;
  readonly spans?: readonly {
    start: number;
    end: number;
    strength?: number;
    grade?: string;
  }[];
}

/** Span grades and whole-line strengths from the grade files that carry them. */
export function spanGrades(
  pieces: ReadonlyMap<string, MapPiece>,
  dir = GRADE_DIR,
): LineGrade[] {
  if (!existsSync(dir)) return [];
  const out: LineGrade[] = [];
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const file = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      grades?: SpanRow[];
      items?: SpanRow[];
    };
    for (const row of file.grades ?? file.items ?? []) {
      if (!row.key || (!row.spans && row.strength === undefined)) continue;
      const piece = pieces.get(row.key);
      // A line he graded that a later pass deleted with his lessons (the
      // journal's "after ... out of work" lines became small stories) has no
      // piece to weigh; its grade stays in the grade file and the ledger.
      if (!piece && gradedThenRemoved.has(row.key)) continue;
      if (!piece)
        throw new Error(
          `${join(dir, name)}: span grade names no piece ${row.key}`,
        );
      // A whole-line verdict from a voice note is folded into the ledger
      // (apply-grades.ts, withVoiceGrades), which the map reads already.
      const whole =
        row.strength === undefined &&
        (row.spans ?? []).length > 0 &&
        (row.spans ?? []).every(
          (span) => span.start <= 0 && span.end >= piece.text.length,
        );
      const net = (row.spans ?? []).reduce(
        (sum, span) => sum + (span.strength ?? 0),
        0,
      );
      if (whole && Math.abs(net) >= VOICE_VERDICT) continue;
      const spans: SpanGrade[] = [];
      if (row.strength !== undefined)
        spans.push({
          start: 0,
          end: piece.text.length,
          strength: clamp(row.strength),
        });
      for (const span of row.spans ?? []) {
        const strength =
          span.strength ?? STRENGTH_OF_GRADE[(span.grade ?? "").toLowerCase()];
        if (strength === undefined)
          throw new Error(
            `${join(dir, name)}: span on ${row.key} has no strength or grade`,
          );
        spans.push({
          start: span.start,
          end: span.end,
          strength: clamp(strength),
        });
      }
      out.push({ key: row.key, spans, from: name });
    }
  }
  return out;
}

/** The writing rules as lessons. */
export function readRules(file = RULES_FILE): RuleLesson[] {
  if (!existsSync(file)) return [];
  const rules = JSON.parse(readFileSync(file, "utf8")) as {
    rules: {
      id: string;
      features?: Record<string, number>;
      register?: string;
    }[];
  };
  return rules.rules
    .filter((rule) => rule.features && Object.keys(rule.features).length > 0)
    .map((rule) => ({
      id: rule.id,
      features: rule.features!,
      ...(rule.register ? { register: rule.register } : {}),
    }));
}

export function mapParameters(table: CalibrationTable): MapParameters {
  const value = (key: string): number => {
    const row = table.parameters[key];
    if (!row) throw new Error(`calibration.json has no parameter ${key}`);
    return row.value;
  };
  return {
    floor: value("mapFloor"),
    ceiling: value("mapCeiling"),
    saturation: value("mapSaturation"),
    rewriteBelow: value("mapRewriteBelow"),
    prior: value("mapPrior"),
    contextWeights: {
      all: value("mapWeightAll"),
      rule: value("mapWeightRule"),
      reg: value("mapWeightRegister"),
      voice: value("mapWeightVoice"),
      scene: value("mapWeightScene"),
      rv: value("mapWeightRegisterVoice"),
    },
  };
}

/** The map as the files on disk say it should be. */
export function currentGradeMap(): GradeMap {
  const table = JSON.parse(
    readFileSync(CALIBRATION_FILE, "utf8"),
  ) as CalibrationTable;
  const pieces = readMapPieces(table.sceneClasses ?? {});
  const ledger = JSON.parse(
    readFileSync(LEDGER_FILE, "utf8"),
  ) as PartGradeLedger;
  return buildGradeMap(
    pieces,
    [...ledgerGrades(ledger, pieces), ...spanGrades(pieces)],
    readRules(),
    table.registerClasses ?? {},
    mapParameters(table),
  );
}

export function writeGradeMap(): GradeMap {
  const map = currentGradeMap();
  writeFileSync(MAP_FILE, `${JSON.stringify(map, null, 2)}\n`);
  execSync(`npx prettier --write ${MAP_FILE}`, { stdio: "ignore" });
  const share = (n: number) =>
    `${((100 * n) / map.coverage.pieces).toFixed(1)}%`;
  console.log(
    `Wrote ${MAP_FILE}: ${Object.keys(map.cells).length} graded features; ${map.coverage.reached} of ${map.coverage.pieces} pieces reached (${share(map.coverage.reached)}), ${map.coverage.near} in their own kind of scene or voice (${share(map.coverage.near)}), ${map.coverage.weighted} weighted (${share(map.coverage.weighted)}), ${map.rewrite.length} marked for a rewrite.`,
  );
  return map;
}

if (import.meta.url === `file://${process.argv[1]}`) writeGradeMap();
