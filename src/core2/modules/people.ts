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
import { REMEMBERED_RECORD_KINDS, rememberEvent } from "../person-life";
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
  pastMovesFor,
  pastMovesHistory,
  pastWorkFor,
  pastWorkHistory,
  pastWorkOf,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  residenceOn,
  schoolHistoryFor,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartModule,
  type PreStartWindow,
  pastHealthFor,
  pastJusticeFor,
  pastPartnersFor,
  pastServiceFor,
  prisonTermOf,
  wholePastOpened,
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
import { openPastTerms } from "./offices";

/** The id a seat's holder is made under: `official:` and their term's id (officials.ts seatOfficial). */
const OFFICIAL_PREFIX = "official:";
import { departureRateFor, livesElsewhere, withinCountyRateFor } from "./moves";
import { coreAPI } from "../state";
import { pastViewShifts, setPastViewShifts } from "./views";
import { pairKey } from "../kernel/ids";
import { bookkeeping } from "../bookkeeping";
import { registerWorldMapPart } from "../snapshot";

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
  CoreState,
  Map<PersonId, { week: number; ids: ReadonlySet<PersonId> }>
>();
// Held for the week, so a save keeps it: a world restored mid-week weighs the
// same ties its original does (core-snapshot-cover-rest).
registerWorldMapPart("core2-people-weekly-contacts", shortlists);
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

/**
 * The people each person has a tie with, read from the person's own set of
 * tie records and kept by that set. Ties are never removed, so a set of the
 * same size holds the same ties; it is read again only once it has grown.
 * A reader asks it instead of building each pair's key.
 */
const tiedSets = new WeakMap<
  ReadonlySet<string>,
  { size: number; ids: ReadonlySet<PersonId> }
>();
const NO_TIES: ReadonlySet<PersonId> = new Set();
function tiedTo(api: CoreAPI, actorId: PersonId): ReadonlySet<PersonId> {
  const keys = api.state.relationshipsByPerson.get(actorId);
  if (!keys) return NO_TIES;
  let row = tiedSets.get(keys);
  if (row?.size !== keys.size) {
    const ids = new Set<PersonId>();
    for (const key of keys) {
      const tie = api.state.relationships.get(key);
      if (tie) ids.add(tie.actorId === actorId ? tie.otherId : tie.actorId);
    }
    row = { size: keys.size, ids };
    tiedSets.set(keys, row);
  }
  return row.ids;
}

