/**
 * Going to college (P15): each fall term, a resident who has turned 18 since
 * the last one weighs enrolling against working or waiting, through the
 * shared chooser, from their own records: a degree held in their household,
 * the household's earnings against the national median, and their own
 * temperament. Someone who enrolls attends a college in their county where
 * there is one, and otherwise leaves town for college (the moves engine).
 * Enrollment ends at graduation, after the college kind's usual years.
 * The national rate of enrolling right after high school checks the total;
 * it never picks a person.
 *
 * Students enrolled at the opening (opening-college.ts) join this engine's
 * table on its first day.
 */
import rows from "../data/college/parameters.json" with { type: "json" };
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import { stableHash } from "../../simulation/ids";
import { decisionFromScores, scoreOffers } from "../choice";
import {
  COLLEGE_FACT_KIND,
  COLLEGE_STAGE,
  COLLEGE_TERM_START,
  collegesNear,
} from "../opening-college";
import { profileFor } from "../opening-profile";
import { decisionKinds, decisionLean } from "../trait-decisions";
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import { departAlone } from "./moves";

import { declareSnapshotCovered } from "../snapshot";
export const COLLEGE_MODULE_ID = "college";
export const ENROLLED_EVENT = "education.enrolled";
export const GRADUATED_EVENT = "education.graduated";
export const LEFT_FOR_COLLEGE_CAUSE = "college";
const STOPGAP = "SG-P15-college-enrollment";
const DECISION = "college.enroll";
const ENROLL_ID = "enroll";
const WAIT_ID = "work-or-wait";
const REVIEW_KIND = "college-term";
const INACTIVE_TIER = "husk";
const PARAMETERS = rows as unknown as Readonly<Record<string, Parameter>>;

