/**
 * Couples forming during play (P15, renewal): each month, every unpartnered
 * adult looks at their own ties for an unpartnered adult they are close to,
 * and the two marry when both choose to. The pull comes from their recorded
 * closeness, how near each is to the usual age at first marriage, and the age
 * gap between them; each weighs it with their own temperament through the
 * shared chooser. The national marriage rate checks the total and never picks
 * a couple.
 */
import rows from "../data/partnering/parameters.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { stableHash } from "../../simulation/ids";
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionKinds, decisionLean } from "../trait-decisions";
import { PROFILE_FACT_KINDS, profileFor } from "../opening-profile";
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";

export const PARTNERING_MODULE_ID = "partnering";
export const MARRIED_EVENT = "family.married";
export const MARRIAGE_KIND = "legal:marriage";
export const COUPLE_KIND = "romantic:couple";
export const MOVED_IN_EVENT = "family.moved-in-together";
export const PARTNERING_PARAMETERS = rows as unknown as Readonly<
  Record<string, Parameter>
>;
const STOPGAP = "SG-P15-partnering-weights";
/** Same-sex couples and a new couple moving in together are not modeled yet. */
const HOMES_STOPGAP = "SG-P15-partnering-homes";
const INACTIVE_TIER = "husk";
const REVIEW_KIND = "partnering-review";
const DECISION = "partnering.marry";
const INTRODUCED_CAUSE = "met-through-friend";
const MARRY_ID = "marry";
const STAY_ID = "stay-as-is";

function q(api: CoreAPI, key: string): number {
  const row = PARTNERING_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

function store(api: CoreAPI) {
  return api.moduleState(PARTNERING_MODULE_ID);
}

const ageOf = (api: CoreAPI, person: Readonly<PersonState>) =>
  ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date));