// The one reader of a person's relatives, for readers outside the family.
export {
  CLOSENESS,
  closenessBetween,
  familyFactsOf,
  familyRelation,
  type FamilyFact,
} from "../closeness";
// The vote record's id and rows, the key people of the opening and the school
// measure's id and rows, for readers outside the family.
export {
  RECORD_MODULE_ID,
  promisesOf,
  votesOf,
  type VoteRecordRow,
} from "./record";
export { keyPeopleOf } from "../opening-key-people";
// The town's moves, for the screens that count them: counted households'
// move records and a named resident's moved-away event.
export { COUNTED_MOVES_MODULE_ID, countedMoves } from "./counted-moves";
export { MOVED_AWAY_EVENT } from "./moves";
// A person's life as one list, for the screens that tell it (the card, the You screen).
export { lifeOf, type LifeEvent } from "../person-life";
// A relative's letter and a missed family gathering, for the director's letter scene.
export { FAMILY_CONTACT, FAMILY_GATHERING_MISSED } from "./kin-contact";
// A housemate's call for help, for the director's rescue scene.
export { HEALTH_RESCUED } from "./rescue";
export { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "../school-measures";
export { SCHOOL_MEASURE } from "../school-outcomes";
export { isNoncitizen, isUnauthorized } from "../citizenship";
export { SPEECH_MODULE_ID, addressesGivenBy, deliverSpeech } from "./speech";
export { ENCOUNTERS, meetAtMeeting, meetInTalk } from "../encounters";
/** A speech heard, for the director's scenes of a speech. */
export { SPEECH_HEARD } from "./speech";
// Disputes between two people from layoffs and evictions, for the world that opens them.
export { openGrievance } from "./grievance";
// A household's month of income (its open jobs and income awards), for
// readers outside the family.
export { householdIncome } from "./moves";
// Who lives a life elsewhere, and each state's unemployment, for the jobs family.
export { livesElsewhere } from "./moves";
export { stateUnemployment } from "./counted-moves";

export const PEOPLE_MODULE_ID = "core2-people-p15-v1";
const LOOKUP = {
  officeAffordance: "known-office",
  affordances: ["known-office", "public-meeting-place", "known-group"],
} as const;

/**
 * Worlds whose housemates have had their opening ties. Saved with the world,
 * so a restored world doesn't seed its housemates a second time.
 */
const seeded = new WeakMap<CoreState, true>();
registerWorldMapPart("core2-people-home-seeded", seeded);

function shareHomeTime(api: CoreAPI): void {
  const core = api.state;
  const p = (key: string) => api.parameter(key);
  const day = daysBetweenText(core.startedAt, core.date);
  const week = p("daysPerWeek");
  const opening = !seeded.has(core as CoreState);
  if (!opening && (day <= p("zero") || day % week !== p("zero"))) return;
  seeded.set(core as CoreState, true);
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
          // People who live together know each other's names: the household's
          // own record is where they learned them.
          if (!family)
            api.meet(a.id, b.id, {
              placeId: a.placeId,
              sourceId: `household:${household.id}:opening`,
              hours: p("zero"),
              cause: ENCOUNTERS.causes.openingHome,
            });
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
  pastMovesHistory(api, window, history, departureRateFor, withinCountyRateFor);
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

/**
 * The couples among people filled in from the counts, written as the run writes
 * the opening's couples (`partneredRecords`): the counted columns record who shares a
 * home but not who is partnered, so two grown members of one household who are
 * both kin to the same child under the adult age at home are told as a couple
 * (SG-HIST-counted-couples-from-household). Dated by the same rule: the later of the
 * days each was grown and working, no later than the child's birth. No dice.
 */
export function partneredForFilledIn(
  api: CoreAPI,
  people: readonly PersonState[],
  moduleId: string,
): void {
  const core = api.state as CoreState;
  const window = preStartWindowOf(core);
  if (!window || !people.length) return;
  api.stopgap("SG-HIST-counted-couples-from-household");
  const adultYears = api.parameter("votingAge");
  const daysPerYear = api.parameter("daysPerMeanYear");
  const grown = (person: Readonly<PersonState>) =>
    addDays(
      makeIsoDate(person.birthDate),
      Math.round(adultYears * daysPerYear),
    );
  const grownOn = (person: Readonly<PersonState>) => {
    const first = pastWorkOf(core, person.id).find(
      (row) => row.kind === PAST_WORK_SPELL && row.facts.how === "first-job",
    );
    const working = first ? String(first.facts.startedAt) : grown(person);
    return working > grown(person) ? working : grown(person);
  };
  const told = new Set(
    preStartHistory(core, { kind: FAMILY_PARTNERED }).map((row) => row.id),
  );
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  for (const a of people) {
    if (!a.alive || !a.householdId) continue;
    const home = core.households.get(a.householdId);
    if (!home) continue;
    const members = [...home.memberIds]
      .map((id) => core.people.get(id as PersonId))
      .filter((row): row is PersonState => !!row && row.alive);
    if (grown(a) > core.date) continue;
    // A child at home is born once the person was grown: a younger sibling of a
    // grown child is nobody's child here.
    const kids = members.filter(
      (row) =>
        grown(row) > core.date &&
        row.familyIds.has(a.id) &&
        a.familyIds.has(row.id) &&
        row.birthDate >= grown(a),
    );
    // The one other grown member who is kin to every one of their children.
    const mates = members.filter(
      (row) =>
        row.id !== a.id &&
        grown(row) <= core.date &&
        kids.length > 0 &&
        kids.every(
          (kid) => kid.familyIds.has(row.id) && kid.birthDate >= grown(row),
        ),
    );
    if (mates.length !== 1) continue;
    const b = mates[0]!;
    const key = pairKey(a.id, b.id);
    const id = `${FAMILY_PARTNERED}:${key}`;
    if (told.has(id)) continue;
    told.add(id);
    const firstChild = kids.map((kid) => kid.birthDate).sort()[0];
    const both = [grownOn(a), grownOn(b)].sort()[1]!;
    const date = makeIsoDate(
      firstChild && firstChild < both ? firstChild : both,
    );
    if (date < window.from || date > window.through) continue;
    const where = residenceOn(core, a, date);
    rows.push({
      id,
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
          "The household's own records: two grown members, each kin to the same child at home, and their first jobs in the working-life run (src/core2/past-work.ts).",
        estimatedFrom:
          "Who is partnered is read from who shares a home and a child; when, by the later of the days each was grown and working, no later than that child's birth.",
      },
    });
  }
  recordPreStartLater(core, moduleId, rows);
}

/**
 * A person's whole past, once (the owner's ruling, Nov 9, 2026: each person's
 * past covers their whole life, coarse, written only when they are opened or
 * met, a relative living elsewhere included): where they lived, their
 * schools and their working life from their birth to the day before the
 * world's opening, by the passes the run uses
 * with the person's own window. Moves first, since school and work are placed
 * by where they lived. Opening them again does nothing; the rows are the same
 * whenever and however a person is opened (the world's seed and the person's
 * records decide, nothing else).
 */
export function openWholePast(core: CoreState, personId: PersonId): void {
  // An official from another place: the earlier terms of their seat, kept on
  // the offices record by the term their id names (officials.ts seatOfficial),
  // whether or not they are a full person yet.
  if (personId.startsWith(OFFICIAL_PREFIX))
    openPastTerms(coreAPI(core), personId.slice(OFFICIAL_PREFIX.length));
  const person = core.people.get(personId);
  if (!person || !preStartWindowOf(core)) return;
  // A relative living elsewhere is opened the same way, one card at a time;
  // the inactive tier's other people (the counts, the central bank) are not.
  if (person.tier === "husk" && !livesElsewhere(core, person)) return;
  writePast(core, person);
  // What their past did to their view (part 14), and what this past does to
  // the views of their children already opened: a parent's layoff is read
  // once the parent's own past is written, whichever is opened first.
  const api = coreAPI(core);
  pastViewsOf(api, person);
  for (const childId of relativesOf(person, "family:child")) {
    const child = core.people.get(childId as PersonId);
    if (child && wholePastOpened(core, child.id, PAST_PASSES))
      pastViewsOf(api, child);
  }
}

/** The passes every opened past runs (`wholePastOnce`). */
const PAST_PASSES = ["work"] as const;

/** A person's view moved by their own past and their opened parents' (part 14). */
function pastViewsOf(api: CoreAPI, person: PersonState): void {
  const parents = parentIdsOf(person).flatMap((id) => {
    const parent = api.state.people.get(id as PersonId);
    return parent && wholePastOpened(api.state, parent.id, PAST_PASSES)
      ? [parent]
      : [];
  });
  // stopgapId: SG-PEOPLE-past-views-two-events
  // stopgapId: SG-PEOPLE-past-views-full-people-only
  api.stopgap("SG-PEOPLE-past-views-two-events");
  api.stopgap("SG-PEOPLE-past-views-full-people-only");
  setPastViewShifts(api, person.id, pastViewShifts(api, person, parents));
}

/** The relatives a person's records name by one family fact. */
function relativesOf(person: Readonly<PersonState>, kind: string): string[] {
  return (person.pastFacts ?? []).flatMap((fact) =>
    fact.kind === kind && fact.facts?.otherPersonId
      ? [fact.facts.otherPersonId]
      : [],
  );
}

/** The passes that write a person's past, each once (moves first: the others place each year where they lived). */
function writePast(core: CoreState, person: PersonState): void {
  pastMovesFor(
    core,
    [person],
    departureRateFor,
    PEOPLE_MODULE_ID,
    withinCountyRateFor,
  );
  schoolHistoryFor(core, [person]);
  pastWorkFor(core, [person], PEOPLE_MODULE_ID);
  pastPartnersFor(core, [person], PEOPLE_MODULE_ID);
  pastHealthFor(core, [person], PEOPLE_MODULE_ID);
  pastServiceFor(core, [person], PEOPLE_MODULE_ID);
  pastJusticeFor(core, [person], PEOPLE_MODULE_ID, (one) =>
    prisonTermOf(core, one),
  );
}

/**
 * The people the player starts out knowing: their household and everyone they
 * know, opened at the opening. A relative living elsewhere is not: their past
 * is written when their card is first opened, so the opening costs no more.
 */
export function openStartingCircle(core: CoreState): void {
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!player) return;
  const circle = new Set<PersonId>([player.id, ...player.knownIds]);
  for (const id of core.households.get(player.householdId)?.memberIds ?? [])
    circle.add(id as PersonId);
  for (const id of [...circle].sort()) {
    const person = core.people.get(id);
    if (person?.tier !== "husk") openWholePast(core, id);
  }
}

