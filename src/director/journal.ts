import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../core2/modules/legislature";
import { billTitleOf } from "../english/bill-names";
import type { CoreState, IsoDate, PersonId, PersonState } from "../core2/types";
import { ageOnDate, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
  type GroundedEnglishKnowledge,
} from "../english/grounded-english";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { properName } from "./words";
import { journalDataFromBank } from "./mined/journal-bank";
import type { Moment } from "./types";
import {
  OFFICE_DAY_MODULE_ID,
  type OfficeActRow,
} from "../core2/modules/office-day";

const zero = P.zero;
const one = P.one;

interface LineRow {
  kindPrefix: string;
  turn: boolean;
  /** A setting (a school, a job) names a chapter; a story is an entry. */
  entry?: "story" | "setting";
  /** One's own race, worded by result (stage "won" or "lost"). */
  ownLine?: readonly {
    key: string;
    text: string;
    stages?: readonly string[];
  }[];
  /** Facts read from the causing event's own record. */
  eventFacts?: Readonly<Record<string, { fact: string; format: string }>>;
  /** An event fact that names the stage a line is worded in (a vote, "yes" or "no"). */
  stageFact?: string;
  line: readonly { key: string; text: string; stages?: readonly string[] }[];
  otherLine?: readonly {
    key: string;
    text: string;
    stages?: readonly string[];
  }[];
  repeatLine?: readonly { key: string; text: string }[];
  title?: readonly { key: string; text: string }[];
  /** The person's own moment when the causing event names them among its people. */
  selfWhenNamed?: boolean;
  /** The own line when the causing event names others with them ("we"). */
  groupLine?: readonly { key: string; text: string }[];
  /**
   * The kind of the person's own event this line tells on the same day: that
   * event's line is not written again, and its others make this the group line.
   */
  sameDay?: string;
  /** A fact told once: a later moment with the same text for it is skipped. */
  oncePer?: string;
  /** What happens around a young person (a death, a move): their age frames it. */
  framesAge?: boolean;
  /** The kind of look-back the moment takes: only a memorable one for a birth. */
  lookBack?: "memorable";
}

/** A journal row's structure before the mined bank words it. */
export interface RowShape {
  kindPrefix: string;
  turn: boolean;
  entry?: "story" | "setting";
  /** The row has a line for one's own race, by result. */
  hasOwnLine?: boolean;
  eventFacts?: LineRow["eventFacts"];
  /** An event fact that names the stage a line is worded in, with the words that mark each stage. */
  stageFact?: string;
  stageWords?: Readonly<Record<string, string>>;
  title?: LineRow["title"];
  selfWhenNamed?: boolean;
  sameDay?: string;
  oncePer?: string;
  framesAge?: boolean;
  lookBack?: "memorable";
  /** The mined target whose sentences word this row, when it is not the row's own kind. */
  wordsFrom?: string;
  /** The row also has a line for someone else's moment. */
  hasOtherLine?: boolean;
  /** The row folds repeats into one line. */
  hasRepeatLine?: boolean;
  /** The row has a line for a group the person was part of ("we"). */
  hasGroupLine?: boolean;
}

/** `data/journal-rows.json`: the journal's structure, holding no sentences. */
export interface JournalRows {
  version: string;
  relationWords: JournalData["relationWords"];
  possessive: JournalData["possessive"];
  possessivePronoun: JournalData["possessivePronoun"];
  countWords: JournalData["countWords"];
  manyTimes: string;
  billForms?: JournalData["billForms"];
  lines: readonly RowShape[];
  firstTitle: JournalData["firstTitle"];
  lookBacks?: JournalData["lookBacks"];
  backdropLines?: readonly {
    kind: string;
    stageFact: string;
    stages: readonly string[];
  }[];
}

