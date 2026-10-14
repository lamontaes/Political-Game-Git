/**
 * "My life" on the new core: a first-person memoir in chapters, written by
 * the English engine from the story director's moments and the person's own
 * records (owner, Sept 22 and Oct 1; Oct 14: "a dramatized story, not a list
 * of facts").
 *
 * A school or a job is a setting, never an entry by itself: it names a
 * chapter, and the chapter is told only when something happened in it. Each
 * entry is a scene: the event, framed by the person's age when they were
 * young ("When I was 7, my father died."), a hard time after a loss, and a
 * look-back when the moment's hindsight (its impact grown by how much the
 * people in it matter now) reaches the interrupt line. Running, winning and
 * losing are entries. The journal is composed when it is read, so it is
 * revised as life goes on: a quiet school chapter gains the schoolmate who
 * later holds office ("except for {name}"). Every slot is a recorded fact;
 * a feeling is never invented.
 */
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import type { CoreState, IsoDate, PersonId, PersonState } from "../core2/types";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
  type GroundedEnglishKnowledge,
} from "../presentation/grounded-english";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { properName } from "./words";
import { journalDataFromBank } from "./mined/journal-bank";
import type { Moment } from "./types";

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
  line: readonly { key: string; text: string }[];
  otherLine?: readonly { key: string; text: string }[];
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
}

/** A journal row's structure before the mined bank words it. */
export interface RowShape {
  kindPrefix: string;
  turn: boolean;
  entry?: "story" | "setting";
  /** The row has a line for one's own race, by result. */
  hasOwnLine?: boolean;
  eventFacts?: LineRow["eventFacts"];
  title?: LineRow["title"];
  selfWhenNamed?: boolean;
  sameDay?: string;
  oncePer?: string;
  framesAge?: boolean;
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
  lines: readonly RowShape[];
  firstTitle: JournalData["firstTitle"];
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
  lines: readonly LineRow[];
  firstTitle: readonly { key: string; text: string }[];
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
      if (word)
        return {
          text: `${data.possessive.journal} ${word}`,
          sourceRecordIds: [relation.factId],
        };
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
    const place = placeId ? lifePlaceByJurisdictionId(placeId as never) : null;
    return place
      ? { text: place.displayName, sourceRecordIds: [placeId!] }
      : null;
  };

  /** The recorded facts a moment can be told with. */
  const factsFor = (moment: Moment): Facts | null => {
    const facts: Facts = {};
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
      facts.other = said;
      const row = core.people.get(otherId);
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
  const moments = book.moments
    .filter((moment) => moment.date <= through)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const rowOf = (moment: Moment) =>
    data.lines.find((entry) => moment.causeKind.startsWith(entry.kindPrefix));
  const memoir = data.memoir ?? {};
  const ageAt = (date: IsoDate) =>
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
  const interrupt =
    DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value;
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

  const chapters: (JournalChapter & {
    settingFactIds: string[];
    employerIds: string[];
  })[] = [];
  let chapter: (typeof chapters)[number] | undefined;
  let chapterKind: string | undefined;
  const toldOnce = new Set<string>();
  const open = (key: string, title: string, date: IsoDate) => {
    chapter = {
      key,
      title,
      from: date,
      through: date,
      lines: [],
      settingFactIds: [],
      employerIds: [],
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
  const selfNamed = (moment: Moment) =>
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
    // A turn opens a chapter titled by its record (a school, an employer, a
    // race), unless the chapter began with the same kind of turn.
    if (!chapter || (row.turn && chapterKind !== row.kindPrefix)) {
      chapterKind = row.turn ? row.kindPrefix : undefined;
      const place = placeName(person.placeId);
      const title =
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
    // A setting is where life happened, not something that happened.
    if (row.entry === "setting") {
      if (moment.causeFactId) chapter!.settingFactIds.push(moment.causeFactId);
      const employer = facts.employer?.sourceRecordIds.at(-one);
      if (employer) chapter!.employerIds.push(employer);
      continue;
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
        memoir.hard,
        facts,
        `${moment.id}:hard`,
        sourceIds,
      );
      if (hard) parts.push(hard);
    }
    // Looking back: a moment whose weight grew with the people in it, when
    // life went on after it.
    // The consequence is on record: a later story involves the same person.
    const later = stories.some(
      (row) =>
        row.date > moment.date &&
        row.counterpartIds.some((id) => moment.counterpartIds.includes(id)),
    );
    if (later && moment.hindsight >= interrupt) {
      const hook = render(
        "journal-memoir:hook",
        memoir.hook,
        facts,
        `${moment.id}:hook`,
        sourceIds,
      );
      if (hook) parts.push(hook);
    }
    chapter!.lines.push({
      id: moment.id,
      date: moment.date,
      text: parts.map((part) => part.text).join(" "),
      momentIds: [moment.id],
      sourceRecordIds: [
        ...new Set(parts.flatMap((part) => part.sourceRecordIds)),
      ],
    });
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
  // Revised as life goes on: a schoolmate or a co-worker from a chapter who
  // now holds office is remembered there, and a quiet chapter turns on them.
  const offices = options.officeOf ?? officeHolding(core);
  for (const row of chapters) {
    const mates = (person.pastFacts ?? []).filter(
      (fact) =>
        (fact.kind === "social:generated-school-acquaintance" &&
          row.settingFactIds.includes(fact.facts?.contextFactId ?? "")) ||
        (fact.kind === "social:generated-coworker" &&
          row.employerIds.includes(
            core.jobs.get((fact.facts?.contextFactId ?? "").split(":")[zero]!)
              ?.organizationId ?? "",
          )),
    );
    for (const fact of mates) {
      const mateId = fact.facts?.otherPersonId;
      const office = mateId ? offices(mateId) : undefined;
      const said = mateId ? other(mateId) : undefined;
      if (!office || !said) continue;
      const setting = row.settingFactIds
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
      const quiet = !row.lines.length;
      const said2 = [
        quiet
          ? render(
              "journal-memoir:except",
              memoir.except,
              facts,
              `${fact.id}:except`,
              ids,
            )
          : null,
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
  return chapters
    .filter((row) => row.lines.length > zero)
    .map(({ settingFactIds, employerIds, ...row }) => {
      void settingFactIds;
      void employerIds;
      return row;
    });
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
