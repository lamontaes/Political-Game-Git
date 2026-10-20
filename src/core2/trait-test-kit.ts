/**
 * Shared measuring for the `*.traits.test.ts` files: the weight a decision's
 * trait term runs at (set and restored around a measurement), the odds gap
 * between the third of people leaning most toward an option and the third
 * leaning least, and the gap a study reports, carried to the same thirds the
 * way `scripts/traits/trait-calibrate.ts` carries it.
 */
import { randomBytes } from "node:crypto";
import decisionTable from "../../data/content/trait-decisions.json" with { type: "json" };
import research from "../../data/research/trait-effect-sizes.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { setTraitProbe, type FormulaProbeRow } from "./trait-probe";
import type { CoreAPI, CoreState, PersonState } from "./types";

/** The top and bottom thirds of a normal trait sit about 2.18 standard deviations apart. */
export const THIRDS_APART = 2.18;
/** A trait scored 0 to 1 over its full range has a standard deviation of about a fifth of it. */
const SD_OF_FULL_RANGE = 0.2;
/** A logistic latent shift of one standard deviation is pi over root 3 logits. */
const LOGIT_PER_SD = Math.PI / Math.sqrt(3);

interface Row {
  id: string;
  trait: string;
  effect: { kind: string; value: number } | null;
}

/** The log odds between the top and bottom thirds that a study row reports (null when it gives no size). */
export function studyLogOdds(
  id: string,
  traitStartsWith?: string,
): number | null {
  const row = (research.rows as unknown as Row[]).find(
    (r) =>
      r.id === id &&
      r.effect !== null &&
      (traitStartsWith === undefined || r.trait.startsWith(traitStartsWith)),
  );
  const e = row?.effect;
  if (!e) return null;
  if (e.kind === "logit-coef-full-range")
    return Math.abs(e.value) * SD_OF_FULL_RANGE * THIRDS_APART;
  if (e.kind === "standardized-beta" || e.kind === "correlation")
    return Math.abs(
      ((LOGIT_PER_SD * e.value) / Math.sqrt(1 - e.value ** 2)) * THIRDS_APART,
    );
  return null;
}

/** The parameter key of a decision's trait weight. */
export function weightKeyOf(decisionId: string): string {
  const row = (
    decisionTable.decisions as readonly {
      id: string;
      traitWeightParameter?: string;
    }[]
  ).find((d) => d.id === decisionId);
  if (!row?.traitWeightParameter)
    throw new Error(`No trait weight row for ${decisionId}`);
  return row.traitWeightParameter;
}

/** Runs `fn` with one decision's trait weight set to `value`, and restores the parameter table. */
export function withTraitWeight<T>(
  core: CoreState,
  decisionId: string,
  value: number,
  fn: () => T,
): T {
  const key = weightKeyOf(decisionId);
  const holder = core as unknown as {
    data: { parameters: Record<string, { value: number }> };
  };
  const before = holder.data;
  holder.data = {
    ...before,
    parameters: {
      ...before.parameters,
      [key]: { ...before.parameters[key]!, value },
    },
  };
  try {
    return fn();
  } finally {
    holder.data = before;
  }
}

/** The weight a decision runs at now. */
export function weightOf(core: CoreState, decisionId: string): number {
  return (core.data.parameters as unknown as Record<string, { value: number }>)[
    weightKeyOf(decisionId)
  ]!.value;
}

const logit = (p: number) => Math.log(p / (1 - p));

/**
 * The log odds of the outcome in the third of people leaning most toward it
 * against the third leaning least. `p` is each person's chance (a share or
 * 0/1); the shares are smoothed by half a case so an empty third stays finite.
 */
export function thirdsLogOdds(
  rows: readonly { lean: number; p: number }[],
): number {
  const sorted = [...rows].sort((a, b) => a.lean - b.lean);
  const n = Math.floor(sorted.length / 3);
  const rate = (part: typeof sorted) =>
    (part.reduce((sum, r) => sum + r.p, 0) + 0.5) / (part.length + 1);
  return (
    logit(rate(sorted.slice(sorted.length - n))) -
    logit(rate(sorted.slice(0, n)))
  );
}

/**
 * The played world of a drawn place, built as the game builds it
 * (`buildBenchWorld`, every module) with every resident a full person, so one
 * town gives hundreds of people to compare, and played to `until`. The place
 * comes from the seed through `drawPlace`; the test log names both.
 */
