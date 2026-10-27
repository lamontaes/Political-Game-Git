/**
 * Trait-wiring audit: one played year of a drawn place, built the way the
 * game builds it (buildBenchWorld, two-level, every module), with the trait
 * probe on. Mode `played` runs the world as drawn; `flat` sets every trait of
 * every full and counted person to the middle before the first day; `mirror`
 * turns every trait to its opposite. Writes one JSON file the matrix step
 * (`trait-wiring-matrix.ts`) joins across the three twins.
 *
 * With `TRAIT_AUDIT_ELECTION=1` the year is the drawn place's own election
 * window instead of the game's first year: the `days` that end 30 days after
 * the place's next race on its election calendar (read from a build at the
 * game's start), never beginning before the game's start. Most places hold no
 * election in the first year, so voting, canvassing, donating, polls and the
 * press only run in such a window. The window goes in the output's `span`.
 *
 * Decisions weighed while the world is built (the opening's appointments,
 * for one) are counted apart, in the output's `opening`, with the first
 * records of each kind the build left: the played year's counts never
 * include them.
 *
 * node --import tsx scripts/traits/trait-wiring-audit.ts <seed> <played|flat|mirror> <out.json> [days] [placeKey]
 */
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { forgetTraitLeans } from "../../src/core2/choice";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../../src/core2/modules/elections";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import { lawChain } from "../../src/core2/modules/laws";
import { setTraitProbe } from "../../src/core2/trait-probe";
import type { CoreState } from "../../src/core2/types";
import { drawPlace } from "../../tests/golden-path/place";

const [seed = "trait-wiring", mode = "played", out = "trait-audit.json"] =
  process.argv.slice(2);
const days = Number(process.argv[5] ?? 365);
const placeKey = process.argv[6] || drawPlace(seed, "trait-wiring").key;
if (!["played", "flat", "mirror", "copy"].includes(mode))
  throw new Error(`Unknown mode ${mode}`);

const gameStart = gameStartDate();
const shiftDate = (date: string, by: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};
/** A race this far past the game's start is too far for a window; draw another seed. */
const MAX_RACE_WAIT_DAYS = 730;
/** The window ends this many days after the race, so the count and its aftermath play. */
const DAYS_AFTER_RACE = 30;
const electionWindow = process.env.TRAIT_AUDIT_ELECTION === "1";

/** Up to this many example calls (and opening records) are kept for each decision id, chooser site or record kind. */
const EXAMPLES_PER_SITE = 3;
/** Decisions weighed while the world is built, apart from the played year. */
const openingFormula = new Map<string, { calls: number }>();
const openingChooser = new Map<string, { calls: number }>();
/** Counts the build's decisions; off with TRAIT_PROBE=off, like the year's. */
function countOpening(): void {
  openingFormula.clear();
  openingChooser.clear();
  if (process.env.TRAIT_PROBE === "off") return;
  const tally = (into: Map<string, { calls: number }>, key: string) => {
    const row = into.get(key);
    if (row) row.calls++;
    else into.set(key, { calls: 1 });
  };
  setTraitProbe({
    chooser: (row) =>
      tally(openingChooser, [...new Set(row.actionIds)].sort().join("|")),
    formula: (row) => tally(openingFormula, row.decisionId),
  });
}