export const PEOPLE_MODULE: PreStartModule = {
  id: PEOPLE_MODULE_ID,
  preStart: { phase: "people", run: peopleHistory },
  // Someone filled in from the counts gets the working life the run would
  // have given them, read against the same economy and openings.
  onFillIn: (api, { memberIds }) => {
    const people = memberIds.flatMap((id) => {
      const person = api.state.people.get(id as PersonId);
      return person ? [person] : [];
    });
    // Their whole past, as anyone's who is opened (moves, school, work).
    for (const person of people)
      openWholePast(api.state as CoreState, person.id);
    // Then the couple among them, from the working lives just written.
    partneredForFilledIn(api, people, PEOPLE_MODULE_ID);
  },
  onDay: (api) => {
    shareHomeTime(api);
  },
  // Part 4: a death reaches the relatives who learn of it as grief.
  // A death reaches the family as grief; every record a person would remember goes on their own list (person-life.ts).
  eventKinds: [
    ...new Set([...GRIEF.deathEventKinds, ...REMEMBERED_RECORD_KINDS]),
  ],
  onEvent: (api, event, learnedBy) => {
    recordDeath(api, event, learnedBy);
    rememberEvent(api.state as CoreState, event);
  },
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
      const ties = tiedTo(api, actor.id);
      for (const id of actor.knownIds) {
        if (!api.state.people.get(id)?.alive) continue;
        const hasTie = ties.has(id);
        if (
          bookkeeping() &&
          hasTie !== api.state.relationships.has(pairKey(actor.id, id))
        )
          throw new Error("A person's kept ties no longer match their ties.");
        if (hasTie) tied.push(id);
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

// Re-exported so other engine families import through this entry, not the file (families guard).
export { currentCloseness } from "../closeness";
export { decisionKinds } from "../trait-decision-table";
export { decisionLean, termOfLean } from "../trait-decisions";
export type { CashJournalPosting } from "../journal";
export { makeCase } from "./speech";
export { areaQuestion } from "./public-action";
// Re-exported so the opening county sample reads them through this entry (families guard).
export { openingTemperaments } from "../opening-personality";
export { namedMembers, townHouseholdSkeleton } from "../town-households";
export { placeEarningsOf } from "../residents";
