/**
 * Constituent cases (M3-08, simple): residents bring real problems from their
 * own records to an official, who helps or doesn't, and it changes how they
 * see that official.
 *
 * Problems come from records, never a roll: an adult under retirement age
 * with no job and a thin cushion (savings against their living costs), or a
 * worker paid under the minimum wage in force. At each local office's
 * regular office hours (a tunable count a month), a resident with a problem
 * decides to come when how hard it presses on them, with how ready they are
 * to reach out, outweighs the effort; they go to the official they know best.
 * The official's office handles it: the player decides with `handleCase`;
 * otherwise their staffer handles it (as well as their own work goes), or
 * with no staff the office decides by the official's own sense of duty, within
 * a few days. Helping a wage complaint refers it to the labor standards
 * office, which raises the pay to the floor; helping a job seeker refers them
 * to the workforce office. Either way the resident's view of the official
 * moves, as a cause their next ballot reads.
 */
import { coreAPI, fillInPerson, registerModule } from "../state";
import { fundBalance } from "../counted-money";
import { closenessBetween } from "../closeness";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-views";
import { leanedYes } from "../trait-decisions";
import { lawChain, lawInForce, raiseOne } from "./laws";
import { townSeats, type TermRow } from "./offices";
import { touchImpression } from "./campaigns";
import { STAFF_MODULE_ID, staffDecision } from "./staff";
import { JOBS_MODULE_ID, recordReferral } from "./jobs";
import { residentsRuntime } from "./residents";
import { makeCase, SPEECH_MODULE_ID } from "./speech";
import problemQuestions from "../data/constituent-cases/problem-questions.json" with { type: "json" };

export const CASES_MODULE_ID = "core2-constituent-cases-v1";

export type Problem = "looking-for-work" | "paid-under-minimum-wage";

const PROBLEM_QUESTIONS = (
  problemQuestions as unknown as {
    problems: Record<
      string,
      { question: string; desiredChange: string } | null
    >;
  }
).problems;

export interface CaseRow {
  readonly id: string;
  readonly personId: string;
  readonly officialId: string;
  readonly problem: Problem;
  /** How hard it presses on them, from their records, in [0, 1]. */
  readonly severity: number;
  readonly facts: Readonly<Record<string, string | number>>;
  readonly opened: string;
  readonly respondBy: string;
  readonly status: "open" | "helped" | "declined";
  readonly handledBy: "official" | "office" | "staff" | null;
  readonly stafferId?: string | null;
  readonly outcome: string | null;
}

export const CASES_MODULE: CoreModule = {
  id: CASES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      cases: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byStatus: { fields: ["status"] },
        },
      },
    },
  },
  onCalendarWork: (api, work) => caseWork(api, work),
};

const table = (api: CoreAPI) => api.moduleState(CASES_MODULE_ID).table("cases");

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

