/**
 * P15 people module: time spent together at home, and the pull to reach out
 * to someone whose tie is fading.
 *
 * People who share a household spend the ATUS average time in each other's
 * presence; once a week that week's hours are added to their tie. When a
 * person chooses whom to contact, each candidate's pull is the hours of time
 * together their tie has lost since they last met, so close ties that are
 * fading draw contact first and distant relatives draw less.
 *
 * Part 2b: caring for a relative answers the needs of relatives at home (a
 * child by age, a grown relative by health and closeness), so a person cares
 * when they have one to care for and the need is met for the day once they
 * have.
 *
 * Part 4: after a death, relatives grieve (grief.ts); grief pulls toward rest
 * and family and holds back organizing as it fades.
 */
import {
  addDays,
  daysBetween,
  makeIsoDate,
  daysBetweenText,
} from "../kernel/dates";
import {
  CLOSENESS,
  closenessBetween,
  hoursLost,
  openingClosenessHours,
} from "../closeness";
import { careNeedOf } from "./health";
import { GRIEF, griefToday, recordDeath } from "../grief";
import { ENCOUNTERS } from "../encounters";
import { OPENING_KIN } from "../opening-kin";
import {
  PAST_WORK_SPELL,
  pastMovesHistory,
  pastWorkFor,
  pastWorkHistory,
  pastWorkOf,
  residenceOn,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartModule,
  type PreStartWindow,
} from "../past-module";
import type {
  ActOffer,
  CoreAPI,
  CoreState,
  PersonId,
  PersonState,
  Relationship,
} from "../types";
import { offer } from "./life";
import { departureRateFor } from "./moves";
import { pairKey } from "../kernel/ids";

/** The hours a tie has lost, read near or far: the pull toward a visit. */
function tiePull(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  otherId: PersonId,
): { value: number; sourceIds: string[] } | undefined {
  const row = api.state.relationships.get(pairKey(actor.id, otherId));
  const other = api.state.people.get(otherId);
  if (!row || !other) return undefined;
  const near =
    other.placeId === actor.placeId ||
    (other.countyId !== undefined && other.countyId === actor.countyId);
  return {
    value:
      hoursLost(api.state, row) *
      (near ? api.parameter("one") : api.parameter("farKinContactShare")),
    sourceIds: [row.id],
  };
}

/**
 * A person with a cause weighs, each week, only the ties that pull hardest at
 * the week's first look (the hours each has lost, as the chooser reads them);
 * a tie made during the week joins the next week's ranking. Someone with no
 * more ties than the shortlist holds weighs them all.
 */
const shortlists = new WeakMap<
  object,
  Map<PersonId, { week: number; ids: ReadonlySet<PersonId> }>
>();
function weeklyContacts(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  tied: readonly PersonId[],
): readonly PersonId[] {
  const size = api.parameter("causeHolderWeeklyContacts");
  if (tied.length <= size) return tied;
  // stopgapId: SG-PEOPLE-cause-holder-weekly-contacts
  api.stopgap("SG-PEOPLE-cause-holder-weekly-contacts");
  const week = Math.floor(
    daysBetweenText(api.state.startedAt, api.state.date) /
      api.parameter("daysPerWeek"),
  );
  let byPerson = shortlists.get(api.state);
  if (!byPerson) shortlists.set(api.state, (byPerson = new Map()));
  let held = byPerson.get(actor.id);
  if (!held || held.week !== week) {
    const ranked = tied
      .map((id) => ({
        id,
        pull: tiePull(api, actor, id)?.value ?? api.parameter("zero"),
      }))
      .sort(
        (a, b) =>
          b.pull - a.pull ||
          (a.id < b.id ? api.parameter("negativeOne") : api.parameter("one")),
      );
    held = {
      week,
      ids: new Set(ranked.slice(0, size).map((row) => row.id)),
    };
    byPerson.set(actor.id, held);
  }
  const ids = held.ids;
  return tied.filter((id) => ids.has(id));
}

// The one reader of a person's relatives, for readers outside the family.
export { familyFactsOf, familyRelation, type FamilyFact } from "../closeness";
export { isNoncitizen, isUnauthorized } from "../citizenship";
export { addressesGivenBy } from "./speech";

export const PEOPLE_MODULE_ID = "core2-people-p15-v1";
const LOOKUP = {
  officeAffordance: "known-office",
  affordances: ["known-office", "public-meeting-place", "known-group"],
} as const;

