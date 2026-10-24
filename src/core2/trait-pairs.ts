/**
 * The trait families' played-pair check: a played window with the audit's
 * probe on (a debug switch, off in play), and from the two-way decisions it
 * weighed, two people who faced about the same case for the same decision,
 * leaned opposite ways and decided differently. A family test names both by
 * person, date, case and lean, and the record the yes side wrote. With every
 * trait flat no pair is found, since every lean is zero.
 */
import table from "../../data/content/trait-decisions.json" with { type: "json" };
import { buildBenchWorld, type BenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentPerson } from "./modules/residents";
import { setTraitProbe } from "./trait-probe";
import type { CoreState } from "./types";

/** One two-way decision a played day weighed for a named actor. */
export interface PlayedCall {
  decisionId: string;
  actorId: string;
  date: string;
  /** The case for yes without personality (chooser: the yes offer's bare score less the no offer's). */
  bare: number;
  /** The actor's trait lean toward yes over no. */
  lean: number;
  yes: boolean;
}

/** Two people, about the same case, opposite leans, different decisions. */
export interface OpposedPair {
  decisionId: string;
  yes: PlayedCall;
  no: PlayedCall;
}

const TWO_WAY = new Map(
  (
    table.decisions as readonly {
      id: string;
      options: readonly { id: string }[];
    }[]
  ).flatMap((d) =>
    d.options.length === 2
      ? [[d.id, [d.options[0]!.id, d.options[1]!.id] as const] as const]
      : [],
  ),
);

/**
 * Plays `core` to `until` with the probe on and keeps every call of the
 * named decisions that names its actor: formula decisions by their table id
 * (`leanedYes`, `leanedScore`, `leanedByKinds`, `leanedTerm`), and, for a
 * decision given its yes option, chooser picks between exactly its two
 * options.
 */
export function playWeighing(
  core: CoreState,
  until: string,
  /** Each decision id, with its yes option where the chooser decides it. */
  decisions: Readonly<Record<string, string | null>>,
): PlayedCall[] {
  const wanted = new Set(Object.keys(decisions));
  const byOptions = new Map<string, { id: string; yes: string }>();
  for (const [id, yes] of Object.entries(decisions)) {
    const options = TWO_WAY.get(id);
    if (yes && options?.includes(yes))
      byOptions.set([...options].sort().join("|"), { id, yes });
  }
  const calls: PlayedCall[] = [];
  setTraitProbe({
    formula(row) {
      if (
        !wanted.has(row.decisionId) ||
        !row.actorId ||
        row.bare === undefined ||
        row.yes === undefined
      )
        return;
      calls.push({
        decisionId: row.decisionId,
        actorId: row.actorId,
        date: core.date,
        bare: row.bare,
        lean: row.lean,
        yes: row.yes,
      });
    },
    chooser(row) {
      const ids = [...new Set(row.actionIds)].sort();
      const decision = ids.length === 2 && byOptions.get(ids.join("|"));
      if (!decision) return;
      const best = (id: string, values: readonly number[]) =>
        Math.max(
          ...row.actionIds.flatMap((a, i) => (a === id ? [values[i]!] : [])),
        );
      const no = ids[0] === decision.yes ? ids[1]! : ids[0]!;
      calls.push({
        decisionId: decision.id,
        actorId: row.actorId,
        date: core.date,
        bare: best(decision.yes, row.bareScores) - best(no, row.bareScores),
        lean: best(decision.yes, row.leans) - best(no, row.leans),
        yes: row.chosen === decision.yes,
      });
    },
  });
  try {
    advanceCore(core, until);
  } finally {
    setTraitProbe(undefined);
  }
  return calls;
}

/**
 * For each decision, the pair of different people whose cases sit within
 * `caseWithin` of each other where the one who said yes leaned furthest
 * above the one who said no, kept when that gap is at least `leanApart`
 * and the yes side leaned toward yes while the no side leaned away. `among`
 * keeps the people a test names to the ones it asks about (a town's own
 * residents, say).
 */
