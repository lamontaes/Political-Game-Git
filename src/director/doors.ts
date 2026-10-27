/**
 * The doors a candidate knocked themself today, from the campaign engine's
 * own records of who it reached (its causes table): each door that opened,
 * whether the candidate had knocked there before, and whether the person
 * who answered holds a stance of their own on a question the candidate's
 * platform takes (the owner's porch scene, Oct 8: a household with a stake).
 */
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
  type CauseRow,
} from "../core2/modules/campaigns";
import { VIEWS_MODULE_ID } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { QueuedRecord } from "./circumstance";

export function doorsKnocked(
  core: Readonly<CoreState>,
  personId: PersonId,
): QueuedRecord[] {
  if (!core.modules.has(CAMPAIGNS_MODULE_ID)) return [];
  const api = coreAPI(core as CoreState);
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  const causes = campaigns.table("causes");
  const door = (row: CauseRow) =>
    row.act === "door" && row.actorId === personId;
  const today = (
    causes.query("byCandidate", [personId]) as unknown as CauseRow[]
  ).filter((row) => door(row) && row.date === core.date);
  if (!today.length) return [];
  // The questions the candidate's own platform takes, from their campaigns.
  const questions = new Set(
    (campaigns.table("campaigns").rows() as unknown as CampaignRow[])
      .filter((row) => row.candidateId === personId)
      .flatMap((row) => row.platform.map((stance) => stance.question)),
  );
  const stances = core.modules.has(VIEWS_MODULE_ID)
    ? api.moduleState(VIEWS_MODULE_ID).table("stances")
    : undefined;
  return today.map((row) => {
    // A door the candidate knocked on an earlier day is a return visit.
    const before = (
      causes.query("byVoter", [row.voterId]) as unknown as CauseRow[]
    ).some(
      (earlier) =>
        earlier.candidateId === personId &&
        door(earlier) &&
        earlier.date < row.date,
    );
    const stake = [...questions].some(
      (question) => !!stances?.get(`${row.voterId}:${question}`),
    );
    return {
      id: row.id,
      kind: "campaign.door",
      direct: true as const,
      personIds: [row.voterId as PersonId],
      witnessIds: [],
      facts: {
        first: String(!before),
        stake: String(stake),
        candidateId: personId,
      },
    };
  });
}
