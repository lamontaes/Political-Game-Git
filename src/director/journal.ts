import {
  corePlaceByJurisdictionId,
  coreStateKeyOfPlaceholderId,
  coreStateName,
} from "../core2/place-lookup";
import {
  familyFactsOf,
  FAMILY_PARTNERED,
  lifeOf,
  type LifeEvent,
} from "../core2/modules/people";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import journalLife from "./data/journal-life.json" with { type: "json" };
import JOURNAL_OUTLINE from "./data/journal-outline.json" with { type: "json" };
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { PLACE_PRICES_MODULE_ID } from "../core2/business-module-id";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { personWorkOf } from "../core2/person-work";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../core2/modules/legislature";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import {
  MEETINGS_MODULE_ID,
  type TownHallRow,
} from "../core2/modules/meetings";
import { PRESS_MODULE_ID, type InterviewRow } from "../core2/modules/press";
import type { LawRowInput } from "../core2/laws-starting";
import {
  billNumberAndTitle,
  billTitleOf,
  billTitleSaid,
} from "../english/bill-names";
import { topicInSentence } from "../english/policy-names";
import { questionAbout, questionTo } from "../english/question-names";
import { VIEWS_MODULE_ID, stancesOf, viewOf } from "../core2/modules/views";
import type { CoreState, IsoDate, PersonId, PersonState } from "../core2/types";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../core2/kernel/dates";
import {
  billNumberName,
  framedByAge,
  journalBackdrop,
  JOURNAL_WORDS,
  journalEntry,
  journalRows,
  possessivePronoun,
  relationPhrase,
  saysOffice,
  seatSaid,
  employerSaid,
  withArticle,
  wordJournalLine,
  type Fact,
  type JournalMove,
  type JournalWords,
  type JournalWorded,
  type MemoirField,
} from "../english/journal-words";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { comingOfAgeOn } from "./coming-of-age";
import type { RACE_MARGINS } from "../english/mined/journal-bank";
import { properName, spokenDate, stateInSentence } from "./words";
import { graduationResults, schoolResult } from "./school";
import {
  PAST_WORK_OUT,
  PAST_WORK_SPELL,
  SCHOOL_STARTED,
  heldSinceRecord,
  pastWorkOf,
  preStartHistory,
  schoolsAttended,
  sharedHistory,
} from "../core2/past";
import { pastParameter } from "../core2/past-module";
import { moneySaid } from "../english/count-words";

import { spanSaid } from "../english/span-words";
import type { Moment, PersonLedger } from "./types";
import {
  OFFICE_DAY_MODULE_ID,
  type OfficeActRow,
} from "../core2/modules/office-day";

/** The school year's end, as the director keeps its moment. */
const SCHOOL_FINISHED = "event:school.finished";
/** The facts that say when, not what: two tellings differing only in these are one. */
/** The facts that say how old the person was, which an age frame has already said. */
const AGE_FACTS = new Set(["age", "age-then"]);
const TIME_FACTS = new Set(["age", "span", "when", "held"]);
const zero = P.zero;
const one = P.one;

/** The events of a life the Journal tells as its rows, by the event's pair (src/director/data/journal-life.json). */
const LIFE_PAIRS = journalLife.pairs as readonly {
  life: string;
  what: string;
  record?: string;
  kind: string;
}[];

export interface JournalLine {
  id: string;
  date: IsoDate;
  text: string;
  momentIds: readonly string[];
  /** The kind of each moment the line tells (its row's cause kind), in the order told. */
  kinds?: readonly string[];
  sourceRecordIds: readonly string[];
}

export interface JournalChapter {
  key: string;
  title: string;
  from: IsoDate;
  through: IsoDate;
  lines: JournalLine[];
}

/** A recorded fact the line may copy; ids are core record ids. */
type Facts = Record<string, Fact>;

/** What the journal reads of a moment: a director moment, or an act the player kept in office. */
type JournalMoment = Pick<
  Moment,
  | "id"
  | "date"
  | "causeId"
  | "causeFactId"
  | "causeKind"
  | "counterpartIds"
  | "selfNamed"
  | "hindsight"
  | "impact"
  | "echoes"
> & {
  readonly actFacts?: Facts;
  /** Moments of one beat are told together, as one memoir entry. */
  readonly beat?: string;
};

/**
 * A bill's real name, from the legislature's own record of it, as a
 * sentence says it: "the Wage Floor Increase Act". Undefined where the bill
 * is not on record or has no name, and the line that would name it is left
 * out.
 */
export function billName(
  core: Readonly<CoreState>,
  billId: string | undefined,
  /** Said with its number first ("HB 9, the Income Tax Act"), as a scene about it names it. */
  withNumber = false,
): string | undefined {
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const api = coreAPI(core as CoreState);
  const row = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  const title = row ? billTitleOf(row)?.title : undefined;
  if (!title) return undefined;
  return withNumber && row?.number
    ? billNumberAndTitle(row.number, row.form.kind, title)
    : billTitleSaid(title);
}

/**
 * A law's name, from the bill that enacted it, as a sentence says it ("the
 * Bottle Deposit Act"), with the records it rests on. Undefined for a law no
 * bill enacted, and the line that would name it is left out.
 */
export function lawName(
  core: Readonly<CoreState>,
  lawId: string | undefined,
): { text: string; recordIds: string[] } | undefined {
  if (!lawId || !core.modules.has(LAWS_MODULE_ID)) return undefined;
  const law = coreAPI(core as CoreState)
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(lawId) as unknown as LawRowInput | undefined;
  const billId = law?.terms?.enactedByBill;
  const text = typeof billId === "string" ? billName(core, billId) : undefined;
  return text ? { text, recordIds: [lawId, billId as string] } : undefined;
}

/**
 * A law no bill enacted (a starting law), by what it is about ("electricity
 * and the grid"), from its own record: what the line says in place of a name.
 */
export function lawTopic(
  core: Readonly<CoreState>,
  lawId: string | undefined,
): { text: string; recordIds: string[] } | undefined {
  if (!lawId || !core.modules.has(LAWS_MODULE_ID)) return undefined;
  const law = coreAPI(core as CoreState)
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(lawId) as unknown as LawRowInput | undefined;
  const text = law ? topicInSentence(law.series) : null;
  return text ? { text, recordIds: [lawId] } : undefined;
}

/**
 * How a race was decided, from its result record's totals: "alone" when one
 * candidate stood, "close" or "wide" by the winner's lead over the runner-up
 * as a share of the votes cast, and "middle" between them or when the totals
 * are not on record, so no line claims a margin the record does not show.
 */
function raceMargin(
  core: Readonly<CoreState>,
  resultId: string,
): (typeof RACE_MARGINS)[number] {
  let votes: number[] = [];
  try {
    votes = Object.values(
      JSON.parse(String(core.durableLog.get(resultId)?.facts?.totals ?? "{}")),
    )
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => b - a);
  } catch {
    votes = [];
  }
  if (votes.length === one) return "alone";
  const cast = votes.reduce((sum, count) => sum + count, zero);
  if (votes.length < P.two || !(cast > zero)) return "middle";
  const lead = (votes[zero]! - votes[one]!) / cast;
  const { journalRaceCloseMargin, journalRaceWideMargin } =
    DEFAULT_DIRECTOR_DATA.parameters;
  if (lead <= journalRaceCloseMargin!.value) return "close";
  if (lead >= journalRaceWideMargin!.value) return "wide";
  return "middle";
}

/**
 * An employer's name as the person says it in a sentence, by the kind of its
 * record ("the Town of Island Falls", "Neal's Market"), citing the records
 * that name it.
 */
function employerName(
  core: Readonly<CoreState>,
  organizationId: string | undefined,
  ...recordIds: string[]
): Fact | undefined {
  const org = organizationId
    ? core.organizations.get(organizationId)
    : undefined;
  // The outside buyers and sellers are the market's stand-in for work out of
  // town, never an employer to name (skill words-engine).
  return org && org.kind !== "outside-market"
    ? {
        text: employerSaid(properName(org.name), org),
        sourceRecordIds: [...recordIds, org.id],
      }
    : undefined;
}

/** A list whose items may hold "and" themselves: a comma before the last "and". */
function listOfParts(items: readonly string[]): string {
  return items.some((item) => / and /.test(item)) && items.length > one
    ? `${items.slice(zero, -one).join(", ")}, and ${items.at(-one)}`
    : listOf(items);
}

function listOf(items: readonly string[]): string {
  return items.length < P.two + one
    ? items.join(" and ")
    : `${items.slice(zero, -one).join(", ")} and ${items.at(-one)}`;
}

/**
 * Which of the family's stories a parent or sibling belongs to, by the
 * household each is in and their birth against the person's own.
 */
function familyCategory(
  person: PersonState,
  relative: PersonState,
  parent: boolean,
): string {
  if (parent)
    return relative.householdId === person.householdId
      ? "household:raised-by"
      : "household:parent-apart";
  const against = relative.birthDate.localeCompare(person.birthDate);
  return against > zero
    ? "household:sibling-born"
    : against < zero
      ? "household:sibling-older"
      : "household:sibling-twin";
}

/**
 * A place as a person names it: the town, county or territory, or the state
 * for someone whose records put them elsewhere in it (the wider population's
 * state-level households).
 */
export function placeLabel(placeId: string | undefined): string | null {
  if (!placeId) return null;
  const place = corePlaceByJurisdictionId(placeId as never);
  if (place) return place.displayName;
  const state = coreStateKeyOfPlaceholderId(placeId);
  const name = state ? coreStateName(state.slice("US-".length)) : null;
  return name ? stateInSentence(name) : null;
}

/**
 * The household's roots, the part of a life the list has no pair for (gaps of
 * docs/design/journal-on-the-life-list.md): the day their parents set up home,
 * a parent's new job they were old enough to remember, what the household's
 * earners do now, and each parent and sibling the family records name.
 * stopgapId: SG-DIRECTOR-journal-life-gaps (the list carries no parent, sibling,
 * parents' partnership or parent's work event; they stay on the family facts
 * and the working-life run until it does). Each moment cites its record's id;
 * the place is named from the place records, and a person only the writer knows
 * by name is skipped.
 */