export function drawnWorld(
  seed: string,
  /** The place `drawPlace(seed, "trait-wiring")` named. */
  place: { key: string; name: string },
  until: string,
  /** Sees every formula decision the days weigh (the cases `leanedYes` was asked about). */
  onFormula?: (row: FormulaProbeRow) => void,
  /** The first day of play (the game's start unless a race window moves it). */
  start = gameStartDate(),
): { core: CoreState; api: CoreAPI; placeName: string; placeKey: string } {
  const world = buildBenchWorld(seed, start, {
    twoLevel: false,
    placeKey: place.key,
  });
  setTraitProbe(onFormula ? { formula: onFormula } : undefined);
  try {
    advanceCore(world.core, until);
  } finally {
    setTraitProbe(undefined);
  }
  console.log(
    `trait test: seed ${seed}, ${place.name} (${place.key}), ${start} through ${until}`,
  );
  return {
    core: world.core,
    api: coreAPI(world.core),
    placeName: place.name,
    placeKey: place.key,
  };
}

/** One seed per test run (or GOLDEN_PATH_SEED to replay one); each test file salts it with its own name. */
export const RUN_SEED =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/** Residents a test town may hold: every one becomes a full person, so a city would take many minutes. */
const MAX_RESIDENTS = 4000;
/** Residents a test town needs, so a town hall or an outlet does not hold everyone. */
const MIN_RESIDENTS = 300;
/** Places drawn before the test fails. */
const MAX_DRAWS = 12;

/**
 * A place drawn from all 56 for one test file, played over the `days` that
 * end `after` days past the place's own next race on its election calendar
 * (read from a first, two-level build), so the window always holds an
 * election day, its campaigns and its count, whatever place is drawn. `draw`
 * names the seed and place of each attempt; a place with more residents than
 * a test can make full people of is passed over, and the test fails after
 * `MAX_DRAWS` attempts.
 */
export function drawnRaceWorld(
  draw: (attempt: number) => {
    seed: string;
    place: { key: string; name: string };
  },
  days: number,
  onFormula?: (row: FormulaProbeRow) => void,
  after = 2,
  /** Whether the played window gave the test something to weigh; the draw moves on when it says why not. */
  accept?: (world: { core: CoreState; api: CoreAPI }) => string | null,
): { core: CoreState; api: CoreAPI; placeName: string; placeKey: string } {
  const opening = gameStartDate();
  const shift = (date: string, by: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + by);
    return d.toISOString().slice(0, 10);
  };
  const passed: string[] = [];
  for (let attempt = 0; attempt < MAX_DRAWS; attempt++) {
    const { seed, place } = draw(attempt);
    const first = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const residents =
      first.people.size + (residentsRuntime(first)?.store.ids.length ?? 0);
    const next = (
      coreAPI(first)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .map((c) => c.electionDate)
      .filter((date) => date > opening)
      .sort()[0];
    const name = `${place.name} (${place.key}), seed ${seed}`;
    if (residents > MAX_RESIDENTS || residents < MIN_RESIDENTS || !next) {
      passed.push(
        `${name}: ${residents} residents, next race ${next ?? "none"}`,
      );
      continue;
    }
    const start = [opening, shift(next, after - days)].sort().at(-1)!;
    const world = drawnWorld(
      seed,
      place,
      shift(start, days),
      onFormula,
      makeIsoDate(start),
    );
    const refused = accept?.(world) ?? null;
    if (refused === null) return world;
    passed.push(`${name}: ${refused}`);
  }
  throw new Error(`No drawn place fit a test town: ${passed.join("; ")}`);
}

/** Adults alive on the world's date, in id order. */
export function adultsOf(core: CoreState): PersonState[] {
  const year = Number(core.date.slice(0, 4));
  return [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        year -
          Number(p.birthDate.slice(0, 4)) -
          (core.date.slice(5) < p.birthDate.slice(5) ? 1 : 0) >=
          18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Personality's own share of the gap: the thirds' log odds with the decision's
 * weight as it stands, less the same calls with the weight at zero (people who
 * lean toward an option can also be the ones whose circumstances favor it).
 */
export function netLogOdds(
  core: CoreState,
  decisionId: string,
  measure: () => readonly { lean: number; p: number }[],
): {
  readonly net: number;
  readonly withTraits: number;
  readonly flat: number;
} {
  const withTraits = thirdsLogOdds(measure());
  const flat = thirdsLogOdds(withTraitWeight(core, decisionId, 0, measure));
  return { net: withTraits - flat, withTraits, flat };
}
