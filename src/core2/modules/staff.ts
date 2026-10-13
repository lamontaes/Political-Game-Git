/**
 * Staff (M3-06, first slice): an official hires people they know or
 * applicants, and delegates work to them; what a staffer gets done follows
 * their own record and improves with experience.
 *
 * A staffer's work on a task is their reliability (do they follow through),
 * their deliberation (do they think it through), what experience has taught
 * them (growing at a rate set by how they learn, which no screen shows), and
 * passion: how much they care about the work in front of them, from their own
 * view of its question. Every delegated result records who did it and the
 * parts of their work behind it. Delegating carries no hidden penalty: a
 * staffer does the task as well as their own record says.
 *
 * Tasks so far: a briefing on where the members stand on a bill (the staffer
 * reads the record of as many members as their work covers), and handling a
 * constituent case in the official's office.
 */
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter, personLean, personStance } from "../campaign-views";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import { lawChain } from "./laws";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { townSeats } from "./offices";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import { startPublicJob } from "../public-payroll";
import {
  LEGISLATURE_MODULE_ID,
  budgetLineStakes,
  learnStake,
  members,
  provisionStance,
  registerLegislatureHooks,
  type BillRow,
  type MemberPosition,
} from "./legislature";

export const STAFF_MODULE_ID = "core2-staff-v1";

export interface StafferRow {
  readonly id: string;
  readonly officialId: string;
  readonly personId: string;
  readonly role: string;
  readonly hiredOn: string;
  readonly hiredFrom: "known" | "applicant";
  readonly tasksDone: number;
}

export interface WorkRecord {
  readonly id: string;
  readonly stafferId: string;
  readonly task: string;
  readonly date: string;
  readonly quality: number;
  readonly parts: {
    readonly reliability: number;
    readonly deliberation: number;
    readonly experience: number;
    readonly passion: number;
  };
  readonly result: Readonly<Record<string, unknown>>;
}

export const STAFF_MODULE: CoreModule = {
  id: STAFF_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      staff: { indexes: { byOfficial: { fields: ["officialId"] } } },
      work: { indexes: { byStaffer: { fields: ["stafferId"] } } },
    },
  },
  onCalendarWork: (api, work) => staffReview(api, work),
};