const c = (api: CoreAPI, key: string) => {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

export interface Enrollment {
  id: PersonId;
  personId: PersonId;
  collegeId: string;
  collegeName: string;
  collegeKind: string;
  startedAt: string;
  endsAt: string;
  status: "enrolled" | "graduated";
}

const enrollments = (api: CoreAPI) =>
  api.moduleState(COLLEGE_MODULE_ID).table("enrollments");

/** A person's current or past enrollment, from this engine or the opening's record. */
export function enrollmentOf(
  api: CoreAPI,
  personId: PersonId,
): Enrollment | undefined {
  if ((api.state as CoreState).modules.has(COLLEGE_MODULE_ID)) {
    const row = enrollments(api).get(personId);
    if (row) return row as unknown as Enrollment;
  }
  const fact = api.state.people
    .get(personId)
    ?.pastFacts?.find(
      (row) =>
        row.kind === COLLEGE_FACT_KIND && row.facts?.stage === COLLEGE_STAGE,
    );
  if (!fact?.facts?.institutionSourceId) return undefined;
  return {
    id: personId,
    personId,
    collegeId: fact.facts.institutionSourceId,
    collegeName: fact.facts.institutionName ?? fact.facts.schoolName ?? "",
    collegeKind: fact.facts.collegeKind ?? "four-year",
    startedAt: fact.date,
    endsAt: endOf(api, fact.date, fact.facts.collegeKind ?? "four-year"),
    status: "enrolled",
  };
}

function endOf(api: CoreAPI, startedAt: string, kind: string): string {
  const years = c(
    api,
    kind === "community" ? "collegeCommunityYears" : "collegeFourYearYears",
  );
  return addDays(
    makeIsoDate(startedAt),
    Math.round(years * api.parameter("daysPerMeanYear")),
  );
}

const pending = new WeakMap<object, number>();

function action(id: string, enrolling: boolean): ActionDefinition {
  return {
    id: `college-${id}`,
    actKinds: decisionKinds(DECISION, id),
    goalKinds: [],
    need: "purpose",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "organization",
    effect: "enroll",
    reasonBindings: [
      {
        id: "college",
        provider: "college-pull",
        weightParameter: "one",
        arguments: { enrolling: String(enrolling) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
const ENROLL = action(ENROLL_ID, true);
const WAIT = action(WAIT_ID, false);

/** Each recorded reason to enroll, as a signed pull. */
export function collegeReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
): Record<string, number> {
  const core = api.state as CoreState;
  const home = core.households.get(person.householdId);
  const members = (home?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter((row): row is PersonState => !!row?.alive);
  const degree = members.some(
    (row) =>
      row.id !== person.id &&
      profileFor(row, api.state.seed, api.state.startedAt)?.education ===
        "college",
  );
  const pay = members.reduce(
    (sum, row) =>
      sum +
      (row.jobId
        ? (core.jobs.get(row.jobId)?.wageDailyMinor ?? api.parameter("zero"))
        : api.parameter("zero")),
    api.parameter("zero"),
  );
  const yearly = pay * api.parameter("daysPerMeanYear");
  return {
    degreeAtHome: degree
      ? c(api, "collegeDegreeAtHomeWeight")
      : -c(api, "collegeDegreeAtHomeWeight"),
    // Sliding and bounded: a household with no pay on record weighs no more
    // than one far below the median.
    means:
      c(api, "collegeMeansWeight") *
      Math.tanh(
        Math.log(
          (yearly + api.parameter("one")) / c(api, "collegeMedianIncomeMinor"),
        ),
      ),
    temperament:
      c(api, "collegeTemperamentWeight") *
      decisionLean(api.state, person, DECISION, ENROLL_ID, WAIT_ID),
  };
}

function chooses(api: CoreAPI, person: Readonly<PersonState>): boolean {
  const pull = Object.values(collegeReasons(api, person)).reduce(
    (sum, value) => sum + value,
    api.parameter("zero"),
  );
  pending.set(api.state, pull - c(api, "collegeStayPull"));
  const offers: ActOffer[] = [WAIT, ENROLL].map((definition) => ({
    definition,
    targetId: person.id,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, person.id, offers, {
    needValues: { purpose: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, person.id, scored);
  pending.delete(api.state);
  return decision.selected?.definition.id === ENROLL.id;
}

/** The colleges a person could attend from home: those in their county. */
export function collegeOptionsFor(
  api: CoreAPI,
  personId: PersonId,
): readonly { collegeId: string; name: string; kind: string }[] {
  const person = api.state.people.get(personId);
  if (!person) return [];
  return collegesNear(person).map(([collegeId, name, kind]) => ({
    collegeId,
    name,
    kind,
  }));
}

/**
 * The player's own choice (the screen offers `collegeOptionsFor`): enrolls
 * them at that college from today, as the engine enrolls anyone. Returns the
 * enrollment, or null when the person is already enrolled or the college is
 * not one they could attend from home.
 */
export function enrollAt(
  api: CoreAPI,
  personId: PersonId,
  collegeId: string,
): Enrollment | null {
  const person = api.state.people.get(personId);
  const college = person
    ? collegesNear(person).find(([id]) => id === collegeId)
    : undefined;
  if (
    !person?.alive ||
    !college ||
    enrollmentOf(api, personId)?.status === "enrolled"
  )
    return null;
  return record(api, person, college);
}

function record(
  api: CoreAPI,
  person: Readonly<PersonState>,
  [collegeId, collegeName, collegeKind]: readonly [string, string, string],
): Enrollment {
  const row: Enrollment = {
    id: person.id,
    personId: person.id,
    collegeId,
    collegeName,
    collegeKind,
    startedAt: api.state.date,
    endsAt: endOf(api, api.state.date, collegeKind),
    status: "enrolled",
  };
  enrollments(api).put(row as unknown as { id: string });
  api.emit({
    id: `${ENROLLED_EVENT}:${person.id}:${api.state.date}`,
    date: api.state.date,
    kind: ENROLLED_EVENT,
    personIds: [person.id],
    placeId: person.placeId,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${person.id} chose to enroll at ${collegeName} (IPEDS ${collegeId}).`,
      estimatedFrom: STOPGAP,
    },
    publicRecord: false,
    facts: { collegeId, school: collegeName, collegeKind },
  });
  return row;
}

function enroll(api: CoreAPI, person: Readonly<PersonState>): void {
  const near = collegesNear(person);
  if (!near.length) {
    // No college at home: they leave town for one.
    departAlone(api, person.id, LEFT_FOR_COLLEGE_CAUSE);
    return;
  }
  const degree =
    collegeReasons(api, person).degreeAtHome! > api.parameter("zero");
  const want = degree ? "four-year" : "community";
  const fitting = near.filter(([, , kind]) => kind === want);
  const pool = fitting.length ? fitting : near;
  // SG-P15-college-enrollment: which college of the kind, keyed to the
  // person, until colleges carry their enrollment.
  const at = Number.parseInt(
    stableHash(`${api.state.seed}:college:${person.id}`).slice(
      api.parameter("zero"),
      api.parameter("seedHashDigits"),
    ),
    api.parameter("seedPlaceHashRadix"),
  );
  record(api, person, pool[at % pool.length]!);
}

/** The fall term: graduations, then those newly of age choose. */
function term(api: CoreAPI): void {
  const core = api.state as CoreState;
  api.stopgap(STOPGAP);
  for (const raw of enrollments(api).rows()) {
    const row = raw as unknown as Enrollment;
    if (row.status !== "enrolled" || row.endsAt > api.state.date) continue;
    enrollments(api).put({ ...row, status: "graduated" } as unknown as {
      id: string;
    });
    const person = core.people.get(row.personId);
    if (!person?.alive || person.tier === INACTIVE_TIER) continue;
    api.emit({
      id: `${GRADUATED_EVENT}:${row.personId}:${api.state.date}`,
      date: api.state.date,
      kind: GRADUATED_EVENT,
      personIds: [row.personId],
      placeId: person.placeId,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `${row.personId} completed ${row.collegeName} after its usual years.`,
        estimatedFrom: STOPGAP,
      },
      publicRecord: false,
      facts: { collegeId: row.collegeId, school: row.collegeName },
    });
  }
  const minimum = c(api, "collegeMinimumAge");
  for (const person of [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      !person.alive ||
      person.tier === INACTIVE_TIER ||
      person.id === core.playerId ||
      enrollmentOf(api, person.id)
    )
      continue;
    // Turned 18 since the last fall term.
    if (
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date)) !==
      minimum
    )
      continue;
    if (chooses(api, person)) enroll(api, person);
  }
}

function nextTerm(api: CoreAPI): string {
  const year = Number(
    api.state.date.slice(api.parameter("zero"), api.state.date.indexOf("-")),
  );
  const thisYear = `${year}-${COLLEGE_TERM_START}`;
  return thisYear > api.state.date
    ? thisYear
    : `${year + api.parameter("one")}-${COLLEGE_TERM_START}`;
}

function schedule(api: CoreAPI): void {
  const date = nextTerm(api);
  api.moduleCalendar(COLLEGE_MODULE_ID).schedule({
    key: `term:${date}`,
    date,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "The fall term, when young adults choose college.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: ["college:state"],
  });
}

export const collegeModule: CoreModule = {
  id: COLLEGE_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, enrollments: {} } },
  onDay(api) {
    const state = api.moduleState(COLLEGE_MODULE_ID).table("state");
    if (state.get("college:opened")) return;
    state.put({ id: "college:opened", openedAt: api.state.date });
    // The opening's students join the table.
    for (const person of (api.state as CoreState).people.values()) {
      const row = enrollmentOf(api, person.id);
      if (row) enrollments(api).put(row as unknown as { id: string });
    }
    schedule(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    term(api);
    schedule(api);
  },
  reasonProviders: {
    "college-pull": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (held === undefined) return undefined;
      return {
        value:
          binding.arguments?.enrolling === "true"
            ? held
            : api.parameter("zero"),
        sourceIds: [actor.id],
      };
    },
  },
};

declareSnapshotCovered(COLLEGE_MODULE_ID);
