/**
 * The English engine's half of "My life", the journal. The director
 * (`composeJournal` in `src/director/journal.ts`) decides which moments are
 * told, which open a chapter, and what the records say about each; this file
 * says how: it picks the mined sentence for each line the director names (the
 * event for whose it was, a chapter's title, a memoir's framing and
 * look-backs, a broad event that reached the person), renders it from the
 * record facts, and names relatives the way the person would.
 */
import { P } from "../core2/parameters";
import type { PersonId } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishKnowledge,
  type GroundedEnglishPacket,
} from "./grounded-english";
import { journalDataFromBank } from "./mined/journal-bank";

const zero = P.zero;
const one = P.one;

type Wording = { key: string; text: string; stages?: readonly string[] };

export interface JournalWordRow {
  kindPrefix: string;
  turn: boolean;
  /** A setting (a school, a job) names a chapter; a story is an entry. */
  entry?: "story" | "setting";
  /** One's own race, worded by result (stage "won" or "lost"). */
  ownLine?: readonly Wording[];
  /**
   * Facts read from the causing event's own record. A "drop" is how far one
   * of the record's counts (`fact`) fell to another (`less`), told only where
   * it fell, citing the records a third fact names (`cites`).
   */
  eventFacts?: Readonly<
    Record<
      string,
      { fact: string; format: string; less?: string; cites?: string }
    >
  >;
  /** An event fact that names the stage a line is worded in (a vote, "yes" or "no"). */
  stageFact?: string;
  /** A fact that, where the moment holds it, marks the stage ("on-ballot:moved"). */
  stageMark?: { fact: string; mark: string };
  /**
   * The person's own moment is told even when they do not know the other by
   * name (a recall's organizer): its lines that name the other are left out.
   */
  toldWithoutOther?: boolean;
  line: readonly Wording[];
  otherLine?: readonly Wording[];
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
  eventFacts?: JournalWordRow["eventFacts"];
  /** An event fact that names the stage a line is worded in, with the words that mark each stage. */
  stageFact?: string;
  stageWords?: Readonly<Record<string, string>>;
  stageMark?: JournalWordRow["stageMark"];
  toldWithoutOther?: boolean;
  title?: JournalWordRow["title"];
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

/** `src/director/data/journal-rows.json`: the journal's structure, holding no sentences. */
export interface JournalRows {
  version: string;
  relationWords: JournalWords["relationWords"];
  kinAddress?: JournalWords["kinAddress"];
  possessive: JournalWords["possessive"];
  possessivePronoun: JournalWords["possessivePronoun"];
  countWords: JournalWords["countWords"];
  manyTimes: string;
  billForms?: JournalWords["billForms"];
  lines: readonly RowShape[];
  firstTitle: JournalWords["firstTitle"];
  lookBacks?: JournalWords["lookBacks"];
  backdropLines?: readonly {
    kind: string;
    stageFact: string;
    stages: readonly string[];
  }[];
}

export interface JournalWords {
  version: string;
  relationWords: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** How two relatives speak of a relative they share ("Dad"), by relation and gender. */
  kinAddress?: Readonly<
    Record<string, string | Readonly<Record<string, string>>>
  >;
  /** The possessive each surface names relatives with ("my", "your"). */
  possessive: Readonly<Record<string, string>>;
  /** The possessive for someone by their recorded gender ("his", "her", "their"). */
  possessivePronoun: Readonly<Record<string, string>>;
  countWords: readonly string[];
  manyTimes: string;
  /** The word a bill's form goes by before its number ("Ordinance 2027-3"). */
  billForms?: Readonly<Record<string, string>>;
  lines: readonly JournalWordRow[];
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
    /** Said only when a later chapter of another kind opened. */
    turning?: readonly string[];
  }>;
  /** The memoir's framing and look-back sentences, by field (whenAge, hook, remember, ...). */
  memoir?: Readonly<Record<string, readonly { key: string; text: string }[]>>;
  /** Broad events that reached the person, written as lines in their story. */
  backdropLines?: readonly {
    kind: string;
    stageFact: string;
    line: readonly Wording[];
  }[];
}

