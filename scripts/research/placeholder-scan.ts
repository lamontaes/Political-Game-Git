import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export type PlaceholderPath = "money" | "law" | "government" | "other";

/**
 * The three ways the code says a number is not a researched fact. A line can
 * carry more than one: "PLACEHOLDER, NOT RESEARCHED" is both.
 *  - placeholder: the literal word PLACEHOLDER (also inside an identifier).
 *  - blanket: the literal word BLANKET, the migration and pressure lanes' name
 *    for one flat rule that holds until someone researches the real one.
 *  - unresearched: "unresearched" or "not researched", in any case.
 */
export type MarkerKind = "placeholder" | "blanket" | "unresearched";

export interface PlaceholderMarker {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly kinds: readonly MarkerKind[];
  readonly path: PlaceholderPath;
  readonly researchQuestionId: string | null;
  readonly researchQuestionFiled: boolean;
}

export interface PlaceholderLedger {
  readonly about: string;
  readonly generatedBy: string;
  readonly pathRule: string;
  readonly counts: {
    readonly markers: number;
    readonly byKind: Readonly<Record<string, number>>;
    readonly byPath: Readonly<Record<string, number>>;
    /** Markers that name no research question: nobody has asked for the real number yet. */
    readonly withoutQuestion: number;
    /** Markers that name a question with no file under docs/research/requests. */
    readonly questionNotFiled: number;
    readonly moneyOrLawQuestions: number;
  };
  readonly markers: readonly PlaceholderMarker[];
}

/** The whole game source. Tests are left out; the exclusions below are named. */
const ROOTS = ["src"];

/**
 * Files a plain search finds the words in that are not unresearched game
 * values. Each has a reason; anything else under src is counted.
 */
export const NOT_MARKERS: Readonly<Record<string, string>> = {
  "src/source/domains/state-office-qualifications/validate.ts":
    "holds the lists of fake citations and values the validator rejects; correct as written",
  "src/source/domains/state-office-qualifications/index.ts":
    "re-exports the two rejected-value lists",
};

/** Directories of test fixtures, not game values. */
const FIXTURE_DIRS = ["src/authoring/fixtures/"];

/** Files that are machine output: one very long line of data, no comments. */
const GENERATED = /\.generated\.tsx?$/;

const KIND_PATTERNS: readonly (readonly [MarkerKind, RegExp])[] = [
  ["placeholder", /PLACEHOLDER/],
  ["blanket", /BLANKET/],
  ["unresearched", /unresearched|not researched/i],
];

export function markerKinds(line: string): MarkerKind[] {
  return KIND_PATTERNS.filter(([, pattern]) => pattern.test(line)).map(
    ([kind]) => kind,
  );
}

/** True when a path under the repository root is scanned for markers. */
export function isScanned(file: string): boolean {
  if (/\.test\.tsx?$/.test(file) || GENERATED.test(file)) return false;
  if (FIXTURE_DIRS.some((dir) => file.startsWith(dir))) return false;
  return !(file in NOT_MARKERS);
}

/** Files whose values reach pay, prices, balances or public money. */
const MONEY =
  /(?:^|\/)(job-market|home-purchase|home-purchase-view|cost-of-living|office-salary|local-economy|starting-money|career-path7|campaign-operating-costs|office-staff-hiring|public-fiscal|tax-[a-z-]+|statutory-tax-[a-z-]+)\.ts$/;

/** Files that make, number, decide, enact or apply law, or seat the bodies that do. */
const LAW =
  /(?:^|\/)(enacted-law-effects|enacted-duties|law-effects-prose|measure-numbering|municipal-[a-z-]+|legislature-[a-z-]+|legislative-[a-z-]+|congress-rule-pack|standing-committee|dc-council-sittings|recall|campaign-compliance|ordinary-meeting-[a-z-]+|governing\/[a-z-]+|judiciary\/[a-z-]+|living-world\/(constitutional-reform|federal-reform|local-council-meetings|local-government-seats)|nationwide-world\/(local-governing-body-[a-z-]+|local-chief-executive-rules|district-of-columbia-council-opening|executive-term-limits|governor-succession))\.ts$/;