function householdMoments(
  core: Readonly<CoreState>,
  person: PersonState,
): JournalMoment[] {
  const history = (kind: string, personId: PersonId) =>
    preStartHistory(core as CoreState, { kind, personId });
  // Each relative once, from the first family fact that names them.
  const toldOf = new Set<string>();
  const parentIds = new Set(
    (person.pastFacts ?? [])
      .filter((fact) =>
        ["family:parent", "family:other-parent"].includes(fact.kind),
      )
      .map((fact) => fact.facts?.otherPersonId),
  );
  // The parents or siblings of one story, told together as one moment.
  const familyGroups = new Map<string, PersonId[]>();
  for (const fact of person.pastFacts ?? []) {
    const id = fact.facts?.otherPersonId as PersonId | undefined;
    const kin = id ? core.people.get(id) : undefined;
    const parent = ["family:parent", "family:other-parent"].includes(fact.kind);
    if (!kin?.alive || !(parent || fact.kind === "family:sibling")) continue;
    const category = familyCategory(person, kin, parent);
    const group = familyGroups.get(category) ?? [];
    if (!group.includes(id!)) group.push(id!);
    familyGroups.set(category, group);
  }
  const bornOn = makeIsoDate(person.birthDate);
  const base = (id: string, date: string) => ({
    id,
    date: date as IsoDate,
    causeId: id,
    causeFactId: id,
    hindsight: zero,
    impact: zero,
    echoes: [] as Moment["echoes"],
  });
  const placeOf = (placeId: string | undefined, recordId: string): Facts => {
    const text = placeLabel(placeId);
    return text ? { place: { text, sourceRecordIds: [recordId] } } : {};
  };
  const moments: JournalMoment[] = [];
  // Each parent from the day the person was born: those who raised them at
  // home together, or the one who lived apart, by the household each is in.
  // Brothers and sisters by their birth against the person's own, older
  // ones together and younger ones together.
  for (const fact of person.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    const relative = otherId ? core.people.get(otherId) : undefined;
    const parent = ["family:parent", "family:other-parent"].includes(fact.kind);
    if (
      !relative?.alive ||
      !(parent || fact.kind === "family:sibling") ||
      toldOf.has(relative.id)
    )
      continue;
    const category = familyCategory(person, relative, parent);
    const group = familyGroups.get(category) ?? [];
    group.forEach((id) => toldOf.add(id));
    const born = relative.birthDate > bornOn ? relative.birthDate : bornOn;
    moments.push({
      ...base(fact.id, fact.kind === "family:sibling" ? born : bornOn),
      // Several brothers and sisters have their own wordings (plural verbs).
      causeKind:
        group.length > one && category.startsWith("household:sibling-")
          ? category.replace("sibling-", "siblings-")
          : category,
      counterpartIds: group,
      beat: "roots",
    });
  }
  // The day their parents set up home, told to their child.
  const parents = [...parentIds].filter((id): id is string => !!id);
  const parentsMet = parents.length
    ? history(FAMILY_PARTNERED, parents[zero] as PersonId).find((row) =>
        parents.every((id) => row.personIds?.includes(id as PersonId)),
      )
    : undefined;
  if (parentsMet) {
    const actFacts = placeOf(parentsMet.placeId, parentsMet.id);
    if (actFacts.place)
      moments.push({
        ...base(parentsMet.id, parentsMet.date),
        causeKind: "household:parents-met:where-they-lived",
        counterpartIds: [],
        actFacts,
        beat: "roots",
      });
  }
  // The working-life run's spells the person was old enough to remember and
  // still a child at home for: a relative's start or move is told inside the
  // one sentence about that relative's work (lead, Nov 11: "one sentence per
  // person").
  const remembers = addDays(
    bornOn,
    Math.round(
      pastParameter(null, "pastEarliestMemoryAge") * P.daysPerMeanYear,
    ),
  );
  const grown = addDays(bornOn, Math.round(P.votingAge * P.daysPerMeanYear));
  // What each earner in the household does for work now: the job they held
  // on day one and each office they serve in, from the one reader the card
  // and Travel tell it from (`personWorkOf`), so the journal never says a
  // sales job where the card says commissioner. The parents first, then the
  // brothers, sisters and partner.
  const household = core.households.get(person.householdId);
  const earners = [...(household?.memberIds ?? [])].sort(
    (a, b) =>
      Number(!parentIds.has(a)) - Number(!parentIds.has(b)) ||
      String(core.people.get(a)?.birthDate ?? "").localeCompare(
        String(core.people.get(b)?.birthDate ?? ""),
      ),
  );
  const lastDay = addDays(makeIsoDate(core.startedAt), -one);
  for (const [at, id] of earners.entries()) {
    const earner = core.people.get(id);
    if (!earner?.alive || id === person.id) continue;
    const work = personWorkOf(core, earner.id);
    // One sentence per person, in the household's order (parents first,
    // then by age): the id leads with that place so the entry keeps it.
    const order = `livelihood:${String(at).padStart(P.two, "0")}:${person.id}`;
    // An office is said the way people say it (lead, Nov 11): a seat on a
    // body is "sits on the Nelson City Council"; any other office is "serves
    // as county clerk for the County of Nuckolls". A job held beside it joins
    // the same sentence ("... and works as a janitor at ..."): one sentence
    // per person.
    const office = work.offices[zero];
    const job = work.job ? core.jobs.get(work.job.id) : undefined;
    if (office) {
      const ids = [office.termId, office.officeId];
      const side = job
        ? employerName(core, job.organizationId, job.id)
        : undefined;
      moments.push({
        ...base(`${order}:${office.termId}`, lastDay),
        causeId: office.termId,
        causeFactId: office.termId,
        // A fact the record does not hold picks the wording that does
        // without it: an office with no government on record, a job with no
        // employer on record.
        causeKind: [
          "household:livelihood:",
          office.bodyName ? "seat" : "office",
          !office.bodyName && !office.governmentName ? "-plain" : "",
          // Work for the outside buyers names no workplace: only a body
          // seat or a plain office says it without one.
          job && (side || office.bodyName || !office.governmentName)
            ? "-and-job"
            : "",
          job && !side && (office.bodyName || !office.governmentName)
            ? "-plain"
            : "",
        ].join(""),
        counterpartIds: [earner.id],
        beat: "work",
        actFacts: {
          ...(office.bodyName
            ? {
                body: {
                  text: seatSaid({
                    title: office.title,
                    seats: office.seats,
                    bodyName: properName(office.bodyName),
                  }),
                  sourceRecordIds: ids,
                },
              }
            : {
                office: {
                  text: seatSaid({ title: office.title }),
                  sourceRecordIds: ids,
                },
                ...(office.governmentName
                  ? {
                      employer: {
                        // The government itself ("the County of Nuckolls").
                        text: employerSaid(properName(office.governmentName), {
                          kind: "government-treasury",
                        }),
                        sourceRecordIds: ids,
                      },
                    }
                  : {}),
              }),
          ...(job
            ? {
                job: {
                  text: withArticle(job.title),
                  sourceRecordIds: [job.id],
                },
                ...(side ? { workplace: side } : {}),
              }
            : {}),
        },
      });
      continue;
    }
    if (!job) continue;
    const held = heldSinceRecord(core as CoreState, earner.id, job.id);
    const employer = employerName(core, job.organizationId, job.id);
    const cause = held?.id ?? job.id;
    // The last spell they started while the person was a child at home who
    // remembers it: the start of the job they hold ("started at ... when I
    // was 15 and still works there"), or the move to it from the one before.
    const spells = pastWorkOf(core as CoreState, earner.id)
      .filter((row) => row.kind === PAST_WORK_SPELL)
      .sort((a, b) =>
        String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
      );
    const last = spells.at(-one);
    const startedAt = String(last?.facts.startedAt ?? "");
    const remembered =
      !!last &&
      !!employer &&
      startedAt >= remembers &&
      startedAt < grown &&
      String(last.facts.organizationId) === job.organizationId;
    const before = remembered ? spells.at(-P.two) : undefined;
    const from = before?.facts.organizationId
      ? employerName(core, String(before.facts.organizationId), before.id)
      : undefined;
    const moved = !!from && from.text !== employer?.text;
    moments.push({
      ...base(`${order}:${cause}`, lastDay),
      causeId: cause,
      causeFactId: cause,
      // A job whose employer is on record is said with it; the plain words
      // are for a job with no employer on record.
      causeKind: remembered
        ? moved
          ? "household:livelihood:moved"
          : "household:livelihood:since"
        : employer
          ? "household:livelihood:at"
          : "household:livelihood",
      counterpartIds: [earner.id],
      beat: "work",
      actFacts: {
        job: { text: withArticle(job.title), sourceRecordIds: [job.id] },
        ...(employer ? { employer } : {}),
        ...(remembered
          ? {
              age: {
                text: String(ageOnDate(bornOn, makeIsoDate(startedAt))),
                sourceRecordIds: [last!.id, person.id],
              },
            }
          : {}),
        ...(moved ? { from: from! } : {}),
      },
    });
  }
  return moments;
}

/**
 * A person's life as the Journal tells it, read from the one list the person
 * card and the You screen read (`lifeOf`; docs/design/journal-on-the-life-list.md):
 * where they were born, the day they and their partner set up home, the day
 * they came to the county, the first school and the high school, the working
 * life before the start (the first job after school, each job lost and the
 * time out of work after it, each move to another employer, the reason on
 * record someone stopped), and every event of the table (src/director/data/journal-life.json)
 * the list holds, in play or before: a job lost, a child born, a move, a death in
 * the family, an illness, a home, a business, a race. The job held on day one is
 * told by the line that leads into it. Each moment cites the id of the event it
 * stands on. The director's moment for the same record, when it has one, lends
 * the entry its weight; the entry exists because the list holds the event.
 */
function lifeMoments(
  core: Readonly<CoreState>,
  person: PersonState,
  book: PersonLedger,
  life: readonly LifeEvent[],
): {
  moments: JournalMoment[];
  /** The director's moments the list now tells, as `<kind>|<event id>`. */
  told: Set<string>;
  /** The days of a move the list tells; the director's own `moved` moment of the day is not told as well. */
  movedDays: Set<string>;
} {
  const told = new Set<string>();
  const movedDays = new Set<string>();
  const base = (id: string, date: string) => ({
    id,
    date: date as IsoDate,
    causeId: id,
    causeFactId: id,
    hindsight: zero,
    impact: zero,
    echoes: [] as Moment["echoes"],
  });
  const moments: JournalMoment[] = [];
  const place = (placeId: string | undefined, recordId: string): Facts => {
    const text = placeLabel(placeId);
    return text ? { place: { text, sourceRecordIds: [recordId] } } : {};
  };
  // Where they were born, where the run's record puts their family that day:
  // the story starts there (owner, Oct 27: "written like a story from birth").
  for (const event of life) {
    if (event.life !== "born" || event.from !== "past") continue;
    const actFacts = place(event.placeId, event.id);
    if (actFacts.place)
      moments.push({
        ...base(event.id, event.date),
        causeKind: "person.birth",
        counterpartIds: [],
        selfNamed: true,
        actFacts,
        beat: "roots",
      });
  }
  // The day they and their partner set up home, where their records put them then.
  for (const event of life) {
    if (event.life !== "partner" || event.what !== "partnered") continue;
    if (event.from !== "past") continue;
    const otherId = event.withIds[zero];
    const actFacts = place(event.placeId, event.id);
    if (otherId && actFacts.place)
      moments.push({
        ...base(event.id, event.date),
        causeKind: "household:partners-met",
        counterpartIds: [otherId],
        actFacts,
      });
  }
  // The day they came to the county, from the moves engine's run before the
  // start (told as their own move, to where they live now).
  for (const event of life)
    if (
      event.life === "move" &&
      event.what === "moved-in" &&
      event.from === "past"
    )
      moments.push({
        ...base(event.id, event.date),
        causeKind: "moved",
        counterpartIds: [],
        selfNamed: true,
      });
  // The first school they attended, and the high school when it was another
  // school, told by the school's own record ("When I was 5, I started at
  // ..."); a school with no record of its own goes unnamed and untold.
  const schools = life
    .filter(
      (event) =>
        event.life === "school" &&
        event.what === "started" &&
        event.from === "past" &&
        core.organizations.get(String(event.facts?.schoolId))?.name,
    )
    .map((event) => ({
      event,
      schoolId: String(event.facts?.schoolId),
      stage: String(event.facts?.stage),
      name: core.organizations.get(String(event.facts?.schoolId))!.name,
    }));
  const first = schools.find((row) => row.stage === "elementary");
  const high = schools.find(
    (row) => row.stage === "high" && row.schoolId !== first?.schoolId,
  );
  for (const school of [first, high])
    if (school && school.event.date < core.startedAt)
      moments.push({
        ...base(school.event.id, school.event.date),
        causeKind: `household:school-started:${school.stage}`,
        counterpartIds: [],
        actFacts: {
          school: {
            text: properName(school.name),
            sourceRecordIds: [school.event.id, school.schoolId],
          },
        },
      });
  moments.push(...workMoments(core, life));
  // The rest of the table: the director's moment for the same record lends its weight.
  const weighed = new Map(
    book.moments.map((moment) => [
      `${moment.causeKind}|${moment.causeFactId ?? moment.causeId}`,
      moment,
    ]),
  );
  // A move the household made is the director's `moved` moment on its day (the household changed).
  const movedOn = new Map(
    book.moments
      .filter((moment) => moment.causeKind === "moved")
      .map((moment) => [moment.date, moment]),
  );
  for (const [event, pair] of LIFE_PAIRS.flatMap((row) =>
    life
      .filter(
        (event) =>
          row.life === event.life &&
          row.what === event.what &&
          (row.record === undefined || row.record === event.record),
      )
      .map((event) => [event, row] as const),
  )) {
    const kept =
      pair.kind === "moved"
        ? movedOn.get(event.date)
        : weighed.get(`${pair.kind}|${event.id}`);
    told.add(`${pair.kind}|${event.id}`);
    if (pair.kind === "moved") movedDays.add(event.date);
    // A built fact is cited through the person who holds it, as the director cites it.
    const own = event.from === "built";
    moments.push({
      id:
        kept?.id ?? `${person.id}:${event.date}:life:${event.id}:${pair.kind}`,
      date: event.date,
      causeId: own ? person.id : event.id,
      ...(own ? { causeFactId: event.id } : {}),
      causeKind: pair.kind,
      counterpartIds: kept?.counterpartIds ?? event.withIds,
      ...((
        kept
          ? kept.selfNamed
          : core.durableLog.get(event.id)?.personIds.includes(person.id)
      )
        ? { selfNamed: true as const }
        : {}),
      hindsight: kept?.hindsight ?? zero,
      impact: kept?.impact ?? zero,
      echoes: kept?.echoes ?? [],
    });
  }
  return { moments, told, movedDays };
}

