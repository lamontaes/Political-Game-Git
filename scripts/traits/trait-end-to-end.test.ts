/**
 * The traits lead's acceptance (pool item traits-end-to-end-proof; the
 * owner, Oct 16: "not everybody's the same zombies"). A place drawn from all
 * 56 is built as the game builds it (`buildBenchWorld`, two-level, every
 * module) and played for a year. Two residents in the same situation (the
 * same age band, household size, a job each and the same savings band) with
 * the most opposite temperaments are picked by rule and put in focus, as the
 * people a player deals with are, so each act keeps its reasons (why-kept).
 * The test names the decisions where their trait reasons pulled opposite
 * ways (by act record id for daily acts, by the weighed call for the rest)
 * and the outcomes their years ended with, each beside what led there.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld, type BenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { setTraitProbe } from "../../src/core2/trait-probe";
import type {
  CoreState,
  DecisionResult,
  PersonState,
} from "../../src/core2/types";
import { drawPlace } from "../../tests/golden-path/place";

const RUN_SEED =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 365;
/** Act records keep every option's reasons for 30 days, so the year is read a week at a time. */
const HARVEST_DAYS = 7;
const MAX_DRAWS = 3;
/** Formula decisions that are civic acts when the answer is yes. */
const CIVIC_ACTS = new Set([
  "parties.join",
  "parties.attend",
  "interest-groups.member-join",
  "meetings.take-part",
  "voting.turnout",
  "campaigns.volunteer",
  "campaigns.donate",
  "campaigns.endorse",
  "constituent-cases.bring-case",
  "press.tip",
  "recalls.sign",
]);

type Side = "a" | "b";

/** One weighed decision of the pair: its kind, the trait reason toward each option, what was picked. */
interface Weighed {
  kind: string;
  date: string;
  /** The act record for a daily act, else none (the call itself is the evidence). */
  record?: string;
  /** Each option's trait reason (chooser), or the lean toward yes as `yes` against `no` at 0 (formula). */
  trait: Map<string, number>;
  picked: string;
}

/** Adults of the town with a job, by situation: age band, household size and savings band. */
function samePlightOpposites(
  core: CoreState,
  placeId: string,
): [PersonState, PersonState] | undefined {
  const start = core.date;
  const groups = new Map<string, PersonState[]>();
  for (const person of core.people.values()) {
    if (!person.alive || person.placeId !== placeId || !person.jobId) continue;
    const age = ageOnDate(person.birthDate, start);
    if (age < 25 || age > 64) continue;
    const members =
      core.households.get(person.householdId)?.memberIds.length ?? 1;
    const savings = Math.floor(
      Math.log2(Math.max(1, person.liquidMinor / 100_000)),
    );
    const key = `${Math.floor(age / 10)}|${Math.min(members, 3)}|${savings}`;
    groups.set(key, [...(groups.get(key) ?? []), person]);
  }
  const apart = (a: PersonState, b: PersonState) =>
    Object.keys(a.traits).reduce(
      (sum, k) => sum + Math.abs(a.traits[k]! - (b.traits[k] ?? 0)),
      0,
    );
  let best: [PersonState, PersonState] | undefined;
  let bestGap = -1;
  for (const people of groups.values())
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        const gap = apart(people[i]!, people[j]!);
        if (gap > bestGap) {
          bestGap = gap;
          best = [people[i]!, people[j]!];
        }
      }
  return best;
}

/** The pair's daily acts recorded since the last harvest, with every option's trait reason. */
function harvest(
  core: CoreState,
  personId: string,
  seen: Set<string>,
): Weighed[] {
  const out: Weighed[] = [];
  for (const id of core.logByPerson.get(personId) ?? []) {
    if (seen.has(id)) continue;
    const row = core.durableLog.get(id);
    if (row?.kind !== "person.acted" || row.actorId !== personId) continue;
    seen.add(id);
    const scores = (row.decision as DecisionResult | undefined)?.scores;
    if (!scores?.length) continue;
    const trait = new Map<string, number>();
    for (const s of scores)
      trait.set(
        s.actionId,
        Math.max(trait.get(s.actionId) ?? -Infinity, s.reasons.trait),
      );
    if (trait.size < 2) continue;
    out.push({
      kind: [...trait.keys()].sort().join("|"),
      date: row.date,
      record: id,
      trait,
      picked: row.actionId!,
    });
  }
  return out;
}

