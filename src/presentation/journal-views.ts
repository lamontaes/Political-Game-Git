import { ageOnDate, type EntityId, type World } from "../simulation";
import { projectLifeRecord } from "./life-record";
import type { JournalView } from "./shell-navigation";
import {
  projectWorld39Journal,
  type World39BiographyEntry,
} from "./world39-journal";

/**
 * The Journal's two views over one set of records (OCD-UI-009).
 *
 * Chapters groups the dated biography entries into the life phases the life
 * record already recognizes; a year a phase does not cover gets a plain year
 * heading. Years is the annual chronicle the reader already had. A year filter
 * narrows either view. Nothing here adds, merges or rewrites an entry, and no
 * total, victory or legacy is derived.
 */

export interface JournalSection {
  readonly key: string;
  readonly heading: string;
  /** "2019" or "2014–2019": the years this section's entries fall in. */
  readonly span: string | null;
  /** What happened once, in order. */
  readonly entries: readonly World39BiographyEntry[];
  /**
   * What happened again and again, said once each, after the rest.
   *
   * A Houma life's three-year chapter was one paragraph of about fifty party
   * invitations that differed only in a name and a date, with the real events
   * lost among them. A sentence whose shape recurs at least
   * `REPEAT_THRESHOLD` times in a section is given once, with how many more
   * there were and the date of the last.
   */
  readonly repeats: readonly JournalRepeat[];
  /**
   * The entries again, as a chronicle is read: each carries the month it
   * happened in when the month changes, and a new paragraph starts at a month
   * change once the current one has run a few sentences. Only the record's own
   * dates are used. The retrospective voice the owner asked for ("who would
   * have known", "you had no idea what you were in for") is PENDING RESEARCH,
   * question `journal-chronicle-voice`, and is not written until it is
   * answered.
   */
  readonly chronicle: readonly JournalChronicleLine[];
}

export interface JournalChronicleLine {
  readonly entry: World39BiographyEntry;
  /** "In March" or "In March 2027"; null when the month has not changed. */
  readonly lead: string | null;
  readonly startsParagraph: boolean;
}

export interface JournalRepeat {
  /** The first of them, as recorded. */
  readonly first: World39BiographyEntry;
  /** Every one, including the first. */
  readonly count: number;
  readonly lastAt: string;
}

export const REPEAT_THRESHOLD = 3;

const MONTH =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g;

/**
 * A sentence with its particulars taken out: names, dates and numbers. Two
 * sentences with the same shape say the same kind of thing about different
 * people or days.
 */
