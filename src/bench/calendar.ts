import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { familyFactsOf } from "../core2/modules/people";
import { wordArchiveStory, wordPrintedStory } from "./archive-words";
import { coreAPI } from "../core2/state";
import {
  standing,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { screenLine } from "../english/screen-words";
import type { CoreState, LogRecord } from "../core2/types";
import { storiesHeard } from "../core2/modules/news";

const ELECTIONS = "core2-elections-v1";
// Engineering window for the calendar screen, not a model value.
const WINDOW_DAYS = 400;

export interface CalendarItem {
  date: string;
  /** What the day's icon draws: a birthday, a filing date or an election. */
  kind: string;
  /** Who and what, in the English engine's words. */
  line: string;
  /** A date in a race the player has filed in: theirs, so it comes first. */
  own: boolean;
  recordIds: string[];
}

const ICON_KINDS = [
  "filing-opens",
  "filing-deadline",
  "primary",
  "election",
] as const;

/**
 * The dated things ahead of a person that they act on or feel: the filing dates and
 * elections of the races here, and their family's birthdays. Seats of one office that
 * share a date are one line; a race the person has filed in is theirs.
 */
export function calendarItems(
  core: CoreState,
  personId: string,
): CalendarItem[] {
  const api = coreAPI(core);
  const from = core.date,
    through = addDays(makeIsoDate(core.date), WINDOW_DAYS);
  const inWindow = (date: string | null | undefined): date is string =>
    !!date && date >= from && date <= through;
  const items: CalendarItem[] = [];
  if (core.modules.has(ELECTIONS)) {
    const elections = api.moduleState(ELECTIONS);
    const filed = new Set(
      (elections.table("filings").rows() as unknown as FilingRow[])
        .filter((f) => f.personId === personId && standing(f))
        .map((f) => f.contestId),
    );
    const groups = new Map<
      string,
      {
        date: string;
        kind: string;
        office: string;
        ids: string[];
        own: boolean;
      }
    >();
    for (const contest of elections
      .table("contests")
      .rows() as unknown as ContestRow[])
      for (const kind of ICON_KINDS) {
        const date = {
          "filing-opens": contest.filingOpens,
          "filing-deadline": contest.filingDeadline,
          primary: contest.primaryDate,
          election: contest.electionDate,
        }[kind];
        if (!inWindow(date)) continue;
        const own = filed.has(contest.id);
        // The player's own race stands alone; other seats of one office share a line.
        const key = own
          ? `${date}|${kind}|${contest.id}`
          : `${date}|${kind}|${contest.title}`;
        const group = groups.get(key) ?? {
          date,
          kind,
          office: contest.title,
          ids: [],
          own,
        };
        group.ids.push(contest.id);
        groups.set(key, group);
      }
    for (const group of groups.values()) {
      const variant = group.own ? "own" : group.ids.length > 1 ? "seats" : "1";
      const line = screenLine("calendar", `calendar.${group.kind}.${variant}`, {
        office: group.office,
        count: group.ids.length,
      });
      if (line)
        items.push({
          date: group.date,
          kind: group.kind,
          line,
          own: group.own,
          recordIds: group.ids,
        });
    }
  }
  const person = core.people.get(personId);
  // The person's own birthday, beside the family's, first among the day's lines.
  const yourBirthday = screenLine("calendar", "calendar.your-birthday.1", {});
  // Only the next one: two of your own birthdays would both sort first.
  const nextBirthday = person
    ? [Number(from.slice(0, 4)), Number(from.slice(0, 4)) + 1]
        .map((year) => `${year}${person.birthDate.slice(4)}`)
        .find(inWindow)
    : undefined;
  if (person && yourBirthday && nextBirthday)
    items.push({
      date: nextBirthday,
      kind: "your-birthday",
      line: yourBirthday,
      own: true,
      recordIds: [person.id],
    });
  const seen = new Set<string>();
  for (const otherId of familyFactsOf(person).keys()) {
    const other = core.people.get(otherId);
    if (!other?.alive) continue;
    if (seen.has(other.id)) continue;
    seen.add(other.id);
    for (const year of [
      Number(from.slice(0, 4)),
      Number(from.slice(0, 4)) + 1,
    ]) {
      const date = `${year}${other.birthDate.slice(4)}`;
      const line = screenLine("calendar", "calendar.birthday.1", {
        name: `${other.givenName} ${other.familyName}`,
      });
      if (inWindow(date) && line)
        items.push({
          date,
          kind: "birthday",
          line,
          own: false,
          recordIds: [other.id],
        });
    }
  }
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(b.own) - Number(a.own) ||
      a.line.localeCompare(b.line),
  );
}

/** Public employer data for the news surface, never a private benefit claim. */
function staffingNews(
  core: CoreState,
  facts: Readonly<Record<string, unknown>>,
) {
  const organization = core.organizations.get(
    String(facts.organizationId ?? ""),
  );
  if (!organization || facts.jobsLost === undefined) return undefined;
  const number = (key: string) =>
    facts[key] === undefined ? undefined : Number(facts[key]);
  const jobsLost = number("jobsLost");
  const salesMinor = number("salesMinor");
  const costsMinor = number("costsMinor");
  if (
    !Number.isFinite(jobsLost) ||
    (salesMinor !== undefined && !Number.isFinite(salesMinor)) ||
    (costsMinor !== undefined && !Number.isFinite(costsMinor))
  )
    return undefined;
  return { employer: organization.name, jobsLost, salesMinor, costsMinor };
}

/**
 * The visibility a kept record has as news. A record that names the player or
 * their circle is kept as "circle"; when it is a public record or a news
 * event (their own race's result, in town or for a statewide seat), it is
 * news to them and shows with the town's public record.
 */
function newsVisibility(core: CoreState, row: LogRecord) {
  if (row.visibility !== "circle") return row.visibility;
  return row.publicRecord || row.news ? "public" : undefined;
}

/** Public records and news the player can know, newest first. */
export function newsItems(core: CoreState) {
  return [...core.durableLog.values()]
    .map((row) => ({ row, visibility: newsVisibility(core, row) }))
    .filter(
      ({ visibility }) => visibility === "public" || visibility === "news",
    )
    .reverse()
    .map(({ row, visibility }) => ({
      id: row.id,
      date: row.date,
      kind: row.kind,
      visibility,
      facts: (row as { facts?: Record<string, unknown> }).facts ?? {},
      staffing: staffingNews(
        core,
        (row as { facts?: Record<string, unknown> }).facts ?? {},
      ),
    }));
}

/** The stories the person has heard (OPUS-PEOPLE's news), newest first. */
export function heardItems(core: CoreState, personId: string) {
  if (!core.modules.has("news")) return [];
  return storiesHeard(coreAPI(core), personId)
    .slice(0, 30)
    .map((story) => ({
      id: story.id,
      date: story.date,
      kind: story.kind,
      facts: story.facts,
      staffing: staffingNews(core, story.facts),
      // A story archived before day one, or printed since, in the English
      // engine's words.
      ...(wordArchiveStory(core, story) ?? wordPrintedStory(core, story)),
    }));
}