export function opposedPairs(
  calls: readonly PlayedCall[],
  {
    caseWithin = 0.05,
    leanApart = 0.5,
    among = () => true,
  }: {
    caseWithin?: number;
    leanApart?: number;
    among?: (actorId: string) => boolean;
  } = {},
): OpposedPair[] {
  const best = new Map<string, OpposedPair>();
  const buckets = new Map<
    string,
    { yes?: PlayedCall; no?: PlayedCall; decisionId: string }
  >();
  for (const call of calls) {
    if (!among(call.actorId)) continue;
    const key = `${call.decisionId}|${Math.floor(call.bare / caseWithin)}`;
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { decisionId: call.decisionId }));
    if (
      call.yes &&
      call.lean > 0 &&
      (!bucket.yes || call.lean > bucket.yes.lean)
    )
      bucket.yes = call;
    if (
      !call.yes &&
      call.lean < 0 &&
      (!bucket.no || call.lean < bucket.no.lean)
    )
      bucket.no = call;
  }
  for (const bucket of buckets.values()) {
    const { yes, no, decisionId } = bucket;
    if (!yes || !no || yes.actorId === no.actorId) continue;
    const gap = yes.lean - no.lean;
    if (gap < leanApart) continue;
    const held = best.get(decisionId);
    if (!held || gap > held.yes.lean - held.no.lean)
      best.set(decisionId, { decisionId, yes, no });
  }
  return [...best.values()];
}

/** Whether a person, full or counted, lives in `placeId`: for `opposedPairs`' `among`. */
export function livesIn(
  core: CoreState,
  placeId: string,
): (actorId: string) => boolean {
  return (id) =>
    (core.people.get(id) ?? residentPerson(core, id))?.placeId === placeId;
}

/** One line naming a pair: the decision, the day each decided, both people, their cases and leans. */
export function describePair(pair: OpposedPair, record?: string): string {
  const side = (c: PlayedCall) =>
    `${c.actorId} on ${c.date} (case ${c.bare.toFixed(3)}, lean ${c.lean.toFixed(3)})`;
  return `${pair.decisionId}: yes ${side(pair.yes)}${record ? `, wrote ${record}` : ""}; no ${side(pair.no)}`;
}

/** Places a played-pair test draws before it fails. */
const MAX_DRAWS = 3;

/**
 * The played-pair check over drawn places: each attempt draws a place (from
 * all 56, by `draw`), builds it as the game does (`buildBenchWorld`,
 * two-level, every module), plays `days` from the game's start and looks for
 * opposed pairs among its own residents. A small place can weigh too few
 * cases to hold a pair, so it moves to the next draw, up to three; `tried`
 * names every place and seed for the failure message.
 */
export function playedPairs(
  draw: (attempt: number) => {
    seed: string;
    place: { key: string; name: string };
  },
  days: number,
  decisions: Readonly<Record<string, string | null>>,
): {
  world: BenchWorld;
  calls: PlayedCall[];
  pairs: OpposedPair[];
  label: string;
  tried: string[];
} {
  const tried: string[] = [];
  for (let attempt = 0; ; attempt++) {
    const { seed, place } = draw(attempt);
    const start = gameStartDate();
    const world = buildBenchWorld(seed, start, {
      twoLevel: true,
      placeKey: place.key,
    });
    const calls = playWeighing(world.core, addDays(start, days), decisions);
    const pairs = opposedPairs(calls, {
      among: livesIn(world.core, world.placeId),
    });
    const label = `${place.name} (${place.key}), seed ${seed}`;
    tried.push(`${label}: ${calls.length} calls, ${pairs.length} pairs`);
    if (pairs.length || attempt + 1 >= MAX_DRAWS)
      return { world, calls, pairs, label, tried };
  }
}
