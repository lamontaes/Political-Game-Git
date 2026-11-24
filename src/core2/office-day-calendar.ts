/**
 * When a local body meets (office play, OFFICE-LOCAL): a town council, a
 * township board or a county board sits on its own regular rule. A place's
 * recorded rule is used where one is read; every other body takes the
 * median interval for its type and size
 * (`data/research/local-government/council-meeting-intervals.json`), on the
 * tunable weekday and at the hour its kind of body sits. Nothing is drawn:
 * the same body meets on the same days in every world.
 *
 * A weekly body meets every week; a body meeting about twice a month meets
 * on the first and third such weekday; a monthly body on the first.
 *
 * The world-legislating engine schedules the meetings where members file
 * their own ordinances from this same rule, so a body has one set of meeting
 * dates.
 */
import intervals from "../../data/research/local-government/council-meeting-intervals.json" with { type: "json" };
import bases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import rows from "./data/office-day/parameters.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreAPI, Source } from "./types";

/** The offices engine's state (read only; imported by id so this helper loads before the engines). */
const OFFICES_MODULE_ID = "core2-offices-v1";

const PARAMETERS = (
  rows as unknown as { parameters: Record<string, { value: number }> }
).parameters;
export function officeDayParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown office-day parameter: ${key}`);
  return row.value;
}

const INTERVALS = intervals as unknown as {
  bands: readonly { id: string; minPopulation: number }[];
  medianIntervalDays: Record<string, Record<string, number>>;
};
const COUNTY_PEOPLE = (
  bases as unknown as { countyPopulation2024: Record<string, number> }
).countyPopulation2024;

/** The research's body type for each local office kind that meets as a body. */
const BODY_TYPES: Readonly<Record<string, string>> = {
  council: "city-council",
  "township-board": "town-or-township-board",
  "county-board": "county-board",
};

export interface MeetingRule {
  readonly officeId: string;
  readonly intervalDays: number;
  /** 0 Sunday to 6 Saturday. */
  readonly weekday: number;
  /** Which of the month's such weekdays it meets on (1-based); empty means every one. */
  readonly weeksOfMonth: readonly number[];
  readonly startMinute: number;
  readonly minutes: number;
  readonly source: Source;
}

/** The population a seat's size band reads: the county's for a county office, the town's otherwise. */
export function bodyPopulation(
  api: CoreAPI,
  kind: string,
  countyGeoid: string | undefined,
): number {
  const town = Number(api.state.placeMetadata.referencePopulation);
  if (kind.startsWith("county-")) {
    const people = countyGeoid ? COUNTY_PEOPLE[countyGeoid] : undefined;
    if (people) return people;
  }
  return Number.isFinite(town) && town > 0 ? town : api.state.people.size;
}

/** A local body's meeting rule, or null for an office that does not meet as a body. */
export function meetingRule(
  api: CoreAPI,
  officeId: string,
  countyGeoid?: string,
): MeetingRule | null {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as unknown as { kind: string; seats: number } | undefined;
  const type = office ? BODY_TYPES[office.kind] : undefined;
  if (!office || !type || office.seats < 2) return null;
  const people = bodyPopulation(api, office.kind, countyGeoid);
  const band = [...INTERVALS.bands]
    .reverse()
    .find((b) => people >= b.minPopulation)!;
  const intervalDays = INTERVALS.medianIntervalDays[type]![band.id]!;
  const county = office.kind === "county-board";
  return {
    officeId,
    intervalDays,
    weekday: officeDayParameter("meetingWeekday"),
    weeksOfMonth: intervalDays <= 7 ? [] : intervalDays <= 14 ? [1, 3] : [1],
    startMinute: officeDayParameter(
      county ? "daytimeMeetingMinute" : "eveningMeetingMinute",
    ),
    minutes: officeDayParameter("meetingMinutes"),
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${type} of ${people} people (band ${band.id}): a regular meeting every ${intervalDays} days, the band's median (council-meeting-intervals.json)`,
      estimatedFrom: "council-meeting-intervals.json medianIntervalDays",
    },
  };
}

const weekOfMonth = (date: string) =>
  Math.floor((Number(date.slice(8, 10)) - 1) / 7) + 1;
const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Whether the body's rule puts a regular meeting on this date. */
export function meetsOn(rule: MeetingRule, date: string): boolean {
  return (
    weekdayOf(date) === rule.weekday &&
    (rule.weeksOfMonth.length === 0 ||
      rule.weeksOfMonth.includes(weekOfMonth(date)))
  );
}

/** The body's next regular meeting after `after` (exclusive), or null for a body without a rule. */
export function nextMeeting(
  api: CoreAPI,
  officeId: string,
  after: string,
  countyGeoid?: string,
): { date: string; rule: MeetingRule } | null {
  const rule = meetingRule(api, officeId, countyGeoid);
  if (!rule) return null;
  let date: string = makeIsoDate(after);
  // A monthly rule's next meeting is at most five weeks out.
  for (let i = 0; i < 40; i++) {
    date = addDays(makeIsoDate(date), 1);
    if (meetsOn(rule, date)) return { date, rule };
  }
  throw new Error(`No regular meeting of ${officeId} after ${after}.`);
}
