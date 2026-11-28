/**
 * The views engine's reads and constants that need nothing of the run: a person's or a counted group's lean and view, the stance rows and the opening leans. src/core2/modules/views.ts re-exports them and keeps every read that weighs a life, the press, an election or another engine's records.
 */
import viewsJson from "../data/views/views.json" with { type: "json" };
import { ageOnDate, addDays, makeIsoDate } from "../kernel/dates";
import { stableHash } from "../kernel/ids";
import { profileFor, PROFILE_FACT_KINDS } from "../opening-profile";
import { historyOf } from "../past-history";
import { placeStateKey } from "../place-map";
import {
  decisionLean,
  decisionTraitWeight,
  reportOutcome,
} from "../trait-decisions";
import type { CoreState, PersonId, PersonState, CoreAPI } from "../types";
import { VIEWS_KEYS, type CellKey } from "../views-keys";
import type { StanceProfile } from "./campaigns";
import type { Stance, PersonView, HeardCase } from "./views";
import { VIEWS_MODULE_ID } from "./views-constants";

export const VIEWS_DATA = viewsJson as {
  version: string;
  stopgapId: string;
  parameters: Readonly<Record<string, { value: number }>>;
  labels: readonly string[];
};

export const v = (key: string): number => {
  const row = VIEWS_DATA.parameters[key];
  if (!row || !Number.isFinite(row.value))
    throw new Error(`Untagged views parameter: ${key}`);
  return row.value;
};

/** The fact an event that makes a case carries: who made it. */
export const VIEWS_SPEAKER_KEY = "views:speaker";

/** A speaker still in the wider population: their lean, from their counted record (they have no view row). */
export const VIEWS_SPEAKER_LEAN_KEY = "views:speakerLean";

const FAITH_IMPORTANCE: Readonly<Record<string, string>> = {
  protestant: "faithImportanceProtestant",
  catholic: "faithImportanceCatholic",
  none: "faithImportanceNone",
  "other-faith": "faithImportanceOtherFaith",
};

/**
 * The causes after one more event. Sources whose latest event is older than
 * `since` drop first (Words, Oct 30: a year's causes and the newest), so a
 * long life's list stays bounded. The new one then replaces its source's
 * kept row (same speaker, same record) and moves to the end, carrying how
 * many events that source has moved the stance, and by how much in all,
 * since it last went quiet for longer than the window.
 */
function withCause(
  causes: Stance["causes"],
  cause: Stance["causes"][number],
  since: string,
): Stance["causes"] {
  const same = (row: Stance["causes"][number]) =>
    row.speakerId === cause.speakerId && row.learnedFrom === cause.learnedFrom;
  const kept = causes.filter((row) => row.date >= since);
  const earlier = kept.find(same);
  return [
    ...kept.filter((row) => !same(row)),
    {
      ...cause,
      count: (earlier?.count ?? (earlier ? 1 : 0)) + 1,
      total: (earlier?.total ?? earlier?.change ?? 0) + cause.change,
    },
  ];
}

/** A stable uniform value in (0, 1) for a key. */
function uniform(key: string): number {
  const digits = v("hashDigits");
  const radix = v("hashRadix");
  const draw = Number.parseInt(stableHash(key).slice(v("zero"), digits), radix);
  return (draw + v("one") / v("two")) / radix ** digits;
}

/** A standard normal value for a key (Box and Muller 1958). */
function normal(key: string): number {
  return (
    Math.sqrt(-v("two") * Math.log(uniform(`${key}:a`))) *
    Math.cos(v("two") * Math.PI * uniform(`${key}:b`))
  );
}

export function ageBand(age: number): string {
  for (const band of VIEWS_KEYS.ageBands) {
    const [low, high] = band.split("-");
    if (age >= Number(low) && (high === "plus" || age <= Number(high)))
      return band;
  }
  return VIEWS_KEYS.ageBands[v("zero")]!;
}

/**
 * One of a person's built facts (their education, their faith), through the
 * one history reader. Someone still counted has none, and reads their profile.
 */
