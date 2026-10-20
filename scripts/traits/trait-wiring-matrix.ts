/**
 * Joins the three twin runs of `trait-wiring-audit.ts` (played, flat,
 * mirror) into the trait-wiring matrix: one row per decision in
 * `data/content/trait-decisions.json` and per trait-shaped outcome in
 * `data/content/trait-outcomes.json`, with its calls in the year, the share
 * of picks the trait turned, the pick-rate gap between the third leaning
 * most toward an option and the third leaning least, and how far opposite
 * personalities lived apart.
 *
 * node --import tsx scripts/traits/trait-wiring-matrix.ts <played.json> <flat.json> <mirror.json> <out.json>
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import decisions from "../../data/content/trait-decisions.json" with { type: "json" };
import outcomes from "../../data/content/trait-outcomes.json" with { type: "json" };

interface Run {
  seed: string;
  span: string[];
  mode: string;
  placeKey: string;
  yearSeconds: number;
  buildSeconds: number;
  chooser: Record<
    string,
    {
      calls: number;
      turned: number;
      gapSum: number;
      chosen: Record<string, number>;
      byLean: Record<
        string,
        { n: number; lowRate: number | null; highRate: number | null }
      >;
    }
  >;
  formula: Record<
    string,
    {
      calls: number;
      absLeanSum: number;
      nonzero: number;
      turned?: number;
      samples?: unknown[];
    }
  >;
  events: Record<string, number>;
  people: {
    id: string;
    placeId?: string;
    householdId?: string;
    birthDate?: string;
    traits: Record<string, number>;
    picks: Record<string, number>;
  }[];
}

const [playedPath, flatPath, mirrorPath, outPath] = process.argv.slice(2);
const load = (path: string | undefined): Run =>
  JSON.parse(readFileSync(path!, "utf8")) as Run;
const played = load(playedPath),
  flat = load(flatPath),
  mirror = load(mirrorPath);

type DecisionRow = (typeof decisions.decisions)[number] & {
  missing?: string;
  why?: string;
};
const GAPS = JSON.parse(
  readFileSync("data/content/trait-decision-gaps.json", "utf8"),
) as {
  formulaSiteAliases?: Record<string, string>;
  gaps: Record<string, { class: string; why: string; fix: string }>;
};
const PARAMETERS = JSON.parse(
  readFileSync("src/core2/data/parameters.json", "utf8"),
) as Record<string, { value: number; tag: string }>;
const RESEARCH = "data/research/trait-effect-sizes.json";
const research = existsSync(RESEARCH)
  ? (JSON.parse(readFileSync(RESEARCH, "utf8")) as { rows: { id: string }[] })
  : { rows: [] };
/** Every study row for a decision (several when a study reports more than one trait). */
const researchById = new Map<string, { id: string }[]>();
for (const row of research.rows)
  researchById.set(row.id, [...(researchById.get(row.id) ?? []), row]);

/** Chooser sites whose action ids all belong to one decision's options. */
function chooserFor(run: Run, decision: DecisionRow) {
  const ids = new Set(decision.options.map((o) => o.id));
  let calls = 0,
    turned = 0;
  const gaps: { option: string; n: number; low: number; high: number }[] = [];
  for (const [key, site] of Object.entries(run.chooser)) {
    const actions = key.split("|");
    if (!actions.every((a) => ids.has(a))) continue;
    // A site whose actions fit several decisions goes to the narrowest.
    const narrower = decisions.decisions.some(
      (other) =>
        other.id !== decision.id &&
        other.options.length < decision.options.length &&
        actions.every((a) => other.options.some((o) => o.id === a)),
    );
    if (narrower) continue;
    calls += site.calls;
    turned += site.turned;
    for (const [option, t] of Object.entries(site.byLean))
      if (t.lowRate !== null && t.highRate !== null && t.n >= 30)
        gaps.push({ option, n: t.n, low: t.lowRate, high: t.highRate });
  }
  return { calls, turned, gaps };
}

/** Formula reads of a decision: by its table id, or by a caller site in its file. */
function formulaFor(run: Run, decision: DecisionRow) {
  let calls = 0,
    absLean = 0,
    nonzero = 0,
    leaned = 0,
    turned = 0;
  const sites: string[] = [];
  for (const [key, row] of Object.entries(run.formula)) {
    if (key !== decision.id && GAPS.formulaSiteAliases?.[key] !== decision.id)
      continue;
    calls += row.calls;
    absLean += row.absLeanSum;
    nonzero += row.nonzero;
    // Calls through leanedYes, leanedScore or leanedByKinds keep a sample and say whether personality turned them.
    leaned += row.samples?.length ? row.calls : 0;
    turned += row.turned ?? 0;
    sites.push(key);
  }
  return {
    calls,
    meanAbsLean: calls ? absLean / calls : 0,
    nonzero,
    leaned,
    turned,
    sites,
  };
}

const rows = decisions.decisions.map((decision: DecisionRow) => {
  const c = chooserFor(played, decision);
  const f = formulaFor(played, decision);
  const calls = c.calls + f.calls;
  const best = c.gaps.sort((a, b) => b.n - a.n)[0];
  return {
    id: decision.id,
    kind: "decision",
    route: decision.route,
    site: decision.site,
    callsInYear: calls,
    chooserCalls: c.calls,
    formulaCalls: f.calls,
    turnedShare: c.calls ? c.turned / c.calls : null,
    leanGap: best
      ? { option: best.option, lowThird: best.low, highThird: best.high }
      : null,
    formulaMeanAbsLean: f.calls ? f.meanAbsLean : null,
    formulaTurnedShare: f.leaned ? f.turned / f.leaned : null,
    formulaLeanedCalls: f.leaned,
    research: researchById.get(decision.id) ?? null,
    gap: GAPS.gaps[decision.id] ?? null,
    weight: PARAMETERS[decision.traitWeightParameter]?.value ?? null,
    weightTag: PARAMETERS[decision.traitWeightParameter]?.tag ?? null,
    status: calls === 0 ? "never-ran" : "ran",
  };
});

