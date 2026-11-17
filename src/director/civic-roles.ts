/**
 * The civic roles a scene's situation type names, filled from the records
 * that carry them (owner, Oct 15, 2026): the poll workers who work an election
 * day's polling place, the reporter who asks at an interview, the chair who
 * presides over a body and the members who sit on it, and the executive who
 * signs or vetoes, the reporters who cover an officeholder's act on a bill
 * (the press corps), the officeholder's own aides and the residents who asked
 * at their town hall. The moment's cause
 * record says which: a bill's id names its
 * body; an interview's id names its reporter; a speech's id names its listeners; the voter's own precinct names
 * its workers.
 *
 * The clerk who takes a filing is the person the contest's filing office
 * records name (`filingClerkFor`: an elected clerk, the town's appointed
 * clerk or the county government's listed clerk). A contest filed with a state
 * or federal office has no counter in the town: the role stays unfilled, and
 * the scene says so by the reach report, never by an invented clerk. A bill
 * presented to the executive's desk is brought by its body's clerk, the
 * town's or the county's (`localClerkFor`), and an official's aide is one of
 * the staff they hired (`servingStaffOf`).
 */

import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState, PersonId } from "../core2/types";
import {
  LEGISLATURE_MODULE_ID,
  billReach,
  memberKey,
  members,
  type BillRow as LegislatureBill,
} from "../core2/modules/legislature";

import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../core2/modules/campaigns";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { STAFF_MODULE_ID, servingStaffOf } from "../core2/modules/staff";

import { retellingsOf } from "../core2/modules/speech";
import { PRESS_MODULE_ID, outletsHere } from "../core2/modules/press";

import { VOTING_MODULE_ID, pollingPlaceOf } from "../core2/modules/voting";
import { P } from "../core2/parameters";

import type { Moment } from "./types";

const zero = P.zero;

const one = P.one;

/** The fills this module answers; `scheduling.ts` asks it for each. */
export const CIVIC_FILLS: ReadonlySet<string> = new Set([
  "clerk",
  "poll-workers",
  "members",
  "press",
  "press-corps",
  "staff",
  "audience",
  "supporters",
]);

interface BillRow {
  readonly id: string;
  readonly bodyOfficeId: string;
  readonly sponsorId: string;
}
interface OutletRow {
  readonly id: string;
  readonly tier?: string;
  readonly reporterIds?: readonly string[];
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

/** The bill a moment's cause is about: its record names it, else the cause is the bill. */
function billOf(
  api: ReturnType<typeof coreAPI>,
  moment: Moment,
): BillRow | undefined {
  const named = api.state.durableLog.get(moment.causeId)?.facts?.billId;
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(named || moment.causeId) as unknown as BillRow | undefined;
}

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
      // A staffer who also volunteers is cast once.
      return free(
        living(core, [
          ...new Set([
            ...(campaign?.volunteerIds ?? []),
            ...(campaign?.staffIds ?? []),
          ]),
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
      // The interview the cause is, or the one its record names.
      const facts = core.durableLog.get(moment.causeId)?.facts;
      const row = api
        .moduleState(PRESS_MODULE_ID)
        .table("interviews")
        .get(facts?.interviewId || moment.causeId) as unknown as
        InterviewRow | undefined;
      if (row) return free(living(core, [row.reporterId ?? null]));
      // A story's own outlet: the outlet its record names covers it.
      const named = facts?.outletId
        ? (api
            .moduleState(PRESS_MODULE_ID)
            .table("outlets")
            .get(facts.outletId) as unknown as OutletRow | undefined)
        : undefined;
      if (named?.reporterIds?.length)
        return free(living(core, named.reporterIds)).sort().slice(zero, one);
      // A public act (a signing, a veto) is covered by the town's own
      // outlet: its first reporter living.
      const outlets = (
        api
          .moduleState(PRESS_MODULE_ID)
          .table("outlets")
          .rows() as unknown as OutletRow[]
      )
        .filter((outlet) => outlet.tier !== "national")
        .sort((a, b) => a.id.localeCompare(b.id));
      return free(
        living(
          core,
          outlets.flatMap((o) => o.reporterIds ?? []),
        ),
      )
        .sort()
        .slice(zero, one);
    }
    case "press-corps": {
      // The reporters who cover an officeholder's act on the bill it names:
      // the national outlets' for a federal bill, the town's own for any
      // other. Reporters who are full people, outlet by outlet.
      if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
      if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return [];
      // The cause's record names the bill; an introduction's id carries it.
      const billId =
        core.durableLog.get(moment.causeId)?.facts?.billId ??
        /(?:^|:)(?<bill>bill:.+)$/.exec(moment.causeId)?.groups?.bill;
      if (typeof billId !== "string" || !billId) return [];
      const bill = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(billId) as unknown as LegislatureBill | undefined;
      if (!bill) return [];
      const tier = billReach(api, bill).federal ? "national" : "local";
      return free(
        living(
          core,
          outletsHere(api)
            .filter((outlet) => (outlet.tier ?? "local") === tier)
            .flatMap((outlet) => outlet.reporterIds),
        ),
      );
    }
    case "staff": {
      // The officeholder's own aides who serve now.
      if (!api.state.modules.has(STAFF_MODULE_ID)) return [];
      return free(
        living(
          core,
          servingStaffOf(api, moment.personId).map((row) => row.personId),
        ),
      );
    }
    case "members": {
      if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return [];
      const bill = billOf(api, moment);
      if (!bill) return [];
      return free(
        living(
          core,
          members(api, bill.bodyOfficeId).map((term) => memberKey(term)),
        ),
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