function builtFact(
  core: CoreState,
  personId: string,
  kind: string,
  key: string,
): string | undefined {
  // An education level or a faith group, as the fact was written.
  return historyOf(
    core,
    { person: personId as PersonId },
    { kinds: [kind], from: "built" },
  )[0]?.facts?.[key] as string | undefined;
}

/** The CES cell a person's opening view is read from, and how it was chosen. */
export function viewCell(
  core: CoreState,
  person: PersonState,
  date: string,
  seed: string,
): { cell: CellKey; shares: Readonly<Record<string, number>>; basis: string } {
  const state = placeStateKey(person.placeId)?.slice("US-".length) ?? null;
  const age = ageOnDate(person.birthDate, date);
  const band = ageBand(age);
  const row = state ? VIEWS_KEYS.states[state] : undefined;
  const national = VIEWS_KEYS.national;
  // The person's own education and faith shift the cell by their profile's
  // national lean, less what the place's mix of profiles at that age averages
  // (the state's, or the nation's where the survey has no state sample).
  const fact = (kind: string, key: string) =>
    builtFact(core, person.id, kind, key);
  const profile = profileFor(person, seed, date);
  const educ =
    fact(PROFILE_FACT_KINDS.education, "level") ?? profile?.education;
  const faith = fact(PROFILE_FACT_KINDS.faith, "group") ?? profile?.faith;
  const shifts = VIEWS_KEYS.profileShift[band];
  const own = educ && faith ? shifts?.[educ]?.[faith]?.shift : undefined;
  let expected = v("zero");
  const educShares = row
    ? row.educationShares[band]
    : VIEWS_KEYS.nationalEducationShares[band];
  const faithShares = row
    ? row.faithShares[band]
    : VIEWS_KEYS.nationalFaithShares[band];
  if (own !== undefined && educShares && faithShares)
    for (const [e, pe] of Object.entries(educShares))
      for (const [f, pf] of Object.entries(faithShares))
        expected += pe * pf * (shifts?.[e]?.[f]?.shift ?? v("zero"));
  const shifted = (base: CellKey) =>
    own === undefined ? base : { ...base, mean: base.mean + own - expected };
  const profiled = own === undefined ? "" : `:${educ}:${faith}`;
  if (!row)
    // Territories and places the survey does not cover: the national spread,
    // labeled as an estimate.
    return {
      cell: shifted(national),
      shares: national.shares!,
      basis: `ces-2024:national (no state sample):age ${band}${profiled}`,
    };
  const byAge = row.byAge[band];
  const base =
    byAge && byAge.n >= v("minimumCellRespondents") ? byAge : (row as CellKey);
  return {
    cell: shifted(base),
    shares: row.shares!,
    basis: `ces-2024:${state}:${base === byAge ? `age ${band}` : "state"}${profiled}`,
  };
}

export function viewsTable(api: CoreAPI) {
  return api.moduleState(VIEWS_MODULE_ID).table("people");
}

export function stancesTable(api: CoreAPI) {
  return api.moduleState(VIEWS_MODULE_ID).table("stances");
}

/** Following politics: the cell's average, spread by the person's own key (u to the power a has mean 1 / (a + 1)). */
export function engagementFrom(seed: string, personId: PersonId, mean: number) {
  return (
    uniform(`${seed}:views:engagement:${personId}`) **
    (v("one") / mean - v("one"))
  );
}

/** A person's faith and degree against the average of their age band in their state, from their profile. */
export function profileFromAverage(
  core: CoreState,
  person: Pick<PersonState, "id" | "householdId" | "birthDate" | "placeId">,
  date: string,
  seed: string,
): StanceProfile {
  const fact = (kind: string, key: string) =>
    builtFact(core, person.id, kind, key);
  const profile = profileFor(person, seed, date);
  const educ =
    fact(PROFILE_FACT_KINDS.education, "level") ?? profile?.education;
  const faith = fact(PROFILE_FACT_KINDS.faith, "group") ?? profile?.faith;
  if (!educ || !faith || !FAITH_IMPORTANCE[faith]) return {};
  const band = ageBand(ageOnDate(person.birthDate, date));
  const state = placeStateKey(person.placeId)?.slice("US-".length) ?? null;
  const row = state ? VIEWS_KEYS.states[state] : undefined;
  const educShares =
    row?.educationShares[band] ?? VIEWS_KEYS.nationalEducationShares[band];
  const faithShares =
    row?.faithShares[band] ?? VIEWS_KEYS.nationalFaithShares[band];
  if (!educShares || !faithShares) return {};
  let expectedFaith = v("zero");
  for (const [group, share] of Object.entries(faithShares))
    expectedFaith +=
      share * v(FAITH_IMPORTANCE[group] ?? "faithImportanceOtherFaith");
  return {
    faithFromAverage: v(FAITH_IMPORTANCE[faith]!) - expectedFaith,
    collegeFromAverage:
      (educ === "college" ? v("one") : v("zero")) -
      (educShares.college ?? v("zero")),
  };
}