/** The journal's default words: its structure with the mined bank's sentences. */
export const JOURNAL_WORDS: JournalWords = journalDataFromBank();

/**
 * A journal row as the director decides from it: which moments it covers,
 * whether it turns a chapter, the record facts it reads. No sentences.
 */
export type JournalRow = Omit<
  JournalWordRow,
  "ownLine" | "line" | "otherLine" | "repeatLine" | "title" | "groupLine"
> & {
  /** The row tells one's own race by its result. */
  hasOwnLine: boolean;
};

const rowsOf = new WeakMap<JournalWords, readonly JournalRow[]>();
/** The rows the bank words, in order. */
export function journalRows(
  words: JournalWords = JOURNAL_WORDS,
): readonly JournalRow[] {
  let rows = rowsOf.get(words);
  if (!rows) {
    rows = words.lines.map((row) => {
      const {
        ownLine,
        line,
        otherLine,
        repeatLine,
        title,
        groupLine,
        ...kept
      } = row;
      void line;
      void otherLine;
      void repeatLine;
      void title;
      void groupLine;
      return { ...kept, hasOwnLine: !!ownLine };
    });
    rowsOf.set(words, rows);
  }
  return rows;
}

/** The broad event a journal tells, and the event fact that says how it went for the person. */
export function journalBackdrop(
  kind: string,
  words: JournalWords = JOURNAL_WORDS,
): { kind: string; stageFact: string } | undefined {
  const rule = words.backdropLines?.find((row) => row.kind === kind);
  return rule ? { kind: rule.kind, stageFact: rule.stageFact } : undefined;
}

/**
 * A relative as the person names them on a surface: "my daughter" in the
 * journal, "your daughter" in a scene. Undefined when the relation has no word.
 */
export function relationPhrase(
  relation: string,
  gender: string,
  surface: "journal" | "scene",
  words: JournalWords = JOURNAL_WORDS,
): string | undefined {
  const forms = words.relationWords[relation];
  const word = forms?.[gender] ?? forms?.other;
  return word ? `${words.possessive[surface]} ${word}` : undefined;
}

/**
 * How two relatives speak of a relative they share: "Dad" when he is father
 * to both. Their shared sibling goes by first name (undefined here); a
 * relation or gender the words hold no address for, undefined as well.
 */
export function kinAddress(
  relation: string,
  gender: string,
  words: JournalWords = JOURNAL_WORDS,
): string | undefined {
  const forms = words.kinAddress?.[relation];
  return typeof forms === "object" ? forms[gender] : undefined;
}

/** Every relation word, so a sentence naming one fits only that relative. */
export const RELATION_WORDS: ReadonlySet<string> = new Set(
  Object.values(JOURNAL_WORDS.relationWords).flatMap((forms) =>
    Object.values(forms),
  ),
);

/** "his", "her" or "their", by the person's recorded gender. */
export function possessivePronoun(
  gender: string,
  words: JournalWords = JOURNAL_WORDS,
): string {
  return words.possessivePronoun[gender] ?? words.possessivePronoun.other!;
}

/** A bill as the journal names it: its form's word and its number ("Ordinance 2027-3"). */
export function billNumberName(
  formKind: string,
  number: string,
  words: JournalWords = JOURNAL_WORDS,
): string {
  const form = words.billForms?.[formKind];
  return form ? `${form} ${number}` : number;
}

/** The memoir's fields: the framing and look-back sentences around an event. */
export type MemoirField =
  | "lost"
  | "decided"
  | "whenAge"
  | "hard"
  | "revise"
  | "hook"
  | "remember"
  | "became";

