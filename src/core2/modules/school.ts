/**
 * School days (M0-13: school-age people attend school). A full person aged
 * 5 to 17 has a school day to attend on each weekday of the school year: the
 * need is the state's compulsory attendance, and attending is a choice the
 * chooser weighs like any other (their traits and the day's other pulls
 * decide; there is no roll). The school is the town's public school district,
 * which every town with a police department has (opening-public-schools.ts),
 * or the town itself where a world opened without that step.
 * Attending takes a school day's hours and is recorded for the day.
 */
import data from "../data/school-days.json" with { type: "json" };
import tuition from "../data/opening-private-tuition.json" with { type: "json" };
import stateDays from "../../../data/research/people/state-instructional-days-2018.json" with { type: "json" };
import { LAWS_MODULE_ID, lawChain } from "./laws";
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionKinds } from "../trait-decisions";
import { offer } from "./life";
import { reenrollPrivateTuition } from "../private-tuition-reenroll";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreModule,
  PersonState,
} from "../types";

export const SCHOOL_MODULE_ID = "core2-school-days-v1";

const ageOn = (birthDate: string, date: string) => {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
};

/** A weekday inside the base school year, outside its recorded breaks. */
function onBaseCalendar(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return false;
  const md = date.slice(5);
  const inYear =
    md >= data.schoolYear.firstDay || md <= data.schoolYear.lastDay;
  if (!inYear) return false;
  if (
    data.breaks.some((row) =>
      row.from <= row.to
        ? md >= row.from && md <= row.to
        : md >= row.from || md <= row.to,
    )
  )
    return false;
  return !data.holidays.some((row) => onHoliday(date, row));
}

/** A state's minimum instructional days (ECS, 2018), where it sets one in days. */
function minimumDays(usps: string | undefined): number | undefined {
  const row = usps
    ? (
        stateDays.minimumDays as Record<
          string,
          { days: number | null } | undefined
        >
      )[usps]
    : undefined;
  return row?.days ?? undefined;
}

/** The last day of a school year that starts in the given year, by state: the base year cut at the state's minimum day count. */
const cutoffs = new Map<string, string>();
function lastDayOfYear(startYear: number, usps: string | undefined): string {
  const days = minimumDays(usps);
  const key = `${startYear}:${days ?? ""}`;
  const hit = cutoffs.get(key);
  if (hit) return hit;
  let last = `${startYear + 1}-${data.schoolYear.lastDay}`;
  if (days !== undefined) {
    let counted = 0;
    for (
      let t = Date.UTC(startYear, 8, 1);
      t <= Date.UTC(startYear + 1, 5, 30);
      t += 86_400_000
    ) {
      const date = new Date(t).toISOString().slice(0, 10);
      if (!onBaseCalendar(date)) continue;
      counted += 1;
      if (counted === days) {
        last = date;
        break;
      }
    }
  }
  cutoffs.set(key, last);
  return last;
}

/**
 * A weekday of the school year, outside its recorded breaks. A state that
 * requires a number of instructional days ends its year when they are done
 * (a state that sets hours, or leaves it to the district, keeps the base year).
 */
export function isSchoolDay(date: string, usps?: string): boolean {
  if (!onBaseCalendar(date)) return false;
  const year = Number(date.slice(0, 4));
  const startYear = date.slice(5) >= data.schoolYear.firstDay ? year : year - 1;
  return date <= lastDayOfYear(startYear, usps);
}

/** The holiday's date that year: the nth (or, at -1, the last) given weekday of its month. */
function onHoliday(
  date: string,
  row: { month: number; weekday: number; nth: number; days: number },
): boolean {
  const year = Number(date.slice(0, 4));
  let day: number;
  if (row.nth > 0) {
    const first = new Date(Date.UTC(year, row.month - 1, 1)).getUTCDay();
    day = 1 + ((row.weekday - first + 7) % 7) + (row.nth - 1) * 7;
  } else {
    const lastDate = new Date(Date.UTC(year, row.month, 0));
    day =
      lastDate.getUTCDate() - ((lastDate.getUTCDay() - row.weekday + 7) % 7);
  }
  const start = Date.UTC(year, row.month - 1, day);
  const at = Date.parse(`${date}T00:00:00Z`);
  return at >= start && at < start + row.days * 86_400_000;
}

const table = (api: CoreAPI) =>
  api.moduleState(SCHOOL_MODULE_ID).table("attended");

/** Each place's school district, found once per world (a cache). */
const schools = new WeakMap<object, Map<string, string | undefined>>();

