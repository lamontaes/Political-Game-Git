/**
 * The civic roles a scene's situation type names, filled from the records
 * that carry them (owner, Oct 15, 2026): the poll workers who work an election
 * day's polling place, the reporter who asks at an interview, the chair who
 * presides over a body and the members who sit on it, and the executive who
 * signs or vetoes. The moment's cause record says which: a bill's id names its
 * body; an interview's id names its reporter; a speech's id names its listeners; the voter's own precinct names
 * its workers.
 *
 * The clerk who takes a filing is the person the contest's filing office
 * records name (`filingClerkFor`: an elected clerk, the town's appointed
 * clerk or the county government's listed clerk). A contest filed with a state
 * or federal office has no counter in the town: the role stays unfilled, and
 * the scene says so by the reach report, never by an invented clerk.
 */
import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState, PersonId } from "../core2/types";
import {
  LEGISLATURE_MODULE_ID,
  executiveOf,
  memberKey,
  members,
} from "../core2/modules/legislature";
import type { BoardMember } from "../core2/central-bank-board";
import { MACRO_MODULE_ID } from "../core2/modules/macro";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import {
  LEADERSHIP_MODULE_ID,
  presidingOfficer,
} from "../core2/modules/leadership";
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../core2/modules/campaigns";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { retellingsOf } from "../core2/modules/speech";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { VOTING_MODULE_ID, pollingPlaceOf } from "../core2/modules/voting";
import type { Moment } from "./types";

/** The fills this module answers; `scheduling.ts` asks it for each. */
export const CIVIC_FILLS: ReadonlySet<string> = new Set([
  "clerk",
  "poll-workers",
  "chair",
  "members",
  "appointer",
  "press",
  "supporters",
  "audience",
]);

interface BillRow {
  readonly id: string;
  readonly bodyOfficeId: string;
}
interface InterviewRow {
  readonly id: string;
  readonly reporterId?: string | null;
}

const FILED_PREFIX = "candidate-filed:";

/** A filing moment's cause is the filing (or its announcement) or the contest itself. */
function contestOfFiling(api: CoreAPI, causeId: string): string {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(
      causeId.startsWith(FILED_PREFIX)
        ? causeId.slice(FILED_PREFIX.length)
        : causeId,
    ) as unknown as { contestId: string } | undefined;
  return filing?.contestId ?? causeId;
}

/** People the core holds as full people and who are alive. */
const living = (core: Readonly<CoreState>, ids: readonly (string | null)[]) =>
  ids.filter(
    (id): id is string => !!id && core.people.get(id)?.alive === true,
  ) as PersonId[];

/**
 * The people who fill a civic role for a moment, or none where the records
 * hold none. `taken` are the people already in the scene.
 */
export function civicFill(
  fill: string,
  core: Readonly<CoreState>,
  moment: Moment,
  taken: ReadonlySet<PersonId>,
): PersonId[] {
  const api = coreAPI(core as CoreState);
  const free = (ids: PersonId[]) =>
    ids.filter((id) => id !== moment.personId && !taken.has(id));
  switch (fill) {
    case "poll-workers": {
      if (!api.state.modules.has(VOTING_MODULE_ID)) return [];
      const place = pollingPlaceOf(api, moment.personId, moment.date);
      return free(living(core, place?.pollWorkers?.ids ?? []));
    }
    case "supporters": {
      // The people who worked the candidate's campaign for the contest the
      // moment's cause settled: its volunteers and its staff.
      if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return [];
      const contestId = core.durableLog.get(moment.causeId)?.facts?.contestId;
      if (!contestId) return [];
      const campaign = (
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .query("byContest", [contestId]) as unknown as CampaignRow[]
      ).find((row) => row.candidateId === moment.personId);
      return free(
        living(core, [
          ...(campaign?.volunteerIds ?? []),
          ...(campaign?.staffIds ?? []),
        ]),
      );
    }
    case "audience": {
      // The people a speech was given to: its recorded listeners.
      return free(
        living(
          core,
          retellingsOf(api, moment.causeId).map((row) => row.listenerId),
        ),
      );
    }
    case "press": {
      if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
      const row = api
        .moduleState(PRESS_MODULE_ID)
        .table("interviews")
        .get(moment.causeId) as unknown as InterviewRow | undefined;
      return free(living(core, [row?.reporterId ?? null]));
    }
    case "appointer": {
      // A central bank governor is named by the president and confirmed by
      // the Senate (`board-appointer.ts`), so the president serving that day
      // announces it. A reserve bank president is reappointed by the bank
      // itself, with no one to announce it.
      if (!api.state.modules.has(MACRO_MODULE_ID)) return [];
      const seat = (
        api
          .moduleState(MACRO_MODULE_ID)
          .table("members")
          .query("all", [true]) as unknown as BoardMember[]
      ).find((row) => row.personId === moment.personId);
      if (seat?.seatKind !== "governor") return [];
      if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
      const [term] = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[];
      const president = term?.personId;
      return free(living(core, [president ?? null]));
    }
    case "chair":
    case "members": {
      if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return [];
      // A public comment's record names its bill; a bill's own record is
      // the bill.
      const billId = core.durableLog.get(moment.causeId)?.facts?.billId;
      const bill = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(typeof billId === "string" ? billId : moment.causeId) as
        BillRow | undefined;
      if (!bill) return [];
      if (fill === "members")
        return free(
          living(
            core,
            members(api, bill.bodyOfficeId).map((term) => memberKey(term)),
          ),
        );
      // The chair presides; a body with no presiding post is chaired by its
      // executive (a mayor, a governor), the one who signs.
      const presiding = api.state.modules.has(LEADERSHIP_MODULE_ID)
        ? presidingOfficer(api, bill.bodyOfficeId)
        : null;
      const executive = executiveOf(api, bill.bodyOfficeId).term;
      return free(
        living(core, [presiding ?? (executive ? memberKey(executive) : null)]),
      );
    }
    case "clerk": {
      if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
      const clerk = filingClerkFor(api, contestOfFiling(api, moment.causeId));
      return free(living(core, [clerk?.personId ?? null]));
    }
    default:
      return [];
  }
}