export interface JournalData {
  version: string;
  relationWords: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The possessive each surface names relatives with ("my", "your"). */
  possessive: Readonly<Record<string, string>>;
  /** The possessive for someone by their recorded gender ("his", "her", "their"). */
  possessivePronoun: Readonly<Record<string, string>>;
  countWords: readonly string[];
  manyTimes: string;
  /** The word a bill's form goes by before its number ("Ordinance 2027-3"). */
  billForms?: Readonly<Record<string, string>>;
  lines: readonly LineRow[];
  firstTitle: readonly { key: string; text: string }[];
  /**
   * Which look-backs fit which moment, by part key: `memorable` ones ("I'll
   * never forget that") are the only ones a birth takes (owner, batch 9: "My
   * daughter was born. I didn't know that at the time." makes no sense), and
   * `youngOnly` ones ("I never knew") fit only a moment from childhood.
   */
  lookBacks?: Readonly<{
    memorable?: readonly string[];
    youngOnly?: readonly string[];
    /** Said only when a later chapter of another kind opened (owner, Oct 15). */
    turning?: readonly string[];
  }>;
  /** The memoir's framing and look-back sentences, by field (whenAge, hook, remember, ...). */
  memoir?: Readonly<Record<string, readonly { key: string; text: string }[]>>;
  /** Broad events that reached the person, written as lines in their story. */
  backdropLines?: readonly {
    kind: string;
    stageFact: string;
    line: readonly { key: string; text: string; stages?: readonly string[] }[];
  }[];
}

/** The journal's default data: its structure with the mined bank's sentences. */
export const JOURNAL_DATA: JournalData = journalDataFromBank();

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
interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}
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
> & { readonly actFacts?: Facts };

function bank(
  key: string,
  rows: readonly { key: string; text: string; stages?: readonly string[] }[],
  version: string,
): AuthoredEnglishBank {
  return {
    key,
    version,
    surface: "journal",
    variants: rows.map((row) => ({ ...row, kind: "template" as const })),
  };
}

/**
 * A bill's real name, from the legislature's own record of it: "Wage Floor
 * Increase Act". Undefined where the bill is not on record or has no name,
 * and the line that would name it is left out.
 */
function billName(
  core: Readonly<CoreState>,
  billId: string | undefined,
): string | undefined {
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const api = coreAPI(core as CoreState);
  const row = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  return row ? (billTitleOf(row)?.title ?? undefined) : undefined;
}

/** The person's relatives by id, with the family fact that records each. */
function relatives(person: PersonState) {
  const out = new Map<PersonId, { relation: string; factId: string }>();
  for (const fact of person.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    if (!otherId || !fact.kind.startsWith("family:")) continue;
    if (!out.has(otherId))
      out.set(otherId, {
        relation: fact.kind.slice("family:".length),
        factId: fact.id,
      });
  }
  return out;
}

/**
 * The household's own story, read from the dated facts the family history
 * keeps on a person (`core2/past-family.ts`): where they met their partner,
 * where their family came from, and a parent's new job they remember. Each
 * moment cites its fact's record id; the place is named from the place
 * records, and a person only the writer knows by name is skipped.
 */
function householdMoments(person: PersonState): JournalMoment[] {
  return (person.pastFacts ?? []).flatMap((fact): JournalMoment[] => {
    const base = {
      id: fact.id,
      date: fact.date as IsoDate,
      causeId: fact.id,
      causeFactId: fact.id,
      hindsight: zero,
    };
    const place = (placeId: string | undefined): Facts => {
      const row = placeId ? corePlaceByJurisdictionId(placeId as never) : null;
      return row
        ? { place: { text: row.displayName, sourceRecordIds: [fact.id] } }
        : {};
    };
    if (fact.kind === "household:partners-met") {
      const otherId = fact.facts?.otherPersonId;
      const actFacts = place(fact.facts?.placeId);
      return otherId && actFacts.place
        ? [
            {
              ...base,
              causeKind: fact.kind,
              counterpartIds: [otherId],
              actFacts,
            },
          ]
        : [];
    }
    if (fact.kind === "household:roots") {
      const first = (fact.facts?.parentBirthplaces ?? "")
        .split(" ")
        .find((id) => id && corePlaceByJurisdictionId(id as never));
      const actFacts = place(first);
      return actFacts.place
        ? [{ ...base, causeKind: fact.kind, counterpartIds: [], actFacts }]
        : [];
    }
    if (
      fact.kind === "household:moment" &&
      fact.facts?.about === "parent-new-job" &&
      fact.facts.otherPersonId
    )
      return [
        {
          ...base,
          causeKind: `${fact.kind}:parent-new-job`,
          counterpartIds: [fact.facts.otherPersonId],
        },
      ];
    return [];
  });
}