/** Caller sites of traitLeanBetween that no table id names (formula reads by file:line). */
const unnamedFormulaSites = Object.entries(played.formula)
  .filter(([key]) => key.startsWith("src/") && !GAPS.formulaSiteAliases?.[key])
  .map(([site, row]) => ({
    site,
    calls: row.calls,
    meanAbsLean: row.absLeanSum / row.calls,
  }));

/** Total-variation distance between two pick distributions. */
function distance(a: Record<string, number>, b: Record<string, number>) {
  const na = Object.values(a).reduce((s, v) => s + v, 0),
    nb = Object.values(b).reduce((s, v) => s + v, 0);
  if (!na || !nb) return null;
  let sum = 0;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
    sum += Math.abs((a[key] ?? 0) / na - (b[key] ?? 0) / nb);
  return sum / 2;
}

/**
 * Neighbors: each opening adult paired with the adult in the same place
 * whose traits differ most. Their pick distributions are compared in the
 * played world and in the flat twin (same people, no personality).
 */
function neighbors() {
  const adults = played.people.filter(
    (p) =>
      p.placeId &&
      p.birthDate &&
      Number(p.birthDate.slice(0, 4)) <=
        Number(played.span[0]!.slice(0, 4)) - 18 &&
      Object.keys(p.picks).length > 0,
  );
  const traitGap = (a: Run["people"][number], b: Run["people"][number]) => {
    let s = 0;
    for (const key in a.traits)
      s += Math.abs(a.traits[key]! - (b.traits[key] ?? 0));
    return s;
  };
  const flatById = new Map(flat.people.map((p) => [p.id, p]));
  const mirrorById = new Map(mirror.people.map((p) => [p.id, p]));
  const pairs: {
    a: string;
    b: string;
    played: number;
    flat: number;
    mirrorSelf: number | null;
  }[] = [];
  const pool = adults.slice(0, 400);
  for (const a of pool) {
    let best: (typeof adults)[number] | undefined,
      gap = -1;
    for (const b of pool)
      if (b.id !== a.id && b.placeId === a.placeId) {
        const g = traitGap(a, b);
        if (g > gap) {
          gap = g;
          best = b;
        }
      }
    if (!best) continue;
    const fa = flatById.get(a.id),
      fb = flatById.get(best.id);
    const dPlayed = distance(a.picks, best.picks);
    const dFlat = fa && fb ? distance(fa.picks, fb.picks) : null;
    const m = mirrorById.get(a.id);
    const dSelf = m ? distance(a.picks, m.picks) : null;
    if (dPlayed !== null && dFlat !== null)
      pairs.push({
        a: a.id,
        b: best.id,
        played: dPlayed,
        flat: dFlat,
        mirrorSelf: dSelf,
      });
  }
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
  return {
    pairs: pairs.length,
    meanDistancePlayed: mean(pairs.map((p) => p.played)),
    meanDistanceFlat: mean(pairs.map((p) => p.flat)),
    meanDistanceSelfMirrored: mean(
      pairs.flatMap((p) => (p.mirrorSelf === null ? [] : [p.mirrorSelf])),
    ),
    sample: pairs.slice(0, 5),
  };
}

/** Event kinds whose counts differ most between the played and mirrored twins. */
function eventShifts() {
  const kinds = new Set([
    ...Object.keys(played.events),
    ...Object.keys(mirror.events),
    ...Object.keys(flat.events),
  ]);
  return (
    [...kinds]
      .map((kind) => ({
        kind,
        played: played.events[kind] ?? 0,
        flat: flat.events[kind] ?? 0,
        mirror: mirror.events[kind] ?? 0,
      }))
      // Kinds only: ids whose second part is a date or a person are not kinds.
      .filter(
        (row) =>
          /^[a-z][a-z.-]+$/.test(row.kind) && row.played + row.mirror >= 10,
      )
      .map((row) => ({
        ...row,
        shift:
          Math.abs(row.played - row.mirror) /
          Math.max(1, (row.played + row.mirror) / 2),
      }))
      .sort((a, b) => b.shift - a.shift)
  );
}

const outcomeRows = (outcomes.outcomes as { id: string }[]).map((row) => ({
  ...row,
  kind: "outcome",
  research: researchById.get(row.id) ?? null,
}));

const matrix = {
  version: 1,
  seed: played.seed,
  place: played.placeKey,
  span: played.span,
  yearSeconds: {
    played: played.yearSeconds,
    flat: flat.yearSeconds,
    mirror: mirror.yearSeconds,
  },
  buildSeconds: played.buildSeconds,
  summary: {
    decisions: rows.length,
    ran: rows.filter((r) => r.status === "ran").length,
    neverRan: rows.filter((r) => r.status === "never-ran").map((r) => r.id),
    // A decision is calibrated once its weight row is set from research (no longer TUNABLE).
    calibrated: rows.filter((r) => r.weightTag && r.weightTag !== "TUNABLE")
      .length,
    outcomes: outcomeRows.length,
    outcomesWired: outcomeRows.filter(
      (r) => (r as { wired?: unknown }).wired === true,
    ).length,
    outcomesPartly: outcomeRows.filter(
      (r) => (r as { wired?: unknown }).wired === "partly",
    ).length,
  },
  neighbors: neighbors(),
  eventShifts: eventShifts().slice(0, 40),
  unnamedFormulaSites,
  rows: [...rows, ...outcomeRows],
};
writeFileSync(outPath!, `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify(matrix.summary));
