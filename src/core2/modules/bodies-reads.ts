import type { CoreAPI } from "../types";
import type { ModuleRow } from "../module-data";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type StudyRow,
} from "./legislature";
import { LEADERSHIP_MODULE_ID, type PostRow } from "./leadership";
import {
  MEETINGS_MODULE_ID,
  type DebateRow,
  type RemarkRow,
  type TownHallRow,
} from "./meetings";

/**
 * The bodies engine's read doors: a bill, the bills, a member's choice on a
 * bill, a study, a town hall, a debate, a remark and a body's posts, as the
 * legislature, the meetings and the leadership keep them. Callers outside the
 * bodies ask these and never open `core2-legislature-v1`, `core2-meetings-v1`
 * or `core2-leadership-v1`. Each door returns the stored rows unchanged and
 * none registers a module.
 */

/** One bill by its id, or undefined where the legislature keeps no such bill. */
export function billById(api: CoreAPI, billId: string): BillRow | undefined {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
}

/** Every bill the legislature keeps, at every stage and level. */
export function allBills(api: CoreAPI): readonly BillRow[] {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as readonly BillRow[];
}

/** What one member chose on one bill (the stored choice row), or undefined. */
export function memberChoiceOn(
  api: CoreAPI,
  billId: string,
  memberId: string,
): ModuleRow | undefined {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("choices")
    .get(`${billId}|${memberId}`);
}

/** One study a legislator asked for, by its id. */
export function studyById(api: CoreAPI, studyId: string): StudyRow | undefined {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("studies")
    .get(studyId) as unknown as StudyRow | undefined;
}

/** One town hall by its id. */
export function townHallById(
  api: CoreAPI,
  townHallId: string,
): TownHallRow | undefined {
  return api
    .moduleState(MEETINGS_MODULE_ID)
    .table("townHalls")
    .get(townHallId) as unknown as TownHallRow | undefined;
}

/** One debate by its id. */
export function debateById(
  api: CoreAPI,
  debateId: string,
): DebateRow | undefined {
  return api
    .moduleState(MEETINGS_MODULE_ID)
    .table("debates")
    .get(debateId) as unknown as DebateRow | undefined;
}

/** One remark made at a meeting, by its id. */
export function remarkById(
  api: CoreAPI,
  remarkId: string,
): RemarkRow | undefined {
  return api
    .moduleState(MEETINGS_MODULE_ID)
    .table("remarks")
    .get(remarkId) as unknown as RemarkRow | undefined;
}

/** Every post the leadership keeps (leader, whip, chair and the rest). */
export function allLeadershipPosts(api: CoreAPI): readonly PostRow[] {
  return api
    .moduleState(LEADERSHIP_MODULE_ID)
    .table("posts")
    .rows() as unknown as readonly PostRow[];
}