const seeded = new WeakSet<object>();

function shareHomeTime(api: CoreAPI): void {
  const core = api.state;
  const p = (key: string) => api.parameter(key);
  const day = daysBetweenText(core.startedAt, core.date);
  const week = p("daysPerWeek");
  const opening = !seeded.has(core);
  if (!opening && (day <= p("zero") || day % week !== p("zero"))) return;
  seeded.add(core);
  api.stopgap(CLOSENESS.stopgapId);
  for (const household of core.households.values()) {
    if (household.memberIds.length < p("two")) continue;
    const members = household.memberIds
      .map((id) => core.people.get(id))
      .filter(
        (person) =>
          person !== undefined &&
          person.alive &&
          person.tier !== OPENING_KIN.kinTier,
      );
    for (let left = p("zero"); left < members.length; left += p("one"))
      for (
        let right = left + p("one");
        right < members.length;
        right += p("one")
      ) {
        const a = members[left]!,
          b = members[right]!;
        const family = a.familyIds.has(b.id);
        // Housemates who are not family start where living together settles.
        if (opening) {
          if (!family && !core.relationships.has(pairKey(a.id, b.id)))
            api.relationship(
              a.id,
              b.id,
              CLOSENESS.householdKind as Relationship["kind"],
              openingClosenessHours(core, a.id, b.id),
              undefined,
              { cause: ENCOUNTERS.causes.openingHome },
            );
          continue;
        }
        const minutes = p(
          family
            ? "householdFamilyMinutesPerDay"
            : "householdOtherMinutesPerDay",
        );
        api.relationship(
          a.id,
          b.id,
          (family
            ? CLOSENESS.familyKind
            : CLOSENESS.householdKind) as Relationship["kind"],
          (minutes / p("minutesPerHour")) * week,
          undefined,
          { cause: ENCOUNTERS.causes.homeTime, sourceId: household.id },
        );
      }
  }
}

/**
 * P15 part 2b: relatives at home who need care, with how much each needs: a
 * newborn needs full care, and a child's need falls with age to none at the
 * age ATUS counts household children to. A grown relative's need follows
 * their health (health.ts `careNeedOf`) and the closeness of the tie.
 */
const dependentsCache = new WeakMap<
  Readonly<PersonState>,
  { date: string; rows: { id: string; need: number }[] }
>();

function dependents(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): { id: string; need: number }[] {
  const cached = dependentsCache.get(actor);
  if (cached?.date === api.state.date) return cached.rows;
  const p = (key: string) => api.parameter(key);
  const rows: { id: string; need: number }[] = [];
  const today = makeIsoDate(api.state.date);
  for (const id of actor.familyIds) {
    const other = api.state.people.get(id);
    if (!other?.alive || other.householdId !== actor.householdId) continue;
    const years =
      daysBetween(makeIsoDate(other.birthDate), today) / p("daysPerMeanYear");
    const childNeed = p("one") - years / p("householdChildAgeYears");
    // A child needs care by age. A grown relative needs it by health, and how
    // much of it this person gives follows how close the two are.
    const need =
      childNeed > p("zero")
        ? childNeed
        : careNeedOf(api.state, id) * closenessBetween(api.state, actor.id, id);
    if (need > p("zero")) rows.push({ id, need });
  }
  dependentsCache.set(actor, { date: api.state.date, rows });
  return rows;
}

/** The relatives a person's records name as their parents. */
function parentIdsOf(person: Readonly<PersonState>): string[] {
  return (person.pastFacts ?? [])
    .filter((fact) =>
      ["family:parent", "family:other-parent"].includes(fact.kind),
    )
    .flatMap((fact) =>
      fact.facts?.otherPersonId ? [fact.facts.otherPersonId] : [],
    );
}

/**
 * Pre-start people pass (M1-14): a full person's own dated records that fall
 * before day one (their birth, where their records put their parents that
 * day, and each dated past fact) are entered in the history, after the
 * moves into the county the moves engine's rule runs, so the world's
 * past can be read by record id, their working life is run through the
 * window (`past-work.ts`), and then the day each couple set up home together
 * (owner, Oct 28, 2026: who was in the household each year). Counted people
 * carry no individual past until they are filled in, and the records' own
 * sources are kept.
 */
function peopleHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
): void {
  const inside = (date: string) =>
    date >= window.from && date <= window.through;
  // Who came to the county and when, first: births, schools, the working
  // life and partnerships are placed by where people lived.
  pastMovesHistory(api, window, history, departureRateFor);
  for (const person of api.state.people.values()) {
    if (person.tier === "husk") continue;
    if (inside(person.birthDate)) {
      const parents = parentIdsOf(person).filter((id) =>
        api.state.people.has(id as PersonId),
      );
      history.record({
        id: `person-history:${person.id}:birth`,
        date: makeIsoDate(person.birthDate),
        kind: "person.birth",
        placeId: residenceOn(api.state, person, person.birthDate).placeId,
        personIds: [person.id],
        facts: {
          personId: person.id,
          ...(parents.length ? { parentIds: parents.join(" ") } : {}),
        },
        publicRecord: true,
        source: person.source,
      });
    }
    for (const fact of person.pastFacts ?? [])
      if (inside(fact.date))
        history.record({
          id: `person-history:${person.id}:${fact.id}`,
          date: makeIsoDate(fact.date),
          kind: `person.${fact.kind}`,
          placeId: person.placeId,
          personIds: [person.id],
          facts: { personId: person.id, ...(fact.facts ?? {}) },
          publicRecord: false,
          source: fact.source,
        });
  }
  // The working life from school to day one is run, not copied (owner,
  // Oct 27, 2026: history before the start is simulated).
  pastWorkHistory(api, window, history);
  for (const row of partneredRecords(api, window)) history.record(row);
}

export const FAMILY_PARTNERED = "family.partnered";

/**
 * The day each couple of the opening set up home together, from their own
 * records (no draw): the later of the days each was grown and working (their
 * first job after school in the working-life run, and never before the adult
 * age), and no later than the birth of their first child together. Written
 * as the same record the people engine writes when two people partner in
 * play, where their records put them that day.
 */
function partneredRecords(
  api: CoreAPI,
  window: PreStartWindow,
): Omit<HistoryRecord, "moduleId">[] {
  const core = api.state as CoreState;
  const adultYears = api.parameter("votingAge");
  const daysPerYear = api.parameter("daysPerMeanYear");
  const grownOn = (person: Readonly<PersonState>) => {
    const adult = addDays(
      makeIsoDate(person.birthDate),
      Math.round(adultYears * daysPerYear),
    );
    const first = pastWorkOf(core, person.id).find(
      (row) => row.kind === PAST_WORK_SPELL && row.facts.how === "first-job",
    );
    const working = first ? String(first.facts.startedAt) : adult;
    return working > adult ? working : adult;
  };
  const children = (person: Readonly<PersonState>) =>
    new Set(
      (person.pastFacts ?? [])
        .filter((fact) => fact.kind === "family:child")
        .flatMap((fact) =>
          fact.facts?.otherPersonId ? [fact.facts.otherPersonId] : [],
        ),
    );
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  const told = new Set<string>();
  for (const a of core.people.values()) {
    if (a.tier === "husk" || !a.alive) continue;
    for (const fact of a.pastFacts ?? []) {
      if (fact.kind !== "family:partner") continue;
      const b = core.people.get(fact.facts?.otherPersonId as PersonId);
      if (!b || b.tier === "husk" || !b.alive) continue;
      const key = pairKey(a.id, b.id);
      if (told.has(key)) continue;
      told.add(key);
      const theirs = children(b);
      const firstChild = [...children(a)]
        .filter((id) => theirs.has(id))
        .map((id) => core.people.get(id as PersonId)?.birthDate)
        .filter((date): date is string => !!date)
        .sort()[0];
      const both = [grownOn(a), grownOn(b)].sort()[1]!;
      const date = makeIsoDate(
        firstChild && firstChild < both ? firstChild : both,
      );
      if (date < window.from || date > window.through) continue;
      const where = residenceOn(core, a, date);
      rows.push({
        id: `${FAMILY_PARTNERED}:${key}`,
        date,
        kind: FAMILY_PARTNERED,
        placeId: where.placeId,
        personIds: [a.id, b.id].sort() as PersonId[],
        facts: {
          householdId: a.householdId,
          residenceRecordId: where.recordId,
          ...(firstChild ? { firstChildBorn: firstChild } : {}),
        },
        publicRecord: false,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation:
            "The partners' own records: their first jobs in the working-life run (src/core2/past-work.ts), the adult age and their first child's birth.",
          estimatedFrom:
            "The later of the days each partner was grown and working, no later than their first child together.",
        },
      });
    }
  }
  return rows;
}

