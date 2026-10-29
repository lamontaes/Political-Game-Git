import {
  corePlaceByJurisdictionId,
  coreStateKeyOfPlaceholderId,
  coreStateName,
} from "../core2/place-lookup";
import { familyFactsOf, FAMILY_PARTNERED } from "../core2/modules/people";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../core2/modules/legislature";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import type { LawRowInput } from "../core2/laws-starting";
import {
  billNumberAndTitle,
  billTitleOf,
  billTitleSaid,
} from "../english/bill-names";
import { topicInSentence } from "../english/policy-names";
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
  journalClosing,
  journalEntry,
  journalRows,
  possessivePronoun,
  relationPhrase,
  saysOffice,
  withArticle,
  wordJournalLine,
  type Fact,
  type JournalMove,
  type JournalWords,
} from "../english/journal-words";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { comingOfAgeOn } from "./coming-of-age";
import type { RACE_MARGINS } from "../english/mined/journal-bank";
import { properName } from "./words";
import {
  PAST_WORK_OUT,
  PAST_WORK_SPELL,
  PERSON_MOVED_IN,
  SCHOOL_STARTED,
  heldSinceRecord,
  pastWorkOf,
  preStartHistory,
  schoolsAttended,
  sharedHistory,
} from "../core2/past";
import { pastParameter } from "../core2/past-module";
import { spanSaid } from "../english/span-words";
import type { Moment } from "./types";
import {
  OFFICE_DAY_MODULE_ID,
  type OfficeActRow,
} from "../core2/modules/office-day";

const zero = P.zero;
const one = P.one;