/** What a year leaves a person with: ties, money, work, wellbeing, causes and memberships. */
function standing(core: CoreState, personId: string) {
  const person = core.people.get(personId);
  const ties = [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((r) => r !== undefined && r.kind !== "family");
  return {
    ties: ties.length,
    closeness: ties.reduce((sum, r) => sum + r!.level, 0),
    cashMinor: person?.liquidMinor ?? 0,
    employed: !!person?.jobId,
    mood: person?.affect.mood ?? 0,
    stress: person?.affect.stress ?? 0,
    causes: person?.drives.size ?? 0,
    memberships: [...core.memberships.keys()].filter((k) =>
      k.startsWith(`${personId}:`),
    ),
  };
}

function playYear(world: BenchWorld, pair: [PersonState, PersonState]) {
  const core = world.core;
  const [a, b] = pair;
  const sideOf = (id: string | undefined): Side | undefined =>
    id === a.id ? "a" : id === b.id ? "b" : undefined;
  core.focusPersonIds.add(a.id);
  core.focusPersonIds.add(b.id);
  const before = { a: standing(core, a.id), b: standing(core, b.id) };
  const acts = { a: [] as Weighed[], b: [] as Weighed[] };
  const calls = { a: [] as Weighed[], b: [] as Weighed[] };
  const civic = { a: new Map<string, number>(), b: new Map<string, number>() };
  const seen = new Set<string>();
  setTraitProbe({
    formula(row) {
      const side = sideOf(row.actorId);
      if (!side || row.yes === undefined) return;
      calls[side].push({
        kind: row.decisionId,
        date: core.date,
        trait: new Map([
          ["yes", row.lean],
          ["no", 0],
        ]),
        picked: row.yes ? "yes" : "no",
      });
      if (row.yes && CIVIC_ACTS.has(row.decisionId))
        civic[side].set(
          row.decisionId,
          (civic[side].get(row.decisionId) ?? 0) + 1,
        );
    },
    chooser(row) {
      const side = sideOf(row.actorId);
      if (!side) return;
      const trait = new Map<string, number>();
      row.actionIds.forEach((id, i) =>
        trait.set(id, Math.max(trait.get(id) ?? -Infinity, row.traitTerms[i]!)),
      );
      if (trait.size < 2) return;
      calls[side].push({
        kind: [...trait.keys()].sort().join("|"),
        date: core.date,
        trait,
        picked: row.chosen,
      });
    },
  });
  try {
    const end = addDays(core.date, DAYS);
    while (core.date < end) {
      const next = addDays(core.date, HARVEST_DAYS);
      advanceCore(core, next < end ? next : end);
      acts.a.push(...harvest(core, a.id, seen));
      acts.b.push(...harvest(core, b.id, seen));
    }
  } finally {
    setTraitProbe(undefined);
  }
  const after = { a: standing(core, a.id), b: standing(core, b.id) };
  return { before, after, acts, calls, civic };
}

/**
 * Decision kinds both people faced where the trait reason between the two
 * options they picked most leaned opposite ways on average, with one weighed
 * decision each that shows it: an act record where the day's act was kept,
 * else the weighed call (its kind and date).
 */
function differingReasons(
  acts: Record<Side, Weighed[]>,
  calls: Record<Side, Weighed[]>,
) {
  const kinds = new Map<string, Record<Side, Weighed[]>>();
  // Acts first, so a kind the act records cover is named by its records.
  for (const source of [acts, calls])
    for (const side of ["a", "b"] as const)
      for (const w of source[side]) {
        if (source === calls && kinds.get(w.kind)?.[side].some((x) => x.record))
          continue;
        if (!kinds.has(w.kind)) kinds.set(w.kind, { a: [], b: [] });
        kinds.get(w.kind)![side].push(w);
      }
  const out: {
    kind: string;
    toward: string;
    over: string;
    a: { lean: number; shown: Weighed; picks: number; of: number };
    b: { lean: number; shown: Weighed; picks: number; of: number };
  }[] = [];
  for (const [kind, { a, b }] of kinds) {
    if (!a.length || !b.length) continue;
    const counts = new Map<string, number>();
    for (const w of [...a, ...b])
      counts.set(w.picked, (counts.get(w.picked) ?? 0) + 1);
    const options = [...a[0]!.trait.keys()];
    const ranked = [...options].sort(
      (x, y) =>
        (counts.get(y) ?? 0) - (counts.get(x) ?? 0) || x.localeCompare(y),
    );
    const [toward, over] =
      options.includes("yes") && options.includes("no")
        ? ["yes", "no"]
        : [ranked[0]!, ranked[1]!].sort();
    const lean = (w: Weighed) =>
      (w.trait.get(toward!) ?? 0) - (w.trait.get(over!) ?? 0);
    const mean = (xs: Weighed[]) =>
      xs.reduce((s, x) => s + lean(x), 0) / xs.length;
    const la = mean(a),
      lb = mean(b);
    if (Math.sign(la) === Math.sign(lb) || la === 0 || lb === 0) continue;
    const show = (xs: Weighed[], sign: number) =>
      xs.find((x) => Math.sign(lean(x)) === sign) ?? xs[0]!;
    const picks = (xs: Weighed[]) =>
      xs.filter((x) => x.picked === toward).length;
    out.push({
      kind,
      toward: toward!,
      over: over!,
      a: {
        lean: la,
        shown: show(a, Math.sign(la)),
        picks: picks(a),
        of: a.length,
      },
      b: {
        lean: lb,
        shown: show(b, Math.sign(lb)),
        picks: picks(b),
        of: b.length,
      },
    });
  }
  return out;
}

describe("two neighbors with opposite temperaments in the same situation", () => {
  it("give opposite reasons at the same decisions and end the year differently, by record", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < MAX_DRAWS; attempt++) {
      const seed = `${RUN_SEED}:trait-end-to-end:${attempt}`;
      const place = drawPlace(seed, "trait-wiring");
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const pair = samePlightOpposites(world.core, world.placeId);
      const label = `${place.name} (${place.key}), seed ${seed}`;
      if (!pair) {
        tried.push(`${label}: no two working adults in the same situation`);
        continue;
      }
      const [a, b] = pair;
      const { before, after, acts, calls, civic } = playYear(world, pair);
      const reasons = differingReasons(acts, calls);
      const delta = (side: Side) => ({
        ties: after[side].ties - before[side].ties,
        closeness: after[side].closeness - before[side].closeness,
        cashMinor: after[side].cashMinor - before[side].cashMinor,
        employed: after[side].employed,
        mood: after[side].mood - before[side].mood,
        stress: after[side].stress - before[side].stress,
        causes: after[side].causes - before[side].causes,
        joined: after[side].memberships.filter(
          (m) => !before[side].memberships.includes(m),
        ),
      });
      const da = delta("a"),
        db = delta("b");
      const count = (xs: Weighed[], id: string) =>
        xs.filter((x) => x.picked === id).length;
      const civicLine = (side: Side) =>
        [...civic[side]].map(([id, n]) => `${id} ${n}`).join(", ") || "none";
      const civicTotal = (side: Side) =>
        [...civic[side].values()].reduce((s, n) => s + n, 0);
      const outcomes = [
        {
          name: "friendships",
          differ:
            Math.abs(da.closeness - db.closeness) >= 0.1 || da.ties !== db.ties,
          line: `ties ${da.ties >= 0 ? "+" : ""}${da.ties} vs ${db.ties >= 0 ? "+" : ""}${db.ties}, closeness gained ${da.closeness.toFixed(2)} vs ${db.closeness.toFixed(2)}; visits ${count(acts.a, "contact-known-person")} vs ${count(acts.b, "contact-known-person")}`,
        },
        {
          name: "work",
          differ:
            da.employed !== db.employed ||
            count(acts.a, "decline-scheduled-work-date-segment") !==
              count(acts.b, "decline-scheduled-work-date-segment"),
          line: `employed at the end ${da.employed} vs ${db.employed}; shifts missed ${count(acts.a, "decline-scheduled-work-date-segment")} vs ${count(acts.b, "decline-scheduled-work-date-segment")}`,
        },
        {
          name: "money",
          differ: Math.abs(da.cashMinor - db.cashMinor) >= 10_000,
          line: `cash change $${(da.cashMinor / 100).toFixed(0)} vs $${(db.cashMinor / 100).toFixed(0)}`,
        },
        {
          name: "civic acts",
          differ:
            civicTotal("a") !== civicTotal("b") ||
            da.joined.length !== db.joined.length,
          line: `${civicLine("a")} vs ${civicLine("b")}; joined ${da.joined.join(", ") || "nothing"} vs ${db.joined.join(", ") || "nothing"}`,
        },
        {
          name: "wellbeing",
          differ:
            Math.abs(da.mood - db.mood) >= 0.05 ||
            Math.abs(da.stress - db.stress) >= 0.05,
          line: `mood change ${da.mood.toFixed(2)} vs ${db.mood.toFixed(2)}, stress change ${da.stress.toFixed(2)} vs ${db.stress.toFixed(2)}`,
        },
        {
          name: "causes",
          differ: da.causes !== db.causes,
          line: `causes taken up ${da.causes} vs ${db.causes}`,
        },
      ];
      const evidence = (w: Weighed) =>
        w.record ?? `weighed ${w.date}, ${w.picked}`;
      console.log(
        [
          `trait end-to-end at ${label}`,
          `pair: ${a.id} and ${b.id}, both working, born ${a.birthDate} and ${b.birthDate}`,
          `decisions where their trait reasons pulled opposite ways (${reasons.length}):`,
          ...reasons.map(
            (r) =>
              `  ${r.kind} (${r.toward} over ${r.over}): ${a.id} ${r.a.lean.toFixed(3)} (${evidence(r.a.shown)}; ${r.toward} ${r.a.picks} of ${r.a.of}), ${b.id} ${r.b.lean.toFixed(3)} (${evidence(r.b.shown)}; ${r.toward} ${r.b.picks} of ${r.b.of})`,
          ),
          `outcomes:`,
          ...outcomes.map(
            (o) => `  ${o.name}${o.differ ? "" : " (alike)"}: ${o.line}`,
          ),
        ].join("\n"),
      );
      expect(reasons.length, label).toBeGreaterThanOrEqual(5);
      expect(
        outcomes.filter((o) => o.differ).length,
        `${label}: ${outcomes.map((o) => `${o.name} ${o.line}`).join("; ")}`,
      ).toBeGreaterThanOrEqual(3);
      return;
    }
    throw new Error(`No pair in ${MAX_DRAWS} draws: ${tried.join("; ")}`);
  }, 1_800_000);
});