function action(id: string, marrying: boolean): ActionDefinition {
  return {
    id: `partnering-${id}`,
    // Every trait reaches both options through the shared decision table.
    actKinds: decisionKinds(DECISION, id),
    goalKinds: [],
    need: "company",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "person",
    effect: "partner",
    reasonBindings: [
      {
        id: "couple",
        provider: "partnering-couple",
        weightParameter: "one",
        arguments: { marrying: String(marrying) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const MARRY = action(MARRY_ID, true);
export const STAY_AS_IS = action(STAY_ID, false);

export interface Marriage {
  id: string;
  /** The partner link, shared by a couple's moving in and their marriage. */
  partnershipId: string;
  /** A marriage, or a couple moving in together. */
  kind: string;
  personIds: readonly [PersonId, PersonId];
  date: string;
  /** The pull behind it, by cause, as each partner weighed it. */
  reasons: Readonly<Record<string, number>>;
  /** Who moved into the other's home, if anyone did. */
  movedIn?: PersonId;
}

/**
 * A newlywed who shares a home with others (a young adult at their parents')
 * moves into the spouse's own home, where the spouse is its only adult. Two
 * who each live alone, or each with others, keep their homes until the
 * housing engine can give them one (SG-P15-partnering-homes).
 */
function moveIn(
  api: CoreAPI,
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
): PersonId | undefined {
  const core = api.state as CoreState;
  const adults = (householdId: string) =>
    (core.households.get(householdId)?.memberIds ?? []).filter((id) => {
      const member = core.people.get(id);
      return (
        !!member?.alive && ageOf(api, member) >= q(api, "partneringMinimumAge")
      );
    });
  const size = (householdId: string) =>
    core.households.get(householdId)?.memberIds.length ?? api.parameter("zero");
  for (const [mover, host] of [
    [a, b],
    [b, a],
  ] as const) {
    if (
      mover.householdId !== host.householdId &&
      mover.placeId === host.placeId &&
      size(mover.householdId) > api.parameter("one") &&
      adults(host.householdId).length === api.parameter("one") &&
      adults(mover.householdId).length > api.parameter("one")
    ) {
      api.moveIntoHouseholdV1(mover.id, host.householdId);
      return mover.id;
    }
  }
  api.stopgap(HOMES_STOPGAP);
  return undefined;
}

/** Who can marry now: alive, in town, an adult, of a recorded gender. */
function eligible(
  api: CoreAPI,
  person: Readonly<PersonState> | undefined,
  partnered: ReadonlySet<PersonId>,
): person is Readonly<PersonState> {
  return (
    !!person?.alive &&
    person.tier !== INACTIVE_TIER &&
    !partnered.has(person.id) &&
    (person.looks?.gender === "female" || person.looks?.gender === "male") &&
    person.id !== (api.state as CoreState).playerId &&
    ageOf(api, person) >= q(api, "partneringMinimumAge")
  );
}

/** The pull toward marrying for a pair, by cause. */
export function coupleReasons(
  api: CoreAPI,
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
  closeness: number,
): Record<string, number> {
  const one = api.parameter("one");
  const two = api.parameter("two");
  const nearPeak = (person: Readonly<PersonState>) => {
    const peak = q(
      api,
      person.looks?.gender === "female"
        ? "partneringPeakAgeWomen"
        : "partneringPeakAgeMen",
    );
    const distance =
      (ageOf(api, person) - peak) / q(api, "partneringAgeSpread");
    return Math.exp(-distance * distance);
  };
  const gap =
    (ageOf(api, a) - ageOf(api, b)) / q(api, "partneringAgeGapSpread");
  return {
    closeness: q(api, "partneringClosenessWeight") * closeness,
    age: q(api, "partneringAgeWeight") * (nearPeak(a) + nearPeak(b) - one),
    gap: -q(api, "partneringGapWeight") * Math.min(gap * gap, two * two),
  };
}

const pending = new WeakMap<object, number>();

/** Whether this person chooses to marry, weighing the pair's pull. */
function chooses(
  api: CoreAPI,
  person: Readonly<PersonState>,
  pull: number,
  otherId: PersonId,
  stayKey = "partneringStayPull",
): boolean {
  const temperament =
    q(api, "partneringTemperamentWeight") *
    decisionLean(api.state, person, DECISION, MARRY_ID, STAY_ID);
  pending.set(api.state, pull + temperament - q(api, stayKey));
  const offers: ActOffer[] = [STAY_AS_IS, MARRY].map((definition) => ({
    definition,
    targetId: otherId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, person.id, offers, {
    needValues: { company: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, person.id, scored);
  pending.delete(api.state);
  return decision.selected?.definition.id === MARRY.id;
}

/**
 * Where a pair already is in courting at the opening: generation of the
 * opening state, keyed to the pair, so marriages run steadily from the first
 * month, as in a town that has been running for years.
 */
function courtshipOf(api: CoreAPI, pairKey: string): number {
  const held = store(api).table("courtships").get(pairKey) as
    { value: number } | undefined;
  if (held) return held.value;
  const digits = api.parameter("seedHashDigits");
  const radix = api.parameter("seedPlaceHashRadix");
  const draw = Number.parseInt(
    stableHash(`${api.state.seed}:partnering:opening:${pairKey}`).slice(
      api.parameter("zero"),
      digits,
    ),
    radix,
  );
  return (draw / radix ** digits) * q(api, "partneringStayPull");
}

function partneredNow(core: Readonly<CoreState>): Set<PersonId> {
  const out = new Set<PersonId>();
  for (const link of core.familyLinks.values())
    if (
      link.kind === "partner" &&
      link.personIds.every((id) => core.people.get(id)?.alive)
    )
      for (const id of link.personIds) out.add(id);
  return out;
}

/** The kind of a couple's partnership, from the latest fact on a partner's record. */
function latestKind(person: Readonly<PersonState>, otherId: PersonId): string {
  const facts = (person.pastFacts ?? []).filter(
    (fact) =>
      fact.kind === "family:partner" && fact.facts?.otherPersonId === otherId,
  );
  facts.sort((x, y) => x.date.localeCompare(y.date));
  return String(facts.at(-1)?.facts?.partnershipKind ?? MARRIAGE_KIND);
}

/** The pull toward marrying now rather than moving in first: faith and age. */
function marryFirstPull(api: CoreAPI, person: Readonly<PersonState>): number {
  const faith =
    person.pastFacts?.find((row) => row.kind === PROFILE_FACT_KINDS.faith)
      ?.facts?.group ??
    profileFor(person, api.state.seed, api.state.startedAt)?.faith;
  const religious =
    faith && faith !== "none" ? api.parameter("one") : api.parameter("zero");
  const peak = q(
    api,
    person.looks?.gender === "female"
      ? "partneringPeakAgeWomen"
      : "partneringPeakAgeMen",
  );
  return (
    q(api, "partneringFaithWeight") * religious +
    q(api, "partneringMarryAgeWeight") *
      ((ageOf(api, person) - peak) / q(api, "partneringAgeSpread"))
  );
}

/** Two people unite: a marriage, or a couple moving in together. */
function unite(
  api: CoreAPI,
  pair: [PersonId, PersonId],
  kind: string,
  reasons: Record<string, number>,
): Marriage {
  const core = api.state as CoreState;
  const [a, b] = pair.map((id) => core.people.get(id)!);
  const event = kind === MARRIAGE_KIND ? MARRIED_EVENT : MOVED_IN_EVENT;
  const eventId = `${event}:${api.state.date}:${[...pair].sort().join(":")}`;
  const partnershipId = api.formPartnershipV1(pair, kind, eventId);
  const movedIn =
    a!.householdId === b!.householdId ? undefined : moveIn(api, a!, b!);
  const marriage: Marriage = {
    id: `${partnershipId}:${kind}`,
    partnershipId,
    kind,
    personIds: pair,
    date: api.state.date,
    reasons,
    ...(movedIn ? { movedIn } : {}),
  };
  store(api)
    .table("marriages")
    .put({ ...marriage });
  api.emit({
    id: eventId,
    date: api.state.date,
    kind: event,
    personIds: pair,
    // Their relatives in town hear of it.
    witnessIds: [
      ...new Set(
        [a!, b!].flatMap((who) =>
          [...who.familyIds].filter((id) => {
            const kin = core.people.get(id);
            return (
              !!kin?.alive && kin.tier !== INACTIVE_TIER && !pair.includes(id)
            );
          }),
        ),
      ),
    ].sort(),
    placeId: a!.placeId,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${kind === MARRIAGE_KIND ? "Marriage" : "Moving in together"} of ${pair.join(" and ")}, chosen by both from their closeness, ages, faith and temperaments.`,
      estimatedFrom: STOPGAP,
    },
    // A marriage license is a public record; living together is not.
    publicRecord: kind === MARRIAGE_KIND,
    facts: { partnershipId, partnershipKind: kind },
  });
  return marriage;
}

/** The month's review: each unpartnered adult and the one they are closest to. */
export function monthlyReview(api: CoreAPI): Marriage[] {
  const core = api.state as CoreState;
  api.stopgap(HOMES_STOPGAP);
  const partnered = partneredNow(core);
  const married: Marriage[] = [];
  const ids = [...core.people.keys()].sort();
  for (const id of ids) {
    const person = core.people.get(id);
    if (!eligible(api, person, partnered)) continue;
    // The closest tie to someone who could marry them (not kin).
    let best:
      | { other: Readonly<PersonState>; level: number; via?: PersonId }
      | undefined;
    const consider = (
      other: Readonly<PersonState> | undefined,
      level: number,
      via?: PersonId,
    ) => {
      if (
        !eligible(api, other, partnered) ||
        other.id === id ||
        other.looks?.gender === person.looks?.gender ||
        person.familyIds.has(other.id)
      )
        return;
      if (
        !best ||
        level > best.level ||
        (level === best.level && other.id < best.other.id)
      )
        best = { other, level, ...(via ? { via } : {}) };
    };
    const introduction = q(api, "partneringIntroductionWeight");
    const acquaintance = q(api, "partneringAcquaintanceLevel");
    // How close two people are: their tie if they have one, else someone
    // known by name (a classmate, a coworker) starts as an acquaintance.
    const closeness = (a: Readonly<PersonState>, otherId: PersonId) => {
      const tie = core.relationships.get([a.id, otherId].sort().join(":"));
      if (tie) return tie.kind === "family" ? null : tie.level;
      return a.knownIds.has(otherId) ? acquaintance : null;
    };
    for (const otherId of person.knownIds) {
      const level = closeness(person, otherId);
      if (level !== null) consider(core.people.get(otherId), level);
    }
    // Someone a relative or friend knows, met through them: as close as the
    // two links together, weighed by how often couples meet that way.
    for (const relationshipId of core.relationshipsByPerson.get(id) ?? []) {
      const tie = core.relationships.get(relationshipId);
      if (!tie) continue;
      const friend = core.people.get(
        tie.actorId === id ? tie.otherId : tie.actorId,
      );
      if (!friend?.alive) continue;
      for (const otherId of friend.knownIds) {
        if (otherId === id || person.knownIds.has(otherId)) continue;
        const second = closeness(friend, otherId);
        if (second === null) continue;
        consider(
          core.people.get(otherId),
          introduction * tie.level * second,
          friend.id,
        );
      }
    }
    if (!best) continue;
    const reasons = coupleReasons(api, person, best.other, best.level);
    const attraction = Object.values(reasons).reduce(
      (sum, value) => sum + value,
      api.parameter("zero"),
    );
    // Courting builds month by month with how well the two suit each other;
    // a pair that suits each other less builds slower, or not at all.
    const chosen = best as {
      other: Readonly<PersonState>;
      level: number;
      via?: PersonId;
    };
    const pairKey = [person.id, chosen.other.id].sort().join(":");
    // Two people introduced by a friend meet before they court.
    if (chosen.via && !person.knownIds.has(chosen.other.id))
      api.meet(person.id, chosen.other.id, {
        placeId: person.placeId,
        sourceId: `introduced:${api.state.date}:${chosen.via}:${pairKey}`,
        cause: INTRODUCED_CAUSE,
        hours: q(api, "partneringIntroductionHours"),
      });
    const pull =
      courtshipOf(api, pairKey) +
      Math.max(api.parameter("zero"), attraction) *
        q(api, "partneringCourtshipPerMonth");
    store(api).table("courtships").put({ id: pairKey, value: pull });
    // Both choose, each by their own temperament.
    if (
      !chooses(api, person, pull, best.other.id) ||
      !chooses(api, best.other, pull, person.id)
    )
      continue;
    const pair: [PersonId, PersonId] = [person.id, best.other.id];
    for (const who of pair) partnered.add(who);
    store(api).table("courtships").remove(pairKey);
    // Marry now, or move in together first: both must want to marry now.
    const marryNow = [person, chosen.other].every((who) =>
      chooses(
        api,
        who,
        marryFirstPull(api, who),
        person.id === who.id ? chosen.other.id : person.id,
        "partneringMoveInStayPull",
      ),
    );
    married.push(
      unite(api, pair, marryNow ? MARRIAGE_KIND : COUPLE_KIND, {
        ...reasons,
        courtship: pull,
      }),
    );
  }
  // Couples living together court toward marrying.
  for (const link of core.familyLinks.values()) {
    if (link.kind !== "partner") continue;
    const [a, b] = link.personIds.map((pid) => core.people.get(pid));
    if (!a?.alive || !b?.alive) continue;
    if (latestKind(a, b.id) !== COUPLE_KIND) continue;
    if (
      [a, b].some(
        (who) =>
          who.tier === INACTIVE_TIER ||
          who.id === (api.state as CoreState).playerId,
      )
    )
      continue;
    const key = `wed:${[a.id, b.id].sort().join(":")}`;
    const tie = core.relationships.get([a.id, b.id].sort().join(":"));
    const pull =
      courtshipOf(api, key) +
      (tie?.level ?? q(api, "partneringAcquaintanceLevel")) *
        q(api, "partneringWeddingPerMonth");
    store(api).table("courtships").put({ id: key, value: pull });
    if (!chooses(api, a, pull, b.id) || !chooses(api, b, pull, a.id)) continue;
    store(api).table("courtships").remove(key);
    married.push(unite(api, [a.id, b.id], MARRIAGE_KIND, { courtship: pull }));
  }
  return married;
}

export function marriagesOf(api: CoreAPI): Marriage[] {
  return store(api).table("marriages").rows() as unknown as Marriage[];
}

/** Books the next review on the first day of next month. */
function scheduleReview(api: CoreAPI): void {
  const [year, month] = api.state.date.split("-").map(Number) as [
    number,
    number,
  ];
  const next =
    month === api.parameter("monthsPerYear")
      ? `${year + api.parameter("one")}-01-01`
      : `${year}-${String(month + api.parameter("one")).padStart(2, "0")}-01`;
  api.moduleCalendar(PARTNERING_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "The monthly review of who chooses to marry.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: ["partnering:state"],
  });
}

export const partneringModule: CoreModule = {
  id: PARTNERING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { state: {}, marriages: {}, courtships: {} },
  },
  onDay(api) {
    if (store(api).table("state").get("partnering:state")) return;
    store(api)
      .table("state")
      .put({ id: "partnering:state", openedAt: api.state.date });
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    monthlyReview(api);
    scheduleReview(api);
  },
  reasonProviders: {
    "partnering-couple": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (held === undefined) return undefined;
      return {
        value:
          binding.arguments?.marrying === "true" ? held : api.parameter("zero"),
        sourceIds: [actor.id],
      };
    },
  },
};