export interface JournalLine {
  id: string;
  date: IsoDate;
  text: string;
  momentIds: readonly string[];
  sourceRecordIds: readonly string[];
  /** The earlier entries this one revises, when a later record changed what they meant. */
  revises?: readonly string[];
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
function billName(
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
function lawName(
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
function lawTopic(
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
function placeLabel(placeId: string | undefined): string | null {
  if (!placeId) return null;
  const place = corePlaceByJurisdictionId(placeId as never);
  if (place) return place.displayName;
  const state = coreStateKeyOfPlaceholderId(placeId);
  return state ? coreStateName(state.slice("US-".length)) : null;
}

/**
 * The household's own story, read from the records the engines ran for the
 * years before the start (owner, Oct 28, 2026: "simulate to the birth
 * year"): the day the person and their partner set up home and the day their
 * parents did (`family.partnered`, the people engine), where the family came
 * from (the place of their recorded birth), a parent's new job they were old
 * enough to remember (the working-life run), the first school they attended
 * (the school engine's run), what the household's earners do now (their
 * jobs' records), and each parent and sibling the family records name. Each
 * moment cites its record's id; the place is named from the place records,
 * and a person only the writer knows by name is skipped.
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
  // Their own birth, where the run's record puts their family that day: the
  // story starts there (owner, Oct 27: "written like a story from birth").
  for (const row of history("person.birth", person.id)) {
    const actFacts = placeOf(row.placeId, row.id);
    if (actFacts.place)
      moments.push({
        ...base(row.id, row.date),
        causeKind: "person.birth",
        counterpartIds: [],
        selfNamed: true,
        actFacts,
        beat: "roots",
      });
  }
  // The day they and their partner set up home, where their records put
  // them then.
  for (const row of history(FAMILY_PARTNERED, person.id)) {
    const otherId = row.personIds?.find((id) => id !== person.id);
    const actFacts = placeOf(row.placeId, row.id);
    if (otherId && actFacts.place)
      moments.push({
        ...base(row.id, row.date),
        causeKind: "household:partners-met",
        counterpartIds: [otherId],
        actFacts,
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
  // Where the family came from: the place of their recorded birth, when the
  // family lives somewhere else now.
  const birth = history("person.birth", person.id)[zero];
  if (birth?.placeId && birth.placeId !== person.placeId) {
    const actFacts = placeOf(birth.placeId, birth.id);
    if (actFacts.place)
      moments.push({
        ...base(birth.id, birth.date),
        causeKind: "household:roots",
        counterpartIds: [],
        actFacts,
        beat: "roots",
      });
  }
  // The day they came to the county, from the moves engine's run before the
  // start (told as their own move, to where they live now).
  for (const row of history(PERSON_MOVED_IN, person.id))
    moments.push({
      ...base(row.id, row.date),
      causeKind: "moved",
      counterpartIds: [],
      selfNamed: true,
    });
  // A parent's new job, from the working-life run, in the years the person
  // was old enough to remember and still a child at home.
  const remembers = addDays(
    bornOn,
    Math.round(
      pastParameter(null, "pastEarliestMemoryAge") * P.daysPerMeanYear,
    ),
  );
  const grown = addDays(bornOn, Math.round(P.votingAge * P.daysPerMeanYear));
  for (const id of parents)
    for (const row of pastWorkOf(core as CoreState, id as PersonId)) {
      if (row.kind !== PAST_WORK_SPELL) continue;
      const startedAt = String(row.facts.startedAt);
      if (startedAt < remembers || startedAt >= grown) continue;
      moments.push({
        ...base(row.id, startedAt),
        causeKind: "household:moment:parent-new-job",
        counterpartIds: [id as PersonId],
        beat: "work",
      });
    }
  // The first school they attended, and the high school when it was another
  // school, told by the school's own record ("When I was 5, I started at
  // ..."); a school with no record of its own goes unnamed and untold.
  const schools = schoolsAttended(core, person.id).filter((row) => row.name);
  const first = schools.find((row) => row.stage === "elementary");
  const high = schools.find(
    (row) => row.stage === "high" && row.schoolId !== first?.schoolId,
  );
  for (const school of [first, high])
    if (school && school.date < core.startedAt)
      moments.push({
        ...base(school.recordId, school.date),
        causeKind: `household:school-started:${school.stage}`,
        counterpartIds: [],
        actFacts: {
          school: {
            text: properName(school.name!),
            sourceRecordIds: [school.recordId, school.schoolId],
          },
        },
      });
  // What each earner in the household does for work now, by the record of
  // the job they held on day one: the family's livelihood the person grew up
  // inside. The parents first, then the brothers, sisters and partner.
  const household = core.households.get(person.householdId);
  const earners = [...(household?.memberIds ?? [])].sort(
    (a, b) => Number(!parentIds.has(a)) - Number(!parentIds.has(b)),
  );
  const lastDay = addDays(makeIsoDate(core.startedAt), -one);
  for (const [at, id] of earners.entries()) {
    const earner = core.people.get(id);
    const job = earner?.jobId ? core.jobs.get(earner.jobId) : undefined;
    if (!earner?.alive || !job || id === person.id) continue;
    const held = heldSinceRecord(core as CoreState, earner.id, job.id);
    const org = core.organizations.get(job.organizationId);
    const cause = held?.id ?? job.id;
    moments.push({
      ...base(`${cause}:livelihood:${person.id}:${at}`, lastDay),
      causeId: cause,
      causeFactId: cause,
      causeKind: "household:livelihood",
      counterpartIds: [earner.id],
      beat: "work",
      actFacts: {
        job: { text: withArticle(job.title), sourceRecordIds: [job.id] },
        ...(org
          ? {
              employer: {
                text: properName(org.name),
                sourceRecordIds: [job.id, org.id],
              },
            }
          : {}),
      },
    });
  }
  return moments;
}

/**
 * The working life before the start, from the pre-start run's own records
 * (`src/core2/past-work.ts`): the first job after school, each job lost and
 * the time out of work after it, each move to another employer, and the
 * reason on record someone stopped. The job held on day one is told by the
 * line that leads into it.
 */
function pastWorkMoments(
  core: Readonly<CoreState>,
  person: PersonState,
): JournalMoment[] {
  const records = pastWorkOf(core as CoreState, person.id);
  const employer = (row: (typeof records)[number] | undefined) => {
    const org = row?.facts.organizationId
      ? core.organizations.get(String(row.facts.organizationId))
      : undefined;
    return org && row
      ? { text: properName(org.name), sourceRecordIds: [row.id, org.id] }
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
  const moment = (
    row: (typeof records)[number],
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
    const own: Facts = where ? { employer: where } : {};
    if (facts.how === "first-job")
      moments.push(
        moment(row, String(facts.startedAt), "job-started:first", own),
      );
    if (facts.how === "after-out-of-work") {
      const out = [...outAfter.values()].find(
        (entry) => entry.facts.endedAt === facts.startedAt,
      );
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
        }),
      );
    }
    const ended = facts.endedAt ? String(facts.endedAt) : undefined;
    if (!ended) return moments;
    if (facts.end === "let-go")
      moments.push(moment(row, ended, "job-ended:let-go", own));
    else if (facts.end === "moved-on") {
      const next = spells.find((_, i) => i > at);
      const nextAt = employer(next);
      moments.push(
        moment(row, ended, "job-ended:moved-on", {
          ...own,
          ...(nextAt ? { next: nextAt } : {}),
        }),
      );
    } else if (facts.end === "child-born") {
      const child = (person.pastFacts ?? []).find(
        (fact) => fact.id === facts.causeRecordId,
      );
      const childId = child?.facts?.otherPersonId as PersonId | undefined;
      moments.push(
        moment(row, ended, "job-ended:child", own, childId ? [childId] : []),
      );
    } else if (facts.end === "retired")
      moments.push(moment(row, ended, "job-ended:retired", own));
    return moments;
  });
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
          causeKind: `scene-ending:${keeps}`,
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
      if (act.kind === "town-hall") return [moment("act:town-hall")];
      if (act.kind === "interview")
        return act.detail.startsWith("declined")
          ? []
          : [moment("act:interview")];
      if (act.kind !== "vote" || !["yes", "no"].includes(act.detail)) return [];
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
  const saidAs = new Map<string, PersonId>();
  const factsById = new Map((person.pastFacts ?? []).map((f) => [f.id, f]));

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
        // Two relatives with one relation (two daughters) are not both "my
        // daughter": the first keeps it, the next is said by their given name
        // (batch 11: "My daughter was born." twice in one chapter).
        const holder = saidAs.get(text);
        if (!holder || holder === id) {
          saidAs.set(text, id);
          return { text, sourceRecordIds: [relation.factId] };
        }
        return { text: row.givenName, sourceRecordIds: [relation.factId, id] };
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
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    return org
      ? { text: properName(org.name), sourceRecordIds: [job!.id, org.id] }
      : null;
  };
  const placeName = (placeId: string | undefined) => {
    const text = placeLabel(placeId);
    return text ? { text, sourceRecordIds: [placeId!] } : null;
  };