export function openStaff(core: CoreState): void {
  registerLegislatureHooks({ beforeVote: briefBeforeVote });
  if (core.modules.has(STAFF_MODULE_ID)) return;
  registerModule(core, STAFF_MODULE);
  scheduleReview(coreAPI(core), core.date);
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(STAFF_MODULE_ID).table(name);

const ageOn = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/**
 * Who an official can hire: people they know, and applicants (town adults
 * out of work, or whose current pay is under the post's).
 */
export function staffCandidates(
  api: CoreAPI,
  officialId: string,
): readonly { personId: string; from: "known" | "applicant" }[] {
  const official = api.state.people.get(officialId);
  if (!official) return [];
  const state = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const hired = new Set(
    (table(api, "staff").rows() as unknown as StafferRow[]).map(
      (s) => s.personId,
    ),
  );
  const postHourly = campaignParameter("staffHourlyMinor");
  const out: { personId: string; from: "known" | "applicant" }[] = [];
  for (const person of [...api.state.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      !person.alive ||
      person.id === officialId ||
      hired.has(person.id) ||
      ageOn(person, api.state.date) < 18
    )
      continue;
    if (official.knownIds.has(person.id) || official.familyIds.has(person.id)) {
      out.push({ personId: person.id, from: "known" });
      continue;
    }
    if (person.placeId !== town) continue;
    const pay = [...(state.work.commitmentsByPerson.get(person.id) ?? [])]
      .map((id) => state.work.commitments.get(id))
      .filter((c) => c && c.endsAt === undefined)
      .reduce((max, c) => Math.max(max, c!.hourlyMinor), 0);
    if (pay < postHourly) out.push({ personId: person.id, from: "applicant" });
  }
  return out;
}

/** Hire one of the official's candidates. */
export function hireStaff(
  api: CoreAPI,
  input: {
    readonly officialId: string;
    readonly personId: string;
    readonly role: string;
  },
): StafferRow {
  const candidate = staffCandidates(api, input.officialId).find(
    (c) => c.personId === input.personId,
  );
  if (!candidate)
    throw new Error(`${input.personId} isn't a candidate for this office`);
  // On the payroll of the government the official serves, at the post's pay.
  const employer = employerOf(api, input.officialId);
  const jobId = employer
    ? startPublicJob(api, {
        personId: input.personId,
        employerId: employer,
        post: `staff:${input.officialId}`,
        title: input.role,
        hourlyMinor: campaignParameter("staffHourlyMinor"),
        citation: `Hired as ${input.role} to ${input.officialId}`,
      })
    : null;
  // stopgapId: SG-GOV-staff-unpaid
  if (!jobId) api.stopgap("SG-GOV-staff-unpaid");
  const row: StafferRow = {
    id: `staffer:${input.officialId}:${input.personId}`,
    officialId: input.officialId,
    personId: input.personId,
    role: input.role,
    hiredOn: api.state.date,
    hiredFrom: candidate.from,
    tasksDone: 0,
  };
  table(api, "staff").put(row as unknown as ModuleRow);
  api.relationship(input.officialId, input.personId, "contact", 0.1);
  return row;
}

/** The treasury of the government whose seat the official holds. */
function employerOf(api: CoreAPI, officialId: string): string | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const seat = townSeats(api).find((s) => s.holder?.personId === officialId);
  if (!seat) return null;
  const level = seat.office.level === "township" ? "city" : seat.office.level;
  return (
    governments(api).find((g) => g.level === level)?.organizationId ?? null
  );
}

export function staffOf(
  api: CoreAPI,
  officialId: string,
): readonly StafferRow[] {
  return table(api, "staff").query("byOfficial", [
    officialId,
  ]) as unknown as StafferRow[];
}

/** How well a staffer does a task on a question, and the parts behind it. */
export function workQuality(
  api: CoreAPI,
  staffer: StafferRow,
  question: string | null,
): { quality: number; parts: WorkRecord["parts"] } {
  const person = api.state.people.get(staffer.personId)!;
  const reliability =
    (person.traits["people-mind-v1:reliability"] ?? 0) *
    campaignParameter("staffTraitWeight");
  const deliberation =
    (person.traits["people-mind-v1:deliberation"] ?? 0) *
    campaignParameter("staffTraitWeight");
  // Experience: what they've learned from tasks done, at their own rate
  // (faster for the deliberate, slower but never stopped for the least).
  const rate =
    campaignParameter("staffLearningBase") *
    2 ** ((person.traits["people-mind-v1:deliberation"] ?? 0) / 2);
  const experience =
    campaignParameter("staffExperienceCeiling") *
    (1 - Math.exp(-rate * staffer.tasksDone));
  // Passion: how much they care about this question, from their own view.
  const passion = question
    ? campaignParameter("staffPassionWeight") *
      Math.abs(
        personStance(
          personLean(api.state.people, person, townLean(api)),
          question,
        ),
      )
    : 0;
  const quality = Math.max(
    0,
    Math.min(
      1,
      campaignParameter("staffBaseQuality") +
        reliability +
        deliberation +
        experience +
        passion,
    ),
  );
  return { quality, parts: { reliability, deliberation, experience, passion } };
}

function townLean(api: CoreAPI): number {
  return (
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0
  );
}

function record(
  api: CoreAPI,
  staffer: StafferRow,
  task: string,
  q: ReturnType<typeof workQuality>,
  result: Record<string, unknown>,
): WorkRecord {
  const work: WorkRecord = {
    id: `work:${staffer.id}:${staffer.tasksDone + 1}`,
    stafferId: staffer.id,
    task,
    date: api.state.date,
    quality: q.quality,
    parts: q.parts,
    result,
  };
  table(api, "work").put(work as unknown as ModuleRow);
  table(api, "staff").put({
    ...staffer,
    tasksDone: staffer.tasksDone + 1,
  } as unknown as ModuleRow);
  return work;
}

