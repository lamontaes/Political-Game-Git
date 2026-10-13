/**
 * "My life" on the new core: a first-person story in chapters, written by
 * the English engine from the story director's moments and the person's own
 * records (owner, Sept 22 and Oct 1). It is selective (only moments a line
 * covers), names relatives by relation, folds repeats within a chapter into
 * one line, and never invents a feeling: every slot is a recorded fact the
 * person holds, and the templates carry no feeling words.
 */
import { makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { P } from "../core2/parameters";
import type { CoreState, IsoDate, PersonId, PersonState } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
  type GroundedEnglishKnowledge,
} from "../presentation/grounded-english";
import journalJson from "./data/journal.json" with { type: "json" };
import type { Director } from "./ledger";
import { withParts } from "./parts";
import { properName, schoolName } from "./words";
import { directorStopgap } from "./stopgaps";
import type { Moment } from "./types";

const zero = P.zero;
const one = P.one;

interface LineRow {
  kindPrefix: string;
  turn: boolean;
  /** Facts read from the causing event's own record. */
  eventFacts?: Readonly<Record<string, { fact: string; format: string }>>;
  /** A fact naming a person (the winner) picks the line's stage: `self` when it names who the line is about, else `other`. */
  stageFact?: { fact: string; self: string; other: string };
  /** A fact's value picks the line's stage (a marriage or a couple), from the event or the past fact behind the moment. */
  stageOf?: {
    fact: string;
    values: Readonly<Record<string, string>>;
    otherwise: string;
  };
  /** The person's own line even though it names someone (their partner). */
  ownWithOther?: boolean;
  line: readonly { key: string; text: string }[];
  otherLine?: readonly { key: string; text: string }[];
  repeatLine?: readonly { key: string; text: string }[];
  title?: readonly { key: string; text: string }[];
}

export interface JournalData {
  version: string;
  stopgapId: string;
  relationWords: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The possessive each surface names relatives with ("my", "your"). */
  possessive: Readonly<Record<string, string>>;
  /** The possessive for someone by their recorded gender ("his", "her", "their"). */
  possessivePronoun: Readonly<Record<string, string>>;
  /** The opening line from the person's birthplace record. */
  birth: {
    placeFact: string;
    yearCharacters: number;
    line: readonly { key: string; text: string }[];
  };
  countWords: readonly string[];
  manyTimes: string;
  lines: readonly LineRow[];
  firstTitle: readonly { key: string; text: string }[];
  lookBack: { died: readonly { key: string; text: string }[] };
  /** Broad events that reached the person, written as lines in their story. */
  backdropLines?: readonly {
    kind: string;
    stageFact: string;
    line: readonly { key: string; text: string; stages?: readonly string[] }[];
  }[];
}

