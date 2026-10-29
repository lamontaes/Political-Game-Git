/**
 * The doors a candidate knocked themself today, from the campaign engine's
 * own records of who it reached (its causes table): each door that opened,
 * and whether the candidate had knocked there before. Of the day's doors,
 * the one whose resident most agrees or disagrees with the candidate's
 * platform (the cause's own agreement) is the household with a stake: the
 * owner's porch scene in a day of door knocking (Oct 8). While the
 * candidate's petition circulates, each door says whether its resident signed.
 */
import { CAMPAIGNS_MODULE_ID, type CauseRow } from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  petitionSignerIds,
  type FilingRow,
} from "../core2/modules/elections";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { QueuedRecord } from "./circumstance";

export function doorsKnocked(
  core: Readonly<CoreState>,
  personId: PersonId,
): QueuedRecord[] {
  if (!core.modules.has(CAMPAIGNS_MODULE_ID)) return [];
  const causes = coreAPI(core as CoreState)
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("causes");
  const door = (row: CauseRow) =>
    row.act === "door" && row.actorId === personId;
  const api = coreAPI(core as CoreState);
  // A door knocked on the race's own day or later asks for nothing: the
  // vote is in (golden-door-ask: a door scene came after the count).
  const before = (row: CauseRow) => {
    const contestId = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("impressions")
        .get(`${row.voterId}|${personId}`) as unknown as
        { contestId?: string } | undefined
    )?.contestId;
    const contest =
      contestId && core.modules.has(ELECTIONS_MODULE_ID)
        ? (api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .get(contestId) as unknown as { electionDate?: string } | undefined)
        : undefined;
    return !!contest?.electionDate && contest.electionDate > core.date;
  };
  const today = (
    causes.query("byCandidate", [personId]) as unknown as CauseRow[]
  ).filter((row) => door(row) && row.date === core.date && before(row));
  const strength = (row: CauseRow) => Math.abs(row.agreement ?? P.zero);
  const most = today
    .filter((row) => row.agreement !== null)
    .sort((a, b) => strength(b) - strength(a) || a.id.localeCompare(b.id))[
    P.zero
  ];
  return today.map((row) => {
    const petition = petitionAtDoor(core, personId, row.voterId as PersonId);
    // A door the candidate knocked on an earlier day is a return visit.
    const before = (
      causes.query("byVoter", [row.voterId]) as unknown as CauseRow[]
    ).some(
      (earlier) =>
        earlier.candidateId === personId &&
        door(earlier) &&
        earlier.date < row.date,
    );
    return {
      id: row.id,
      kind: "campaign.door",
      direct: true as const,
      personIds: [row.voterId as PersonId],
      witnessIds: [],
      facts: {
        first: String(!before),
        stake: String(row.id === most?.id),
        candidateId: personId,
        petition: String(!!petition),
        ...(petition ? { signed: String(petition.signed) } : {}),
      },
    };
  });
}

/**
 * While the candidate's petition for the race they asked a resident about
 * circulates, a door is also asked to sign (the campaign engine's
 * `askToSign`): whether that resident signed, from the petition record. Null
 * where no petition circulates for that race.
 */
export function petitionAtDoor(
  core: Readonly<CoreState>,
  candidateId: PersonId,
  voterId: PersonId,
): { signed: boolean } | null {
  if (
    !core.modules.has(CAMPAIGNS_MODULE_ID) ||
    !core.modules.has(ELECTIONS_MODULE_ID)
  )
    return null;
  const api = coreAPI(core as CoreState);
  const contestId = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("impressions")
      .get(`${voterId}|${candidateId}`) as unknown as
      { contestId?: string } | undefined
  )?.contestId;
  const filing = contestId
    ? (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .query("byPerson", [candidateId]) as unknown as FilingRow[]
      ).find((row) => row.contestId === contestId)
    : undefined;
  return filing && petitionCirculating(api, filing.id)
    ? { signed: petitionSignerIds(api, filing.id).has(voterId) }
    : null;
}