  // The run's work records before the start: each names its own employer.
  const pastWorkIds = new Set(
    pastWorkOf(core as CoreState, personId).map((row) => row.id),
  );
  /** The recorded facts a moment can be told with. */
  const factsFor = (moment: JournalMoment): Facts | null => {
    const facts: Facts = { ...moment.actFacts };
    const fact = moment.causeFactId
      ? factsById.get(moment.causeFactId)
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
      if (value === undefined) return null;
      facts[key] = {
        text:
          spec.format === "money"
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(value) / P.minorPerDollar)
            : spec.format === "count"
              ? Number(value).toLocaleString("en-US")
              : value,
        sourceRecordIds:
          spec.format === "organization"
            ? [moment.causeId, logged!.topic!]
            : [moment.causeId, ...(law?.recordIds ?? [])],
      };
    }
    const hasOwnLine = Boolean(row?.hasOwnLine);
    const toldWithoutOther = Boolean(row?.toldWithoutOther);
    const otherId =
      moment.counterpartIds[zero] ??
      (moment.causeKind === "family:child"
        ? fact?.facts?.otherPersonId
        : undefined);
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
        said.text !== row.givenName
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
    const stage = row.stageFact
      ? core.durableLog.get(moment.causeId)?.facts?.[row.stageFact]
      : undefined;
    return stage !== undefined && row.stageMark && facts[row.stageMark.fact]
      ? `${stage}:${row.stageMark.mark}`
      : stage;
  };

  const through = options.through ?? core.date;
  // Moments of one day are told in the order the rows give: where the family
  // came from, then who raised the person, then their brothers and sisters.
  const rank = (moment: JournalMoment) => {
    const at = rows.findIndex((entry) =>
      moment.causeKind.startsWith(entry.kindPrefix),
    );
    return at < zero ? rows.length : at;
  };
  const moments: JournalMoment[] = [
    ...book.moments,
    ...officeActMoments(core, personId, words),
    ...sceneEndingMoments(core, book, personId),
    ...householdMoments(core, person),
    ...pastWorkMoments(core, person),
    ...comingOfAgeMoments(core, person),
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
  const ageAt = (date: IsoDate) =>
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
  const interrupt =
    DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value;
  const monthSpan =
    core.data.parameters.yearSpanDays!.value / (P.two * P.two * P.two);

  const chapters: JournalChapter[] = [];
  // Where life happened (a school, a job): never a chapter or an entry, only
  // where the person knew someone who matters later.
  const employerIds: string[] = [];
  let chapter: (typeof chapters)[number] | undefined;
  // The chapter a race's turn opened, by contest record id: the race's result
  // is told there, never under whatever chapter another person's race (a
  // relative's, on the same day) opened last.
  const chapterOfContest = new Map<string, (typeof chapters)[number]>();
  let chapterKind: string | undefined;
  const toldOnce = new Set<string>();
  const beatEntries = new Map<string, JournalLine>();
  // Every moment of the person's so far, told or not, and those a later
  // entry has already revised.
  const momentsById = new Map(moments.map((moment) => [moment.id, moment]));
  const revisedAlready = new Set<string>();
  // How each closing line (a hard time, a look-back) ends, its last two
  // words, so none is said twice in one journal.
  const closedWith = new Set<string>();
  const open = (key: string, title: string, date: IsoDate) => {
    chapter = {
      key,
      title,
      from: date,
      through: date,
      lines: [],
    };
    chapters.push(chapter);
  };
  const stories = moments.filter(
    (moment) => rowOf(moment)?.entry !== "setting",
  );
  let wonBefore = false;
  let lostBefore = false;
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
      if (toldOnce.has(`${row.kindPrefix}|${once}`)) continue;
      toldOnce.add(`${row.kindPrefix}|${once}`);
    }
    const sourceIds = [moment.causeId];
    // A setting is where life happened, not something that happened: it
    // neither opens a chapter nor titles one.
    if (row.entry === "setting") {
      const employer = facts.employer?.sourceRecordIds.at(-one);
      if (employer) employerIds.push(employer);
      continue;
    }
    // A turn opens a chapter titled by its record (a race, a child), unless
    // the chapter began with the same kind of turn.
    // A turn of the same kind about someone else opens its own chapter: a
    // daughter's birth is never told under "My son".
    const ownTitle =
      row.turn && chapterKind === row.kindPrefix
        ? render(
            { part: "title", kindPrefix: row.kindPrefix },
            facts,
            `${moment.id}:title`,
            sourceIds,
          )
        : null;
    if (
      !chapter ||
      (row.turn && chapterKind !== row.kindPrefix) ||
      (ownTitle && ownTitle.text !== chapter.title)
    ) {
      chapterKind = row.turn ? row.kindPrefix : undefined;
      const place = placeName(person.placeId);
      const title =
        ownTitle ??
        render(
          { part: "title", kindPrefix: row.kindPrefix },
          facts,
          `${moment.id}:title`,
          sourceIds,
        ) ??
        render(
          { part: "first-title" },
          place ? { ...facts, place } : facts,
          `${moment.id}:title`,
          sourceIds,
        );
      open(moment.id, title?.text ?? "", moment.date);
    }
    const contestId = core.durableLog.get(moment.causeId)?.facts?.contestId;
    if (typeof contestId === "string" && row.turn)
      chapterOfContest.set(contestId, chapter!);
    const told =
      (typeof contestId === "string" && !row.turn
        ? chapterOfContest.get(contestId)
        : undefined) ?? chapter!;
    // The scene: the event itself, worded for whose it was.
    const own =
      !!selfCount ||
      !!moment.selfNamed ||
      !facts.other ||
      moment.causeKind === "family:child";
    // A move the household made together is "we".
    const together =
      (selfCount ??
        (row.sameDay
          ? ownEvents.get(`${row.sameDay}|${moment.date}`)
          : undefined) ??
        one) > one;
    const age = ageAt(moment.date);
    const young = age < P.votingAge;
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
    else
      event = render(
        {
          part: "line",
          kindPrefix: row.kindPrefix,
          whose: own ? "own" : "other",
          together,
        },
        facts,
        moment.id,
        sourceIds,
        // Someone else's race is told by the record's result for them; a
        // line worded by an event fact (a vote's yes or no) by that fact.
        !own && row.hasOwnLine
          ? facts.winner?.text === moment.counterpartIds[zero]
            ? "won"
            : "lost"
          : stageOf(row, moment, facts),
      );
    if (!event) continue;
    const parts = [event];
    // When they were young, the age frames it: "When I was 7, my father died."
    // Only what happened around a young person (a death, a move, an
    // illness), as the row says; never a race or their own child's birth.
    if (young && row.framesAge) {
      const frame = render(
        { part: "memoir", field: "whenAge" },
        {
          ...facts,
          age: { text: String(age), sourceRecordIds: [person.id] },
        },
        `${moment.id}:age`,
        sourceIds,
      );
      // A mined opening clause leads into the event.
      if (frame) parts[zero] = framedByAge(frame, event, facts);
    }
    // A death in the family or a lost job is a hard time.
    if (
      (moment.causeKind === "event:life.death" &&
        !!facts.other &&
        kin.has(moment.counterpartIds[zero]!)) ||
      ((moment.causeKind === "job-ended" ||
        moment.causeKind === "job-ended:let-go") &&
        own)
    ) {
      const hard = render(
        { part: "memoir", field: "hard", closedWith },
        facts,
        `${moment.id}:hard`,
        sourceIds,
      );
      if (hard) {
        closedWith.add(journalClosing(hard));
        parts.push(hard);
      }
    }
    // Looking back: a moment whose weight grew with the people in it, when
    // life went on after it.
    // The consequence is on record: a later story involves the same person.
    const later = stories.some(
      (row) =>
        row.date > moment.date &&
        row.counterpartIds.some((id) => moment.counterpartIds.includes(id)),
    );
    // "That was a turning point" only when the record shows one: a later
    // chapter of another kind opened in this life.
    const turned =
      !!row.turn &&
      stories.some((story) => {
        const next = rowOf(story);
        return (
          story.date > moment.date &&
          !!next?.turn &&
          next.kindPrefix !== row.kindPrefix
        );
      });
    // Revised by what came after, as a memoir with hindsight: a moment that
    // weighed little then, told or not ("an uneventful high school chapter
    // gains 'except for one person' twenty years on"), and since grown by the
    // same person coming back, is looked back on in the entry that echoes it.
    // Only when the record shows it: the earlier moment's weight then, against
    // its weight now. Time has passed since: an eighth of a year at least,
    // never the same season's moments revising each other.
    const changed = moment.echoes
      .filter((link) => link.earlierKind === "moment")
      .map((link) => momentsById.get(link.earlierId))
      .filter(
        (earlier): earlier is JournalMoment =>
          !!earlier &&
          !revisedAlready.has(earlier.id) &&
          earlier.impact < interrupt &&
          earlier.hindsight >= interrupt &&
          daysBetween(makeIsoDate(earlier.date), makeIsoDate(moment.date)) >=
            monthSpan &&
          earlier.counterpartIds.includes(moment.counterpartIds[zero]!),
      )
      .sort((a, b) => b.hindsight - a.hindsight || a.id.localeCompare(b.id))[
      zero
    ];
    const revision =
      changed && facts.name
        ? render(
            { part: "memoir", field: "revise" },
            facts,
            `${moment.id}:revise`,
            [changed.causeId, moment.causeId],
          )
        : null;
    if (changed && revision) {
      revisedAlready.add(changed.id);
      parts.push(revision);
    }
    if (!revision && later && moment.hindsight >= interrupt) {
      // A look-back is said once: no two end the same way ("at the time").
      const hook = render(
        {
          part: "memoir",
          field: "hook",
          closedWith,
          lookBack: {
            memorableOnly: row.lookBack === "memorable",
            young,
            turned,
          },
        },
        facts,
        `${moment.id}:hook`,
        sourceIds,
      );
      if (hook) {
        closedWith.add(journalClosing(hook));
        parts.push(hook);
      }
    }
    const entry = {
      id: moment.id,
      date: moment.date,
      text: journalEntry(parts),
      momentIds: [moment.id],
      sourceRecordIds: [
        ...new Set(parts.flatMap((part) => part.sourceRecordIds)),
      ],
      ...(changed && revision ? { revises: [changed.id] } : {}),
    };
    // A beat of the household's story (where the family came from, who
    // raised the person, what they did for a living) is one memoir entry, its
    // sentences told in the order the records give them.
    const joined = moment.beat ? beatEntries.get(moment.beat) : undefined;
    if (joined) {
      joined.text = `${joined.text} ${entry.text}`;
      joined.momentIds = [...joined.momentIds, moment.id];
      joined.sourceRecordIds = [
        ...new Set([...joined.sourceRecordIds, ...entry.sourceRecordIds]),
      ];
    } else {
      told.lines.push(entry);
      if (moment.beat) beatEntries.set(moment.beat, entry);
    }
    if (moment.date > told.through) told.through = moment.date;
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
  return chapters.filter((row) => row.lines.length > zero);
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