/**
 * The working life before the start and the jobs lost, from the list's work
 * events: the first job after school, each job lost and the time out of work
 * after it, each move to another employer and the reason on record someone
 * stopped. The job held on day one is told by the line that leads into it.
 */
function workMoments(
  core: Readonly<CoreState>,
  life: readonly LifeEvent[],
): JournalMoment[] {
  type Row = Pick<LifeEvent, "id" | "placeId"> & {
    kind: string;
    facts: Readonly<Record<string, string>>;
  };
  const records: Row[] = life
    .filter(
      (event) =>
        event.life === "work" &&
        (event.record === PAST_WORK_SPELL || event.record === PAST_WORK_OUT),
    )
    .map((event) => ({
      id: event.id,
      kind: event.record,
      ...(event.placeId ? { placeId: event.placeId } : {}),
      facts: event.facts ?? {},
    }));
  const employer = (row: Row | undefined) => {
    return row?.facts.organizationId
      ? employerName(core, String(row.facts.organizationId), row.id)
      : undefined;
  };
  const spells = records
    .filter((row) => row.kind === PAST_WORK_SPELL)
    .sort((a, b) =>
      String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
    );
  const outAfter = new Map(
    records
      .filter((row) => row.kind === PAST_WORK_OUT && row.facts.causeRecordId)
      .map((row) => [String(row.facts.causeRecordId), row]),
  );
  // What a job paid an hour, as people round it, from the spell's own record.
  const paid = (row: Row): Facts =>
    Number(row.facts.hourlyMinor) > zero
      ? {
          wage: {
            text: moneySaid(Number(row.facts.hourlyMinor)),
            sourceRecordIds: [row.id],
          },
        }
      : {};
  // How the pay compares with the job before, said only when the two round
  // to different sums: the old pay is named as the one it rose from or fell to.
  const against = (now: Row, before: Row | undefined): Facts => {
    if (!before) return {};
    const was = moneySaid(Number(before.facts.hourlyMinor));
    if (was === moneySaid(Number(now.facts.hourlyMinor))) return {};
    const key =
      Number(now.facts.hourlyMinor) > Number(before.facts.hourlyMinor)
        ? "paid-more-than"
        : "paid-less-than";
    return { [key]: { text: was, sourceRecordIds: [before.id] } };
  };
  // How long a job lasted, from the dates on its own record.
  const held = (row: Row): Facts =>
    row.facts.endedAt
      ? {
          held: {
            text: spanSaid(
              daysBetween(
                makeIsoDate(String(row.facts.startedAt)),
                makeIsoDate(String(row.facts.endedAt)),
              ),
            ),
            sourceRecordIds: [row.id],
          },
        }
      : {};
  const moment = (
    row: Row,
    date: string,
    causeKind: string,
    actFacts: Facts,
    counterpartIds: PersonId[] = [],
  ): JournalMoment => ({
    id: `${row.id}:${causeKind}`,
    date: date as IsoDate,
    causeId: row.id,
    causeKind,
    counterpartIds,
    selfNamed: true,
    hindsight: zero,
    impact: zero,
    echoes: [],
    actFacts,
  });
  return spells.flatMap((row, at): JournalMoment[] => {
    const moments: JournalMoment[] = [];
    const facts = row.facts;
    const where = employer(row);
    // Where they lived when they held it, from the spell's own record: a job
    // held before a move keeps no employer the town knows, and is told by
    // its place (words-journal-work-line-without-employer).
    const placeText = placeLabel(row.placeId);
    const own: Facts = {
      ...(where ? { employer: where } : {}),
      ...(placeText
        ? { place: { text: placeText, sourceRecordIds: [row.id] } }
        : {}),
    };
    if (facts.how === "first-job")
      moments.push(
        moment(row, String(facts.startedAt), "job-started:first", {
          ...own,
          ...paid(row),
        }),
      );
    if (facts.how === "after-out-of-work") {
      const out = [...outAfter.values()].find(
        (entry) => entry.facts.endedAt === facts.startedAt,
      );
      // The job whose loss began the time out of work.
      const lost = out
        ? spells.find((entry) => entry.id === String(out.facts.causeRecordId))
        : undefined;
      const days = out
        ? daysBetween(
            makeIsoDate(String(out.facts.startedAt)),
            makeIsoDate(String(facts.startedAt)),
          )
        : undefined;
      moments.push(
        moment(row, String(facts.startedAt), "job-started:again", {
          ...own,
          ...(out && days !== undefined
            ? { span: { text: spanSaid(days), sourceRecordIds: [out.id] } }
            : {}),
          ...paid(row),
          ...(lost
            ? {
                ...against(row, lost),
                ...(employer(lost) ? { "last-employer": employer(lost)! } : {}),
              }
            : {}),
        }),
      );
    }
    const ended = facts.endedAt ? String(facts.endedAt) : undefined;
    if (!ended) return moments;
    if (facts.end === "let-go")
      moments.push(
        moment(row, ended, "job-ended:let-go", {
          ...own,
          ...held(row),
          ...paid(row),
        }),
      );
    else if (facts.end === "moved-on") {
      const next = spells.find((_, i) => i > at);
      const nextAt = employer(next);
      moments.push(
        moment(row, ended, "job-ended:moved-on", {
          ...own,
          ...(nextAt ? { next: nextAt } : {}),
          ...held(row),
          ...(next ? { ...paid(next), ...against(next, row) } : {}),
        }),
      );
    } else if (facts.end === "child-born") {
      const childId = life.find((event) => event.id === facts.causeRecordId)
        ?.withIds[zero];
      moments.push(
        moment(row, ended, "job-ended:child", own, childId ? [childId] : []),
      );
    } else if (facts.end === "retired")
      moments.push(moment(row, ended, "job-ended:retired", own));
    return moments;
  });
}

/**
 * Each school year's end the school engine wrote a graduation result for, as
 * the person's own moment. The result is a row of the engine's table, not a
 * logged event, so no other source brings it to the journal.
 */
function schoolFinishedMoments(
  core: Readonly<CoreState>,
  person: PersonState,
): JournalMoment[] {
  return graduationResults(core, person.id).map((row) => ({
    id: row.id,
    date: row.date as IsoDate,
    causeId: row.id,
    causeKind: SCHOOL_FINISHED,
    counterpartIds: [],
    selfNamed: true,
    hindsight: zero,
    impact: zero,
    echoes: [],
  }));
}

/**
 * The day the person comes of voting age, told once it has come, for a life
 * the player began before it (golden-path step one). It cites the person's
 * own record, whose birth date sets the day.
 */
function comingOfAgeMoments(
  core: Readonly<CoreState>,
  person: PersonState,
): JournalMoment[] {
  const date = comingOfAgeOn(person.birthDate);
  if (date < core.startedAt) return [];
  return [
    {
      id: `came-of-age:${person.id}`,
      date,
      causeId: person.id,
      causeFactId: person.id,
      causeKind: "life:came-of-age",
      counterpartIds: [],
      ...(placeLabel(person.placeId)
        ? {
            actFacts: {
              place: {
                text: placeLabel(person.placeId)!,
                sourceRecordIds: [person.id],
              },
            },
          }
        : {}),
      hindsight: zero,
      impact: zero,
      echoes: [],
    },
  ];
}

/**
 * What a scene the person answered kept, from the reply record it wrote: a
 * promise made, a favor owed, a tie strained, a lie caught, a meeting set or
 * words on the record, each told with the other person in it. An ending that
 * keeps nothing is not told.
 */
function sceneEndingMoments(
  core: Readonly<CoreState>,
  book: { schedule: readonly { replies?: string[] }[] },
  personId: PersonId,
): JournalMoment[] {
  return book.schedule.flatMap((entry) =>
    (entry.replies ?? []).flatMap((id): JournalMoment[] => {
      const reply = core.durableLog.get(id);
      const keeps = reply?.facts?.keeps;
      const otherId = reply?.personIds.find((row) => row !== personId);
      if (!reply || typeof keeps !== "string" || keeps === "none" || !otherId)
        return [];
      return [
        {
          id,
          date: reply.date as IsoDate,
          causeId: id,
          // A promise given only as "I'll look at it" is told as that.
          causeKind:
            keeps === "promise" && reply.facts?.firmness === "vague"
              ? "scene-ending:vague-promise"
              : `scene-ending:${keeps}`,
          counterpartIds: [otherId as PersonId],
          selfNamed: true,
          hindsight: zero,
          impact: zero,
          echoes: [],
        },
      ];
    }),
  );
}

/**
 * What the person did in office, read from the acts the office-day engine
 * keeps (a vote, a town hall, an interview): each is a moment the journal
 * tells, citing the act's own record and, for a vote, the bill.
 */
function officeActMoments(
  core: Readonly<CoreState>,
  personId: PersonId,
  words: JournalWords | undefined,
  told: ReadonlySet<string>,
): JournalMoment[] {
  if (!core.modules.has(OFFICE_DAY_MODULE_ID)) return [];
  const api = coreAPI(core as CoreState);
  const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
  const acts = api.moduleState(OFFICE_DAY_MODULE_ID).table("acts");
  return (acts.rows() as unknown as OfficeActRow[])
    .filter((act) => act.personId === personId)
    .flatMap((act): JournalMoment[] => {
      const moment = (causeKind: string, actFacts?: Facts): JournalMoment => ({
        id: act.id,
        date: act.date as IsoDate,
        causeId: act.id,
        causeKind,
        counterpartIds: [],
        hindsight: zero,
        impact: zero,
        echoes: [],
        ...(actFacts ? { actFacts } : {}),
      });
      // The office they held it in and the town, from the offices engine's
      // serving term and the person's own place record.
      const officeHeld = officeHolding(core)(personId);
      const town = placeLabel(core.people.get(personId)?.placeId);
      const where: Facts = {
        ...(officeHeld
          ? { office: { ...officeHeld, text: officeHeld.text.toLowerCase() } }
          : {}),
        ...(town ? { place: { text: town, sourceRecordIds: [personId] } } : {}),
      };
      // A town hall is told by who came and what they asked, from its own
      // row; an interview by the outlet it was given to, through the
      // outlet's organization (from W3's claude/words-w3-journal, Nov 12). A
      // count of one is not told as a number ("1 people").
      if (act.kind === "town-hall") {
        const hall = core.modules.has(MEETINGS_MODULE_ID)
          ? (api
              .moduleState(MEETINGS_MODULE_ID)
              .table("townHalls")
              .get(act.recordId) as unknown as TownHallRow | undefined)
          : undefined;
        const counted = (n: number) =>
          n > one ? { text: String(n), sourceRecordIds: [act.recordId] } : null;
        const came = counted(hall?.attendeeIds.length ?? zero);
        const asked = counted(hall?.questions.length ?? zero);
        return [
          moment("act:town-hall", {
            ...where,
            ...(came ? { attendees: came } : {}),
            ...(asked ? { questions: asked } : {}),
          }),
        ];
      }
      if (act.kind === "interview") {
        if (act.detail.startsWith("declined")) return [];
        const row = core.modules.has(PRESS_MODULE_ID)
          ? (api
              .moduleState(PRESS_MODULE_ID)
              .table("interviews")
              .get(act.recordId) as unknown as InterviewRow | undefined)
          : undefined;
        const outletRow = row
          ? (api
              .moduleState(PRESS_MODULE_ID)
              .table("outlets")
              .get(row.outletId) as unknown as
              { organizationId?: string } | undefined)
          : undefined;
        const outlet = outletRow?.organizationId
          ? core.organizations.get(outletRow.organizationId as never)?.name
          : undefined;
        return [
          moment("act:interview", {
            ...where,
            ...(outlet
              ? {
                  outlet: {
                    text: properName(outlet),
                    sourceRecordIds: [act.recordId, row!.outletId],
                  },
                }
              : {}),
          }),
        ];
      }
      if (act.kind !== "vote" || !["yes", "no"].includes(act.detail)) return [];
      // The legislature's own record of the vote is told already: one line
      // a vote (the journal printed every vote twice, Oct 29).
      if (told.has(act.recordId)) return [];
      const bill = bills.get(act.recordId) as unknown as BillRow | undefined;
      if (!bill) return [];
      return [
        moment(`act:vote-${act.detail}`, {
          law: {
            text: billNumberName(bill.form.kind, bill.number, words),
            sourceRecordIds: [bill.id],
          },
        }),
      ];
    });
}

