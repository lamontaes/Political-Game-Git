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
import { lawChain } from "./laws";
import {
  LEGISLATURE_MODULE_ID,
  budgetLineStakes,
  learnStake,
  members,
  provisionStance,
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
};

export function openStaff(core: CoreState): void {
  if (!core.modules.has(STAFF_MODULE_ID)) registerModule(core, STAFF_MODULE);
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
  // stopgapId: SG-GOV-staff-unpaid
  api.stopgap("SG-GOV-staff-unpaid");
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
  // Experience: what they've learned from tasks done, at their own rate.
  const rate =
    campaignParameter("staffLearningBase") *
    (1 + (person.traits["people-mind-v1:deliberation"] ?? 0) / 2);
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
  const help = q.quality >= campaignParameter("staffCaseFollowThrough");
  const work = record(api, staffer, "case", q, { help });
  return { stafferId: staffer.id, help, work };
}

export function workOf(api: CoreAPI, stafferId: string): readonly WorkRecord[] {
  return table(api, "work").query("byStaffer", [
    stafferId,
  ]) as unknown as WorkRecord[];
}

export { coreAPI };
