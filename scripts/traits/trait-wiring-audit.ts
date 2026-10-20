/**
 * Trait-wiring audit: one played year of a drawn place, built the way the
 * game builds it (buildBenchWorld, two-level, every module), with the trait
 * probe on. Mode `played` runs the world as drawn; `flat` sets every trait of
 * every full and counted person to the middle before the first day; `mirror`
 * turns every trait to its opposite. Writes one JSON file the matrix step
 * (`trait-wiring-matrix.ts`) joins across the three twins.
 *
 * node --import tsx scripts/traits/trait-wiring-audit.ts <seed> <played|flat|mirror> <out.json> [days] [placeKey]
 */
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { forgetTraitLeans } from "../../src/core2/choice";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { setTraitProbe } from "../../src/core2/trait-probe";
import type { CoreState } from "../../src/core2/types";
import { drawPlace } from "../../tests/golden-path/place";

const [seed = "trait-wiring", mode = "played", out = "trait-audit.json"] =
  process.argv.slice(2);
const days = Number(process.argv[5] ?? 365);
const placeKey = process.argv[6] || drawPlace(seed, "trait-wiring").key;
if (!["played", "flat", "mirror", "copy"].includes(mode))
  throw new Error(`Unknown mode ${mode}`);

const start = gameStartDate();
const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const buildSeconds = (performance.now() - t0) / 1000;

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
/** Each full person's picks by action id (opening people only: twins share them). */
const picks = new Map<string, Map<string, number>>();

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
});

const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
const t1 = performance.now();
advanceCore(core, end.toISOString().slice(0, 10));
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

const events: Record<string, number> = {};
for (const id of core.eventIds) {
  const kind = id.split(":")[1] ?? id;
  events[kind] = (events[kind] ?? 0) + 1;
}

writeFileSync(
  out,
  JSON.stringify({
    seed,
    mode,
    placeKey,
    span: [start, core.date],
    buildSeconds: Math.round(buildSeconds),
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
    events,
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
  `${mode} ${placeKey} seed ${seed}: build ${Math.round(buildSeconds)}s, year ${Math.round(yearSeconds)}s, ${chooser.size} chooser sites, ${formula.size} formula sites`,
);