export function composeJournal(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  options: {
    through?: IsoDate;
    /** The words the English engine writes it with; the mined bank's by default. */
    words?: JournalWords;
    /** Who holds which office now; the offices engine's serving terms by default. */
    officeOf?: (personId: PersonId) => Fact | undefined;
  } = {},
): JournalChapter[] {
  const words = options.words;
  const rows = journalRows(words);
  const person = core.people.get(personId);
  const book = director.ledger.people.get(personId);
  if (!person || !book) return [];
  const kin = familyFactsOf(person);
  const named = new Set<PersonId>();
  // Whose moment it is, when it is someone else's: a relative first, then
  // someone the person knows, else the first on record. A moment's people
  // are kept sorted by id, so a rival a relative lost to can come first
  // (Wayne Heights, Pennsylvania, seed je-2: "a stranger won" for a
  // daughter's lost race, which no line could tell).
  const subjectOf = (moment: {
    counterpartIds: readonly PersonId[];
  }): PersonId | undefined =>
    moment.counterpartIds.find((id) => kin.has(id)) ??
    moment.counterpartIds.find((id) => person.knownIds.has(id)) ??
    moment.counterpartIds[zero];

  // The person's life, read once: the one list the card and the You screen read.
  const life = lifeOf(core, personId);
  const lifeById = new Map(life.map((event) => [event.id, event]));
  // The children the person was made with, by the day each was born.
  const children = life.filter(
    (event) =>
      event.life === "child" &&
      event.what === "born" &&
      event.record === "family:child",
  );

  // How the person refers to someone: a relative by relation, anyone else by
  // name, and only someone whose name they know.
  const other = (id: PersonId): Fact | undefined => {
    const row = core.people.get(id);
    if (!row) return undefined;
    const relation = kin.get(id);
    if (relation) {
      const text = relationPhrase(
        relation.relation,
        row.looks?.gender ?? "other",
        "journal",
        words,
      );
      if (text) {
        // Two relatives with one relation (two daughters, a father and a
        // stepfather both "my father") are each named: "my father Ray", "my
        // father Matthew" (batch 11: "My daughter was born." twice in one
        // chapter; Nov 11: "My father went to work somewhere new." twice).
        const shared = [...kin].some(([otherId, fact]) => {
          if (otherId === id) return false;
          const twin = core.people.get(otherId as PersonId);
          return (
            !!twin &&
            relationPhrase(
              fact.relation,
              twin.looks?.gender ?? "other",
              "journal",
              words,
            ) === text
          );
        });
        return shared
          ? {
              text: `${text} ${row.givenName}`,
              sourceRecordIds: [relation.factId, id],
            }
          : { text, sourceRecordIds: [relation.factId] };
      }
    }
    const known = person.knownIdSources?.[id];
    if (!person.knownIds.has(id)) return undefined;
    const first = !named.has(id);
    named.add(id);
    return {
      text: first ? `${row.givenName} ${row.familyName}` : row.givenName,
      sourceRecordIds: [known?.sourceFactId ?? id],
    };
  };
  const employerOf = (jobId: string | undefined) => {
    const job = jobId ? core.jobs.get(jobId) : undefined;
    return (job && employerName(core, job.organizationId, job.id)) ?? null;
  };
  const placeName = (placeId: string | undefined) => {
    const text = placeLabel(placeId);
    return text ? { text, sourceRecordIds: [placeId!] } : null;
  };

  // The run's work records before the start: each names its own employer.
  const pastWorkIds = new Set(
    life
      .filter(
        (event) =>
          event.life === "work" &&
          (event.record === PAST_WORK_SPELL || event.record === PAST_WORK_OUT),
      )
      .map((event) => event.id),
  );
  /** The recorded facts a moment can be told with. */
  const factsFor = (moment: JournalMoment): Facts | null => {
    const facts: Facts = { ...moment.actFacts };
    const fact = moment.causeFactId
      ? lifeById.get(moment.causeFactId)
      : undefined;
    // A school the person started, named from the school's own record.
    if (moment.causeKind === SCHOOL_STARTED && !facts.school) {
      const school = schoolsAttended(core, personId).find(
        (row) => row.recordId === moment.causeFactId,
      );
      if (school?.name)
        facts.school = {
          text: properName(school.name),
          sourceRecordIds: [school.recordId, school.schoolId],
        };
    }
    // The school year's end, from the school engine's result: a diploma or
    // none, and the school they finished at (one line for the record, though
    // the last day and the day after are both moments of it).
    if (moment.causeKind === SCHOOL_FINISHED) {
      const result = schoolResult(core, moment.causeId);
      if (!result) return null;
      // Whether they graduated is the line's stage (the row's stageFact).
      facts.passed = {
        text: String(result.passed),
        sourceRecordIds: [moment.causeId],
      };
      facts.finished = {
        text: moment.causeId,
        sourceRecordIds: [moment.causeId],
      };
      const school = schoolsAttended(core, personId).find(
        (row) => row.schoolId === result.schoolId,
      );
      if (school?.name)
        facts.school = {
          text: properName(school.name),
          sourceRecordIds: [moment.causeId, school.schoolId],
        };
    }
    if (moment.causeKind === "work:opening") {
      const employer = employerOf(person.jobId);
      if (employer) facts.employer = employer;
    }
    // A job of the run before the start names its own employer; a spell with
    // none on record (work in another place before a move) names none.
    if (
      moment.causeKind.startsWith("job-") &&
      !facts.employer &&
      !pastWorkIds.has(moment.causeId)
    ) {
      const job =
        core.jobs.get(moment.causeId) ??
        [...core.jobs.values()].find(
          (row) =>
            row.personId === personId &&
            (row.endsAt === moment.date || row.id === person.jobId),
        );
      const employer = employerOf(job?.id);
      if (employer) facts.employer = employer;
    }
    if (moment.causeKind === "moved") {
      const place = placeName(person.placeId);
      if (place) facts.place = place;
    }
    // A lost job with no employer on record is told by where the person
    // lived: "I lost my job in Sunbury, North Carolina." (W3, Nov 12: four
    // losses in Delphos, Iowa were untold once "I lost my job." went).
    if (
      moment.causeKind.startsWith("job-ended") &&
      !facts.employer &&
      !facts.place
    ) {
      const place = placeName(person.placeId);
      if (place) facts.place = place;
    }
    // How old they were on the day, from the birth record they stand on.
    const ageThen = (born: string, recordId: string): Fact => ({
      text: String(ageOnDate(makeIsoDate(born), makeIsoDate(moment.date))),
      sourceRecordIds: [recordId],
    });
    // A move into the county: where they came from, and the children born
    // before it, who came with them (the moves engine holds a mover back for
    // children at home).
    if (moment.causeKind === "moved") {
      const move = lifeById.get(moment.causeId);
      const from = placeLabel(String(move?.facts?.fromPlaceId ?? ""));
      // Only a place that is not the one they moved to (a county and its
      // seat are one answer).
      if (
        move &&
        from &&
        !(placeName(person.placeId)?.text ?? "").endsWith(
          from.replace(/^the /, ""),
        )
      )
        facts["moved-from"] = { text: from, sourceRecordIds: [move.id] };
      const came = children.flatMap((entry) => {
        const child =
          entry.date < moment.date
            ? core.people.get(entry.withIds[zero] as PersonId)
            : undefined;
        const relation = child ? kin.get(child.id) : undefined;
        const phrase =
          child && relation
            ? relationPhrase(
                relation.relation,
                child.looks?.gender ?? "other",
                "journal",
                words,
              )
            : undefined;
        return child && phrase
          ? [
              {
                text: `${phrase} ${child.givenName}`,
                phrase,
                name: child.givenName,
                id: child.id,
                fact: entry.id,
              },
            ]
          : [];
      });
      if (came.length)
        facts["moved-with"] = {
          text:
            new Set(came.map((child) => child.phrase)).size === one
              ? `${came[zero]!.phrase}${came.length > one ? "s" : ""} ${listOf(came.map((child) => child.name))}`
              : listOf(came.map((child) => child.text)),
          sourceRecordIds: came.flatMap((child) => [child.fact, child.id]),
        };
      facts["age-then"] = ageThen(person.birthDate, person.id);
    }
    // A child born to them: how old they were, and whether the first.
    if (moment.causeKind === "family:child") {
      facts["age-then"] = ageThen(person.birthDate, person.id);
      const earlier = children.some((entry) => entry.date < moment.date);
      if (!earlier)
        facts.firstborn = {
          text:
            core.people.get(fact?.withIds[zero] as PersonId)?.givenName ??
            "yes",
          sourceRecordIds: [moment.causeFactId ?? moment.causeId],
        };
    }
    // A partnership: how long they have been together, to the day told.
    if (moment.causeKind === "household:partners-met") {
      const days = daysBetween(
        makeIsoDate(moment.date),
        makeIsoDate(core.date),
      );
      if (days > zero)
        facts.together = {
          text: spanSaid(days),
          sourceRecordIds: [moment.causeId],
        };
    }
    // A death in the family: how old they were, and whether it followed an illness the record names.
    if (moment.causeKind === "event:life.death") {
      const deadId = subjectOf(moment);
      const dead = deadId ? core.people.get(deadId) : undefined;
      if (dead) facts["death-age"] = ageThen(dead.birthDate, dead.id);
      if (
        core.durableLog
          .get(moment.causeId)
          ?.topic?.startsWith("health:serious-illness")
      )
        facts["after-illness"] = {
          text: "seriously ill",
          sourceRecordIds: [moment.causeId],
        };
    }
    // A school year's end: how long they had been at the school.
    if (moment.causeKind === SCHOOL_FINISHED) {
      const result = schoolResult(core, moment.causeId);
      const attended = schoolsAttended(core, personId).find(
        (entry) => entry.schoolId === result?.schoolId,
      );
      if (attended && attended.date < moment.date) {
        facts["school-for"] = {
          text: spanSaid(
            daysBetween(makeIsoDate(attended.date), makeIsoDate(moment.date)),
          ),
          sourceRecordIds: [attended.recordId, moment.causeId],
        };
        facts["age-then"] = ageThen(person.birthDate, person.id);
      }
    }
    const row = rows.find((entry) =>
      moment.causeKind.startsWith(entry.kindPrefix),
    );
    const logged = core.durableLog.get(moment.causeId);
    for (const [key, spec] of Object.entries(row?.eventFacts ?? {})) {
      // How far a count fell ("before" an official's answer to the count
      // after it), told only where it fell, citing the records that moved it.
      if (spec.format === "drop") {
        const fell =
          Number(logged?.facts?.[spec.fact]) -
          Number(logged?.facts?.[spec.less ?? ""]);
        if (fell > zero)
          facts[key] = {
            text: fell.toLocaleString("en-US"),
            sourceRecordIds: [
              moment.causeId,
              ...String(logged?.facts?.[spec.cites ?? ""] ?? "")
                .split(" ")
                .filter(Boolean),
            ],
          };
        continue;
      }
      // A law is named from the bill that enacted it, citing both.
      const law =
        spec.format === "lawName"
          ? lawName(core, logged?.facts?.[spec.fact])
          : undefined;
      // A law no bill enacted is told by what it is about.
      if (spec.format === "lawName" && !law) {
        const about = lawTopic(core, logged?.facts?.[spec.fact]);
        if (!about) return null;
        facts.topic = {
          text: about.text,
          sourceRecordIds: [moment.causeId, ...about.recordIds],
        };
        continue;
      }
      // An organization the event is about is named from its own record.
      const value =
        spec.format === "organization"
          ? core.organizations.get(logged?.topic ?? "")?.name
          : spec.format === "billName" || spec.format === "billNumberAndName"
            ? billName(
                core,
                logged?.facts?.[spec.fact],
                spec.format === "billNumberAndName",
              )
            : spec.format === "lawName"
              ? law?.text
              : logged?.facts?.[spec.fact];
      // A fact the row marks optional leaves its lines out when the record
      // lacks it; any other missing fact leaves the moment untold.
      if (value === undefined) {
        if ("optional" in spec && spec.optional) continue;
        return null;
      }
      facts[key] = {
        text:
          spec.format === "money"
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(value) / P.minorPerDollar)
            : spec.format === "count"
              ? Number(value).toLocaleString("en-US")
              : spec.format === "date"
                ? // As people say a date, from the day the line tells:
                  // the year only when it differs.
                  spokenDate(String(value), moment.date)
                : value,
        sourceRecordIds:
          spec.format === "organization"
            ? [moment.causeId, logged!.topic!]
            : [moment.causeId, ...(law?.recordIds ?? [])],
      };
    }
    // A filing names its seat as people say it, through the one seat reader
    // (`seatSaid`): the body for a seat on a body, the district for a
    // districted seat, the office in lower case otherwise, at every level.
    if (moment.causeKind.startsWith("event:candidate-filed") && facts.office) {
      const contestId = logged?.facts?.contestId;
      const contest =
        typeof contestId === "string" && core.modules.has(ELECTIONS_MODULE_ID)
          ? (coreAPI(core as CoreState)
              .moduleState(ELECTIONS_MODULE_ID)
              .table("contests")
              .get(contestId) as unknown as ContestRow | undefined)
          : undefined;
      const office =
        contest && core.modules.has(OFFICES_MODULE_ID)
          ? (coreAPI(core as CoreState)
              .moduleState(OFFICES_MODULE_ID)
              .table("offices")
              .get(contest.officeId) as unknown as
              | { title?: string; seats?: number; bodyName?: string | null }
              | undefined)
          : undefined;
      facts.office = {
        text: seatSaid({
          title: contest?.title ?? facts.office.text,
          ...(office?.seats !== undefined ? { seats: office.seats } : {}),
          ...(office?.bodyName ? { bodyName: office.bodyName } : {}),
          ...(contest?.district ? { district: contest.district } : {}),
        }),
        sourceRecordIds: [
          ...facts.office.sourceRecordIds,
          ...(contest ? [contest.id] : []),
        ],
      };
    }
    // A law learned of is told by what it did to the person: the bill the
    // price engine's rule moved and about how much a month, from the
    // learned record's own facts. A record with no amount is not told
    // (what the Journal still needs: Social Security and estate records).
    if (moment.causeKind === "event:law.effect-learned") {
      const moved = Number(logged?.facts?.movedMinor);
      const ruleId = logged?.facts?.priceRuleId;
      // The price engine's rule the record cites, read by the prices
      // family's id entry (no part of the engine is loaded): its good.
      const rule =
        typeof ruleId === "string" && core.modules.has(PLACE_PRICES_MODULE_ID)
          ? (coreAPI(core as CoreState)
              .moduleState(PLACE_PRICES_MODULE_ID)
              .table("rules")
              .get(ruleId) as unknown as { good?: string } | undefined)
          : undefined;
      const bill = rule?.good
        ? (JOURNAL_OUTLINE.goodBills as Record<string, string>)[rule.good]
        : undefined;
      if (!bill || !Number.isFinite(moved) || moved === zero) return null;
      facts.bill = {
        text: bill,
        sourceRecordIds: [moment.causeId, ruleId as string],
      };
      facts.amount = {
        text: moneySaid(Math.abs(moved)),
        sourceRecordIds: [moment.causeId],
      };
      // Paying more is the bill going up (the record keeps refund less pay).
      facts.direction = {
        text: moved < zero ? "up" : "down",
        sourceRecordIds: [moment.causeId],
      };
    }
    const hasOwnLine = Boolean(row?.hasOwnLine);
    const toldWithoutOther = Boolean(row?.toldWithoutOther);
    const otherId =
      subjectOf(moment) ??
      (moment.causeKind === "family:child" ? fact?.withIds[zero] : undefined);
    if (otherId) {
      const said = other(otherId);
      // One's own race is told without a rival the person never knew by
      // name: its own lines say only how it went.
      if (!said)
        return moment.selfNamed && (hasOwnLine || toldWithoutOther)
          ? facts
          : null;
      const row = core.people.get(otherId);
      // A child is born with a name: "My daughter Jane was born." (owner,
      // Oct 15). A second child already said by name keeps it alone.
      facts.other =
        moment.causeKind === "family:child" &&
        row &&
        !said.text.endsWith(row.givenName)
          ? {
              text: `${said.text} ${row.givenName}`,
              sourceRecordIds: [...said.sourceRecordIds, otherId],
            }
          : said;
      // Their recorded gender picks the possessive, as it picks "father".
      facts.their = {
        text: possessivePronoun(row?.looks?.gender ?? "other", words),
        sourceRecordIds: said.sourceRecordIds,
      };
      if (row) {
        facts.name = {
          text: row.givenName,
          sourceRecordIds: said.sourceRecordIds,
        };
        // A relative with their name, so a line carries its subject ("My
        // daughter Jane was born."; owner, Oct 15, evening).
        // With the name said, two daughters are each "my daughter ...".
        const relation = kin.get(otherId);
        const phrase = relation
          ? relationPhrase(
              relation.relation,
              row.looks?.gender ?? "other",
              "journal",
              words,
            )
          : undefined;
        facts.named =
          relation && phrase
            ? {
                text: `${phrase} ${row.givenName}`,
                sourceRecordIds: [relation.factId, otherId],
              }
            : said;
      }
    }
    // Several relatives of one story ("my brothers Daniel and George") are
    // named together, each by their recorded relation and given name.
    if (moment.counterpartIds.length > one && facts.named) {
      const members = moment.counterpartIds.flatMap((id) => {
        const row = core.people.get(id);
        const relation = kin.get(id);
        const phrase =
          row && relation
            ? relationPhrase(
                relation.relation,
                row.looks?.gender ?? "other",
                "journal",
                words,
              )
            : undefined;
        return row && relation && phrase
          ? [{ phrase, name: row.givenName, factId: relation.factId, id }]
          : [];
      });
      const phrases = new Set(members.map((member) => member.phrase));
      const names = members.map((member) => member.name);
      facts.named = {
        text:
          phrases.size === one
            ? `${members[zero]!.phrase}s ${listOf(names)}`
            : listOf(members.map((m) => `${m.phrase} ${m.name}`)),
        sourceRecordIds: members.flatMap((m) => [m.factId, m.id]),
      };
    }
    return facts;
  };

  // Each line is the English engine's: the director says which line it is,
  // what the records give it and the stage they put it in.
  const render = (
    move: JournalMove,
    facts: Facts,
    momentKey: string,
    sourceIds: readonly string[],
    stage?: string,
  ) =>
    wordJournalLine({
      seed: core.seed,
      personId,
      move,
      facts,
      momentKey,
      sourceIds,
      ...(stage !== undefined ? { stage } : {}),
      ...(words ? { words } : {}),
    });

  // The stage a line is worded in: the record's own fact (a vote's yes or
  // no, a petition's outcome), marked where the moment holds the row's mark
  // (a count the official's answer lowered: "on-ballot:moved").
  const stageOf = (
    row: (typeof rows)[number],
    moment: JournalMoment,
    facts: Facts,
  ): string | undefined => {
    const logged = core.durableLog.get(moment.causeId)?.facts;
    // A record the log does not keep (a school's result) gives its stage
    // through the moment's own facts.
    const stage = row.stageFact
      ? (logged?.[row.stageFact] ?? facts[row.stageFact]?.text)
      : undefined;
    if (stage !== undefined && row.stageMark && facts[row.stageMark.fact])
      return `${stage}:${row.stageMark.mark}`;
    // The one the record names in a fact (the executive who signed) tells
    // it in their own words, apart from the others it names (the sponsor).
    return stage !== undefined &&
      row.stageSelf &&
      logged?.[row.stageSelf.fact] === personId
      ? `${stage}:${row.stageSelf.mark}`
      : stage;
  };

  const through = options.through ?? core.date;
  // Moments of one day are told in the order the rows give: where the family
  // came from, then who raised the person, then their brothers and sisters.
  // A moment ranks with the most general row it matches, so the kinds of one
  // story ("household:livelihood", ":since", ":moved") keep their own order.
  const rank = (moment: JournalMoment) => {
    let at = -one;
    for (const [index, entry] of rows.entries())
      if (
        moment.causeKind.startsWith(entry.kindPrefix) &&
        (at < zero || entry.kindPrefix.length < rows[at]!.kindPrefix.length)
      )
        at = index;
    return at < zero ? rows.length : at;
  };
  // What the list holds is told from the list (lifeMoments); the director's moment
  // for the same record only lends its weight. A moment of the director's that the
  // list does not hold (a relative's move, a stranger's death) is told as before.
  const fromList = lifeMoments(core, person, book, life);
  const moments: JournalMoment[] = [
    // A race is the person's own when its record names them as a candidate,
    // whoever else the moment is with (Storrs, Connecticut, replay
    // storrs-1: a father who walked doors was told as the one who lost).
    ...[
      ...book.moments.filter(
        (moment) =>
          !(
            fromList.told.has(
              `${moment.causeKind}|${moment.causeFactId ?? moment.causeId}`,
            ) ||
            (moment.causeKind === "moved" &&
              fromList.movedDays.has(moment.date))
          ),
      ),
      ...fromList.moments,
    ].map((moment) =>
      !moment.selfNamed &&
      rows.some(
        (row) => row.hasOwnLine && moment.causeKind.startsWith(row.kindPrefix),
      ) &&
      core.durableLog.get(moment.causeId)?.personIds.includes(personId)
        ? { ...moment, selfNamed: true as const }
        : moment,
    ),
    ...officeActMoments(
      core,
      personId,
      words,
      new Set(
        book.moments
          .filter((moment) => moment.causeKind === "event:office.voted")
          .map((moment) =>
            String(core.durableLog.get(moment.causeId)?.facts?.billId ?? ""),
          ),
      ),
    ),
    ...sceneEndingMoments(core, book, personId),
    ...householdMoments(core, person),
    ...comingOfAgeMoments(core, person),
    ...schoolFinishedMoments(core, person),
  ]
    .filter((moment) => moment.date <= through)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        rank(a) - rank(b) ||
        a.id.localeCompare(b.id),
    );
  const rowOf = (moment: JournalMoment) =>
    rows.find((entry) => moment.causeKind.startsWith(entry.kindPrefix));
  const turnOf = (
    row: { turn?: boolean; turnFor?: "self" | "self-or-kin" },
    moment: JournalMoment,
  ) =>
    !!row.turn &&
    (row.turnFor === undefined ||
      moment.selfNamed === true ||
      (row.turnFor === "self-or-kin" &&
        moment.counterpartIds.some((id) => kin.has(id))));
  const ageAt = (date: IsoDate) =>
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
  const monthSpan =
    core.data.parameters.yearSpanDays!.value / (P.two * P.two * P.two);

  // ---- The telling (words composer, unit 6) ----
  // The Journal tells a life, not a ledger: the records of a stretch of life
  // are told once, as one paragraph, in the order the outline gives
  // (src/director/data/journal-outline.json): where they came from and grew
  // up, the family they made and the moves, the working life, the household
  // now; then what the player did in play, one paragraph per event or race.
  const chapters: JournalChapter[] = [];
  // Where life happened (a school, a job): never a chapter or an entry, only
  // where the person knew someone who matters later.
  const employerIds: string[] = [];
  let chapter: (typeof chapters)[number] | undefined;
  const open = (key: string, title: string, date: IsoDate) => {
    chapter = { key, title, from: date, through: date, lines: [] };
    chapters.push(chapter);
  };
  // The events that name the person among their own people (a household
  // move), by kind and date, with how many people each names.
  const selfNamed = (moment: JournalMoment) =>
    rowOf(moment)?.selfWhenNamed && moment.selfNamed
      ? moment.counterpartIds.length + one
      : undefined;
  const ownEvents = new Map<string, number>();
  for (const moment of moments) {
    const selfCount = selfNamed(moment);
    if (selfCount)
      ownEvents.set(`${rowOf(moment)!.kindPrefix}|${moment.date}`, selfCount);
  }
  // Only a line that can be written tells the event (a destination with no
  // place name leaves the event's own line to tell the move).
  const toldSameDay = new Set(
    moments.flatMap((moment) => {
      const row = rowOf(moment);
      const key = `${row?.sameDay}|${moment.date}`;
      if (!row?.sameDay || !ownEvents.has(key)) return [];
      const facts = factsFor(moment);
      const told =
        facts &&
        render(
          { part: "check", kindPrefix: row.kindPrefix },
          facts,
          moment.id,
          [moment.causeId],
        );
      return told ? [key] : [];
    }),
  );

  /** One record as the telling holds it: its core sentence and the facts that may follow. */
  interface Unit {
    moment: JournalMoment;
    row: NonNullable<ReturnType<typeof rowOf>>;
    facts: Facts;
    event: JournalWorded;
    /** The age already said by the sentence's own frame ("When I was 7, ..."). */
    framed: boolean;
    paragraph: string;
    turn: boolean;
    /** The record's line again from fewer facts, when the paragraph said some already. */
    retell?: (given: Facts, key?: string) => JournalWorded | null;
  }
  const paragraphOf = (moment: JournalMoment): string => {
    if (moment.date >= core.startedAt && moment.beat !== "work") return "play";
    const kind = moment.causeKind;
    const young = ageAt(moment.date) < P.votingAge;
    const rows = JOURNAL_OUTLINE.paragraphs;
    return (
      rows.find((row) => "beat" in row && row.beat === moment.beat)?.key ??
      rows.find((row) => row.kinds.some((prefix) => kind.startsWith(prefix)))
        ?.key ??
      rows.find((row) => "young" in row && row.young && young)?.key ??
      "family"
    );
  };
  const units: Unit[] = [];
  // Each fact is told once in a life: the same kind, the same people and the
  // same facts, whenever it happened (#8234: "I moved to Jaguas" twice).
  const toldFacts = new Set<string>();
  let wonBefore = false;
  let lostBefore = false;
  for (const moment of moments) {
    const row = rowOf(moment);
    if (!row) continue;
    const selfCount = selfNamed(moment);
    // The person's own event already told by the line of its day.
    if (selfCount && toldSameDay.has(`${row.kindPrefix}|${moment.date}`))
      continue;
    const facts = factsFor(moment);
    if (!facts) continue;
    const once = row.oncePer ? facts[row.oncePer]?.text : undefined;
    if (once !== undefined) {
      if (toldFacts.has(`${row.kindPrefix}|${once}`)) continue;
      toldFacts.add(`${row.kindPrefix}|${once}`);
    }
    const sourceIds = [moment.causeId];
    if (row.entry === "setting") {
      const employer = facts.employer?.sourceRecordIds.at(-one);
      if (employer) employerIds.push(employer);
      continue;
    }
    // The same move kept twice (the life list's move and the moves engine's
    // record of one day to one place, #8234's Jaguas) is told once: by the
    // move's own destination on the list, never by where the person lives
    // now, which every move would share.
    // A move is told by where the person lives now (the record's own
    // destination is not read yet), so two moves before the start read the
    // same: the first is told, never the same sentence twice (#8234's
    // Jaguas; Washington, D.C., seed dd487c96b0e937fb). A move in play is
    // always told.
    // stopgapId: SG-DIRECTOR-journal-life-gaps (a move's destination is not
    // on the life list's event; the Journal tells one past move per place).
    if (
      moment.causeKind === "moved" &&
      facts.place &&
      moment.date < core.startedAt
    ) {
      const key = `moved|${facts.place.text}`;
      if (toldFacts.has(key)) continue;
      toldFacts.add(key);
    }
    const sign = [
      moment.causeKind,
      moment.counterpartIds.join(","),
      ...Object.entries(facts)
        .filter(([key]) => !TIME_FACTS.has(key))
        .map(([key, fact]) => `${key}=${fact.text}`)
        .sort(),
    ].join("|");
    if (toldFacts.has(sign)) continue;
    const own =
      !!selfCount ||
      !!moment.selfNamed ||
      !facts.other ||
      moment.causeKind === "family:child" ||
      // The school year's end is the person's own result, whoever the
      // scene of it was with.
      moment.causeKind === SCHOOL_FINISHED;
    // A move the household made together is "we".
    const together =
      (selfCount ??
        (row.sameDay
          ? ownEvents.get(`${row.sameDay}|${moment.date}`)
          : undefined) ??
        one) > one;
    let event: ReturnType<typeof render> = null;
    if (row.hasOwnLine && own) {
      const won = facts.winner?.text === personId;
      const stage = `${won ? "won" : "lost"}:${raceMargin(core, moment.causeId)}`;
      // Losing a first race is the start of a story, not its end.
      const first = !won && !wonBefore && !lostBefore;
      event =
        (first
          ? render(
              { part: "memoir", field: "lost" },
              facts,
              `${moment.id}:first`,
              sourceIds,
            )
          : null) ??
        render(
          { part: "race", kindPrefix: row.kindPrefix },
          facts,
          moment.id,
          sourceIds,
          stage,
        );
      if (won) wonBefore = true;
      else lostBefore = true;
    } else if (row.kindPrefix === "event:candidate-filed" && own)
      // Running begins with deciding to.
      event =
        render(
          { part: "memoir", field: "decided" },
          facts,
          moment.id,
          sourceIds,
        ) ??
        render(
          { part: "line", kindPrefix: row.kindPrefix, whose: "own" },
          facts,
          moment.id,
          sourceIds,
        );
    // The record's own line, worded from the facts given: a paragraph that
    // has already named a fact asks for it again without that fact.
    const lineOf = (given: Facts, key: string) =>
      render(
        {
          part: "line",
          kindPrefix: row.kindPrefix,
          whose: own ? "own" : "other",
          together,
          named: !!given.other,
        },
        given,
        key,
        sourceIds,
        // Someone else's race is told by the record's result for them; a
        // line worded by an event fact (a vote's yes or no) by that fact.
        !own && row.hasOwnLine
          ? given.winner?.text === subjectOf(moment)
            ? "won"
            : "lost"
          : stageOf(row, moment, given),
      );
    const plainLine =
      !(row.hasOwnLine && own) &&
      !(row.kindPrefix === "event:candidate-filed" && own);
    if (plainLine) event = lineOf(facts, moment.id);
    if (!event) continue;
    toldFacts.add(sign);
    // When they were young, the age frames it: "When I was 7, my father
    // died." Only what happened around a young person, as the row says.
    let framed = false;
    // An age of nothing ("When I was 0") is no frame: the day of the birth.
    if (
      ageAt(moment.date) < P.votingAge &&
      ageAt(moment.date) > zero &&
      row.framesAge
    ) {
      const frame = render(
        { part: "memoir", field: "whenAge" },
        {
          ...facts,
          age: {
            text: String(ageAt(moment.date)),
            sourceRecordIds: [person.id],
          },
        },
        `${moment.id}:age`,
        sourceIds,
      );
      if (frame) {
        event = framedByAge(frame, event, facts);
        framed = true;
      }
    }
    units.push({
      moment,
      row,
      facts,
      event,
      framed: framed || !!row.ownTime,
      paragraph: paragraphOf(moment),
      turn: turnOf(row, moment),
      ...(plainLine
        ? {
            retell: (given: Facts, key?: string) =>
              lineOf(given, key ?? `${moment.id}:again`),
          }
        : {}),
    });
  }

  // What moved the person's views, from the views engine's own record of
  // each stance's causes (owner, Nov 12: "big events in your life that shape
  // the person you are"): the event, and which way it moved them. Told only
  // where a stance cites the event; a view nothing records the cause of is
  // not told.
  const movedViews = new Map<
    string,
    { topic: string; side: string; id: string; size: number }
  >();
  if (core.modules.has(VIEWS_MODULE_ID))
    for (const stance of stancesOf(coreAPI(core as CoreState), personId))
      for (const cause of stance.causes) {
        const size = Math.abs(cause.total ?? cause.change);
        const was = movedViews.get(cause.eventId);
        if (!was || size > was.size)
          movedViews.set(cause.eventId, {
            topic: stance.topic,
            side: stance.desiredChange,
            id: stance.id,
            size,
          });
      }
  const viewMovedBy = (unit: Unit): JournalWorded | null => {
    const moved =
      movedViews.get(unit.moment.causeId) ??
      (unit.moment.causeFactId
        ? movedViews.get(unit.moment.causeFactId)
        : undefined);
    if (!moved) return null;
    const enact = moved.side === "enact";
    const text = enact ? questionTo(moved.topic) : questionAbout(moved.topic);
    if (!text) return null;
    return render(
      { part: "memoir", field: enact ? "viewFor" : "viewAgainst" },
      {
        [enact ? "to" : "about"]: {
          text,
          sourceRecordIds: [moved.id, unit.moment.causeId],
        },
      },
      `${unit.moment.id}:view`,
      [moved.id, unit.moment.causeId],
    );
  };

  // The facts a sentence names once in a paragraph (an employer, a place, a
  // wage): a sentence after it that would say it again is told without it.
  const sayOnce = new Set<string>(JOURNAL_OUTLINE.sayOnce);
  /**
   * One paragraph from its records, in order: each record's sentence, the
   * facts its row lets follow it when they say something not yet said, and
   * the time between two records where a month or more went by (never two
   * time openings in a row). The first sentence of a grown-up stretch opens
   * on the age it began at.
   */
  // Whether a partner is on record for the person, so "we" and "our" have
  // someone behind them.
  const partnered =
    [...kin.values()].some((fact) =>
      ["partner", "former-partner"].includes(fact.relation),
    ) || life.some((event) => event.life === "partner");
  const WE = /\b(?:we|our|us)\b/i;
  const tellParagraph = (
    told: readonly Unit[],
    key: string,
  ): JournalWorded[] => {
    const said = new Set<string>();
    const sentences: JournalWorded[] = [];
    const remember = (text: string, facts: Facts) => {
      for (const [name, fact] of Object.entries(facts))
        if (sayOnce.has(name) && text.includes(fact.text)) said.add(fact.text);
    };
    let last: Unit | undefined;
    let lastTimed = false;
    for (const unit of told) {
      const ids = [unit.moment.causeId];
      let event = unit.event;
      // A fact this paragraph has named already (an employer, a place) is
      // not named again when the record's line can be said without it.
      const repeated = Object.entries(unit.facts).filter(
        ([name, fact]) => sayOnce.has(name) && said.has(fact.text),
      );
      if (repeated.length && unit.retell && !unit.framed) {
        const fewer = Object.fromEntries(
          Object.entries(unit.facts).filter(
            ([name]) => !repeated.some(([gone]) => gone === name),
          ),
        );
        // The employer first: a place may be said again where the line
        // has no other way to say where.
        const fewerButPlace = Object.fromEntries(
          Object.entries(unit.facts).filter(
            ([name]) =>
              name === "place" || !repeated.some(([gone]) => gone === name),
          ),
        );
        const again = unit.retell(fewerButPlace) ?? unit.retell(fewer);
        if (again) event = again;
      }
      // No "we" or "our" without a partner on record to stand behind it
      // (lead, Nov 12: "our" has nobody behind it): the record's line is
      // asked again in other words.
      const child = unit.moment.causeKind === "family:child";
      if (child && !partnered && WE.test(event.text) && unit.retell)
        for (let again = one; again <= P.two * P.two * P.two; again += one) {
          const other = unit.retell(
            unit.facts,
            `${unit.moment.id}:alone:${again}`,
          );
          if (other && !WE.test(other.text)) {
            event = other;
            break;
          }
        }
      let timed = false;
      let aged = unit.framed;
      let heldSaid = false;
      // A record that carries the person's age then says it in its own
      // sentence ("When I was 15, my son Xavier was born."), never as a
      // sentence after it.
      if (unit.facts["age-then"] && !unit.framed && key !== "roots") {
        const frame = render(
          { part: "memoir", field: "whenAge" },
          { age: unit.facts["age-then"] },
          `${unit.moment.id}:age`,
          ids,
        );
        if (frame) {
          event = framedByAge(frame, event, unit.facts);
          aged = true;
        }
      } else if (last && !unit.framed && key !== "roots") {
        const days = daysBetween(
          makeIsoDate(last.moment.date),
          makeIsoDate(unit.moment.date),
        );
        if (!lastTimed && days >= monthSpan) {
          const frame = render(
            { part: "memoir", field: "joinLater" },
            {
              span: {
                text: spanSaid(days),
                sourceRecordIds: [last.moment.causeId, unit.moment.causeId],
              },
            },
            `${unit.moment.id}:join`,
            ids,
          );
          if (frame) {
            event = framedByAge(frame, event, unit.facts);
            timed = true;
            // The time just said is how long the job before lasted: it is
            // not said again as "I had been there ...".
            if (unit.facts.held?.text === spanSaid(days)) heldSaid = true;
          }
        }
      } else if (
        !aged &&
        !last &&
        !unit.framed &&
        (key === "family" || key === "work") &&
        ageAt(unit.moment.date) > zero
      ) {
        const frame = render(
          { part: "memoir", field: "whenAge" },
          {
            age: {
              text: String(ageAt(unit.moment.date)),
              sourceRecordIds: [person.id],
            },
          },
          `${unit.moment.id}:age`,
          ids,
        );
        if (frame) {
          event = framedByAge(frame, event, unit.facts);
          aged = true;
        }
      }
      sentences.push(event);
      remember(event.text, unit.facts);
      // The event told as a small story: each field the row names follows
      // it when its facts say something this paragraph has not said yet.
      const followFacts = Object.fromEntries(
        Object.entries(unit.facts).filter(
          ([name, fact]) =>
            !(sayOnce.has(name) && said.has(fact.text)) &&
            !(aged && AGE_FACTS.has(name)) &&
            !(heldSaid && name === "held"),
        ),
      );
      for (const named of unit.row.follow ?? []) {
        for (const field of named.split("|")) {
          const follow = render(
            { part: "memoir", field: field as MemoirField },
            followFacts,
            `${unit.moment.id}:${field}`,
            ids,
          );
          if (!follow || (child && !partnered && WE.test(follow.text)))
            continue;
          sentences.push(follow);
          remember(follow.text, followFacts);
          break;
        }
      }
      const view = viewMovedBy(unit);
      if (view) sentences.push(view);
      last = unit;
      lastTimed = timed;
    }
    return sentences;
  };

  /**
   * A working life is told as a run, whatever its length (lead, Nov 12:
   * "nothing flips at a count"): one sentence of what kind of work it was and
   * where, how it went (let go, from the records) and where it stands (still
   * there, or the last place they worked); then, where the records hold
   * them, how the pay moved from the first job to the last, and how long they
   * went without a paycheck in all. One job is one sentence about that job.
   * The pieces are `journal.work-run`'s, joined by the outline's join words.
   */
  const tellWork = (told: readonly Unit[]): JournalWorded[] | null => {
    const employers = new Map<string, string>();
    for (const unit of told)
      for (const fact of [unit.facts.employer, unit.facts.next])
        if (fact)
          employers.set(fact.text, String(fact.sourceRecordIds.at(-one)));
    const ids = told.map((unit) => unit.moment.causeId);
    const first = told[zero]!;
    const lastUnit = told.at(-one)!;
    // Where it stands: still at the last job, or the last place worked
    // when the run ends on a job that ended with none after it.
    const endedOut =
      lastUnit.moment.causeKind.startsWith("job-ended") && !lastUnit.facts.next;
    const ended = lastUnit.facts.next ?? lastUnit.facts.employer;
    const lostIds = told
      .filter((unit) => unit.moment.causeKind === "job-ended:let-go")
      .map((unit) => unit.moment.causeId);
    // The kinds of work, from each employer's record, the most held first.
    const workWords = JOURNAL_OUTLINE.workWords as Record<string, string>;
    const kinds = new Map<string, { n: number; ids: string[] }>();
    for (const orgId of employers.values()) {
      const kind = (core.organizations.get(orgId)?.classification ?? "")
        .split(":")
        .at(-one);
      const word = kind ? workWords[kind] : undefined;
      if (!word) continue;
      const row = kinds.get(word) ?? { n: zero, ids: [] };
      row.n += one;
      row.ids.push(orgId);
      kinds.set(word, row);
    }
    const said = [...kinds]
      .sort(([a, x], [b, y]) => y.n - x.n || a.localeCompare(b))
      .slice(zero, P.two);
    const join = JOURNAL_OUTLINE.workJoin;
    const where = lastUnit.facts.place ?? first.facts.place;
    const span: Fact = {
      text: spanSaid(
        daysBetween(
          makeIsoDate(first.moment.date),
          makeIsoDate(endedOut ? lastUnit.moment.date : core.startedAt),
        ),
      ),
      sourceRecordIds: ids,
    };
    // One job: that job and how long.
    if (employers.size === one && ended) {
      const one_ = render(
        { part: "memoir", field: endedOut ? "workOneLeft" : "workOne" },
        { employer: ended, span },
        `${first.moment.id}:work-one`,
        ids,
      );
      if (one_) return [one_, ...workAfter(told, ids)];
    }
    const facts: Facts = {
      span,
      ...(said.length
        ? {
            work: {
              text: said.map(([word]) => word).join(join.kindsAnd),
              sourceRecordIds: said.flatMap(([, row]) => row.ids),
            },
          }
        : {}),
      ...(where ? { place: where } : {}),
    };
    const run = render(
      { part: "memoir", field: "workRun" },
      facts,
      `${first.moment.id}:work-run`,
      ids,
    );
    if (!run) return null;
    const times = (words ?? JOURNAL_WORDS).countWords;
    const lost = lostIds.length
      ? render(
          { part: "memoir", field: "workLost" },
          {
            times: {
              text: times[lostIds.length] ?? (words ?? JOURNAL_WORDS).manyTimes,
              sourceRecordIds: lostIds,
            },
          },
          `${first.moment.id}:work-lost`,
          ids,
        )
      : null;
    const end = ended
      ? render(
          { part: "memoir", field: endedOut ? "workLeft" : "workEnd" },
          { employer: ended },
          `${first.moment.id}:work-end`,
          ids,
        )
      : null;
    const lower = (part: JournalWorded) =>
      part.text.charAt(zero).toLowerCase() + part.text.slice(one);
    const tail = [lost, end].filter((part): part is JournalWorded => !!part);
    const text =
      run.text +
      tail
        .map(
          (part, at) =>
            (at === tail.length - one ? join.beforeLast : join.between) +
            lower(part),
        )
        .join("") +
      join.end;
    return [
      {
        text:
          tail.length === one
            ? text.replace(join.beforeLast, join.onlyLast)
            : text,
        sourceRecordIds: [
          ...new Set([run, ...tail].flatMap((part) => part.sourceRecordIds)),
        ],
      },
      ...workAfter(told, ids),
    ];
  };
  /** How the pay moved from the first job to the last, and the time without a paycheck, from the records. */
  const workAfter = (
    told: readonly Unit[],
    ids: readonly string[],
  ): JournalWorded[] => {
    const out: JournalWorded[] = [];
    // The pay of the first job and of the last, from the run's own spell
    // records in the order they began (the job held at the start is one).
    const wages = life
      .filter(
        (event) =>
          event.life === "work" &&
          event.record === PAST_WORK_SPELL &&
          Number(event.facts?.hourlyMinor) > zero,
      )
      .sort((a, b) =>
        String(a.facts?.startedAt).localeCompare(String(b.facts?.startedAt)),
      )
      .map((event) => ({
        minor: Number(event.facts!.hourlyMinor),
        id: event.id,
      }));
    const from = wages[zero];
    const to = wages.at(-one);
    if (from && to && moneySaid(from.minor) !== moneySaid(to.minor)) {
      const pay = render(
        {
          part: "memoir",
          field: to.minor > from.minor ? "workPayUp" : "workPayDown",
        },
        {
          "wage-from": {
            text: moneySaid(from.minor),
            sourceRecordIds: [from.id],
          },
          "wage-to": { text: moneySaid(to.minor), sourceRecordIds: [to.id] },
        },
        `${told[zero]!.moment.id}:work-pay`,
        [...ids],
      );
      if (pay) out.push(pay);
    }
    // Every time out of work the run's records hold, summed.
    const outs = life.filter(
      (event) =>
        event.life === "work" &&
        event.record === PAST_WORK_OUT &&
        event.facts?.endedAt &&
        event.facts?.startedAt,
    );
    const days = outs.reduce(
      (sum, event) =>
        sum +
        daysBetween(
          makeIsoDate(String(event.facts!.startedAt)),
          makeIsoDate(String(event.facts!.endedAt)),
        ),
      zero,
    );
    if (outs.length && days > zero) {
      const without = render(
        { part: "memoir", field: "workOut" },
        {
          "out-span": {
            text: spanSaid(days),
            sourceRecordIds: outs.map((event) => event.id),
          },
        },
        `${told[zero]!.moment.id}:work-out`,
        [...ids],
      );
      if (without) out.push(without);
    }
    return out;
  };

  /**
   * Records of one kind that came together, told as one sentence: the facts
   * that differ between them are said as one list ("the rules on
   * transportation and the local income tax rate"), by the outline's merge
   * row and its memoir field.
   */
  const mergeOf = (told: readonly Unit[]): JournalWorded[] | null => {
    const row = JOURNAL_OUTLINE.merge.find(
      (entry) => entry.kindPrefix === told[zero]?.row.kindPrefix,
    );
    if (!row || (told.length < P.two && !row.alone)) return null;
    // Records named the same way (a law by its bill's name, or by what it is
    // about) are one sentence each: the first of the row's facts each holds.
    const byFact = new Map<string, Unit[]>();
    for (const unit of told) {
      const key = row.facts.find((name) => unit.facts[name]) ?? "";
      byFact.set(key, [...(byFact.get(key) ?? []), unit]);
    }
    const out: JournalWorded[] = [];
    for (const [key, units] of byFact) {
      if (!key) continue;
      const said = units.map((unit) => unit.facts[key]!);
      const facts: Facts = {
        [key]: {
          text: listOfParts([...new Set(said.map((fact) => fact.text))]),
          sourceRecordIds: said.flatMap((fact) => fact.sourceRecordIds),
        },
      };
      // Each record's own clause (what it did), the clauses as one list.
      const clauses = units.flatMap((unit) => {
        const field =
          row.clauses[unit.facts.direction?.text as keyof typeof row.clauses];
        const clause = field
          ? render(
              { part: "memoir", field: field as MemoirField },
              unit.facts,
              `${unit.moment.id}:clause`,
              [unit.moment.causeId],
            )
          : null;
        return clause
          ? [
              {
                ...clause,
                text:
                  clause.text.charAt(zero).toLowerCase() +
                  clause.text.slice(one),
              },
            ]
          : [];
      });
      if (!clauses.length) continue;
      facts.effects = {
        text: listOf(clauses.map((clause) => clause.text)),
        sourceRecordIds: clauses.flatMap((clause) => clause.sourceRecordIds),
      };
      const line = render(
        { part: "memoir", field: row.field as MemoirField },
        facts,
        `${units[zero]!.moment.id}:merged`,
        units.map((unit) => unit.moment.causeId),
      );
      if (line) out.push(line);
    }
    return out.length ? out : null;
  };

  const entryOf = (told: readonly Unit[], sentences: JournalWorded[]) => ({
    id: told[zero]!.moment.id,
    date: told[zero]!.moment.date,
    text: journalEntry(sentences),
    momentIds: told.map((unit) => unit.moment.id),
    kinds: told.map((unit) => unit.moment.causeKind),
    sourceRecordIds: [
      ...new Set(sentences.flatMap((part) => part.sourceRecordIds)),
    ],
  });
  const push = (told: readonly Unit[], sentences: JournalWorded[]) => {
    if (!told.length || !sentences.length || !chapter) return;
    chapter.lines.push(entryOf(told, sentences));
    const lastDate = told.at(-one)!.moment.date;
    if (lastDate > chapter.through) chapter.through = lastDate;
  };

  /**
   * What the person lived through before the start that moved their views,
   * from the views engine's own record of it (owner, Nov 12: "big events in
   * your life that shape the person you are"; the view's `pastShifts`, life
   * record part 14, #8973): a parent's job lost while they were a child, in
   * the roots paragraph, and their own last layoff as a grown-up, in the
   * work paragraph, each with which way it moved them. A view with no such
   * record (main before #8973 lands) tells nothing.
   */
  const pastViewSentences = (paragraph: string): JournalWorded[] => {
    if (!core.modules.has(VIEWS_MODULE_ID)) return [];
    const view = viewOf(coreAPI(core as CoreState), personId) as {
      id: string;
      pastShifts?: readonly {
        recordId: string;
        kind: string;
        parentId?: string;
        change: number;
      }[];
    } | null;
    const out: JournalWorded[] = [];
    for (const shift of view?.pastShifts ?? []) {
      const parentCase = shift.kind === "parent-job-lost";
      if ((paragraph === "roots") !== parentCase) continue;
      if (!parentCase && paragraph !== "work") continue;
      const whose = (parentCase ? shift.parentId : personId) as PersonId;
      const spell = whose
        ? pastWorkOf(core as CoreState, whose).find(
            (row) => row.id === shift.recordId,
          )
        : undefined;
      const ended = spell?.facts.endedAt ? String(spell.facts.endedAt) : null;
      if (!spell || !ended || shift.change === zero) continue;
      const ids = [shift.recordId, view!.id];
      const lean: Fact = {
        text: JOURNAL_OUTLINE.leanWords[shift.change < zero ? "left" : "right"],
        sourceRecordIds: ids,
      };
      const employer = spell.facts.organizationId
        ? employerName(core, String(spell.facts.organizationId), spell.id)
        : undefined;
      if (parentCase) {
        const parent = core.people.get(whose);
        const relation = kin.get(whose);
        const phrase =
          parent && relation
            ? relationPhrase(
                relation.relation,
                parent.looks?.gender ?? "other",
                "journal",
                words,
              )
            : undefined;
        if (!parent || !phrase) continue;
        const facts: Facts = {
          age: {
            text: String(ageAt(makeIsoDate(ended))),
            sourceRecordIds: [spell.id, person.id],
          },
          named: {
            text: `${phrase} ${parent.givenName}`,
            sourceRecordIds: [relation!.factId, whose],
          },
          their: {
            text: possessivePronoun(parent.looks?.gender ?? "other", words),
            sourceRecordIds: [relation!.factId],
          },
          ...(employer ? { employer } : {}),
        };
        const lost = render(
          { part: "memoir", field: "viewParentLost" },
          facts,
          `${shift.recordId}:view-lost`,
          ids,
        );
        const moved = render(
          {
            part: "memoir",
            // Toward the parent's view, or away from it, as the record keeps
            // it (`follow`, from the person's traits).
            field:
              (shift.follow ?? zero) >= zero
                ? "viewParentToward"
                : "viewParentAway",
          },
          { ...facts, lean },
          `${shift.recordId}:view-moved`,
          ids,
        );
        if (lost && moved) out.push(lost, moved);
        continue;
      }
      const own = employer
        ? render(
            { part: "memoir", field: "viewOwn" },
            {
              employer,
              year: {
                text: ended.slice(zero, P.two * P.two),
                sourceRecordIds: [spell.id],
              },
              lean,
            },
            `${shift.recordId}:view-own`,
            ids,
          )
        : null;
      if (own) out.push(own);
    }
    return out;
  };

  // The past: a few short paragraphs under the first chapter.
  const past = units.filter((unit) => unit.paragraph !== "play");
  if (past.length) {
    const place = placeName(person.placeId);
    const title = render(
      { part: "first-title" },
      place ? { place } : {},
      `${past[zero]!.moment.id}:title`,
      [past[zero]!.moment.causeId],
    );
    open(past[zero]!.moment.id, title?.text ?? "", past[zero]!.moment.date);
    // Each outline row's records, in the order they happened; the birth
    // leads its paragraph, since a life is told from the day it began.
    const queues = JOURNAL_OUTLINE.paragraphs
      .map((row) => ({
        key: row.key,
        units: past
          .filter((unit) => unit.paragraph === row.key)
          .sort(
            (a, b) =>
              Number(b.moment.causeKind === "person.birth") -
              Number(a.moment.causeKind === "person.birth"),
          ),
      }))
      .filter((row) => row.units.length);
    // The Journal is told in the order things happened (lead, Nov 13): a
    // paragraph is dated by its earliest record and paragraphs follow those
    // dates. A paragraph carries the later records of its thread only until
    // another thread's next record comes first; then the thread is split, and
    // its later records are a paragraph of their own in their place.
    const viewsTold = new Set<string>();
    while (queues.some((row) => row.units.length)) {
      const open = queues.filter((row) => row.units.length);
      // The thread whose next record came first (the outline's order breaks a tie).
      const next = open.reduce((best, row) =>
        row.units[zero]!.moment.date < best.units[zero]!.moment.date
          ? row
          : best,
      );
      const others = open
        .filter((row) => row !== next)
        .map((row) => row.units[zero]!.moment.date)
        .sort();
      const until = others[zero];
      const told: Unit[] = [];
      while (
        next.units.length &&
        (!told.length ||
          until === undefined ||
          next.units[zero]!.moment.date <= until)
      )
        told.push(next.units.shift()!);
      const views = viewsTold.has(next.key) ? [] : pastViewSentences(next.key);
      viewsTold.add(next.key);
      const sentences = [
        ...((next.key === "work" ? tellWork(told) : null) ??
          tellParagraph(told, next.key)),
        ...views,
      ];
      push(told, sentences);
    }
  }
  // Play: what the player did and what happened to them since the start,
  // one paragraph per event, a race's records together, in more detail. A
  // turn (a race, a child) opens a chapter titled by its record.
  const played = units.filter((unit) => unit.paragraph === "play");
  const groups: Unit[][] = [];
  const byContest = new Map<string, Unit[]>();
  for (const unit of played) {
    // A race's records go together, and so do records of one kind the
    // outline merges that came on one day (three laws learned at once).
    const merged = JOURNAL_OUTLINE.merge.find(
      (row) => row.kindPrefix === unit.row.kindPrefix,
    );
    const contestId = merged
      ? `${merged.kindPrefix}|${unit.moment.date}`
      : core.durableLog.get(unit.moment.causeId)?.facts?.contestId;
    const group =
      typeof contestId === "string" ? byContest.get(contestId) : undefined;
    if (group) {
      group.push(unit);
      continue;
    }
    const fresh = [unit];
    groups.push(fresh);
    if (typeof contestId === "string") byContest.set(contestId, fresh);
  }
  let chapterKind: string | undefined;
  for (const group of groups) {
    const turn = group.find((unit) => unit.turn);
    const titleOf = (unit: Unit) =>
      render(
        { part: "title", kindPrefix: unit.row.kindPrefix },
        unit.facts,
        `${unit.moment.id}:title`,
        [unit.moment.causeId],
      );
    // A title that would be a bare person's name is no chapter of this life.
    const title = turn ? titleOf(turn) : null;
    const byName =
      !!title &&
      turn!.moment.counterpartIds.some((other) => {
        const row = core.people.get(other);
        return (
          !!row &&
          (title.text === row.givenName ||
            title.text === `${row.givenName} ${row.familyName}`)
        );
      });
    if (
      !chapter ||
      (turn &&
        title &&
        !byName &&
        (chapterKind !== turn.row.kindPrefix || title.text !== chapter.title))
    ) {
      chapterKind = turn?.row.kindPrefix;
      const place = placeName(person.placeId);
      const opening =
        (title && !byName ? title : null) ??
        render(
          { part: "first-title" },
          place ? { place } : {},
          `${group[zero]!.moment.id}:title`,
          [group[zero]!.moment.causeId],
        );
      open(
        group[zero]!.moment.id,
        opening?.text ?? "",
        group[zero]!.moment.date,
      );
    }
    const merged = JOURNAL_OUTLINE.merge.some(
      (row) => row.kindPrefix === group[zero]?.row.kindPrefix,
    );
    // A merged kind is told only as its merged sentence.
    const told = mergeOf(group) ?? (merged ? [] : tellParagraph(group, "play"));
    push(group, told);
  }

  // Revised as life goes on: a schoolmate or a co-worker who now holds office
  // is remembered in the latest chapter, as the story of that person.
  const offices = options.officeOf ?? officeHolding(core);
  {
    // The employer's and the school's records say who they were; only
    // someone they know by name is remembered.
    const mates = [...person.knownIds]
      .sort()
      .filter((mateId) => offices(mateId))
      .flatMap((mateId) =>
        sharedHistory(core, personId, mateId)
          .filter(
            (row) =>
              row.kind === "schoolmate" ||
              (row.kind === "coworker" && employerIds.includes(row.recordId)),
          )
          .map((row) => ({
            mateId,
            key: `${row.kind}:${row.recordId}:${mateId}`,
            recordId: row.recordId,
            school:
              row.kind === "schoolmate"
                ? core.organizations.get(row.recordId)?.name
                : undefined,
          })),
      );
    for (const { mateId, key, recordId, school } of mates) {
      const office = offices(mateId);
      const said = other(mateId);
      if (!office || !said) continue;
      const facts: Facts = {
        name: said,
        other: said,
        office: { ...office, text: office.text.toLowerCase() },
        ...(school
          ? {
              school: {
                text: properName(school),
                sourceRecordIds: [recordId],
              },
            }
          : {}),
      };
      const ids = [recordId, ...office.sourceRecordIds];
      const said2 = [
        render(
          { part: "memoir", field: "remember" },
          facts,
          `${key}:remember`,
          ids,
        ),
        render(
          // "He became mayor.": the pronoun follows their recorded gender.
          {
            part: "memoir",
            field: "became",
            gender: core.people.get(mateId)?.looks?.gender,
          },
          facts,
          `${key}:became`,
          ids,
        ),
      ].filter(Boolean) as NonNullable<ReturnType<typeof render>>[];
      // Remembering needs saying who they became; a bare name tells nothing.
      if (!saysOffice(said2, office)) continue;
      // The latest chapter, or the first one when nothing else is told yet,
      // titled as every first chapter is (never by the school).
      if (!chapters.length) {
        const place = placeName(person.placeId);
        const title = render(
          { part: "first-title" },
          place ? { place } : {},
          `${key}:title`,
          ids,
        );
        open(`${key}:remember`, title?.text ?? "", through);
      }
      const row = chapters.at(-one)!;
      row.lines.push({
        id: `${row.key}:remember:${mateId}`,
        date: row.through,
        text: journalEntry(said2),
        momentIds: [],
        sourceRecordIds: [
          ...new Set(said2.flatMap((part) => part.sourceRecordIds)),
        ],
      });
      break;
    }
  }

  // A law or a broad event is told only when the person had a part in it.
  for (const entry of book.backdrop) {
    if (entry.date > through) continue;
    const rule = journalBackdrop(entry.kind, words);
    const event = rule ? core.durableLog.get(entry.sourceId) : undefined;
    const stage = rule ? event?.facts?.[rule.stageFact] : undefined;
    if (!rule || !stage || !event?.personIds.includes(personId)) continue;
    const rendered = render(
      { part: "backdrop", kind: rule.kind },
      {},
      entry.id,
      [entry.sourceId],
      stage,
    );
    const home = [...chapters].reverse().find((row) => row.from <= entry.date);
    if (!rendered || !home) continue;
    home.lines.push({
      id: entry.id,
      date: entry.date,
      text: rendered.text,
      momentIds: [],
      sourceRecordIds: rendered.sourceRecordIds,
    });
    home.lines.sort((a, b) => a.date.localeCompare(b.date));
  }
  const kept = chapters.filter((row) => row.lines.length > zero);
  // Said-as: a relative is said by relation and first name the first time
  // the Journal names them ("my father Daniel"), then by first name.
  const kinSaid = [...kin].flatMap(([id, fact]) => {
    const row = core.people.get(id as PersonId);
    const phrase = row
      ? relationPhrase(
          fact.relation,
          row.looks?.gender ?? "other",
          "journal",
          words,
        )
      : undefined;
    return row && phrase ? [{ phrase, given: row.givenName }] : [];
  });
  for (const { phrase, given } of kinSaid) {
    const pattern = new RegExp(
      `\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ${given}\\b`,
      "gi",
    );
    let saidOnce = false;
    for (const line of kept.flatMap((row) => row.lines))
      line.text = line.text.replace(pattern, (whole) => {
        if (!saidOnce) {
          saidOnce = true;
          return whole;
        }
        return given;
      });
  }
  return kept;
}