const ageOn = (p: Pick<PersonState, "birthDate">, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/** Register the module and put the town's local office hours on the calendar. */
export function openCases(core: CoreState): void {
  if (!core.modules.has(CASES_MODULE_ID)) registerModule(core, CASES_MODULE);
  scheduleOfficeHours(coreAPI(core), core.date);
}

function scheduleOfficeHours(api: CoreAPI, from: string): void {
  const days = Math.round(30 / campaignParameter("officeHoursPerMonth"));
  const date = addDays(from, days);
  api.moduleCalendar(CASES_MODULE_ID).schedule({
    key: `office-hours:${date}`,
    date,
    kind: "office-hours",
    source: {
      tag: "ESTIMATED",
      citation: "local officials' regular office hours, at the tunable count",
      asOf: api.state.date,
      estimatedFrom: "officeHoursPerMonth",
    },
    sourceRecordIds: [lawChain(api).townPlaceId],
  });
}

/** Officials covering the town, including its state district office, chosen by the same ties and service rule. */
function localOfficials(api: CoreAPI): readonly TermRow[] {
  return townSeats(api)
    .filter(
      ({ office, seat }) =>
        seat.coversTown &&
        [
          "council",
          "mayor",
          "legislature-lower",
          "legislature-upper",
          "legislature-unicameral",
        ].includes(office.kind),
    )
    .flatMap(({ holder }) =>
      holder?.personId && api.state.people.has(holder.personId) ? [holder] : [],
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** A resident's problem from their records, and how hard it presses on them. */
export function problemOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): {
  problem: Problem;
  severity: number;
  facts: Record<string, string | number>;
} | null {
  const state = api.state as CoreState;
  const date = api.state.date;
  const age = ageOn(person, date);
  if (age < 18) return null;
  const floor = lawInForce(api, "minimum-wage").value;
  const jobs = [...(state.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => state.work.commitments.get(id))
    .filter((c) => c && (c.endsAt === undefined || c.endsAt > date));
  const under = jobs.find((c) => floor !== null && c!.hourlyMinor < floor);
  if (under && floor !== null)
    return {
      problem: "paid-under-minimum-wage",
      // The share of the legal wage they're being shorted, scaled.
      severity: Math.min(
        1,
        ((floor - under.hourlyMinor) / floor) *
          campaignParameter("caseWageShortfallScale"),
      ),
      facts: {
        commitmentId: under.id,
        hourlyMinor: under.hourlyMinor,
        floorMinor: floor,
      },
    };
  if (
    jobs.length ||
    person.jobId ||
    age >= campaignParameter("caseRetirementAge")
  )
    return null;
  // Out of work: how thin their savings are against their own living costs.
  const months =
    person.liquidMinor / Math.max(1, person.livingCostDailyMinor * 30);
  const severity = Math.max(
    0,
    Math.min(1, 1 - months / campaignParameter("caseCushionMonths")),
  );
  return severity > 0
    ? {
        problem: "looking-for-work",
        severity,
        facts: { cushionMonths: Math.round(months * 10) / 10 },
      }
    : null;
}

function caseWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "office-hours") officeHours(api);
  if (work.kind === "case-due") {
    const row = table(api).get(work.sourceRecordIds[0]!) as unknown as
      CaseRow | undefined;
    if (row?.status === "open") officeHandles(api, row);
  }
}

/** The town's members of Congress: the House member and the senators whose seats cover it. */
function federalOfficials(api: CoreAPI): readonly TermRow[] {
  return townSeats(api)
    .filter(
      ({ office, seat }) =>
        seat.coversTown &&
        (office.kind === "us-senate" || office.kind.startsWith("us-house")),
    )
    .flatMap(({ holder }) =>
      holder?.personId && api.state.people.has(holder.personId) ? [holder] : [],
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

function officeHours(api: CoreAPI): void {
  scheduleOfficeHours(api, api.state.date);
  bringCases(api);
}

/** Residents with a problem bring it to the official they know best among those it concerns. */
export function bringCases(api: CoreAPI): void {
  const local = localOfficials(api);
  const federal = federalOfficials(api);
  if (!local.length && !federal.length) return;
  const officials = [...local, ...federal];
  const town = lawChain(api).townPlaceId;
  const effort = campaignParameter("caseEffort");
  const recent = (personId: string) =>
    (table(api).query("byPerson", [personId]) as unknown as CaseRow[]).some(
      (c) =>
        c.status === "open" ||
        c.opened >
          addDays(api.state.date, -campaignParameter("caseRepeatDays")),
    );
  for (const person of [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === town)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    if (officials.some((o) => o.personId === person.id)) continue;
    if (recent(person.id)) continue;
    const problem = problemOf(api, person);
    if (!problem) continue;
    if (
      !leanedYes(
        api.state,
        person,
        "constituent-cases.bring-case",
        "bring",
        "let-it-go",
        problem.severity - effort,
      )
    )
      continue;
    // A wage complaint under the federal floor goes to the town's members of
    // Congress; every other problem goes to the officials nearest to home.
    const federalFloor =
      problem.problem === "paid-under-minimum-wage" &&
      federal.length > 0 &&
      lawInForce(api, "minimum-wage").governing?.level === "federal";
    const pool = federalFloor ? federal : local;
    if (!pool.length) continue;
    bringCase(api, person, problem, pool, town);
  }
  // The wider population brings problems from the same records: a counted
  // resident out of work, with the cushion their group's fund leaves them. A
  // case that reaches an official fills the resident in first, so the case,
  // the relationship and the view of the official land on a full person.
  if (local.length)
    for (const seeker of countedOutOfWork(api, town)) {
      if (recent(seeker.personId)) continue;
      if (
        !leanedYes(
          api.state,
          { traits: seeker.traits },
          "constituent-cases.bring-case",
          "bring",
          "let-it-go",
          seeker.problem.severity - effort,
        )
      )
        continue;
      const person = fillInPerson(api.state as CoreState, seeker.personId);
      bringCase(api, person, seeker.problem, local, town);
    }
}

/**
 * Counted residents of the town who are out of work (the jobs engine's
 * counted seekers), each with the problem their records show: how thin their
 * share of the group's fund is against their own living costs, the same
 * measure a full person's own money gives. Read once an office hours, from
 * the seekers' table, never a scan of everyone.
 */
function countedOutOfWork(
  api: CoreAPI,
  town: string,
): {
  personId: string;
  traits: Readonly<Record<string, number>>;
  problem: {
    problem: Problem;
    severity: number;
    facts: Record<string, number>;
  };
}[] {
  const state = api.state as CoreState;
  const rt = residentsRuntime(state);
  if (!rt || !state.modules.has(JOBS_MODULE_ID)) return [];
  const date = state.date;
  const seekers = api
    .moduleState(JOBS_MODULE_ID)
    .table("countedSeekers")
    .query("all", [true]) as unknown as {
    personId: string;
    placeId: string;
  }[];
  const store = rt.store;
  const share = new Map<number, number>();
  const out: ReturnType<typeof countedOutOfWork> = [];
  for (const seeker of [...seekers].sort((a, b) =>
    a.personId.localeCompare(b.personId),
  )) {
    if (seeker.placeId !== town) continue;
    const m = store.countedMember(seeker.personId);
    // Someone already on file as a person (one returned to the counts) is not a new fill-in.
    if (m === undefined || state.people.has(seeker.personId)) continue;
    if (
      ageOn({ birthDate: store.born[m]! }, date) < 18 ||
      ageOn({ birthDate: store.born[m]! }, date) >=
        campaignParameter("caseRetirementAge")
    )
      continue;
    const h = store.households[store.household[m]!]!;
    // The group's fund per counted member, the member's pooled cushion.
    let perMember = share.get(h.group);
    if (perMember === undefined) {
      let people = 0;
      for (const index of store.groups[h.group]!.households)
        people += store.countedCount(store.households[index]!);
      perMember = people ? fundBalance(api, rt, h.group) / people : 0;
      share.set(h.group, perMember);
    }
    const months = perMember / Math.max(1, store.living[m]! * 30);
    const severity = Math.max(
      0,
      Math.min(1, 1 - months / campaignParameter("caseCushionMonths")),
    );
    if (severity <= 0) continue;
    out.push({
      personId: seeker.personId,
      traits: store.packedTraits(m),
      problem: {
        problem: "looking-for-work",
        severity,
        facts: { cushionMonths: Math.round(months * 10) / 10 },
      },
    });
  }
  return out;
}

/** A resident brings a problem to the official they know best: the case, their standing with them, their argument. */
function bringCase(
  api: CoreAPI,
  person: Readonly<PersonState>,
  problem: {
    problem: Problem;
    severity: number;
    facts: Record<string, string | number>;
  },
  officials: readonly TermRow[],
  town: string,
): void {
  const state = api.state as CoreState;
  // They go to the official they know best (the senior one if none).
  const official = [...officials].sort((a, b) => {
    const level = (t: TermRow) =>
      closenessBetween(state, person.id, t.personId!);
    return (
      level(b) - level(a) ||
      (a.serviceStart ?? a.startDate).localeCompare(
        b.serviceStart ?? b.startDate,
      ) ||
      a.id.localeCompare(b.id)
    );
  })[0]!;
  const row: CaseRow = {
    id: `case:${person.id}:${api.state.date}`,
    personId: person.id,
    officialId: official.personId!,
    problem: problem.problem,
    severity: problem.severity,
    facts: problem.facts,
    opened: api.state.date,
    respondBy: addDays(api.state.date, campaignParameter("caseResponseDays")),
    status: "open",
    handledBy: null,
    outcome: null,
  };
  table(api).put(row as unknown as ModuleRow);
  api.relationship(person.id, official.personId!, "contact", 0.05);
  // Bringing the problem makes the resident's case on its question to the
  // official, who is moved by the resident's standing with them.
  const argues = PROBLEM_QUESTIONS[row.problem];
  if (argues && api.state.modules.has(SPEECH_MODULE_ID))
    makeCase(api, {
      id: `case-made:${row.id}`,
      speakerId: person.id,
      listenerIds: [row.officialId],
      placeId: town,
      topic: argues.question,
      desiredChange: argues.desiredChange,
      citation: `Constituent case ${row.id}`,
    });
  api.moduleCalendar(CASES_MODULE_ID).schedule({
    key: `case-due:${row.id}`,
    date: row.respondBy,
    kind: "case-due",
    source: {
      tag: "ESTIMATED",
      citation: "the office's response window",
      asOf: api.state.date,
      estimatedFrom: "caseResponseDays",
    },
    sourceRecordIds: [row.id],
  });
}

/**
 * An official's own call on a case nobody told them how to decide: most
 * help, and every trait tilts that toward or away from it. The one rule the
 * office, and the character of a player who leaves a case alone, follow.
 */
export function ownCaseDecision(
  api: CoreAPI,
  officialId: string,
): { duty: number; decision: "help" | "decline" } {
  const official = api.state.people.get(officialId);
  const duty = campaignParameter("constituentHelpBase");
  const help = official
    ? leanedYes(
        api.state,
        official,
        "constituent-cases.handle-case",
        "help",
        "turn-away",
        duty,
      )
    : duty > 0;
  return { duty, decision: help ? "help" : "decline" };
}

/**
 * The office handles a case nobody decided. The official's own call comes
 * first, by their own sense of duty; an office with staff passes that call to
 * its staffer, who sees a "help" through only as far as their own work allows.
 */
function officeHandles(api: CoreAPI, row: CaseRow): void {
  const own = ownCaseDecision(api, row.officialId);
  const staffed = api.state.modules.has(STAFF_MODULE_ID)
    ? staffDecision(api, row.officialId, own.decision)
    : null;
  if (staffed) {
    resolve(
      api,
      row,
      staffed.help ? "help" : "decline",
      "staff",
      staffed.stafferId,
    );
    return;
  }
  resolve(api, row, own.decision, "office");
}

/** The player's (or any official's) decision on a case in their office. */
export function handleCase(
  api: CoreAPI,
  caseId: string,
  decision: "help" | "decline",
): CaseRow | null {
  const row = table(api).get(caseId) as unknown as CaseRow | undefined;
  if (!row || row.status !== "open") return row ?? null;
  return resolve(api, row, decision, "official");
}

function resolve(
  api: CoreAPI,
  row: CaseRow,
  decision: "help" | "decline",
  by: "official" | "office" | "staff",
  stafferId: string | null = null,
): CaseRow {
  let outcome: string;
  if (decision === "help" && row.problem === "paid-under-minimum-wage") {
    const raised = raiseOne(api, String(row.facts.commitmentId), {
      tag: "SOURCED",
      citation: `Wage complaint referred by ${row.officialId}`,
      asOf: api.state.date,
    });
    outcome = raised ? "referred-pay-raised" : "referred-no-finding";
  } else if (decision === "help") {
    // The jobs engine reads the referral when an employer chooses among
    // applicants.
    recordReferral(api, {
      caseId: row.id,
      personId: row.personId,
      officialId: row.officialId,
    });
    outcome = "referred-to-workforce-office";
  } else outcome = "turned-away";
  const done: CaseRow = {
    ...row,
    status: decision === "help" ? "helped" : "declined",
    handledBy: by,
    stafferId,
    outcome,
  };
  table(api).put(done as unknown as ModuleRow);
  touchImpression(api, {
    voterId: row.personId,
    officialId: row.officialId,
    act: "constituent-case",
    target:
      decision === "help"
        ? campaignParameter("caseHelpedWarmth")
        : -campaignParameter("caseHelpedWarmth"),
    weight: row.severity * campaignParameter("caseWeight"),
    rapport: 0,
  });
  return done;
}

/**
 * The official's desk of cases: those still open, soonest deadline first. The
 * player decides these (`handleCase`); one left past its deadline goes to the
 * office's staff, or to the office's own habit where it has none.
 */
export function casesOpenFor(
  api: CoreAPI,
  officialId: string,
): readonly CaseRow[] {
  return (table(api).query("byStatus", ["open"]) as unknown as CaseRow[])
    .filter((c) => c.officialId === officialId)
    .sort(
      (a, b) =>
        a.respondBy.localeCompare(b.respondBy) || a.id.localeCompare(b.id),
    );
}

export function casesFor(api: CoreAPI, officialId: string): readonly CaseRow[] {
  return (table(api).rows() as unknown as CaseRow[]).filter(
    (c) => c.officialId === officialId,
  );
}

export function allCases(api: CoreAPI): readonly CaseRow[] {
  return table(api).rows() as unknown as CaseRow[];
}
