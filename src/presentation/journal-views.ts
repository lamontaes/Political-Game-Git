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
              ...collapseJournalRepeats(entries),
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
      ...collapseJournalRepeats(group.entries),
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