/**
 * Where a person's view opens on the views scale: the CES cell for their
 * state, age and profile, spread by their household's heritage and their own
 * key. A counted resident opens where they will when filled in.
 */
export function openingLean(
  core: CoreState,
  person: PersonState,
  startedAt: string,
  seed: string,
): ReturnType<typeof viewCell> & { lean: number } {
  const found = viewCell(core, person, startedAt, seed);
  const share = v("householdShare");
  const z =
    share * normal(`${seed}:views:home:${person.householdId}`) +
    Math.sqrt(v("one") - share * share) *
      normal(`${seed}:views:person:${person.id}`);
  const lean = Math.min(
    v("leanMax"),
    Math.max(v("leanMin"), found.cell.mean + found.cell.sd * z),
  );
  return { ...found, lean };
}

const countedLeans = new WeakMap<object, Map<PersonId, number>>();

/**
 * A counted resident's lean on the views scale: the lean their view gets when
 * they are filled in as a full person, without making them one (one model,
 * two tiers). A counted resident hears nothing that moves it, so it is kept
 * for the world.
 */
export function countedLean(
  api: CoreAPI,
  voter: {
    readonly id: PersonId;
    readonly householdId: string;
    readonly birthDate: string;
    readonly placeId: string;
    readonly traits: PersonState["traits"];
  },
): number {
  const held = countedLeans.get(api.state) ?? new Map<PersonId, number>();
  countedLeans.set(api.state, held);
  const kept = held.get(voter.id);
  if (kept !== undefined) return kept;
  const { lean } = openingLean(
    api.state as CoreState,
    voter as unknown as PersonState,
    api.state.startedAt,
    api.state.seed,
  );
  held.set(voter.id, lean);
  return lean;
}

/** A person's view, formed from their record the first time it is read. */
export function viewOf(api: CoreAPI, personId: PersonId): PersonView | null {
  const table = viewsTable(api);
  const held = table.get(personId) as unknown as PersonView | undefined;
  if (held) return held;
  const person = api.state.people.get(personId);
  if (!person) return null;
  api.stopgap(VIEWS_DATA.stopgapId);
  const seed = api.state.seed;
  const { lean, cell, shares, basis } = openingLean(
    api.state as CoreState,
    person,
    api.state.startedAt,
    seed,
  );
  // Following politics: the cell's average, spread by the person's own key
  // (u to the power a has mean 1 / (a + 1)).
  const mean = cell.engagement ?? VIEWS_KEYS.national.engagement!;
  const engagement = engagementFrom(seed, person.id, mean);
  // People who do not place themselves are the least engaged, in the state's
  // own share.
  const notSure = shares.notSure ?? v("zero");
  const label =
    engagement < notSure ** (v("one") / mean - v("one"))
      ? "not-sure"
      : VIEWS_DATA.labels[Math.round(lean) - v("leanMin")]!;
  const view: PersonView = {
    id: personId,
    lean,
    engagement,
    label,
    basis,
    formedAt: api.state.date,
    ...profileFromAverage(
      api.state as CoreState,
      person,
      api.state.startedAt,
      seed,
    ),
  };
  table.put(view as unknown as { id: string });
  return view;
}

/** Which way a wanted change points on a policy question: +1 for, -1 against. */
export function direction(desiredChange: string): number {
  return desiredChange === "enact"
    ? v("one")
    : desiredChange === "repeal"
      ? -v("one")
      : v("zero");
}