export const PEOPLE_MODULE: PreStartModule = {
  id: PEOPLE_MODULE_ID,
  preStart: { phase: "people", run: peopleHistory },
  // Someone filled in from the counts gets the working life the run would
  // have given them, read against the same economy and openings.
  onFillIn: (api, { memberIds }) =>
    pastWorkFor(
      api.state as CoreState,
      memberIds.flatMap((id) => {
        const person = api.state.people.get(id as PersonId);
        return person &&
          !pastWorkOf(api.state as CoreState, id as PersonId).length
          ? [person]
          : [];
      }),
      PEOPLE_MODULE_ID,
    ),
  onDay: (api) => {
    shareHomeTime(api);
  },
  // Part 4: a death reaches the relatives who learn of it as grief.
  eventKinds: GRIEF.deathEventKinds,
  onEvent: (api, event, learnedBy) => recordDeath(api, event, learnedBy),
  needEvaluators: {
    // The children at home need care each day; the act meets it for the day.
    "dependent-care": (api, actor) =>
      Math.min(
        api.parameter("one"),
        dependents(api, actor).reduce(
          (sum, row) => sum + row.need,
          api.parameter("zero"),
        ),
      ),
  },
  offerProviders: {
    "dependent-at-home": (api, actor, action) =>
      dependents(api, actor).map((row) => offer(api, actor, action, row.id)),
    // P15 part 4: looking something up serves a cause's need to know where
    // to go next: an office to approach (one with staff), a place to meet or
    // a group to join. A person with a cause is offered the institutions of
    // each kind they know none of in their town and county; once they know
    // one of a kind, look-ups of that kind stop pulling.
    "office-directory": (api, actor, action) => {
      if (!actor.drives.size) return [];
      const unknown = new Map<string, string[]>();
      const known = new Set<string>();
      for (const placeId of new Set([
        actor.placeId,
        ...(actor.countyId ? [actor.countyId] : []),
      ]))
        for (const id of api.state.publicOrganizationsByPlace.get(placeId) ??
          []) {
          const row = api.state.publicOrganizations.get(id)!;
          for (const kind of LOOKUP.affordances) {
            if (!row.affordances?.includes(kind)) continue;
            if (kind === LOOKUP.officeAffordance && !row.staff?.length)
              continue;
            if (api.knows(actor.id, `organization:${id}:public`))
              known.add(kind);
            else unknown.set(kind, [...(unknown.get(kind) ?? []), id]);
          }
        }
      const ids = new Set<string>();
      for (const [kind, rows] of unknown)
        if (!known.has(kind)) for (const id of rows) ids.add(id);
      return [...ids].map((id) => offer(api, actor, action, id));
    },
    // Everyone the person knows and has a tie with, plus one person they know
    // without a tie yet. Untied offers all score alike and the chooser breaks
    // ties by the lowest key, so the lowest-id untied person stands for them all.
    // A person with a cause weighs only the week's shortlist of their ties.
    "contact-candidate": (api, actor, action) => {
      const out: ActOffer[] = [];
      const tied: PersonId[] = [];
      let untied: string | undefined;
      for (const id of actor.knownIds) {
        if (!api.state.people.get(id)?.alive) continue;
        if (api.state.relationships.has(pairKey(actor.id, id))) tied.push(id);
        else if (untied === undefined || id < untied) untied = id;
      }
      for (const id of actor.drives.size
        ? weeklyContacts(api, actor, tied)
        : tied)
        out.push(offer(api, actor, action, id));
      if (untied !== undefined) out.push(offer(api, actor, action, untied));
      return out;
    },
  },
  reasonProviders: {
    // Grief pulls toward rest and toward family, and holds back organizing;
    // a visit to someone outside the family draws no pull from it.
    grief: (api, actor, offer) => {
      const { grief, sourceIds } = griefToday(api, actor);
      if (grief <= api.parameter("zero")) return undefined;
      const target = api.state.people.get(offer.targetId);
      if (target && target.id !== actor.id && !actor.familyIds.has(target.id))
        return undefined;
      return { value: grief, sourceIds };
    },
    "tie-fading": (api, actor, offer) => tiePull(api, actor, offer.targetId),
  },
};
