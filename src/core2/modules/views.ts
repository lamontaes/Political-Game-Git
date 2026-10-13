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
 * Views form when first read, so a person filled in later gets theirs too.
 */
import { stableHash } from "../../simulation/ids";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { PROFILE_FACT_KINDS, profileFor } from "../opening-profile";
import partyJson from "../data/views/ces-2024-party.json" with { type: "json" };
import keysJson from "../data/views/ces-2024-views.json" with { type: "json" };
import viewsJson from "../data/views/views.json" with { type: "json" };
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionKinds } from "../trait-decisions";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonId,
  PersonState,
} from "../types";

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
/** The fact a speech event carries: the speaker's lean, -2 to +2. */
export const VIEWS_SPEECH_LEAN_KEY = "speech:lean";

export interface PersonView {
  id: PersonId;
  /** Seven-point party identification (CES pid7), e.g. "lean-democrat". */
  party?: string;
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

export interface Stance {
  id: string;
  personId: PersonId;
  topic: string;
  /** The change the person wants, and how strongly (0 to 1). */
  desiredChange: string;
  strength: number;
  /** The most recent causes, newest last (stanceCausesKept of them). */
  causes: readonly { eventId: string; date: string; change: number }[];
  /** Older causes folded away to keep memory small: how many, and their total change. */
  earlier?: { count: number; change: number };
}

/**
 * A stance's causes with a new one added: the newest few kept whole, older
 * ones folded into a count and a total (owner, Oct 12, ruling 5: memory
 * stays small).
 */
function keepRecent(
  prior: Stance | undefined,
  cause: Stance["causes"][number],
): Pick<Stance, "causes" | "earlier"> {
  const all = [...(prior?.causes ?? []), cause];
  const kept = v("stanceCausesKept");
  const folded = all.slice(v("zero"), Math.max(v("zero"), all.length - kept));
  const earlier = folded.reduce(
    (sum, row) => ({
      count: sum.count + v("one"),
      change: sum.change + row.change,
    }),
    prior?.earlier ?? { count: v("zero"), change: v("zero") },
  );
  return {
    causes: all.slice(-kept),
    ...(earlier.count > v("zero") ? { earlier } : {}),
  };
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

const PARTY = partyJson as unknown as {
  parties: readonly string[];
  byIdeology: Readonly<Record<string, Readonly<Record<string, number>>>>;
  meanLeanByParty: Readonly<Record<string, number>>;
};

/**
 * A person's party at the opening, from the CES shares of each party among
 * people of their ideology (interpolated between the two nearest points),
 * read with a draw keyed to their home and to them: who they are, not a
 * decision. People who do not place themselves read the "not sure" row.
 */
function partyFor(
  lean: number,
  label: string,
  seed: string,
  person: Pick<PersonState, "id" | "householdId">,
): string {
  let shares: Record<string, number>;
  if (label === "not-sure") shares = { ...PARTY.byIdeology["not-sure"]! };
  else {
    const low = Math.floor(lean);
    const high = Math.min(v("leanMax"), low + v("one"));
    const t = lean - low;
    const a = PARTY.byIdeology[String(low)]!;
    const b = PARTY.byIdeology[String(high)]!;
    shares = Object.fromEntries(
      PARTY.parties.map((party) => [
        party,
        (v("one") - t) * (a[party] ?? v("zero")) + t * (b[party] ?? v("zero")),
      ]),
    );
  }
  const share = v("partyHouseholdShare");
  const draw =
    uniform(`${seed}:views:party:which:${person.id}`) < share
      ? uniform(`${seed}:views:party:home:${person.householdId}`)
      : uniform(`${seed}:views:party:person:${person.id}`);
  const total = Object.values(shares).reduce((sum, x) => sum + x, v("zero"));
  let cumulative = v("zero");
  for (const party of PARTY.parties) {
    cumulative += (shares[party] ?? v("zero")) / total;
    if (draw < cumulative) return party;
  }
  return PARTY.parties.at(-v("one"))!;
}

function stateOf(person: PersonState): string | null {
  const place = lifePlaceByJurisdictionId(person.placeId as never);
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
  const engagement =
    uniform(`${seed}:views:engagement:${person.id}`) **
    (v("one") / mean - v("one"));
  // People who do not place themselves are the least engaged, in the state's
  // own share.
  const notSure = shares.notSure ?? v("zero");
  const label =
    engagement < notSure ** (v("one") / mean - v("one"))
      ? "not-sure"
      : VIEWS_DATA.labels[Math.round(lean) - v("leanMin")]!;
  const view: PersonView = {
    id: personId,
    party: partyFor(lean, label, seed, person),
    lean,
    engagement,
    label,
    basis,
    formedAt: api.state.date,
  };
  table.put(view as unknown as { id: string });
  return view;
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
    // Only an event with a topic and a wanted change carries a stance.
    if (!event.topic || !event.desiredChange) return;
    const speechLean = Number(event.facts?.[VIEWS_SPEECH_LEAN_KEY]);
    const cause = {
      eventId: event.id,
      date: event.date,
      topic: event.topic,
      desiredChange: event.desiredChange,
      size: stanceSize(event),
    };
    for (const personId of learnedBy)
      moveStance(
        api,
        personId,
        cause,
        Number.isFinite(speechLean) ? v("speechStanceStep") : v("stanceStep"),
        Number.isFinite(speechLean) ? speechLean : undefined,
      );
  },
  reasonProviders: {
    "views-party": (api, actor, _offer, binding) => {
      const held = pendingParty.get(api.state);
      if (!held || held.personId !== actor.id) return undefined;
      return {
        value:
          binding.arguments?.changing === "true"
            ? held.pull
            : v(`partyStickiness:${held.strength}`),
        sourceIds: [actor.id, held.eventId],
      };
    },
  },
};

/** What an event carries toward a stance: its topic, wanted change and size. */
export interface StanceCause {
  eventId: string;
  date: string;
  topic: string;
  desiredChange: string;
  size: number;
}

/** An event's size for a stance: its appraised impulse, else one. */
export function stanceSize(event: {
  moodImpulse?: number;
  stressImpulse?: number;
}): number {
  const impulse =
    Math.abs(event.moodImpulse ?? v("zero")) +
    Math.max(v("zero"), event.stressImpulse ?? v("zero"));
  return impulse > v("zero") ? impulse : v("one");
}

/**
 * Moves one person's stance on a cause's topic by `step` per unit of its
 * size, less for someone who follows politics closely. A speech's lean
 * (`speechLean`) persuades in proportion to how near the listener's lean is.
 * Returns whether the stance moved.
 */
export function moveStance(
  api: CoreAPI,
  personId: PersonId,
  cause: StanceCause,
  step: number,
  speechLean?: number,
): boolean {
  const view = viewOf(api, personId);
  if (!view) return false;
  const id = `${personId}:${cause.topic}`;
  const prior = stancesTable(api).get(id) as unknown as Stance | undefined;
  // A speech persuades listeners in proportion to how near their lean is
  // to the speaker's; one far away is not moved.
  const nearness =
    speechLean === undefined
      ? v("one")
      : Math.max(
          v("zero"),
          v("one") -
            Math.abs(view.lean - speechLean) / (v("leanMax") - v("leanMin")),
        );
  const change =
    step *
    cause.size *
    nearness *
    (v("one") - v("tightness") * view.engagement);
  if (change <= v("zero")) return false;
  const same = prior?.desiredChange === cause.desiredChange;
  const strength = Math.min(
    v("one"),
    prior ? (same ? prior.strength + change : prior.strength - change) : change,
  );
  const stance: Stance = {
    id,
    personId,
    topic: cause.topic,
    // A stance pushed past zero turns toward the new change.
    desiredChange:
      prior && !same && strength > v("zero")
        ? prior.desiredChange
        : cause.desiredChange,
    strength: Math.abs(strength),
    ...keepRecent(prior, {
      eventId: cause.eventId,
      date: cause.date,
      change,
    }),
  };
  stancesTable(api).put(stance as unknown as { id: string });
  if (speechLean !== undefined)
    driftToward(api, view, speechLean, nearness, cause.eventId);
  return true;
}

/** How strongly a seven-point party identification holds: its strength word. */
function strengthOf(party: string): string {
  return party.split("-")[v("zero")]!;
}

function partyAction(id: string, changing: boolean): ActionDefinition {
  return {
    id,
    actKinds: decisionKinds("views.party-change", id),
    goalKinds: [],
    need: "safety",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "party",
    effect: "identify",
    reasonBindings: [
      {
        id: "party",
        provider: "views-party",
        weightParameter: "one",
        arguments: { changing: String(changing) },
        stopgapId: VIEWS_DATA.stopgapId,
      },
    ],
  };
}
const KEEP_PARTY = partyAction("views-keep-party", false);
const CHANGE_PARTY = partyAction("views-change-party", true);
const pendingParty = new WeakMap<
  object,
  { personId: PersonId; pull: number; strength: string; eventId: string }
>();

/**
 * A speech heard moves the listener's lean a little toward the speaker's, by
 * how near they already were and how loosely they hold their views; then the
 * listener weighs moving one step along the party scale toward the point
 * whose people's average lean is now nearer, against how strongly they hold
 * their party (CES 2024 means by party; Pew 2020 is the check on totals).
 */
function driftToward(
  api: CoreAPI,
  view: PersonView,
  speechLean: number,
  nearness: number,
  eventId: string,
): void {
  const step =
    v("speechLeanPull") *
    nearness *
    (v("one") - v("tightness") * view.engagement);
  if (!(step > v("zero"))) return;
  const lean = Math.min(
    v("leanMax"),
    Math.max(v("leanMin"), view.lean + step * (speechLean - view.lean)),
  );
  let party = view.party;
  if (party && party !== "not-sure") {
    const order = PARTY.parties.filter((row) => row !== "not-sure");
    const at = order.indexOf(party);
    const mean = (row: string) => PARTY.meanLeanByParty[row] ?? v("zero");
    const toward =
      lean < mean(party) ? order[at - v("one")] : order[at + v("one")];
    if (toward) {
      const pull = Math.abs(lean - mean(party)) - Math.abs(lean - mean(toward));
      pendingParty.set(api.state, {
        personId: view.id,
        pull,
        strength: strengthOf(party),
        eventId,
      });
      const offers: ActOffer[] = [KEEP_PARTY, CHANGE_PARTY].map(
        (definition) => ({
          definition,
          targetId: toward,
          availableHours: api.parameter("hoursPerDay"),
        }),
      );
      const scored = scoreOffers(api.state, view.id, offers, {
        needValues: { safety: v("zero") },
      });
      const decision = decisionFromScores(api.state, view.id, scored);
      pendingParty.delete(api.state);
      if (decision.selected?.definition.id === CHANGE_PARTY.id) {
        api.emit({
          id: `views.party-changed:${view.id}:${api.state.date}:${eventId}`,
          date: api.state.date,
          kind: "views.party-changed",
          personIds: [view.id],
          placeId: api.state.people.get(view.id)!.placeId,
          publicRecord: false,
          source: {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation:
              "A change of party identification after a speech moved their lean.",
            estimatedFrom: VIEWS_DATA.stopgapId,
          },
          facts: { from: party, to: toward, causeId: eventId },
        });
        party = toward;
      }
    }
  }
  viewsTable(api).put({
    ...view,
    lean,
    ...(party ? { party } : {}),
  } as unknown as { id: string });
}