/**
 * A briefing on a bill: the staffer reads the record of as many of the body's
 * members as their work covers, and reports each one's stake.
 */
export function briefOnBill(
  api: CoreAPI,
  stafferId: string,
  billId: string,
): { work: WorkRecord; stakes: readonly MemberPosition[] } {
  const staffer = table(api, "staff").get(stafferId) as unknown as StafferRow;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow;
  const question =
    bill.provisions
      .map((p) => provisionStance(api, p)?.question)
      .find((q): q is string => !!q) ?? null;
  const q = workQuality(api, staffer, question);
  const body = members(api, bill.bodyOfficeId)
    .map((t) => t.personId ?? `official:${t.id}`)
    .filter((id) => id !== staffer.officialId)
    .sort();
  const covered = body.slice(0, Math.round(q.quality * body.length));
  const stakes = covered.map((id) => learnStake(api, billId, id, "record"));
  const work = record(api, staffer, "brief", q, {
    billId,
    covered: covered.length,
    of: body.length,
  });
  return { work, stakes };
}

/**
 * Advice on budget priorities: for each proposed line change, the staffer
 * reads as many members of each voting chamber as their work covers and
 * reports who favors and who opposes it; a change opposed by more of those
 * read than favor it, in any chamber, is at risk of being dropped when the
 * budget is negotiated.
 */
export function adviseOnBudget(
  api: CoreAPI,
  stafferId: string,
  governmentId: string,
  changes: Readonly<Record<string, number>>,
): {
  work: WorkRecord;
  lines: readonly {
    line: string;
    delta: number;
    chambers: readonly {
      chamber: string;
      read: number;
      of: number;
      favor: number;
      oppose: number;
    }[];
    atRisk: boolean;
  }[];
} | null {
  const staffer = table(api, "staff").get(stafferId) as unknown as StafferRow;
  const q = workQuality(api, staffer, null);
  const lines = [];
  for (const [line, delta] of Object.entries(changes).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const stakes = budgetLineStakes(api, governmentId, line, delta);
    if (!stakes) return null;
    const chambers = [...new Set(stakes.map((s) => s.chamber))].map(
      (chamber) => {
        const body = stakes
          .filter((s) => s.chamber === chamber)
          .sort((a, b) => a.memberId.localeCompare(b.memberId));
        const read = body.slice(0, Math.round(q.quality * body.length));
        return {
          chamber,
          read: read.length,
          of: body.length,
          favor: read.filter((s) => s.stake > 0).length,
          oppose: read.filter((s) => s.stake < 0).length,
        };
      },
    );
    lines.push({
      line,
      delta,
      chambers,
      atRisk: chambers.some((c) => c.oppose > c.favor),
    });
  }
  const work = record(api, staffer, "budget-advice", q, {
    governmentId,
    lines: lines.length,
  });
  return { work, lines };
}

/**
 * A constituent case handled by the official's staffer: they help when their
 * work on it is good enough to follow through; the result records who did it.
 */
export function staffDecision(
  api: CoreAPI,
  officialId: string,
): { stafferId: string; help: boolean; work: WorkRecord } | null {
  const staffer = [...staffOf(api, officialId)].sort(
    (a, b) => b.tasksDone - a.tasksDone || a.id.localeCompare(b.id),
  )[0];
  if (!staffer) return null;
  const q = workQuality(api, staffer, null);
  // Ability is the work's quality; whether they see it through also leans on
  // every trait they have.
  const person = api.state.people.get(staffer.personId)!;
  const help =
    q.quality +
      parameter("traitDecisionWeight") *
        decisionLean(
          api.state,
          person,
          "staff.follow-through",
          "follow-through",
          "decline",
        ) >=
    campaignParameter("staffCaseFollowThrough");
  const work = record(api, staffer, "case", q, { help });
  return { stafferId: staffer.id, help, work };
}

