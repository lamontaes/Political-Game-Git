/**
 * A petition found short: the telling and the answer.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { campaignDayOpen, takeCampaignDayChoice } from "../campaign-day";
import type { CoreAPI, CoreEventInput, PersonId, CoreState } from "../types";
import { daysBetweenText as daysBetween } from "../kernel/dates";
import { filingClerkFor } from "./filing-clerk";
import { campaignParameter } from "../campaign-data";
import { petitionCirculating, petitionOf, type ContestRow } from "./elections";
import { campaignFor, elections, townRow } from "./campaigns-base";
import { PETITION_SHORT_EVENT } from "./campaigns-constants";
import { petitionAsksAtDoors, signaturesToGather } from "./campaigns-petitions";

/**
 * The signatures one canvass shift of the player's own adds to a petition: the
 * shift's hours (`playerCanvassHours`) at the doors a canvasser reaches an hour
 * (`doorsPerCanvasserHour`), of whom the share who sign
 * (`petitionSignOpenness`, the same bar every door's ask for a signature
 * weighs). No number of its own.
 */
export function petitionShiftYield(): number {
  return (
    campaignParameter("playerCanvassHours") *
    campaignParameter("doorsPerCanvasserHour") *
    campaignParameter("petitionSignOpenness")
  );
}

/** How a controlled filer's petition stands against the days left, and whether it is the day to say so. */
export interface PetitionShortReading {
  /** Signatures still wanted to reach what the teller measures it by (see `petitionShortReading`). */
  readonly gap: number;
  readonly daysLeft: number;
  /** What the days left, one canvass shift each, can add. */
  readonly canAdd: number;
  /** What the days left after the next turn can add. */
  readonly canAddAfterNextTurn: number;
  readonly due: boolean;
}

/**
 * Whether a filed player's petition is behind enough to say so today: the
 * gap is more than the days left after the next turn can close at one canvass
 * shift a day (`petitionShiftYield`), so waiting for the next turn would leave
 * it out of reach. The clerk measures the petition by what the office
 * requires (`needed`, the count the clerk will check it against); someone on
 * the campaign measures it by what the campaign aims to gather
 * (`signaturesToGather`, the cushion for names that will not count). A
 * petition on pace never reads as due; one at its measure is not behind. Null
 * when nothing is circulating.
 */
export function petitionShortReading(
  api: CoreAPI,
  filingId: string,
  turnWait: number,
  by: "clerk" | "helper" = "helper",
): PetitionShortReading | null {
  if (!petitionAsksAtDoors(api, filingId)) return null;
  const petition = petitionOf(api, filingId);
  if (!petition?.needed) return null;
  const measure =
    by === "clerk" ? petition.needed : signaturesToGather(api, filingId);
  const gap = measure - petition.signed;
  const daysLeft = daysBetween(api.state.date, petition.due);
  const shift = petitionShiftYield();
  const canAdd = shift * daysLeft;
  const canAddAfterNextTurn = shift * Math.max(0, daysLeft - turnWait);
  return {
    gap,
    daysLeft,
    canAdd,
    canAddAfterNextTurn,
    due: gap > canAddAfterNextTurn,
  };
}

/**
 * Who would really tell a candidate their petition is short, from who the
 * records have there: someone on the campaign who has been watching the sheets
 * (staff first, then a volunteer, the one named first by id, and only one the
 * player knows), else the clerk who takes the filing. Null where the records name no one: no scene is staged
 * and nothing is invented.
 */
export function petitionTeller(
  api: CoreAPI,
  filingId: string,
): { readonly id: string; readonly kind: "clerk" | "helper" } | null {
  const campaign = campaignFor(api, filingId);
  const alive = (id: string) => api.state.people.get(id)?.alive === true;
  // Only someone the player can be told by: a helper the player does not
  // know by name cannot be named in the scene, so the clerk tells them instead.
  const player = api.state.people.get(campaign.candidateId);
  const knownToPlayer = (id: string) =>
    !!player && player.knownIds.has(id as PersonId);
  const named = (ids: readonly string[]) =>
    ids
      .filter((id) => id !== campaign.candidateId && alive(id))
      .filter(knownToPlayer)
      .sort()[0];
  const helper = named(campaign.staffIds) ?? named(campaign.volunteerIds);
  if (helper) return { id: helper, kind: "helper" };
  const clerk = filingClerkFor(api, campaign.contestId);
  return clerk && alive(clerk.personId)
    ? { id: clerk.personId, kind: "clerk" }
    : null;
}

/**
 * The day to tell a filed player their petition is behind (the Account lead
 * and the owner's Oct 14 rule: the engine offers, the player decides): written
 * once per filing, as a record the director stages as a scene with the clerk
 * or helper, answered by the player. Nothing is done for them (OWNER-DECISIONS
 * Oct 14, "No engine accepts a ... filing or any choice for the controlled
 * person").
 */
export function tellPetitionShort(
  api: CoreAPI,
  filingId: string,
  turnWait: number,
): boolean {
  const campaign = campaignFor(api, filingId);
  if (campaign.candidateId !== (api.state as CoreState).playerId) return false;
  const id = `${PETITION_SHORT_EVENT}:${filingId}`;
  if (api.state.durableLog.has(id)) return false;
  const teller = petitionTeller(api, filingId);
  if (!teller) return false;
  const reading = petitionShortReading(api, filingId, turnWait, teller.kind);
  if (!reading?.due) return false;
  const petition = petitionOf(api, filingId)!;
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  api.emit({
    id,
    date: api.state.date,
    kind: PETITION_SHORT_EVENT,
    personIds: [campaign.candidateId, teller.id],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Petition ${petition.id}: ${petition.signed} signed, ${petition.needed} needed (${signaturesToGather(api, filingId)} a campaign gathers), ${reading.daysLeft} days left`,
      asOf: api.state.date,
    },
    facts: {
      invitedId: campaign.candidateId,
      tellerId: teller.id,
      tellerKind: teller.kind,
      filingId,
      contestId: campaign.contestId,
      petitionId: petition.id,
      started: petition.signed > 0 ? "yes" : "no",
      // What the engine read the day it told them, for the trace.
      signed: String(petition.signed),
      gathers: String(signaturesToGather(api, filingId)),
      needed: String(petition.needed),
      daysLeft: String(reading.daysLeft),
      canAddAfterNextTurn: reading.canAddAfterNextTurn.toFixed(1),
      ...(contest ? { office: contest.title } : {}),
    },
  });
  return true;
}

/**
 * The player's answer in the scene that tells them the petition is short: a
 * yes ("I'll go out and knock on doors") takes their canvass day, the same
 * choice the Campaign tab offers; any other answer leaves things as they are.
 */
export function answerPetitionShort(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "petition-short" || facts.ending !== "going-out")
    return;
  const told = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (told?.kind !== PETITION_SHORT_EVENT) return;
  const filingId = String(told.facts?.filingId ?? "");
  if (!petitionCirculating(api, filingId)) return;
  if (
    !campaignDayOpen(api, filingId).find((c) => c.kind === "canvass")?.available
  )
    return;
  takeCampaignDayChoice(api, filingId, "canvass");
}
