/**
 * Answering an ask for a vote, and the electorate a campaign weighs.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { countedResidents } from "../electorate";
import { closenessBetween } from "./people";
import type { CoreAPI, CoreEventInput, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { daysBetweenText as daysBetween } from "../kernel/dates";
import { basePlaces } from "../race-places";
import { campaignParameter } from "../campaign-data";
import { ACCEPTING_MOVES, REFUSING_MOVES } from "./press";
import { type ContestRow, type FilingRow } from "./elections";
import {
  ageOn,
  campaignFor,
  elections,
  pledgesOf,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type { CampaignRow } from "./campaigns-base";
import { VOLUNTEER_OFFERED_EVENT, townShares } from "./campaigns-constants";
import { onStaff, volunteerReason } from "./campaigns-volunteers";

/**
 * Whether someone who heard of a filing offers to help unasked: the same
 * reasons as an ask to volunteer, against the offer's own bar.
 */
export function offerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  return (
    volunteerReason(api, campaign, person) +
    campaignParameter("volunteerThreshold") -
    campaignParameter("volunteerOfferThreshold")
  );
}

/**
 * The candidate's answer to an offer of help, said in its scene: the one who
 * offered is already on the campaign's volunteers, and a refusal takes them
 * off; a yes, or no answer, keeps them. An offer to run the campaign made to
 * the player puts its helper on the staff only on a yes.
 */
export function answerOffer(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  const offer = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (offer?.kind !== VOLUNTEER_OFFERED_EVENT) return;
  const move = String(facts.move);
  const filingId = String(offer.facts?.filingId ?? "");
  const helperId = String(offer.facts?.offeredBy ?? "");
  const candidateId = String(offer.facts?.invitedId ?? "");
  if (!event.personIds.includes(candidateId)) return;
  const campaign = campaignFor(api, filingId);
  // The player's yes to an offer to run the campaign is what puts the helper
  // on its staff; no other answer does.
  if (
    offer.facts?.role === "manager" &&
    candidateId === (api.state as CoreState).playerId
  ) {
    if (ACCEPTING_MOVES.has(move)) save(api, onStaff(campaign, helperId));
    return;
  }
  if (ACCEPTING_MOVES.has(move) || !REFUSING_MOVES.has(move)) return;
  if (
    !campaign.volunteerIds.includes(helperId) &&
    !campaign.staffIds.includes(helperId)
  )
    return;
  save(api, {
    ...campaign,
    volunteerIds: campaign.volunteerIds.filter((id) => id !== helperId),
    staffIds: campaign.staffIds.filter((id) => id !== helperId),
  });
}

/**
 * A listener's answer to the candidate who came over after a speech they
 * heard in person (the `speech-afterward` scene): a yes (an accepting move)
 * is their word to that candidate in the race the candidate is running in
 * that is still ahead, kept as the same pledge a yes at the door is, which
 * the ballot reads (`pledgesOf`, `pledgeDoubt`). It cites the scene's
 * `scene.reply` record as its cause, and replaces an earlier word to a rival
 * in the same contest, as a door's does. A no or a deflection leaves things
 * as they were.
 */
export function answerAskForVote(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "speech-afterward") return;
  const move = String(facts.move);
  if (!ACCEPTING_MOVES.has(move)) return;
  const speech = api.state.durableLog.get(String(facts.causeId ?? ""));
  const candidateId = String(speech?.facts?.["views:speaker"] ?? "");
  const voterId = event.personIds.find((id) => id !== candidateId);
  if (!candidateId || !voterId) return;
  // The race the candidate is running in that has not been decided yet.
  const contests = elections(api, "contests");
  const campaign = (table(api, "campaigns").rows() as unknown as CampaignRow[])
    .filter((row) => row.candidateId === candidateId)
    .filter(
      (row) =>
        ((
          contests.get(row.contestId) as unknown as
            { electionDate?: string } | undefined
        )?.electionDate ?? "") >= api.state.date,
    )
    .sort((a, b) => a.contestId.localeCompare(b.contestId))[0];
  if (!campaign) return;
  const pledges = table(api, "pledges");
  for (const earlier of pledgesOf(api, voterId))
    if (
      earlier.contestId === campaign.contestId &&
      earlier.candidateId !== campaign.candidateId
    )
      pledges.remove(earlier.id);
  pledges.put({
    id: `${voterId}|${campaign.contestId}|${campaign.candidateId}`,
    voterId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    date: api.state.date,
    canvasserId: campaign.candidateId,
    causeId: event.id,
    firmness: Math.max(
      0,
      Math.min(1, Number(facts.firmness ?? api.parameter("one"))),
    ),
  } as unknown as ModuleRow);
}

