/**
 * Political views (M1-10), first version on the new core.
 *
 * Each person's opening lean comes from who they are on record: the CES 2024
 * spread for their state and age band, with a share their household holds in
 * common (families and partners lean alike). That is who someone is at the
 * opening, keyed to them and their home, never a choice made in play. How
 * closely they follow politics comes the same way. After the opening, views
 * change only from causes: an event with a topic that reaches the person moves
 * their stance on that topic, less for people who follow politics closely,
 * and each change records its cause. Nothing drifts on a schedule.
 *
 * When someone makes the case to the person (a speech, a hearing statement, a
 * constituent's case, a lobbying visit, a candidate's stated position), the
 * event names the speaker, and how far it moves the listener slides with the
 * speaker's standing with them: how near their views are (whom they trust),
 * how close the two are today, whether they share a party, and how the
 * speaker has voted on the question before. `viewOn` is the person's current
 * view on a question, which every vote reads.
 *
 * Views form when first read, so a person filled in later gets theirs too.
 */
import { stableHash } from "../kernel/ids";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { corePlaceByJurisdictionId } from "../place-lookup";
import { PROFILE_FACT_KINDS, profileFor } from "../opening-profile";
import { personStance } from "../campaign-views";
import { currentCloseness } from "../closeness";
import keysJson from "../data/views/ces-2024-views.json" with { type: "json" };
import viewsJson from "../data/views/views.json" with { type: "json" };
import drivesJson from "../data/drives.json" with { type: "json" };
import stanceLoadings from "../../../data/research/people/opening-stance-loadings.json" with { type: "json" };
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import { keepsWhy } from "../why-kept";

interface CellKey {
  n: number;
  mean: number;
  sd: number;
  engagement?: number;
  shares?: Readonly<Record<string, number>>;
}
interface StateKey extends CellKey {
  byAge: Readonly<Record<string, CellKey>>;
  educationShares: Readonly<
    Record<string, Readonly<Record<string, number>> | null>
  >;
  faithShares: Readonly<
    Record<string, Readonly<Record<string, number>> | null>
  >;
}
export const VIEWS_KEYS = keysJson as unknown as {
  version: string;
  source: { citation: string };
  ageBands: readonly string[];
  national: CellKey;
  states: Readonly<Record<string, StateKey>>;
  counties: Readonly<Record<string, CellKey>>;
  nationalEducationShares: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  nationalFaithShares: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  profileShift: Readonly<
    Record<
      string,
      Readonly<
        Record<string, Readonly<Record<string, { n: number; shift: number }>>>
      >
    >
  >;
};
export const VIEWS_DATA = viewsJson as {
  version: string;
  stopgapId: string;
  parameters: Readonly<Record<string, { value: number }>>;
  labels: readonly string[];
};
const v = (key: string): number => {
  const row = VIEWS_DATA.parameters[key];
  if (!row || !Number.isFinite(row.value))
    throw new Error(`Untagged views parameter: ${key}`);
  return row.value;
};

export const VIEWS_MODULE_ID = "views";
const DRIVE_MOMENTS = new Set<string>(
  Object.entries(
    (drivesJson as { eventKinds: Record<string, string> }).eventKinds,
  )
    .filter(([key]) => key === "formed" || key === "strengthened")
    .map(([, kind]) => kind),
);
/** Facts by which an event cites a law, a vote or a bill. */
const CITED_RECORDS = ["lawId", "voteId", "billId"] as const;

/** The drives engine's acts (sharing a cause, donating, volunteering, going to an office, ...). */
const DRIVE_ACTS = new Set<string>([
  ...Object.values(
    (drivesJson as { eventKinds: Record<string, string> }).eventKinds,
  ),
  ...((
    drivesJson as { civicActEvents?: readonly { eventKind: string }[] }
  ).civicActEvents?.map((row) => row.eventKind) ?? []),
]);
/** The fact an event that makes a case carries: who made it. */
export const VIEWS_SPEAKER_KEY = "views:speaker";
/** The parties and record engines' tables, read by id (they import this one). */
const PARTIES_STORE = "core2-parties-v1";
const RECORD_STORE = "core2-record-v1";