export function workOf(api: CoreAPI, stafferId: string): readonly WorkRecord[] {
  return table(api, "work").query("byStaffer", [
    stafferId,
  ]) as unknown as WorkRecord[];
}

function scheduleReview(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), campaignParameter("staffReviewDays"));
  api.moduleCalendar(STAFF_MODULE_ID).schedule({
    key: `staff-review:${date}`,
    date,
    kind: "staff-review",
    source: {
      tag: "ESTIMATED",
      citation: "An official's regular look at their office's work",
      asOf: api.state.date,
      estimatedFrom: "staffReviewDays",
    },
    sourceRecordIds: [`staff-review:${lawChain(api).townPlaceId}`],
  });
}

/**
 * Each official who is a person in town, holding a seat, with room in their
 * office for a staffer, decides from their own traits whether to hire; they
 * choose among people they know and applicants who'd take the post (it pays
 * more than they earn now), by how well each would do the work, people they
 * know counting for more.
 */
function staffReview(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "staff-review") return;
  scheduleReview(api, api.state.date);
  const state = api.state as CoreState;
  const postHourly = campaignParameter("staffHourlyMinor");
  const officials = [
    ...new Set(
      townSeats(api)
        .map((s) => s.holder?.personId)
        .filter((id): id is string => !!id && id !== state.playerId),
    ),
  ].sort();
  for (const officialId of officials) {
    const official = api.state.people.get(officialId);
    if (!official?.alive) continue;
    if (
      staffOf(api, officialId).length >= campaignParameter("staffPerOfficial")
    )
      continue;
    if (
      campaignParameter("staffHireBase") +
        parameter("traitDecisionWeight") *
          decisionLean(api.state, official, "staff.hire", "hire", "do-alone") <=
      0
    )
      continue;
    // stopgapId: SG-GOV-staff-hire-out-of-work
    api.stopgap("SG-GOV-staff-hire-out-of-work");
    // Only people out of work: taking the post would end a job that other
    // records (a business's contracts) may still rely on.
    const choice = staffCandidates(api, officialId)
      .filter((c) => {
        const person = state.people.get(c.personId);
        if (person?.jobId && state.jobs.get(person.jobId)?.endsAt === undefined)
          return false;
        const pay = [...(state.work.commitmentsByPerson.get(c.personId) ?? [])]
          .map((id) => state.work.commitments.get(id))
          .filter((row) => row && row.endsAt === undefined)
          .reduce((max, row) => Math.max(max, row!.hourlyMinor), 0);
        return pay < postHourly;
      })
      .map((c) => ({
        ...c,
        score:
          workQuality(
            api,
            {
              id: "",
              officialId,
              personId: c.personId,
              role: "",
              hiredOn: api.state.date,
              hiredFrom: c.from,
              tasksDone: 0,
            },
            null,
          ).quality +
          (c.from === "known" ? campaignParameter("staffKnownWeight") : 0),
      }))
      .sort(
        (a, b) => b.score - a.score || a.personId.localeCompare(b.personId),
      )[0];
    if (choice)
      hireStaff(api, {
        officialId,
        personId: choice.personId,
        role: "aide",
      });
  }
}

/** Before a vote, each member with a staffer is briefed on where the others stand. */
function briefBeforeVote(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(STAFF_MODULE_ID)) return;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) return;
  for (const term of members(api, bill.bodyOfficeId)) {
    if (!term.personId) continue;
    const staffer = [...staffOf(api, term.personId)].sort(
      (a, b) => b.tasksDone - a.tasksDone || a.id.localeCompare(b.id),
    )[0];
    if (staffer && api.state.people.get(staffer.personId)?.alive)
      briefOnBill(api, staffer.id, billId);
  }
}

export { coreAPI };