/**
 * A line of the journal: the event worded for whose it was (`line`, with
 * "we" when the household did it together), whether the event's line can be
 * written at all (`check`), one's own race by its result (`race`), a
 * chapter's title (`title`, or `first-title` for the first chapter), a
 * memoir sentence, or a broad event that reached the person (`backdrop`).
 */
export type JournalMove =
  | {
      part: "line";
      kindPrefix: string;
      whose: "own" | "other";
      together?: boolean;
    }
  | { part: "check"; kindPrefix: string }
  | { part: "race"; kindPrefix: string }
  | { part: "title"; kindPrefix: string }
  | { part: "first-title" }
  | {
      part: "memoir";
      field: MemoirField;
      /** Closings already said in this journal (see `journalClosing`): none is said twice. */
      closedWith?: ReadonlySet<string>;
      /** A look-back fits the moment: a birth takes only a memorable one, a grown-up no childhood one, a turning point only when one came. */
      lookBack?: { memorableOnly: boolean; young: boolean; turned: boolean };
      /** "He became mayor.": the pronoun a sentence opens with fits their recorded gender. */
      gender?: string;
    }
  | { part: "backdrop"; kind: string };

const kebab = (field: string) =>
  field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** How a closing line ends, its last two words. */
export function journalClosing(line: { text: string }): string {
  return line.text
    .toLowerCase()
    .replace(/[^a-z' ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(-P.two)
    .join(" ");
}

const fitsGender = (text: string, gender: string | undefined) => {
  const lead = /^(he|she)\b/i.exec(text)?.[one]?.toLowerCase();
  if (!lead) return true;
  return (
    (lead === "he" && gender === "male") ||
    (lead === "she" && gender === "female")
  );
};

/**
 * A row's own line can tell someone else's moment only when it names them:
 * "{other} died." does, "I introduced {law}." would make it the reader's own.
 */
const namesTheOther = (wording: Wording) =>
  /\{(?:other|named|relation)\}/.test(wording.text);

function wordingsFor(
  words: JournalWords,
  move: JournalMove,
): { key: string; rows: readonly Wording[] | undefined } {
  const rowOf = (kindPrefix: string) =>
    words.lines.find((row) => row.kindPrefix === kindPrefix);
  switch (move.part) {
    case "line": {
      const row = rowOf(move.kindPrefix);
      return {
        key: `journal-line:${move.kindPrefix}:${move.whose}`,
        rows:
          move.whose === "own"
            ? move.together
              ? (row?.groupLine ?? row?.line)
              : row?.line
            : (row?.otherLine ?? row?.line?.filter(namesTheOther)),
      };
    }
    case "check": {
      const row = rowOf(move.kindPrefix);
      return {
        key: `journal-line:${move.kindPrefix}:check`,
        rows: row?.groupLine ?? row?.line,
      };
    }
    case "race":
      return {
        key: `journal-line:${move.kindPrefix}:own`,
        rows: rowOf(move.kindPrefix)?.ownLine,
      };
    case "title":
      return {
        key: `journal-title:${move.kindPrefix}`,
        rows: rowOf(move.kindPrefix)?.title,
      };
    case "first-title":
      return { key: "journal-title:first", rows: words.firstTitle };
    case "memoir": {
      const all = words.memoir?.[move.field];
      const fits = {
        memorable: new Set(words.lookBacks?.memorable ?? []),
        youngOnly: new Set(words.lookBacks?.youngOnly ?? []),
        turning: new Set(words.lookBacks?.turning ?? []),
      };
      const look = move.lookBack;
      const rows = all?.filter(
        (row) =>
          !move.closedWith?.has(journalClosing(row)) &&
          (!look ||
            ((!look.memorableOnly || fits.memorable.has(row.key)) &&
              (look.young || !fits.youngOnly.has(row.key)) &&
              (look.turned || !fits.turning.has(row.key)))) &&
          // Only a sentence that names them: "We were friends." points to no one.
          (move.field !== "remember" || row.text.includes("{{name}}")) &&
          (move.field !== "became" || fitsGender(row.text, move.gender)),
      );
      return {
        key: `journal-memoir:${kebab(move.field)}`,
        rows: all && rows,
      };
    }
    case "backdrop":
      return {
        key: `journal-backdrop:${move.kind}`,
        rows: words.backdropLines?.find((row) => row.kind === move.kind)?.line,
      };
  }
}

export interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}

/** A journal line as worded, with the records it stands on. */
export interface JournalWorded {
  text: string;
  sourceRecordIds: readonly string[];
}

/** Words one line of the journal, or null when no sentence fits its facts. */
export function wordJournalLine(request: {
  seed: string;
  personId: PersonId;
  move: JournalMove;
  facts: Record<string, Fact>;
  momentKey: string;
  sourceIds: readonly string[];
  stage?: string;
  words?: JournalWords;
}): JournalWorded | null {
  const words = request.words ?? JOURNAL_WORDS;
  const { key, rows } = wordingsFor(words, request.move);
  const { facts, personId, sourceIds } = request;
  if (!rows?.length || !sourceIds.length) return null;
  // Core record ids stand in for the engine's entity ids.
  const knowledge = Object.entries(facts).map(([factKey, fact]) => ({
    personId,
    factKey,
    sourceRecordIds: fact.sourceRecordIds,
  })) as unknown as GroundedEnglishKnowledge[];
  const bank: AuthoredEnglishBank = {
    key,
    version: words.version,
    surface: "journal",
    variants: rows.map((row) => ({ ...row, kind: "template" as const })),
  };
  const result = renderGroundedEnglish(
    {
      surface: "journal",
      momentKey: request.momentKey,
      worldSeed: request.seed,
      bankVersion: words.version,
      stage: request.stage ?? "journal",
      sourceRecordIds: sourceIds,
      facts,
      viewer: { personId, traits: {} },
      knowledge,
    } as unknown as GroundedEnglishPacket,
    bank,
  );
  if (result.kind !== "rendered") return null;
  // A line or title starts with a capital, whatever its first slot holds.
  return {
    ...result,
    text: result.text.charAt(zero).toUpperCase() + result.text.slice(one),
  };
}

/**
 * "When I was 7, my father died.": the age frame leads into the event, as one
 * sentence. A mined opening clause ends as a sentence; its stop becomes a
 * comma, and the event goes on in lower case unless it opens with a fact (a
 * person's name).
 */
export function framedByAge<T extends JournalWorded>(
  frame: JournalWorded,
  event: T,
  facts: Readonly<Record<string, { text: string }>>,
): T {
  const opensWithFact = Object.values(facts).some(
    (fact) => fact.text.length > zero && event.text.startsWith(fact.text),
  );
  // "I" stays a capital in the middle of a sentence.
  const lower = /^I\b/.test(event.text)
    ? event.text
    : event.text.charAt(zero).toLowerCase() + event.text.slice(one);
  return {
    ...event,
    text: `${frame.text.replace(/[.]$/, ",")} ${opensWithFact ? event.text : lower}`,
    sourceRecordIds: [
      ...new Set([...frame.sourceRecordIds, ...event.sourceRecordIds]),
    ],
  };
}

/** Whether the lines remembering someone say what office they hold now: a bare name tells nothing. */
export function saysOffice(
  lines: readonly JournalWorded[],
  office: { text: string },
): boolean {
  return lines.some((line) => line.text.includes(office.text.toLowerCase()));
}

/** The parts of a journal entry, said as one entry. */
export function journalEntry(parts: readonly JournalWorded[]): string {
  return parts.map((part) => part.text).join(" ");
}

/** A job title as a sentence says it after "works as": "a county clerk", "an electrician". */
export function withArticle(title: string): string {
  const said =
    title.length > one && title.charAt(one) === title.charAt(one).toLowerCase()
      ? title.charAt(zero).toLowerCase() + title.slice(one)
      : title;
  return `${/^[aeiou]/i.test(said) ? "an" : "a"} ${said}`;
}