export function journalSentenceShape(text: string): string {
  return text
    .replace(MONTH, "#")
    .replace(/\d+/g, "#")
    .replace(/\b[A-Z][\w'’.-]*/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

export function collapseJournalRepeats(
  entries: readonly World39BiographyEntry[],
): {
  readonly entries: readonly World39BiographyEntry[];
  readonly repeats: readonly JournalRepeat[];
} {
  const byShape = new Map<string, World39BiographyEntry[]>();
  for (const entry of entries) {
    const shape = `${entry.kind}:${journalSentenceShape(entry.text)}`;
    const group = byShape.get(shape);
    if (group) group.push(entry);
    else byShape.set(shape, [entry]);
  }
  const repeated = new Set<string>();
  const repeats: JournalRepeat[] = [];
  for (const group of byShape.values()) {
    if (group.length < REPEAT_THRESHOLD) continue;
    for (const entry of group) repeated.add(entry.id);
    repeats.push({
      first: group[0]!,
      count: group.length,
      lastAt: group[group.length - 1]!.at,
    });
  }
  return {
    entries: entries.filter((entry) => !repeated.has(entry.id)),
    repeats,
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Sentences a paragraph runs before a month change may start a new one. */
export const CHRONICLE_PARAGRAPH_SENTENCES = 4;

/** Opening words that read the same in lower case after a lead. */
const LOWERCASE_AFTER_LEAD = new Set([
  "You",
  "Your",
  "The",
  "A",
  "An",
  "Somebody",
  "Someone",
  "Nobody",
  "Privately",
  "At",
  "On",
  "After",
  "Before",
  "During",
  "When",
  "While",
  "This",
  "That",
  "It",
  "They",
  "Their",
  "There",
  "Everyone",
  "Everybody",
  "Nothing",
  "Something",
]);

/**
 * Joins a month lead to a recorded sentence. The sentence's own words are
 * kept; only a common opening word is lowered, so a name stays capitalized.
 */
export function withChronicleLead(lead: string | null, text: string): string {
  if (!lead) return text;
  const first = text.split(/\s/, 1)[0] ?? "";
  const body = LOWERCASE_AFTER_LEAD.has(first)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;
  return `${lead}, ${body}`;
}

/**
 * Whether a sentence already says when it happened: a month near its start,
 * or a month with its day or year anywhere ("finished in May 1998").
 */
function datesItself(text: string): boolean {
  const opening = text.split(/\s+/).slice(0, 6).join(" ");
  return MONTH_NAMES.some(
    (month) =>
      opening.includes(month) || new RegExp(`\\b${month} \\d`).test(text),
  );
}

export function chronicleLines(
  entries: readonly World39BiographyEntry[],
): readonly JournalChronicleLine[] {
  const lines: JournalChronicleLine[] = [];
  let previousMonth: string | null = null;
  let previousYear: string | null = null;
  let sentences = 0;
  for (const entry of entries) {
    const year = entry.at.slice(0, 4);
    const monthKey = entry.at.slice(0, 7);
    const monthChanged = monthKey !== previousMonth;
    const monthName = MONTH_NAMES[Number(entry.at.slice(5, 7)) - 1];
    const lead =
      monthChanged &&
      monthName &&
      entry.kind !== "account" &&
      !datesItself(entry.text)
        ? previousYear === null || year === previousYear
          ? `In ${monthName}`
          : `In ${monthName} ${year}`
        : null;
    const startsParagraph =
      lines.length === 0 ||
      (monthChanged && sentences >= CHRONICLE_PARAGRAPH_SENTENCES);
    if (startsParagraph) sentences = 0;
    sentences += 1;
    lines.push({ entry, lead, startsParagraph });
    previousMonth = monthKey;
    previousYear = year;
  }
  return lines;
}

function withChronicle(
  collapsed: ReturnType<typeof collapseJournalRepeats>,
): Pick<JournalSection, "entries" | "repeats" | "chronicle"> {
  return { ...collapsed, chronicle: chronicleLines(collapsed.entries) };
}

export interface JournalViewModel {
  readonly name: string;
  readonly view: JournalView;
  /** The filter actually applied; an unknown year falls back to all years. */
  readonly year: string | null;
  readonly years: readonly string[];
  readonly sections: readonly JournalSection[];
  readonly entryCount: number;
}

function yearOf(entry: World39BiographyEntry): string {
  return entry.at.slice(0, 4);
}

function spanOf(entries: readonly World39BiographyEntry[]): string | null {
  if (entries.length === 0) return null;
  const years = entries.map(yearOf).sort();
  const first = years[0]!;
  const last = years[years.length - 1]!;
  return first === last ? first : `${first}–${last}`;
}

export function projectJournalView(
  world: World,
  personId: EntityId,
  view: JournalView,
  year: string | null,
): JournalViewModel {
  const biography = projectWorld39Journal(world, personId);
  const years = [
    ...new Set(biography.chapters.map((chapter) => chapter.year)),
  ].sort();
  const appliedYear = year !== null && years.includes(year) ? year : null;
  const keep = (entry: World39BiographyEntry) =>
    appliedYear === null || yearOf(entry) === appliedYear;

  let sections: JournalSection[];
  if (view === "years") {
    sections = biography.chapters.flatMap((chapter) => {
      const entries = chapter.entries.filter(keep);
      return entries.length === 0
        ? []
        : [
            {
              key: chapter.key,
              heading: chapter.heading,
              span: chapter.year,
              ...withChronicle(collapseJournalRepeats(entries)),
            },
          ];
    });
  } else {
    const birthDate = world.people[personId]?.birthDate ?? null;
    const phases = projectLifeRecord(world, personId).chapters;
    const groups = new Map<
      string,
      { heading: string; entries: World39BiographyEntry[] }
    >();
    for (const entry of biography.chapters.flatMap(
      (chapter) => chapter.entries,
    )) {
      if (!keep(entry)) continue;
      const age =
        birthDate && entry.at >= birthDate ? ageOnDate(birthDate, entry.at) : 0;
      const phase = phases.find(
        (candidate) => age >= candidate.fromAge && age <= candidate.toAge,
      );
      const key = phase ? `phase:${phase.key}` : `year:${yearOf(entry)}`;
      const heading = phase ? phase.heading : yearOf(entry);
      const group = groups.get(key);
      if (group) group.entries.push(entry);
      else groups.set(key, { heading, entries: [entry] });
    }
    sections = [...groups].map(([key, group]) => ({
      key,
      heading: group.heading,
      span: spanOf(group.entries),
      ...withChronicle(collapseJournalRepeats(group.entries)),
    }));
  }

  return {
    name: biography.name,
    view,
    year: appliedYear,
    years,
    sections,
    entryCount: sections.reduce(
      (total, section) =>
        total +
        section.entries.length +
        section.repeats.reduce((sum, repeat) => sum + repeat.count, 0),
      0,
    ),
  };
}