/** Elections, candidacies and offices: who holds power, not what it does. */
const GOVERNMENT =
  /(?:^|\/)(campaigns|campaign-[a-z-]+|candidacy|living-world\/(congress-[a-z-]+|local-elections|political-reflection)|nationwide-world\/(presidential-turnover|state-legislature-[a-z-]+|state-executive-candidacy-packs|town-election-calendar)|press\/[a-z-]+)\.ts$/;

export function placeholderPathFor(file: string): PlaceholderPath {
  if (MONEY.test(file)) return "money";
  if (LAW.test(file)) return "law";
  if (GOVERNMENT.test(file)) return "government";
  return "other";
}
placeholderPathFor.rule =
  "money: files whose values reach pay, prices, balances or public money; law: files that make, number, decide, enact or apply law, or seat the bodies that do; government: elections, candidacies, offices and the press; other: everything else. The rule is by file, in scripts/research/placeholder-scan.ts.";

const ID = "([a-z0-9]+-[a-z0-9-]+[a-z0-9])";
const ID_PATTERNS = [
  /research:\s*([a-z0-9][a-z0-9-]+[a-z0-9])/,
  new RegExp(`filed as\\s+\`${ID}\``),
  new RegExp(`research (?:question|request)[\\s*]+\`?${ID}`),
  /pending[\s*]+(?:research\s+)?`([a-z0-9][a-z0-9-]+[a-z0-9])`/,
  new RegExp(`until ${ID} is answered`),
  /research\s*\(([a-z0-9][a-z0-9-]+[a-z0-9])\)/,
  /researchQuestion(?:Id)?:\s*"([a-z0-9-]+)"/,
  /pending\s+research\s+([a-z0-9]+-[a-z0-9-]+[a-z0-9])/,
];

function findId(text: string): string | null {
  for (const pattern of ID_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[1]!;
  }
  return null;
}

export function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
}

/**
 * The research id for a marker: on its own line or the comment block around
 * it; then the id recorded on a PLACEHOLDER constant the line uses; otherwise
 * the one id its file names, when the file names exactly one.
 */
export function scanPlaceholders(root: string): PlaceholderMarker[] {
  const found: string[] = [];
  for (const dir of ROOTS) walk(resolve(root, dir), found);
  const rel = (full: string) => relative(root, full).split("\\").join("/");
  const files = found.filter((full) => isScanned(rel(full)));
  const constantIds = new Map<string, string>();
  for (const full of files) {
    const lines = readFileSync(full, "utf8").split("\n");
    lines.forEach((line, index) => {
      const declared = /const (\w*(?:PLACEHOLDER|BLANKET)\w*)\b/.exec(line);
      if (!declared) return;
      const id = findId(lines.slice(index, index + 25).join("\n"));
      if (id) constantIds.set(declared[1]!, id);
    });
  }
  const markers: PlaceholderMarker[] = [];
  for (const full of files) {
    const source = readFileSync(full, "utf8");
    const file = rel(full);
    const lines = source.split("\n");
    if (!lines.some((line) => markerKinds(line).length > 0)) continue;
    const fileIds = new Set<string>();
    for (const line of lines) {
      const id = findId(line);
      if (id) fileIds.add(id);
    }
    const soleFileId = fileIds.size === 1 ? [...fileIds][0]! : null;
    lines.forEach((line, index) => {
      const kinds = markerKinds(line);
      if (kinds.length === 0) return;
      let id: string | null = null;
      for (const width of [0, 3, 8]) {
        id = findId(
          lines.slice(Math.max(0, index - width), index + width + 2).join("\n"),
        );
        if (id) break;
      }
      for (const name of line.match(/\w*(?:PLACEHOLDER|BLANKET)\w*/g) ?? [])
        id ??= constantIds.get(name) ?? null;
      id ??= soleFileId;
      markers.push({
        file,
        line: index + 1,
        text: line.trim().slice(0, 160),
        kinds,
        path: placeholderPathFor(file),
        researchQuestionId: id,
        researchQuestionFiled:
          id !== null &&
          existsSync(resolve(root, "docs/research/requests", `${id}.json`)),
      });
    });
  }
  return markers;
}