function schoolFor(api: CoreAPI, actor: Readonly<PersonState>) {
  let byPlace = schools.get(api.state);
  if (!byPlace) schools.set(api.state, (byPlace = new Map()));
  if (!byPlace.has(actor.placeId)) {
    let found: string | undefined;
    for (const org of api.state.organizations.values())
      if (
        org.placeId === actor.placeId &&
        org.classification === data.schoolClassification
      ) {
        found = org.id;
        break;
      }
    byPlace.set(actor.placeId, found);
  }
  // No district record yet (a world opened without the core's public-school
  // step): the town's schools stand as the place itself.
  return (
    byPlace.get(actor.placeId) ?? `${data.placeTargetPrefix}${actor.placeId}`
  );
}

/** The two-letter postal code of the world's state, from the law chain where the laws are installed. */
function stateOf(api: CoreAPI): string | undefined {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return undefined;
  return lawChain(api).stateKey.slice(3);
}

function due(api: CoreAPI, actor: Readonly<PersonState>): boolean {
  const date = api.state.date;
  if (!isSchoolDay(date, stateOf(api))) return false;
  const age = ageOn(actor.birthDate, date);
  if (
    age < api.parameter("openingSchoolAgeFirst") ||
    age > api.parameter("openingSchoolAgeLast")
  )
    return false;
  return table(api).get(actor.id)?.date !== date;
}

/** The other way to spend a school day (the same act kinds as missing a work shift). */
const STAY_HOME: ActionDefinition = {
  id: "stay-home-from-school",
  actKinds: decisionKinds("school.attend", "stay-home-from-school"),
  goalKinds: [],
  need: "time",
  effortParameter: "schoolDayHours",
  effectParameter: "one",
  targetKind: "self",
  effect: "recover",
};

/**
 * Each school day, every school-age full person but the player decides
 * whether to go, through the core's chooser: going answers the full
 * compulsory pull; staying home answers the day's need for rest. The player
 * chooses it among their own acts instead (the offer below).
 */
function schoolDay(api: CoreAPI): void {
  const date = api.state.date;
  if (!isSchoolDay(date, stateOf(api))) return;
  const action = api.state.data.actions.find((row) => row.id === data.actionId);
  if (!action) return;
  // Light relatives who live elsewhere (inactive tiers) make no choices here.
  const inactive = new Set(
    api.state.data.tiers
      .filter((tier) => tier.cadence === "inactive")
      .map((tier) => tier.id),
  );
  for (const person of api.state.people.values()) {
    if (!person.alive || person.id === api.state.playerId) continue;
    if (inactive.has(person.tier)) continue;
    if (!due(api, person)) continue;
    const school = schoolFor(api, person);
    const attend = offer(api, person, action, school);
    const home: ActOffer = {
      definition: STAY_HOME,
      targetId: person.id,
      availableHours: api.parameter("schoolDayHours"),
    };
    const scored = scoreOffers(api.state, person.id, [attend, home], {
      needValues: { [action.need]: api.parameter("one") },
    });
    const decision = decisionFromScores(api.state, person.id, scored);
    if (decision.selected?.definition.id !== action.id) continue;
    api.stopgap(data.stopgapId);
    attended(api, person.id, school);
    api.recordAct(person.id, attend, date, decision);
  }
}

function attended(api: CoreAPI, personId: string, schoolId: string): void {
  table(api).put({ id: personId, date: api.state.date, schoolId });
}

const isPlayer = (api: CoreAPI, actor: Readonly<PersonState>) =>
  actor.id === api.state.playerId;

export const SCHOOL_MODULE: CoreModule = {
  id: SCHOOL_MODULE_ID,
  state: { schemaVersion: 1, tables: { attended: {} } },
  onDay: (api) => {
    schoolDay(api);
    // A new school year: private enrollment is ranked again on what families hold.
    if (api.state.date.slice(5) === tuition.reenrollOn)
      reenrollPrivateTuition(api);
    return undefined;
  },
  needEvaluators: {
    // The player's compulsory pull on a school day not yet attended.
    "school-day": (api, actor) =>
      isPlayer(api, actor) && due(api, actor)
        ? api.parameter("one")
        : api.parameter("zero"),
  },
  offerProviders: {
    "child-school": (api, actor, action) => {
      if (!isPlayer(api, actor) || !due(api, actor)) return [];
      return [offer(api, actor, action, schoolFor(api, actor))];
    },
  },
  effectHandlers: {
    "school-day": (api, actorId, chosen) =>
      attended(api, actorId, chosen.targetId),
  },
};