export interface PersonView {
  id: PersonId;
  /** -2 (very liberal) to +2 (very conservative). */
  lean: number;
  /** 0 (hardly follows politics) to 1 (follows it most of the time). */
  engagement: number;
  /** "not-sure" when they would not place themselves. */
  label: string;
  /** The records and key cell the opening view came from. */
  basis: string;
  formedAt: string;
}

/**
 * The causes after one more event: the new one replaces its source's earlier
 * row (same speaker, same record) and moves to the end, carrying how many
 * events that source has moved the stance and by how much in all.
 */
function withCause(
  causes: Stance["causes"],
  cause: Stance["causes"][number],
): Stance["causes"] {
  const same = (row: Stance["causes"][number]) =>
    row.speakerId === cause.speakerId && row.learnedFrom === cause.learnedFrom;
  const earlier = causes.find(same);
  return [
    ...causes.filter((row) => !same(row)),
    {
      ...cause,
      count: (earlier?.count ?? (earlier ? 1 : 0)) + 1,
      total: (earlier?.total ?? earlier?.change ?? 0) + cause.change,
    },
  ];
}

export interface Stance {
  id: string;
  personId: PersonId;
  topic: string;
  /** The change the person wants, and how strongly (0 to 1). */
  desiredChange: string;
  strength: number;
  causes: readonly {
    eventId: string;
    date: string;
    change: number;
    /** Who made the case, when someone did. */
    speakerId?: string;
    /** The record (a story heard, a notice) by which they learned of the law, vote or bill the event cites. */
    learnedFrom?: string;
    /** How many events from this same source (speaker and record) have moved the stance, and by how much in all. `eventId`, `date` and `change` are the latest. */
    count?: number;
    total?: number;
  }[];
  /** How many times each speaker has made a case to them: the repeat wear-out reads this, whatever causes are kept. */
  heard?: Readonly<Record<string, number>>;
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

function stateOf(person: PersonState): string | null {
  const place = corePlaceByJurisdictionId(person.placeId as never);
  const key = place?.stateJurisdictionKey;
  return key ? key.slice(key.lastIndexOf("-") + v("one")) : null;
}

function ageBand(age: number): string {
  for (const band of VIEWS_KEYS.ageBands) {
    const [low, high] = band.split("-");
    if (age >= Number(low) && (high === "plus" || age <= Number(high)))
      return band;
  }
  return VIEWS_KEYS.ageBands[v("zero")]!;
}

/** The CES cell a person's opening view is read from, and how it was chosen. */
export function viewCell(
  person: PersonState,
  date: string,
  seed: string,
): { cell: CellKey; shares: Readonly<Record<string, number>>; basis: string } {
  const state = stateOf(person);
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
  const band = ageBand(age);
  const row = state ? VIEWS_KEYS.states[state] : undefined;
  const national = VIEWS_KEYS.national;
  // The person's own education and faith shift the cell by their profile's
  // national lean, less what the place's mix of profiles at that age averages
  // (the state's, or the nation's where the survey has no state sample).
  const fact = (kind: string, key: string) =>
    person.pastFacts?.find((row) => row.kind === kind)?.facts?.[key];
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

function viewsTable(api: CoreAPI) {
  return api.moduleState(VIEWS_MODULE_ID).table("people");
}
function stancesTable(api: CoreAPI) {
  return api.moduleState(VIEWS_MODULE_ID).table("stances");
}

/** Following politics: the cell's average, spread by the person's own key (u to the power a has mean 1 / (a + 1)). */
function engagementFrom(seed: string, personId: PersonId, mean: number) {
  return (
    uniform(`${seed}:views:engagement:${personId}`) **
    (v("one") / mean - v("one"))
  );
}

const engagementCells = new WeakMap<object, Map<string, number>>();

/**
 * How closely a counted resident follows politics: the same value their
 * view gets when they are filled in as a full person (their own key spread
 * around the CES cell's average for their state and age), without making
 * them one. Read for counted groups, so the count and the person agree.
 */
export function countedEngagement(
  api: CoreAPI,
  voter: {
    readonly id: PersonId;
    readonly birthDate: string;
    readonly placeId: string;
    readonly traits: PersonState["traits"];
  },
  record?: object,
): number {
  const cache = engagementCells.get(api.state) ?? new Map<string, number>();
  engagementCells.set(api.state, cache);
  const age = ageOnDate(
    makeIsoDate(voter.birthDate),
    makeIsoDate(api.state.startedAt),
  );
  const key = `${voter.placeId}|${age}`;
  let mean = cache.get(key);
  if (mean === undefined) {
    const person = {
      ...(record ?? {}),
      id: voter.id,
      birthDate: voter.birthDate,
      placeId: voter.placeId,
      traits: voter.traits,
    } as unknown as PersonState;
    const { cell } = viewCell(person, api.state.startedAt, api.state.seed);
    mean = cell.engagement ?? VIEWS_KEYS.national.engagement!;
    cache.set(key, mean);
  }
  return engagementFrom(api.state.seed, voter.id, mean);
}

/** A person's view, formed from their record the first time it is read. */
export function viewOf(api: CoreAPI, personId: PersonId): PersonView | null {
  const table = viewsTable(api);
  const held = table.get(personId) as unknown as PersonView | undefined;
  if (held) return held;
  const person = api.state.people.get(personId);
  if (!person) return null;
  api.stopgap(VIEWS_DATA.stopgapId);
  const { cell, shares, basis } = viewCell(
    person,
    api.state.startedAt,
    api.state.seed,
  );
  const seed = api.state.seed;
  // Who someone is at the opening: their household's heritage and their own.
  const share = v("householdShare");
  const z =
    share * normal(`${seed}:views:home:${person.householdId}`) +
    Math.sqrt(v("one") - share * share) *
      normal(`${seed}:views:person:${person.id}`);
  const lean = Math.min(
    v("leanMax"),
    Math.max(v("leanMin"), cell.mean + cell.sd * z),
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
  };
  table.put(view as unknown as { id: string });
  return view;
}

/** Which way a wanted change points on a policy question: +1 for, -1 against. */
function direction(desiredChange: string): number {
  return desiredChange === "enact"
    ? v("one")
    : desiredChange === "repeal"
      ? -v("one")
      : v("zero");
}

/**
 * A speaker's standing with a listener on a question, 0 to 1: how near their
 * views are (people trust those who think as they do), how close the two are
 * today, whether they share a party (half for anyone not tied to one), and
 * how the speaker has voted on the question before (half with no record).
 * Each part slides; the weights are the views table's.
 */
export function standingWith(
  api: CoreAPI,
  listener: PersonView,
  speakerId: string,
  topic: string,
  desiredChange: string,
): number {
  const speaker = viewOf(api, speakerId);
  const half = v("one") / v("two");
  const trust = speaker
    ? Math.max(
        v("zero"),
        v("one") -
          Math.abs(listener.lean - speaker.lean) /
            (v("leanMax") - v("leanMin")),
      )
    : half;
  const tie = api.state.relationships.get(
    [listener.id, speakerId].sort().join(":"),
  );
  const closeness = tie ? currentCloseness(api.state, tie) : v("zero");
  const partyOf = (id: string) =>
    api.state.modules.has(PARTIES_STORE)
      ? ((
          api.moduleState(PARTIES_STORE).table("ties").get(id) as unknown as
            { partyId: string | null } | undefined
        )?.partyId ?? null)
      : null;
  const mine = partyOf(listener.id);
  const theirs = partyOf(speakerId);
  const party =
    mine && theirs ? (mine === theirs ? v("one") : v("zero")) : half;
  const want = direction(desiredChange);
  const votes = api.state.modules.has(RECORD_STORE)
    ? (
        api
          .moduleState(RECORD_STORE)
          .table("votes")
          .query("byPerson", [speakerId]) as unknown as {
          stance: { question: string; position: number };
        }[]
      ).filter((row) => row.stance.question === topic)
    : [];
  const record =
    votes.length && want !== v("zero")
      ? (v("one") +
          votes.reduce(
            (sum, row) => sum + Math.sign(row.stance.position) * want,
            v("zero"),
          ) /
            votes.length) /
        v("two")
      : half;
  return (
    v("standingTrustWeight") * trust +
    v("standingClosenessWeight") * closeness +
    v("standingPartyWeight") * party +
    v("standingRecordWeight") * record
  );
}

/**
 * How far the person's stance on a policy question has moved since the
 * opening, -1 to 1: positive toward enacting it, negative toward repealing.
 */
export function stanceOn(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return v("zero");
  const stance = stancesTable(api).get(`${personId}:${question}`) as unknown as
    Stance | undefined;
  return stance ? direction(stance.desiredChange) * stance.strength : v("zero");
}

/**
 * How far what the person has heard since the opening has moved their view
 * on a question, on the scale of a view (-1 to 1), positive toward enacting.
 * A state or federal official's position reads this on top of their own
 * stand, the way a town member's view does (`viewOn`).
 */
export function caseShift(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  return v("stanceViewWeight") * stanceOn(api, personId, question);
}

/**
 * The person's current view on a policy question, -1 to 1: where their
 * opening lean (`lean`, the campaigns engine's, -1 to 1) puts them on the
 * question's axis, plus how far what they have heard since has moved them.
 */
export function viewOn(
  api: CoreAPI,
  personId: PersonId,
  question: string,
  lean: number,
): number {
  return Math.max(
    -v("one"),
    Math.min(
      v("one"),
      personStance(lean, question) +
        openingLoadingShift(api, personId, question) +
        v("stanceViewWeight") * stanceOn(api, personId, question),
    ),
  );
}

interface Loading {
  readonly value: number;
}
const LOADINGS = stanceLoadings.questions as unknown as Record<
  string,
  { loadings: { faith: Loading; college: Loading } }
>;
const PREDICTORS = stanceLoadings.predictors;
const profiles = new WeakMap<
  object,
  Map<PersonId, { faith: number; college: number } | null>
>();

/**
 * Where a person sits on the survey's faith index (0 to 1, from their faith
 * group's CES 2020 mean) and whether they hold a four-year degree, from the
 * same education and faith records their opening view is read with.
 */
function faithAndDegree(api: CoreAPI, personId: PersonId) {
  const held = profiles.get(api.state) ?? new Map();
  profiles.set(api.state, held);
  if (held.has(personId)) return held.get(personId) ?? null;
  const person = api.state.people.get(personId);
  let out: { faith: number; college: number } | null = null;
  if (person) {
    const fact = (kind: string, key: string) =>
      person.pastFacts?.find((row) => row.kind === kind)?.facts?.[key];
    const profile = profileFor(person, api.state.seed, api.state.startedAt);
    const educ =
      fact(PROFILE_FACT_KINDS.education, "level") ?? profile?.education;
    const group = fact(PROFILE_FACT_KINDS.faith, "group") ?? profile?.faith;
    const faith = group
      ? (PREDICTORS.faithMeanByGroup as Record<string, number>)[group]
      : undefined;
    if (faith !== undefined && educ !== undefined)
      out = { faith, college: educ === "college" ? v("one") : v("zero") };
  }
  held.set(personId, out);
  return out;
}

/**
 * What a person's faith and degree add to their opening stance on a question
 * the 2020 Cooperative Election Study asked (`opening-stance-loadings.json`):
 * each loading times how far they sit from the average person, so the town's
 * mean stance stays on the lean axis. A question with no survey item, or a
 * person with no recorded faith or education, adds nothing (ESTIMATED).
 */
export function openingLoadingShift(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  const loadings = LOADINGS[question]?.loadings;
  if (!loadings) return v("zero");
  const own = faithAndDegree(api, personId);
  if (!own) return v("zero");
  return (
    loadings.faith.value * (own.faith - PREDICTORS.nationalFaithMean) +
    loadings.college.value * (own.college - PREDICTORS.collegeShare)
  );
}

/**
 * How much a person agrees with a platform, -1 to 1: the mean, over its
 * stated positions, of their current view times the position (the views
 * engine's version of `platformAgreement`).
 */
export function agreementWith(
  api: CoreAPI,
  personId: PersonId,
  lean: number,
  platform: readonly { question: string; position: number }[],
): number {
  if (!platform.length) return v("zero");
  let sum = v("zero");
  for (const stance of platform)
    sum += viewOn(api, personId, stance.question, lean) * stance.position;
  return Math.max(-v("one"), Math.min(v("one"), sum / platform.length));
}

type StanceListener = (api: CoreAPI, personId: PersonId, topic: string) => void;
const stanceListeners: StanceListener[] = [];

/**
 * Engines that act on the day a stance moves (interest-group membership
 * follows the view) register here; each is called after the move is stored.
 */
export function registerStanceListener(listener: StanceListener): void {
  if (!stanceListeners.includes(listener)) stanceListeners.push(listener);
}

export function stancesOf(api: CoreAPI, personId: PersonId): Stance[] {
  return stancesTable(api).query("byPerson", [personId]) as unknown as Stance[];
}

export const viewsModule: CoreModule = {
  id: VIEWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      people: {},
      stances: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byTopic: { fields: ["topic"] },
        },
      },
    },
  },
  eventKinds: ["*"],
  onEvent(api, event, learnedBy) {
    // Only an event with a topic and a wanted change carries a stance. A
    // drive forming or growing restates a change the event behind it already
    // made, so it moves nothing again.
    if (!event.topic || !event.desiredChange) return;
    if (DRIVE_MOMENTS.has(event.kind)) return;
    const impulse =
      Math.abs(event.moodImpulse ?? v("zero")) +
      Math.max(v("zero"), event.stressImpulse ?? v("zero"));
    const size = impulse > v("zero") ? impulse : v("one");
    for (const personId of learnedBy) {
      const view = viewOf(api, personId);
      if (!view) continue;
      const id = `${personId}:${event.topic}`;
      const prior = stancesTable(api).get(id) as unknown as Stance | undefined;
      // A case made by a speaker moves the listener by the speaker's
      // standing with them: the speaker the event names, or for someone who
      // only witnessed it, the person whose act it was (a cause shared with
      // them). An event about the person themselves reaches them in full.
      // A person's own act for their cause is their drive at work (the drives
      // engine strengthens it); it moves only those it reaches.
      if (DRIVE_ACTS.has(event.kind) && event.personIds.includes(personId))
        continue;
      const speakerId =
        event.facts?.[VIEWS_SPEAKER_KEY] ??
        (event.personIds.includes(personId) ? undefined : event.personIds[0]);
      if (speakerId === personId) continue;
      // Knowing is a read (owner, Oct 14, 2026): an event citing a law, a
      // vote or a bill moves a stance only for someone who learned of it,
      // from the case made to them or from a record they hold (a story they
      // heard, a notice), and the stance cites how they learned.
      const received = event.facts?.learnedFrom;
      const learnedFrom =
        typeof received === "string" && api.knows(personId, received)
          ? received
          : undefined;
      if (
        CITED_RECORDS.some((key) => event.facts?.[key] !== undefined) &&
        !speakerId &&
        !(learnedFrom && api.knows(personId, learnedFrom))
      )
        continue;
      const nearness = speakerId
        ? standingWith(api, view, speakerId, event.topic, event.desiredChange)
        : v("one");
      // The same case from the same speaker again persuades less each time.
      const heard = speakerId
        ? (prior?.heard?.[speakerId] ?? v("zero"))
        : v("zero");
      const change =
        (v("stanceStep") *
          size *
          nearness *
          (v("one") - v("tightness") * view.engagement)) /
        (v("one") + v("repeatWearOut") * heard);
      if (change <= v("zero")) continue;
      const same = prior?.desiredChange === event.desiredChange;
      const strength = Math.min(
        v("one"),
        prior
          ? same
            ? prior.strength + change
            : prior.strength - change
          : change,
      );
      const stance: Stance = {
        id,
        personId,
        topic: event.topic,
        // A stance pushed past zero turns toward the new change.
        desiredChange:
          prior && !same && strength > v("zero")
            ? prior.desiredChange
            : event.desiredChange,
        strength: Math.abs(strength),
        // The player's circle (and every person when bookkeeping is on) keeps
        // why the stance is what it is: one cause per source, the speaker and
        // the record they learned it from, holding that source's latest event
        // and how often and how much it has moved the stance. A source
        // heard from every day is one row, so the list is as long as the
        // number of distinct sources, never the number of events. For anyone
        // else only the latest (the speech that just moved them), since the
        // wear-out reads `heard`.
        causes: withCause(
          keepsWhy(api.state as CoreState, personId)
            ? (prior?.causes ?? [])
            : [],
          {
            eventId: event.id,
            date: event.date,
            change,
            ...(speakerId ? { speakerId } : {}),
            ...(learnedFrom ? { learnedFrom } : {}),
          },
        ),
        ...(speakerId || prior?.heard
          ? {
              heard: {
                ...prior?.heard,
                ...(speakerId ? { [speakerId]: heard + v("one") } : {}),
              },
            }
          : {}),
      };
      stancesTable(api).put(stance as unknown as { id: string });
      for (const listener of stanceListeners)
        listener(api, personId, event.topic);
    }
  },
};
