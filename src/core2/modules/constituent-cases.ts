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
import { coreAPI, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-views";
import { decisionLean } from "../trait-decisions";
import { lawChain, lawInForce, raiseOne } from "./laws";
import { townSeats, type TermRow } from "./offices";
import { touchImpression } from "./campaigns";
import { STAFF_MODULE_ID, staffDecision } from "./staff";
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

const ageOn = (p: Readonly<PersonState>, date: string) =>
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

function officeHours(api: CoreAPI): void {
  scheduleOfficeHours(api, api.state.date);
  const officials = localOfficials(api);
  if (!officials.length) return;
  const town = lawChain(api).townPlaceId;
  const state = api.state as CoreState;
  const effort = campaignParameter("caseEffort");
  for (const person of [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === town)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    if (officials.some((o) => o.personId === person.id)) continue;
    if (
      (table(api).query("byPerson", [person.id]) as unknown as CaseRow[]).some(
        (c) =>
          c.status === "open" ||
          c.opened >
            addDays(api.state.date, -campaignParameter("caseRepeatDays")),
      )
    )
      continue;
    const problem = problemOf(api, person);
    if (!problem) continue;
    const reachOut = decisionLean(
      api.state,
      person,
      "constituent-cases.bring-case",
      "bring",
      "let-it-go",
    );
    if (problem.severity + reachOut <= effort) continue;
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
}

/** The office handles a case nobody decided: by the official's own sense of duty. */
function officeHandles(api: CoreAPI, row: CaseRow): void {
  // An office with staff hands it to its staffer; the result is theirs.
  const staffed = api.state.modules.has(STAFF_MODULE_ID)
    ? staffDecision(api, row.officialId)
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
  const official = api.state.people.get(row.officialId);
  // Most officials help; every trait tilts that toward or away from it.
  const duty = official
    ? campaignParameter("constituentHelpBase") +
      decisionLean(
        api.state,
        official,
        "constituent-cases.handle-case",
        "help",
        "turn-away",
      )
    : campaignParameter("constituentHelpBase");
  resolve(api, row, duty > 0 ? "help" : "decline", "office");
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
    // stopgapId: SG-GOV-case-referral-unread (the jobs engine doesn't read a referral yet)
    api.stopgap("SG-GOV-case-referral-unread");
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
