import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { wordArchiveStory } from "./archive-words";
import { coreAPI } from "../core2/state";
import { lawHere } from "../core2/modules/laws";
import type { ContestRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { storiesHeard } from "../core2/modules/news";
import { lawStoryHeadline } from "../director/law-story-words";

const ELECTIONS = "core2-elections-v1";
// Engineering window for the calendar screen, not a model value.
const WINDOW_DAYS = 400;

export interface CalendarItem {
  date: string;
  kind: string;
  title: string;
  recordId: string;
}

/** The dated records ahead of a person: elections, laws, family birthdays. */
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
  if (core.modules.has(ELECTIONS))
    for (const contest of api
      .moduleState(ELECTIONS)
      .table("contests")
      .rows() as unknown as ContestRow[])
      for (const [kind, date] of [
        ["filing-opens", contest.filingOpens],
        ["filing-deadline", contest.filingDeadline],
        ["primary", contest.primaryDate],
        ["election", contest.electionDate],
      ] as const)
        if (inWindow(date))
          items.push({
            date,
            kind,
            title: contest.title,
            recordId: contest.id,
          });
  if (core.modules.has("core2-laws-v1"))
    for (const law of lawHere(api))
      for (const row of law.pending)
        if (inWindow(row.effectiveDate))
          items.push({
            date: row.effectiveDate,
            kind: "law-takes-effect",
            title: law.series,
            recordId: row.id,
          });
  const person = core.people.get(personId);
  for (const fact of person?.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    const other = otherId ? core.people.get(otherId) : undefined;
    if (!fact.kind.startsWith("family:") || !other?.alive) continue;
    for (const year of [
      Number(from.slice(0, 4)),
      Number(from.slice(0, 4)) + 1,
    ]) {
      const date = `${year}${other.birthDate.slice(4)}`;
      if (inWindow(date))
        items.push({
          date,
          kind: "birthday",
          title: `${other.givenName} ${other.familyName}`,
          recordId: other.id,
        });
    }
  }
  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
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

/** Public records and news the player can know, newest first. */
export function newsItems(core: CoreState) {
  return [...core.durableLog.values()]
    .filter((row) => row.visibility === "public" || row.visibility === "news")
    .reverse()
    .map((row) => ({
      id: row.id,
      date: row.date,
      kind: row.kind,
      visibility: row.visibility,
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
      // The paper's own words for a law taking effect, in place of the
      // record's keys on the News screen.
      ...(lawStoryHeadline(core, story) ?? {}),
      ...wordArchiveStory(core, story),
    }));
}