/**
 * The office a person holds now, from the offices engine's serving terms,
 * as a fact the journal can name: "{name} became {office}."
 */
function officeHolding(
  core: Readonly<CoreState>,
): (personId: PersonId) => Fact | undefined {
  if (!core.modules.has(OFFICES_MODULE_ID)) return () => undefined;
  const api = coreAPI(core as CoreState);
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  return (personId: PersonId): Fact | undefined => {
    const term = (
      terms.query("byPerson", [personId]) as unknown as {
        id: string;
        officeId: string;
        status: string;
      }[]
    ).find((row) => row.status === "serving");
    const office = term
      ? (offices.get(term.officeId) as unknown as
          { title?: string; seats?: number } | undefined)
      : undefined;
    if (!office?.title) return undefined;
    // One of several seats takes an article: "a council member", but "mayor".
    const article = /^[aeiou]/i.test(office.title) ? "an" : "a";
    return {
      text:
        (office.seats ?? one) > one
          ? `${article} ${office.title}`
          : office.title,
      sourceRecordIds: [term!.id],
    };
  };
}

/**
 * The look-back when a life ends (owner, Sept 28): each chapter's opening
 * line, in order, from the same records. The death itself is not worded: no
 * mined sentence says it from these records, so it is left out.
 */
export function composeLookBack(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  words?: JournalWords,
): JournalLine[] {
  const person = core.people.get(personId);
  if (!person || person.alive) return [];
  const lines = composeJournal(core, director, personId, {
    ...(words ? { words } : {}),
  }).map((chapter) => chapter.lines[zero]!);
  return lines;
}