/**
 * What the person did in office, read from the acts the office-day engine
 * keeps (a vote, a town hall, an interview): each is a moment the journal
 * tells, citing the act's own record and, for a vote, the bill.
 */
function officeActMoments(
  core: Readonly<CoreState>,
  personId: PersonId,
  data: JournalData,
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
      const form = data.billForms?.[bill.form.kind];
      return [
        moment(`act:vote-${act.detail}`, {
          law: {
            text: form ? `${form} ${bill.number}` : bill.number,
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
    data?: JournalData;
    /** Who holds which office now; the offices engine's serving terms by default. */
    officeOf?: (personId: PersonId) => Fact | undefined;
  } = {},
): JournalChapter[] {
  const data = options.data ?? JOURNAL_DATA;
  const person = core.people.get(personId);
  const book = director.ledger.people.get(personId);
  if (!person || !book) return [];
  const kin = relatives(person);
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
      const words = data.relationWords[relation.relation];
      const gender = row.looks?.gender ?? "other";
      const word = words?.[gender] ?? words?.other;
      if (word) {
        // Two relatives with one relation (two daughters) are not both "my
        // daughter": the first keeps it, the next is said by their given name
        // (batch 11: "My daughter was born." twice in one chapter).
        const text = `${data.possessive.journal} ${word}`;
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
    const place = placeId ? corePlaceByJurisdictionId(placeId as never) : null;
    return place
      ? { text: place.displayName, sourceRecordIds: [placeId!] }
      : null;
  };

  /** The recorded facts a moment can be told with. */
  const factsFor = (moment: JournalMoment): Facts | null => {
    const facts: Facts = { ...moment.actFacts };
    const fact = moment.causeFactId
      ? factsById.get(moment.causeFactId)
      : undefined;
    if (fact?.facts?.schoolName)
      facts.school = {
        text: properName(fact.facts.schoolName),
        sourceRecordIds: [fact.id],
      };
    if (moment.causeKind === "work:opening") {
      const employer = employerOf(person.jobId);
      if (employer) facts.employer = employer;
    }
    if (moment.causeKind.startsWith("job-")) {
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
    const row = data.lines.find((entry) =>
      moment.causeKind.startsWith(entry.kindPrefix),
    );
    const logged = core.durableLog.get(moment.causeId);
    for (const [key, spec] of Object.entries(row?.eventFacts ?? {})) {
      // An organization the event is about is named from its own record.
      const value =
        spec.format === "organization"
          ? core.organizations.get(logged?.topic ?? "")?.name
          : spec.format === "billName"
            ? billName(core, logged?.facts?.[spec.fact])
            : logged?.facts?.[spec.fact];
      if (value === undefined) return null;
      facts[key] = {
        text:
          spec.format === "money"
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(value) / P.minorPerDollar)
            : value,
        sourceRecordIds:
          spec.format === "organization"
            ? [moment.causeId, logged!.topic!]
            : [moment.causeId],
      };
    }
    const otherId =
      moment.counterpartIds[zero] ??
      (moment.causeKind === "family:child"
        ? fact?.facts?.otherPersonId
        : undefined);
    if (otherId) {
      const said = other(otherId);
      if (!said) return null;
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
        text:
          data.possessivePronoun[row?.looks?.gender ?? "other"] ??
          data.possessivePronoun.other!,
        sourceRecordIds: said.sourceRecordIds,
      };
      if (row)
        facts.name = {
          text: row.givenName,
          sourceRecordIds: said.sourceRecordIds,
        };
    }
    return facts;
  };

  const render = (
    key: string,
    rows:
      | readonly { key: string; text: string; stages?: readonly string[] }[]
      | undefined,
    facts: Facts,
    momentKey: string,
    sourceIds: readonly string[],
    stage = "journal",
  ) => {
    if (!rows?.length || !sourceIds.length) return null;
    // Core record ids stand in for the engine's entity ids.
    const knowledge = Object.entries(facts).map(([factKey, fact]) => ({
      personId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })) as unknown as GroundedEnglishKnowledge[];
    const result = renderGroundedEnglish(
      {
        surface: "journal",
        momentKey,
        worldSeed: core.seed,
        bankVersion: data.version,
        stage,
        sourceRecordIds: sourceIds,
        facts,
        viewer: { personId, traits: {} },
        knowledge,
      } as unknown as GroundedEnglishPacket,
      bank(key, rows, data.version),
    );
    if (result.kind !== "rendered") return null;
    // A line or title starts with a capital, whatever its first slot holds.
    return {
      ...result,
      text: result.text.charAt(zero).toUpperCase() + result.text.slice(one),
    };
  };

  const through = options.through ?? core.date;
  const moments: JournalMoment[] = [
    ...book.moments,
    ...officeActMoments(core, personId, data),
    ...householdMoments(person),
  ]
    .filter((moment) => moment.date <= through)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const rowOf = (moment: JournalMoment) =>
    data.lines.find((entry) => moment.causeKind.startsWith(entry.kindPrefix));
  const memoir = data.memoir ?? {};
  const ageAt = (date: IsoDate) =>
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
  const interrupt =
    DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value;
  const monthSpan =
    core.data.parameters.yearSpanDays!.value / (P.two * P.two * P.two);
  const lower = (text: string) =>
    text.charAt(zero).toLowerCase() + text.slice(one);
  // A line that opens with a fact (a person's name) keeps its capital.
  const opensWithFact = (
    text: string,
    facts: Readonly<Record<string, { text: string }>>,
  ) =>
    Object.values(facts).some(
      (fact) => fact.text.length > zero && text.startsWith(fact.text),
    );

  const chapters: JournalChapter[] = [];
  // Where life happened (a school, a job): never a chapter or an entry, only
  // where the person knew someone who matters later (owner, Oct 14).
  const settingFactIds: string[] = [];
  const employerIds: string[] = [];
  let chapter: (typeof chapters)[number] | undefined;
  let chapterKind: string | undefined;
  const toldOnce = new Set<string>();
  // The entries told so far, and those a later entry has already revised.
  const toldMoments = new Map<string, JournalMoment>();
  const revisedAlready = new Set<string>();
  // How each closing line (a hard time, a look-back) ends, its last two
  // words, so none is said twice in one journal.
  const closedWith = new Set<string>();
  const fits = {
    memorable: new Set(data.lookBacks?.memorable ?? []),
    youngOnly: new Set(data.lookBacks?.youngOnly ?? []),
    turning: new Set(data.lookBacks?.turning ?? []),
  };
  const closing = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(-P.two)
      .join(" ");
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
          `journal-line:${row.kindPrefix}:check`,
          row.groupLine ?? row.line,
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
      if (moment.causeFactId) settingFactIds.push(moment.causeFactId);
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
            `journal-title:${row.kindPrefix}`,
            row.title,
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
          `journal-title:${row.kindPrefix}`,
          row.title,
          facts,
          `${moment.id}:title`,
          sourceIds,
        ) ??
        render(
          "journal-title:first",
          data.firstTitle,
          place ? { ...facts, place } : facts,
          `${moment.id}:title`,
          sourceIds,
        );
      open(moment.id, title?.text ?? "", moment.date);
    }
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
    const young = age < P.benchmarkAdultMinimumAge;
    let event: ReturnType<typeof render> = null;
    if (row.ownLine && own) {
      const won = facts.winner?.text === personId;
      const stage = won ? "won" : "lost";
      // Losing a first race is the start of a story, not its end.
      const first = !won && !wonBefore && !lostBefore;
      event =
        (first
          ? render(
              "journal-memoir:lost",
              memoir.lost,
              facts,
              `${moment.id}:first`,
              sourceIds,
            )
          : null) ??
        render(
          `journal-line:${row.kindPrefix}:own`,
          row.ownLine,
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
          "journal-memoir:decided",
          memoir.decided,
          facts,
          moment.id,
          sourceIds,
        ) ??
        render(
          `journal-line:${row.kindPrefix}:own`,
          row.line,
          facts,
          moment.id,
          sourceIds,
        );
    else
      event = render(
        `journal-line:${row.kindPrefix}:${own ? "own" : "other"}`,
        own
          ? together
            ? (row.groupLine ?? row.line)
            : row.line
          : (row.otherLine ?? row.line),
        facts,
        moment.id,
        sourceIds,
        // Someone else's race is told by the record's result for them; a
        // line worded by an event fact (a vote's yes or no) by that fact.
        !own && row.ownLine
          ? facts.winner?.text === moment.counterpartIds[zero]
            ? "won"
            : "lost"
          : row.stageFact
            ? core.durableLog.get(moment.causeId)?.facts?.[row.stageFact]
            : undefined,
      );
    if (!event) continue;
    const parts = [event];
    // When they were young, the age frames it: "When I was 7, my father died."
    // Only what happened around a young person (a death, a move, an
    // illness), as the row says; never a race or their own child's birth.
    if (young && row.framesAge) {
      const frame = render(
        "journal-memoir:when-age",
        memoir.whenAge,
        {
          ...facts,
          age: { text: String(age), sourceRecordIds: [person.id] },
        },
        `${moment.id}:age`,
        sourceIds,
      );
      // A mined opening clause ends as a sentence; it leads into the event.
      if (frame)
        parts[zero] = {
          ...event,
          text: `${frame.text.replace(/[.]$/, ",")} ${opensWithFact(event.text, facts) ? event.text : lower(event.text)}`,
          sourceRecordIds: [
            ...new Set([...frame.sourceRecordIds, ...event.sourceRecordIds]),
          ],
        };
    }
    // A death in the family or a lost job is a hard time.
    if (
      (moment.causeKind === "event:life.death" &&
        !!facts.other &&
        kin.has(moment.counterpartIds[zero]!)) ||
      (moment.causeKind.startsWith("job-ended") && own)
    ) {
      const hard = render(
        "journal-memoir:hard",
        memoir.hard?.filter((row) => !closedWith.has(closing(row.text))),
        facts,
        `${moment.id}:hard`,
        sourceIds,
      );
      if (hard) {
        closedWith.add(closing(hard.text));
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
    // chapter of another kind opened in this life (owner, Oct 15).
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
    // Revised by what came after (owner, Oct 15: a memoir with hindsight):
    // an entry told as small, and since grown by the same person coming back,
    // is looked back on in the entry that echoes it. Only when the record
    // shows it: the earlier entry's weight then, against its weight now.
    // Time has passed since: an eighth of a year at least, never the same season's
    // entries revising each other.
    const changed = moment.echoes
      .filter((link) => link.earlierKind === "moment")
      .map((link) => toldMoments.get(link.earlierId))
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
            "journal-memoir:revise",
            memoir.revise,
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
        "journal-memoir:hook",
        memoir.hook?.filter(
          (entry) =>
            !closedWith.has(closing(entry.text)) &&
            (row.lookBack !== "memorable" || fits.memorable.has(entry.key)) &&
            (young || !fits.youngOnly.has(entry.key)) &&
            (turned || !fits.turning.has(entry.key)),
        ),
        facts,
        `${moment.id}:hook`,
        sourceIds,
      );
      if (hook) {
        closedWith.add(closing(hook.text));
        parts.push(hook);
      }
    }
    chapter!.lines.push({
      id: moment.id,
      date: moment.date,
      text: parts.map((part) => part.text).join(" "),
      momentIds: [moment.id],
      sourceRecordIds: [
        ...new Set(parts.flatMap((part) => part.sourceRecordIds)),
      ],
      ...(changed && revision ? { revises: [changed.id] } : {}),
    });
    toldMoments.set(moment.id, moment);
    chapter!.through = moment.date;
  }

  const fitsGender = (text: string, id: PersonId) => {
    const lead = /^(he|she)\b/i.exec(text)?.[one]?.toLowerCase();
    if (!lead) return true;
    const gender = core.people.get(id)?.looks?.gender;
    return (
      (lead === "he" && gender === "male") ||
      (lead === "she" && gender === "female")
    );
  };
  // Revised as life goes on: a schoolmate or a co-worker who now holds office
  // is remembered in the latest chapter, as the story of that person.
  const offices = options.officeOf ?? officeHolding(core);
  {
    const mates = (person.pastFacts ?? []).filter(
      (fact) =>
        (fact.kind === "social:generated-school-acquaintance" &&
          settingFactIds.includes(fact.facts?.contextFactId ?? "")) ||
        (fact.kind === "social:generated-coworker" &&
          employerIds.includes(
            core.jobs.get((fact.facts?.contextFactId ?? "").split(":")[zero]!)
              ?.organizationId ?? "",
          )),
    );
    for (const fact of mates) {
      const mateId = fact.facts?.otherPersonId;
      const office = mateId ? offices(mateId) : undefined;
      const said = mateId ? other(mateId) : undefined;
      if (!office || !said) continue;
      const setting = settingFactIds
        .map((id) => factsById.get(id))
        .find((entry) => entry?.facts?.schoolName);
      const facts: Facts = {
        name: said,
        other: said,
        office: { ...office, text: office.text.toLowerCase() },
        ...(setting
          ? {
              school: {
                text: properName(setting.facts!.schoolName!),
                sourceRecordIds: [setting.id],
              },
            }
          : {}),
      };
      const ids = [fact.id, ...office.sourceRecordIds];
      const said2 = [
        render(
          "journal-memoir:remember",
          // Only a sentence that names them: "We were friends." points to no one.
          memoir.remember?.filter((row) => row.text.includes("{{name}}")),
          facts,
          `${fact.id}:remember`,
          ids,
        ),
        render(
          "journal-memoir:became",
          // "He became mayor.": the pronoun follows their recorded gender.
          memoir.became?.filter((row) => fitsGender(row.text, mateId!)),
          facts,
          `${fact.id}:became`,
          ids,
        ),
      ].filter(Boolean) as NonNullable<ReturnType<typeof render>>[];
      // Remembering needs saying who they became; a bare name tells nothing.
      if (!said2.some((part) => part.text.includes(office.text.toLowerCase())))
        continue;
      // The latest chapter, or the first one when nothing else is told yet,
      // titled as every first chapter is (never by the school).
      if (!chapters.length) {
        const place = placeName(person.placeId);
        const title = render(
          "journal-title:first",
          data.firstTitle,
          place ? { place } : {},
          `${fact.id}:title`,
          ids,
        );
        open(`${fact.id}:remember`, title?.text ?? "", through);
      }
      const row = chapters.at(-one)!;
      row.lines.push({
        id: `${row.key}:remember:${mateId}`,
        date: row.through,
        text: said2.map((part) => part.text).join(" "),
        momentIds: [],
        sourceRecordIds: [
          ...new Set(said2.flatMap((part) => part.sourceRecordIds)),
        ],
      });
      break;
    }
  }

  // A law or a broad event is told only when the person had a part in it
  // (owner, Oct 14: "The bill passed" is not a chapter about a son).
  for (const entry of book.backdrop) {
    if (entry.date > through) continue;
    const rule = data.backdropLines?.find((row) => row.kind === entry.kind);
    const event = rule ? core.durableLog.get(entry.sourceId) : undefined;
    const stage = rule ? event?.facts?.[rule.stageFact] : undefined;
    if (!rule || !stage || !event?.personIds.includes(personId)) continue;
    const rendered = render(
      `journal-backdrop:${rule.kind}`,
      rule.line,
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
  data: JournalData = JOURNAL_DATA,
): JournalLine[] {
  const person = core.people.get(personId);
  if (!person || person.alive) return [];
  const lines = composeJournal(core, director, personId, { data }).map(
    (chapter) => chapter.lines[zero]!,
  );
  return lines;
}