/**
 * How much one offer of help matters to the candidate's story, from 0 to 1
 * (owner, Oct 27, 4 PM Eastern: "it shouldn't be stopped for literally every
 * single volunteer. Maybe some that matter. And that's only when you're doing
 * small local campaigns, or maybe your first campaign."). The race's reach on
 * the story falls smoothly with its eligible voters and with each campaign the
 * candidate ran before; within that, a close tie counts twice a stranger. The
 * director sizes the offer's moment by it, so a friend's offer in a first
 * council race is a scene and a stranger's in a statewide race a journal line,
 * with no size or count at which it flips.
 */
export function offerWeight(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
  helperId: string,
): number {
  const half = campaignParameter("volunteerOfferHalfElectorate");
  const small = half / (half + raceElectorate(api, contest));
  const before = (
    elections(api, "filings").rows() as unknown as FilingRow[]
  ).filter(
    (row) =>
      row.personId === filing.personId &&
      row.id !== filing.id &&
      (api.state.durableLog.get(`candidate-filed:${row.id}` as never)?.date ??
        "9999") <
        (api.state.durableLog.get(`candidate-filed:${filing.id}` as never)
          ?.date ?? "9999"),
  ).length;
  const fresh =
    campaignParameter("volunteerOfferFirstCampaignShare") / (1 + before);
  const reach = 1 - (1 - small) * (1 - fresh);
  const tie = closenessBetween(api.state, filing.personId, helperId);
  return reach * ((1 + tie) / 2);
}

/**
 * A race's eligible voters: the places its electorate lives in (a district,
 * the state's counties), or for a local race the town's own adults, named
 * and counted.
 */
function raceElectorate(api: CoreAPI, contest: ContestRow): number {
  const { places } = basePlaces(api, contest);
  if (places.length)
    return places.reduce((sum, place) => sum + place.eligible, 0);
  return townElectorate(api);
}

/** The town's own adults, named and counted. */
export function townElectorate(api: CoreAPI): number {
  const core = api.state as CoreState;
  const { townPlaceId } = townRow(api);
  const adult = api.parameter("votingAge");
  let total = 0;
  for (const person of core.people.values())
    if (
      person.alive &&
      person.placeId === townPlaceId &&
      ageOn(person, core.date) >= adult
    )
      total += 1;
  for (const row of countedResidents(core))
    if (row.placeId === townPlaceId && ageOn(row, core.date) >= adult)
      total += row.weight;
  return total;
}

/**
 * The share of a race's voters who live in the town, 0 to 1: one for a town
 * race, and for a county, district or state race the town's adults over the
 * race's eligible voters (Census counts in the places' rows). Read again a
 * quarter after it was last read, since a town's size moves slowly.
 */
export function townShareOfRace(api: CoreAPI, contestId: string): number {
  const held = townShares.get(api.state) ?? new Map();
  townShares.set(api.state, held);
  const kept = held.get(contestId);
  if (kept && daysBetween(kept.asOf, api.state.date) < 90) return kept.share;
  const contest = elections(api, "contests").get(contestId) as unknown as
    ContestRow | undefined;
  const whole = contest ? raceElectorate(api, contest) : 0;
  const share =
    !contest || !basePlaces(api, contest).places.length || whole <= 0
      ? 1
      : Math.min(1, townElectorate(api) / whole);
  held.set(contestId, { asOf: api.state.date, share });
  return share;
}

/**
 * Whether a world candidate's event this turn is held in the town. A
 * candidate for an office the town is only part of spreads their evenings
 * over the whole district, so the town has its share of them: each event they
 * would hold adds the town's share of the race's voters to what the town is
 * owed, and the event is held here when that reaches one. No dice, and a
 * town race (share one) holds every event. (Speed, Nov 8: a House candidate
 * held about a town hall a day in a town of 600.)
 */
export function heldInTown(
  api: CoreAPI,
  filingId: string,
  credit: "townEventCredit" | "townInterviewCredit" = "townEventCredit",
): boolean {
  const campaign = campaignFor(api, filingId);
  const share = townShareOfRace(api, campaign.contestId);
  if (share >= 1) return true;
  const owed = (campaign[credit] ?? 0) + share;
  const held = owed >= 1;
  save(api, {
    ...campaign,
    [credit]: held ? owed - 1 : owed,
  });
  return held;
}

/**
 * Whether an interview a town outlet would ask of a candidate is held: the
 * town's outlets interview a candidate for an office the town is only part of
 * in proportion to the town's share of the race, as events are (`heldInTown`).
 */
export function interviewHeldInTown(api: CoreAPI, filingId: string): boolean {
  return heldInTown(api, filingId, "townInterviewCredit");
}
