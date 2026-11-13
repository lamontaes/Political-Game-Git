import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { CLOSENESS, familyFactsOf } from "../core2/modules/people";
import { bodyOf, nextSittingOf } from "../core2/modules/legislature";
import {
  federalHolidayName,
  federalHolidays,
  meetingToAttend,
  OFFICE_DAY_MODULE_ID,
  officeHost,
} from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { wordArchiveStory, wordPrintedStory } from "./archive-words";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import { coreAPI } from "../core2/state";
import {
  standing,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { screenLine, screenPick, screenWays } from "../english/screen-words";
import type { CoreState, LogRecord } from "../core2/types";
import { freshSince, storiesHeard } from "../core2/modules/news";

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
  /**
   * A posted meeting the person may come to as a resident (the office-day
   * engine's `meetingToAttend`), and whether they have marked it.
   */
  attend?: {
    officeId: string;
    date: string;
    marked: boolean;
    /** Once marked: the plan in the English engine's words, one wording per meeting. */
    plan: string | null;
  };
}

/** A meeting's hour as people say it: "7 p.m.", "6:30 p.m.", from its record's start minute. */
const spokenHour = (minuteOfDay: number) => {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "a.m." : "p.m."}`;
};

/** The levels of the town's own governments. */
const LOCAL_LEVELS: readonly string[] = ["city", "township", "county"];

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
  // Birthdays only for the household and close kin (owner, Nov 1: "it's just
  // people's birthdays"): the people who live with the person, and parents,
  // children, siblings and a partner by the closeness table's own marking of
  // which relations are extended.
  const close = new Set<string>([
    ...(core.households.get(person?.householdId ?? "")?.memberIds ?? []),
    ...[...familyFactsOf(person)]
      .filter(
        ([, fact]) =>
          fact.relation === "partner" ||
          (CLOSENESS.tieRows as Record<string, { extended: boolean }>)[
            fact.relation
          ]?.extended === false,
      )
      .map(([id]) => id),
  ]);
  close.delete(personId);
  const seen = new Set<string>();
  for (const otherId of close) {
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
  // The town's public dates: each body's next meeting (the bodies' calendar
  // engine) and the federal holidays (5 U.S.C. 6103, the office-day calendar).
  const bodies = new Map<string, { title: string; date: string }>();
  for (const { office } of townSeats(api)) {
    // The town's and county's own councils and boards, not the state's offices
    // that happen to cover the town.
    if (bodies.has(office.id) || !LOCAL_LEVELS.includes(office.level)) continue;
    // A seat belongs to a body that meets when the legislature's records name one
    // (a council, a township board, a county board: the kind names differ by place).
    const body = bodyOf(api, office.id);
    const sitting = body ? nextSittingOf(api, office.id) : null;
    if (body && sitting && inWindow(sitting.date))
      bodies.set(office.id, {
        title: body.bodyName ?? body.kind,
        date: sitting.date,
      });
  }
  // The bodies the person sits on, at any level (a legislature, Congress): the next day each sits.
  for (const officeId of officeHost.officesOf(api, personId)) {
    if (bodies.has(officeId)) continue;
    const body = bodyOf(api, officeId);
    const sitting = nextSittingOf(api, officeId);
    // The body the person sits on is shown whenever it next sits: a legislature that meets every other year is a date more than a year off.
    if (body && sitting && sitting.date >= from)
      bodies.set(officeId, {
        title: body.bodyName ?? body.kind,
        date: sitting.date,
      });
  }
  for (const [officeId, body] of bodies) {
    const line = screenLine("calendar", "calendar.meeting.1", {
      body: body.title,
    });
    // Only the person the clock is held for can mark a meeting (the engine
    // answers for the player alone).
    const open =
      core.modules.has(OFFICE_DAY_MODULE_ID) &&
      snapshotExplicitControlV1(core).personId === personId
        ? meetingToAttend(api, officeId, body.date)
        : null;
    if (line)
      items.push({
        date: body.date,
        kind: "meeting",
        line,
        own: false,
        recordIds: [officeId],
        ...(open
          ? {
              attend: {
                officeId,
                date: body.date,
                marked: open.marked,
                plan: open.marked
                  ? (screenPick(
                      "calendar",
                      screenWays("calendar", "calendar.meeting-plan.1"),
                      { body: body.title, time: spokenHour(open.startMinute) },
                      { momentKey: open.id, sourceIds: [open.id] },
                    )?.text ?? null)
                  : null,
              },
            }
          : {}),
      });
  }
  for (const year of [Number(from.slice(0, 4)), Number(from.slice(0, 4)) + 1])
    for (const [date, id] of federalHolidays(year)) {
      // The holiday's name is the federal calendar's record; the line says it.
      const name = federalHolidayName(id);
      const line = name
        ? screenLine("calendar", "calendar.holiday.name", { holiday: name })
        : null;
      if (inWindow(date) && line)
        items.push({
          date,
          kind: "holiday",
          line,
          own: false,
          recordIds: [`federal-holiday:${id}:${date}`],
        });
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
  // Still news on today's date, by the news engine's own window: the paper
  // prints only these; older ones stay in the archive (agreements/3-4.md).
  const since = freshSince(coreAPI(core));
  return storiesHeard(coreAPI(core), personId)
    .slice(0, 30)
    .map((story) => ({
      id: story.id,
      date: story.date,
      kind: story.kind,
      fresh: story.date >= since,
      facts: story.facts,
      staffing: staffingNews(core, story.facts),
      // A story archived before day one, or printed since, in the English
      // engine's words.
      ...(wordArchiveStory(core, story) ?? wordPrintedStory(core, story)),
    }));
}