export const JOURNAL_DATA = journalJson as JournalData;

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
  options: { through?: IsoDate; data?: JournalData } = {},
): JournalChapter[] {
  const data = options.data ?? JOURNAL_DATA;
  const person = core.people.get(personId);
  const book = director.ledger.people.get(personId);
  if (!person || !book) return [];
  directorStopgap(data.stopgapId, director.ledger.stopgapHits);
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
        text: schoolName(fact.facts.schoolName),
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
  const chapters: JournalChapter[] = [];
  let chapter: JournalChapter | undefined;
  let chapterKind: string | undefined;
  // Repeats within a chapter fold into the line they first made.
  let repeats = new Map<
    string,
    { line: JournalLine; row: LineRow; facts: Facts; count: number }
  >();
  const open = (key: string, title: string, date: IsoDate) => {
    chapter = { key, title, from: date, through: date, lines: [] };
    chapters.push(chapter);
    repeats = new Map();
  };

  for (const moment of moments) {
    const row = data.lines.find((entry) =>
      moment.causeKind.startsWith(entry.kindPrefix),
    );
    if (!row) continue;
    const facts = factsFor(moment);
    if (!facts) continue;
    const sourceIds = [moment.causeId];
    const own =
      !facts.other || moment.causeKind === "family:child" || !!row.ownWithOther;
    const field = own || !row.otherLine ? "line" : "otherLine";
    const rows = (own ? row.line : (row.otherLine ?? row.line)).flatMap(
      (variant) => withParts("journal", row.kindPrefix, field, variant),
    );
    // A turn opens a chapter, unless the chapter already began with the same
    // kind of turn (the schools of a childhood, the children of a family).
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
    const repeatKey = `${row.kindPrefix}|${moment.counterpartIds.join(",")}`;
    const prior = repeats.get(repeatKey);
    if (prior && prior.row.repeatLine) {
      prior.count += one;
      const words = data.countWords;
      const times =
        prior.count < words.length ? words[prior.count]! : data.manyTimes;
      const again = render(
        `journal-line:${row.kindPrefix}:repeat`,
        row.repeatLine,
        {
          ...prior.facts,
          times: { text: times, sourceRecordIds: [moment.causeId] },
        },
        `${prior.line.id}:repeat`,
        prior.line.sourceRecordIds,
      );
      if (again) {
        prior.line.text = again.text;
        prior.line.momentIds = [...prior.line.momentIds, moment.id];
        prior.line.sourceRecordIds = [
          ...new Set([...prior.line.sourceRecordIds, ...again.sourceRecordIds]),
        ];
        chapter!.through = moment.date;
      }
      continue;
    }
    const about = own ? personId : moment.counterpartIds[zero];
    const stageNamed = row.stageFact
      ? core.durableLog.get(moment.causeId)?.facts?.[row.stageFact.fact]
      : undefined;
    const rendered = render(
      `journal-line:${row.kindPrefix}:${own ? "own" : "other"}`,
      rows,
      facts,
      moment.id,
      sourceIds,
      row.stageFact
        ? stageNamed === about
          ? row.stageFact.self
          : row.stageFact.other
        : row.stageOf
          ? (row.stageOf.values[
              String(
                core.durableLog.get(moment.causeId)?.facts?.[
                  row.stageOf.fact
                ] ??
                  (moment.causeFactId
                    ? factsById.get(moment.causeFactId)?.facts?.[
                        row.stageOf.fact
                      ]
                    : undefined),
              )
            ] ?? row.stageOf.otherwise)
          : undefined,
    );
    if (!rendered) continue;
    const line: JournalLine = {
      id: moment.id,
      date: moment.date,
      text: rendered.text,
      momentIds: [moment.id],
      sourceRecordIds: rendered.sourceRecordIds,
    };
    chapter!.lines.push(line);
    chapter!.through = moment.date;
    repeats.set(repeatKey, { line, row, facts, count: one });
  }
  // The story opens where the person was born, from their own birth records.
  const birthplace = (person.pastFacts ?? []).find(
    (fact) => fact.kind === data.birth.placeFact && fact.facts?.placeId,
  );
  const born = birthplace ? placeName(birthplace.facts!.placeId) : null;
  if (birthplace && born && birthplace.date <= through) {
    const rendered = render(
      "journal-born",
      data.birth.line,
      {
        place: { text: born.text, sourceRecordIds: [birthplace.id] },
        year: {
          text: birthplace.date.slice(zero, data.birth.yearCharacters),
          sourceRecordIds: [birthplace.id],
        },
      },
      `${personId}:born`,
      [birthplace.id],
    );
    if (rendered) {
      const line: JournalLine = {
        id: `${personId}:born`,
        date: makeIsoDate(birthplace.date),
        text: rendered.text,
        momentIds: [],
        sourceRecordIds: rendered.sourceRecordIds,
      };
      const first = chapters[zero];
      if (first) {
        first.lines.unshift(line);
        first.from = line.date;
      } else {
        open(`${personId}:born`, rendered.text, line.date);
        chapters[zero]!.title =
          render(
            "journal-title:first",
            data.firstTitle,
            { place: born },
            `${personId}:born:title`,
            [birthplace.id],
          )?.text ?? born.text;
        chapters[zero]!.lines.push(line);
      }
    }
  }
  // Broad events that reached the person join the chapter they fell in.
  for (const entry of book.backdrop) {
    if (entry.date > through) continue;
    const rule = data.backdropLines?.find((row) => row.kind === entry.kind);
    const event = rule ? core.durableLog.get(entry.sourceId) : undefined;
    const stage = rule ? event?.facts?.[rule.stageFact] : undefined;
    if (!rule || !stage) continue;
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
    if (entry.date > home.through) home.through = entry.date;
  }
  return chapters.filter((row) => row.lines.length > zero);
}

/**
 * The look-back when a life ends (owner, Sept 28): each chapter's opening
 * line, in order, then the death itself, all from the same records.
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
  const place = lifePlaceByJurisdictionId(person.placeId as never);
  const years = String(
    Number(core.date.slice(zero, core.date.indexOf("-"))) -
      Number(person.birthDate.slice(zero, person.birthDate.indexOf("-"))) -
      (core.date.slice(core.date.indexOf("-")) <
      person.birthDate.slice(person.birthDate.indexOf("-"))
        ? one
        : zero),
  );
  if (place) {
    const facts = {
      place: { text: place.displayName, sourceRecordIds: [person.placeId] },
      age: { text: years, sourceRecordIds: [person.id] },
    };
    const result = renderGroundedEnglish(
      {
        surface: "journal",
        momentKey: `${personId}:look-back`,
        worldSeed: core.seed,
        bankVersion: data.version,
        stage: "journal",
        sourceRecordIds: [person.id],
        facts,
        viewer: { personId, traits: {} },
        knowledge: Object.entries(facts).map(([factKey, fact]) => ({
          personId,
          factKey,
          sourceRecordIds: fact.sourceRecordIds,
        })),
      } as unknown as GroundedEnglishPacket,
      bank("journal-look-back", data.lookBack.died, data.version),
    );
    if (result.kind === "rendered")
      lines.push({
        id: `${personId}:look-back`,
        date: core.date,
        text: result.text,
        momentIds: [],
        sourceRecordIds: result.sourceRecordIds as unknown as string[],
      });
  }
  return lines;
}