export function stancesOf(api: CoreAPI, personId: PersonId): Stance[] {
  return stancesTable(api).query("byPerson", [personId]) as unknown as Stance[];
}

/**
 * A person's stance on one topic, or undefined for none: the row `onEvent`
 * keeps for them at `${personId}:${topic}`, the one row of theirs on it (the
 * same row `stancesOf` lists), read by its id instead of a scan.
 */
export function stanceRow(
  api: CoreAPI,
  personId: PersonId,
  topic: string,
): Stance | undefined {
  const row = stancesTable(api).get(`${personId}:${topic}`) as unknown as
    Stance | undefined;
  return row && row.personId === personId && row.topic === topic
    ? row
    : undefined;
}

export function stanceAfterCase(
  api: CoreAPI,
  heardCase: HeardCase,
): Stance | undefined {
  const {
    view,
    hearer,
    prior,
    event,
    topic,
    desiredChange,
    size,
    nearness,
    speakerId,
    learnedFrom,
    keepCauses,
    exposure = 1,
  } = heardCase;
  const personId = view.id;
  const id = `${personId}:${topic}`;
  const heard = speakerId
    ? (prior?.heard?.[speakerId] ?? v("zero"))
    : v("zero");
  const since = addDays(makeIsoDate(event.date), -v("stanceCauseKeptDays"));
  // How far this hearer lets an argument or a story move them follows
  // their own traits (openness and agreeableness toward yielding), at the
  // weight fitted to its study.
  // A multiplier, never zero: the most resistant hearer still moves a little.
  const yieldLean = hearer
    ? decisionLean(api.state, hearer, "views.persuasion", "yield", "resist")
    : v("zero");
  const yielding = hearer
    ? Math.exp(decisionTraitWeight(api.state, "views.persuasion") * yieldLean)
    : v("one");
  const change =
    (v("stanceStep") *
      size *
      nearness *
      yielding *
      (v("one") - v("tightness") * view.engagement)) /
    (v("one") + v("repeatWearOut") * heard);
  // The audit's probe (off in play) sees the move with and without the trait term.
  if (hearer)
    reportOutcome(
      "views.persuasion",
      personId,
      yieldLean,
      "size",
      (withTerm) => (withTerm ? change : change / yielding),
    );
  if (change <= v("zero") || exposure <= v("zero")) return undefined;
  const same = prior?.desiredChange === desiredChange;
  const fullStrength = Math.min(
    v("one"),
    prior ? (same ? prior.strength + change : prior.strength - change) : change,
  );
  // An audience count changes the group's mean, without choosing a member.
  // Mix the reached and unreached masses after the full reader's capped move.
  const signedBefore = prior ? (same ? prior.strength : -prior.strength) : 0;
  const signedAfter = prior && !same ? -fullStrength : fullStrength;
  const signedMean =
    exposure === 1
      ? signedAfter
      : signedBefore + (signedAfter - signedBefore) * exposure;
  const strength = Math.abs(signedMean);
  return {
    id,
    personId,
    topic,
    // A stance pushed past zero turns toward the new change.
    desiredChange:
      prior && !same && signedMean < v("zero")
        ? prior.desiredChange
        : desiredChange,
    strength: Math.abs(strength),
    // The player's circle (and everyone, under the keep-everyone's-why switch) keeps
    // why the stance is what it is: one cause per source, the speaker and
    // the record they learned it from, holding that source's latest event
    // and how often and how much it has moved the stance. A source
    // heard from every day is one row, so the list is as long as the
    // number of distinct sources heard in the last stanceCauseKeptDays,
    // never the number of events. For anyone
    // else only the latest (the speech that just moved them), since the
    // wear-out reads `heard`.
    causes: withCause(
      keepCauses ? (prior?.causes ?? []) : [],
      {
        eventId: event.id,
        date: event.date,
        change: change * exposure,
        ...(speakerId ? { speakerId } : {}),
        ...(learnedFrom ? { learnedFrom } : {}),
      },
      since,
    ),
    ...(speakerId || prior?.heard
      ? {
          heard: {
            ...prior?.heard,
            ...(speakerId ? { [speakerId]: heard + exposure } : {}),
          },
        }
      : {}),
  };
}