const t0 = performance.now();
let start = gameStart;
countOpening();
let world = buildBenchWorld(seed, gameStart, { twoLevel: true, placeKey });
let nextRace: string | null = null;
if (electionWindow) {
  // The first race on the place's calendar after the game's start, read from the elections module.
  nextRace =
    (
      coreAPI(world.core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .map((c) => c.electionDate)
      .filter((date) => date > gameStart)
      .sort()[0] ?? null;
  if (!nextRace || nextRace > shiftDate(gameStart, MAX_RACE_WAIT_DAYS))
    throw new Error(
      `${placeKey} seed ${seed}: next race ${nextRace ?? "none"}, not within ${MAX_RACE_WAIT_DAYS} days of ${gameStart}; draw another seed`,
    );
  start = [gameStart, shiftDate(nextRace, DAYS_AFTER_RACE - days)]
    .sort()
    .at(-1)!;
  // The window's world is built on its first day, as the game builds a world.
  if (start !== gameStart) {
    countOpening();
    world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
  }
}
setTraitProbe(undefined);
const core = world.core;
/** The first ids of each kind of record the build left (the opening's appointments, for one). */
const openingRecords: Record<string, string[]> = {};
for (const record of core.durableLog.values()) {
  const kept = (openingRecords[record.kind] ??= []);
  if (kept.length < EXAMPLES_PER_SITE) kept.push(record.id);
}
const buildSeconds = (performance.now() - t0) / 1000;

/**
 * With TRAIT_AUDIT_RECORDS=1, a sample of the town's named people is put in
 * focus, as the people a player deals with are, so the choices they weigh
 * keep a `person.weighed` record (choice.ts, trait-decisions.ts) that the
 * examples below cite by id. Off by default: focus keeps reasons the plain
 * audit does not need.
 */
const FOCUS_SAMPLE = 400;
const KEEP_RECORDS = process.env.TRAIT_AUDIT_RECORDS === "1";
if (KEEP_RECORDS) {
  // The town's own state's officials, whose decisions a town's year reaches,
  // and a sample of everyone else by id (ids are hashes, so in no order).
  const stateKey = lawChain(coreAPI(core)).stateKey;
  const own = `US-${stateKey.slice(stateKey.lastIndexOf("-") + 1)}:`;
  const living = [...core.people.values()]
    .filter((p) => p.alive)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const p of living)
    if (p.id.startsWith("official:") && p.id.includes(own))
      core.focusPersonIds.add(p.id);
  for (const p of living
    .filter((p) => !p.id.startsWith("official:"))
    .slice(0, FOCUS_SAMPLE))
    core.focusPersonIds.add(p.id);
}

/** Every trait set to the middle (flat) or its opposite (mirror), full and counted. */
function reshape(core: CoreState, how: "flat" | "mirror" | "copy"): void {
  const turn = (value: number) =>
    how === "flat" ? 0 : how === "mirror" ? -value : value;
  for (const person of core.people.values()) {
    const next: Record<string, number> = {};
    for (const key in person.traits) next[key] = turn(person.traits[key]!);
    (person as { traits: Record<string, number> }).traits = next;
  }
  const store = residentsRuntime(core)?.store;
  if (store)
    for (let i = 0; i < store.traits.length; i++)
      store.traits[i] = turn(store.traits[i]!);
  forgetTraitLeans();
}

const opening = new Map(
  [...core.people.values()].map((p) => [p.id, { ...p.traits }]),
);
if (mode !== "played") reshape(core, mode as "flat" | "mirror" | "copy");

const SAMPLE_CAP = 20_000;

interface SiteTally {
  calls: number;
  turned: number;
  gapSum: number;
  chosen: Record<string, number>;
  /** Up to `SAMPLE_CAP` calls kept whole (each offer's bare score and lean, by sorted action), for calibration. */
  samples: { actions: string[]; bare: number[]; lean: number[] }[];
  /** For two-way picks: each call's lean toward the second action (sorted ids) and whether it won. */
  byLean: Record<string, { lean: number; picked: boolean }[]>;
}
const chooser = new Map<string, SiteTally>();
interface Example {
  actorId: string | null;
  date: string;
  /** The option picked (chooser sites) or whether the outcome was yes (formula decisions), when known. */
  result?: string | boolean;
}
const chooserExamples = new Map<string, Example[]>();
const formulaExamples = new Map<string, Example[]>();
/** With TRAIT_AUDIT_RECORDS=1: up to `EXAMPLES_PER_SITE` calls by people in focus, each with the weighed record's id it should leave. */
const chooserRecorded = new Map<string, (Example & { recordId: string })[]>();
const formulaRecorded = new Map<string, (Example & { recordId: string })[]>();
function keepRecorded(
  into: Map<string, (Example & { recordId: string })[]>,
  key: string,
  actorId: string | undefined | null,
  action: string,
  result: string | boolean | undefined,
): void {
  if (!KEEP_RECORDS || !actorId || !core.focusPersonIds.has(actorId)) return;
  let list = into.get(key);
  if (!list) into.set(key, (list = []));
  if (list.length >= EXAMPLES_PER_SITE) return;
  list.push({
    actorId,
    date: core.date,
    ...(result === undefined ? {} : { result }),
    recordId: `weighed:${core.date}:${action}:${actorId}`,
  });
}
/**
 * Keeps the first few calls; a later call that names its actor takes the
 * place of a kept call that does not (the probe passes an id only where the
 * decision is read for a person with one).
 */
function keepExample(
  into: Map<string, Example[]>,
  key: string,
  actorId: string | null,
  example: () => Example,
): void {
  let list = into.get(key);
  if (!list) into.set(key, (list = []));
  if (list.length < EXAMPLES_PER_SITE) {
    list.push(example());
    return;
  }
  if (actorId === null) return;
  for (let at = list.length - 1; at >= 0; at--)
    if (list[at]!.actorId === null) {
      list[at] = example();
      return;
    }
}
interface FormulaTally {
  calls: number;
  absLeanSum: number;
  maxAbs: number;
  nonzero: number;
  /** Through `leanedYes` only: yes outcomes, outcomes personality turned, and kept calls. */
  yes: number;
  turned: number;
  samples: { bare: number; lean: number }[];
}
const formula = new Map<string, FormulaTally>();
/** Decisions whose trait term joins a sum or scales a size: kept results with and without the term, by lean. */
interface OutcomeTally {
  unit: "probability" | "size";
  calls: number;
  samples: { lean: number; value: number; flat: number }[];
}
const outcomes = new Map<string, OutcomeTally>();
/** Each full person's picks by action id (opening people only: twins share them). */
const picks = new Map<string, Map<string, number>>();

// TRAIT_PROBE=off times the year as played, with the probe's counting off.
if (process.env.TRAIT_PROBE !== "off")
  setTraitProbe({
    chooser(row) {
      const key = [...new Set(row.actionIds)].sort().join("|");
      let t = chooser.get(key);
      if (!t)
        chooser.set(
          key,
          (t = {
            calls: 0,
            turned: 0,
            gapSum: 0,
            chosen: {},
            byLean: {},
            samples: [],
          }),
        );
      t.calls++;
      keepExample(chooserExamples, key, row.actorId, () => ({
        actorId: row.actorId,
        date: core.date,
        result: row.chosen,
      }));
      keepRecorded(chooserRecorded, key, row.actorId, row.chosen, row.chosen);
      t.gapSum += row.traitGap;
      if (row.chosen !== row.withoutTrait) t.turned++;
      t.chosen[row.chosen] = (t.chosen[row.chosen] ?? 0) + 1;
      // Every call while few, then every tenth: enough to calibrate a weight offline.
      if (
        t.samples.length < SAMPLE_CAP &&
        (t.calls < SAMPLE_CAP / 2 || t.calls % 10 === 0)
      )
        t.samples.push({
          actions: [...row.actionIds],
          bare: row.bareScores.map((v) => Math.round(v * 1e4) / 1e4),
          lean: row.leans.map((v) => Math.round(v * 1e4) / 1e4),
        });
      const ids = [...new Set(row.actionIds)].sort();
      if (ids.length === 2) {
        const term = (id: string) =>
          Math.max(
            ...row.actionIds.flatMap((a, i) =>
              a === id ? [row.traitTerms[i]!] : [],
            ),
          );
        const list = (t.byLean[ids[1]!] ??= []);
        if (list.length < 200_000)
          list.push({
            lean: term(ids[1]!) - term(ids[0]!),
            picked: row.chosen === ids[1],
          });
      }
      if (opening.has(row.actorId)) {
        let mine = picks.get(row.actorId);
        if (!mine) picks.set(row.actorId, (mine = new Map()));
        mine.set(row.chosen, (mine.get(row.chosen) ?? 0) + 1);
      }
    },
    formula(row) {
      let t = formula.get(row.decisionId);
      if (!t)
        formula.set(
          row.decisionId,
          (t = {
            calls: 0,
            absLeanSum: 0,
            maxAbs: 0,
            nonzero: 0,
            yes: 0,
            turned: 0,
            samples: [],
          }),
        );
      t.calls++;
      keepExample(formulaExamples, row.decisionId, row.actorId ?? null, () => ({
        actorId: row.actorId ?? null,
        date: core.date,
        ...(row.yes === undefined ? {} : { result: row.yes }),
      }));
      keepRecorded(
        formulaRecorded,
        row.decisionId,
        row.actorId,
        row.decisionId,
        row.yes,
      );
      const a = Math.abs(row.lean);
      t.absLeanSum += a;
      t.maxAbs = Math.max(t.maxAbs, a);
      if (a > 1e-9) t.nonzero++;
      if (row.yes) t.yes++;
      if (row.turned) t.turned++;
      if (
        row.bare !== undefined &&
        t.samples.length < SAMPLE_CAP &&
        (t.calls < SAMPLE_CAP / 2 || t.calls % 10 === 0)
      )
        t.samples.push({
          bare: Math.round(row.bare * 1e4) / 1e4,
          lean: Math.round(row.lean * 1e4) / 1e4,
        });
    },
    outcome(row) {
      let t = outcomes.get(row.decisionId);
      if (!t)
        outcomes.set(
          row.decisionId,
          (t = { unit: row.unit, calls: 0, samples: [] }),
        );
      t.calls++;
      // Every call while few, then every tenth, as the formula samples are kept.
      if (
        t.samples.length < SAMPLE_CAP &&
        (t.calls < SAMPLE_CAP / 2 || t.calls % 10 === 0)
      )
        t.samples.push({
          lean: Math.round(row.lean * 1e4) / 1e4,
          value: Math.round(row.value * 1e6) / 1e6,
          flat: Math.round(row.flat * 1e6) / 1e6,
        });
    },
  });

const t1 = performance.now();
advanceCore(core, shiftDate(start, days));
const yearSeconds = (performance.now() - t1) / 1000;
setTraitProbe(undefined);

/** The pick rate in the third of calls leaning most toward an action and the third leaning least. */
function terciles(by: Record<string, { lean: number; picked: boolean }[]>) {
  return Object.fromEntries(
    Object.entries(by).map(([id, rows]) => {
      const sorted = [...rows].sort((a, b) => a.lean - b.lean);
      const n = Math.floor(sorted.length / 3);
      const rate = (part: typeof rows) =>
        part.length ? part.filter((r) => r.picked).length / part.length : null;
      return [
        id,
        {
          n: sorted.length,
          lowRate: rate(sorted.slice(0, n)),
          highRate: rate(sorted.slice(sorted.length - n)),
          lowLean: n ? sorted[Math.floor(n / 2)]!.lean : null,
          highLean: n
            ? sorted[sorted.length - 1 - Math.floor(n / 2)]!.lean
            : null,
        },
      ];
    }),
  );
}

/** What the money decisions wrote in the year, by record id: foundings, purchases, rent settled, owners' draws. */
function recordsOfYear(core: CoreState) {
  const api = coreAPI(core);
  const rows = (moduleId: string, table: string) => {
    // A table an older build does not have reads as empty.
    try {
      return core.modules.has(moduleId)
        ? (api.moduleState(moduleId).table(table).rows() as unknown as {
            id: string;
            share?: number;
          }[])
        : [];
    } catch {
      return [];
    }
  };
  const ids = (list: { id: string }[]) => ({
    count: list.length,
    first: list.slice(0, 3).map((row) => row.id),
  });
  const founded = [...core.organizations.keys()]
    .filter(
      (id) =>
        id.startsWith("organization:founded:") ||
        id.startsWith("organization:location:"),
    )
    .map((id) => ({ id }));
  return {
    founded: ids(founded),
    purchases: ids(rows("housing", "purchases")),
    settlements: ids(rows("housing", "settlements")),
    settlementsPaid: ids(
      rows("housing", "settlements").filter(
        (row) => (row as unknown as { paidMinor: number }).paidMinor > 0,
      ),
    ),
    ownerDraws: ids(rows("business", "draws").filter((row) => row.share! > 0)),
    ownerDrawMonths: rows("business", "draws").length,
  };
}

const events: Record<string, number> = {};
for (const id of core.eventIds) {
  const kind = id.split(":")[1] ?? id;
  events[kind] = (events[kind] ?? 0) + 1;
}
/** The first ids of each kind of record the log kept, so a decision weighed only for the counted population can name the record it fed. */
const eventExamples: Record<string, string[]> = {};
for (const record of core.durableLog.values()) {
  const kept = (eventExamples[record.kind] ??= []);
  if (kept.length < EXAMPLES_PER_SITE) kept.push(record.id);
}
/** A kept call's record, only where the log holds it (a decision that writes none is reported without one). */
const withRecords = (from: Map<string, (Example & { recordId: string })[]>) =>
  Object.fromEntries(
    [...from].map(([key, list]) => [
      key,
      list.filter((example) => core.durableLog.has(example.recordId)),
    ]),
  );

writeFileSync(
  out,
  JSON.stringify({
    seed,
    mode,
    placeKey,
    span: [start, core.date],
    // Only with TRAIT_AUDIT_ELECTION=1: the race the window was drawn around.
    ...(electionWindow ? { electionWindow: { nextRace, gameStart } } : {}),
    buildSeconds: Math.round(buildSeconds),
    opening: {
      chooser: Object.fromEntries(openingChooser),
      formula: Object.fromEntries(openingFormula),
      records: openingRecords,
    },
    yearSeconds: Math.round(yearSeconds),
    fullPeopleStart: opening.size,
    fullPeopleEnd: core.people.size,
    chooser: Object.fromEntries(
      [...chooser].map(([key, t]) => [
        key,
        { ...t, byLean: terciles(t.byLean) },
      ]),
    ),
    formula: Object.fromEntries(formula),
    outcomes: Object.fromEntries(outcomes),
    events,
    records: recordsOfYear(core),
    examples: {
      chooser: Object.fromEntries(chooserExamples),
      formula: Object.fromEntries(formulaExamples),
      ...(KEEP_RECORDS
        ? {
            recorded: {
              chooser: withRecords(chooserRecorded),
              formula: withRecords(formulaRecorded),
            },
          }
        : {}),
      events: eventExamples,
    },
    people: [...opening].map(([id, traits]) => {
      const p = core.people.get(id);
      return {
        id,
        placeId: p?.placeId,
        householdId: (p as { householdId?: string } | undefined)?.householdId,
        birthDate: p?.birthDate,
        traits,
        picks: Object.fromEntries(picks.get(id) ?? []),
      };
    }),
  }),
);
console.log(
  `${mode} ${placeKey} seed ${seed}: window ${start} to ${core.date}${electionWindow ? ` (next race ${nextRace})` : ""}, build ${Math.round(buildSeconds)}s, year ${Math.round(yearSeconds)}s, ${chooser.size} chooser sites, ${formula.size} formula sites`,
);
