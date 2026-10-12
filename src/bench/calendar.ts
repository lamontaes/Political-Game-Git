import { addDays, makeIsoDate } from "../simulation/dates";
import { coreAPI } from "../core2/state";
import { lawHere } from "../core2/modules/laws";
import type { ContestRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";

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

/** Public records and news the player can know, newest first. */
export function newsItems(core: CoreState) {
  return [...core.durableLog.values()]
    .filter((row) => row.visibility === "public" || row.visibility === "news")
    .reverse()
    .map((row) => ({
      id: row.id,
      date: row.date,
      kind: row.kind,
      facts: (row as { facts?: Record<string, unknown> }).facts ?? {},
    }));
}
