import {
  campaignActionResultRecords,
  campaignActions,
} from "./campaign-queries";
import { ageOnDate } from "./dates";
import { eventById } from "./event-index";
import { recordsByKey } from "./history-index";
import type { CampaignRecord, EntityId, World } from "./types";

/** Recognition is the share of recorded adult residents actually met.
 * The campaign.contact records and their dated events supply the people;
 * neither finished afternoons nor prior wins invent additional contacts.
 * This measures the recorded resident cohort, not unrecorded population.
 */
export const CAMPAIGN_RECOGNITION_PROFILE =
  "recorded-campaign-contact-share/v1";

export interface DoorReturn {
  /** The share of the ordinary return this candidate gets, in percent. */
  readonly percent: number;
  readonly adultResidentIds: readonly EntityId[];
  readonly recognizedPersonIds: readonly EntityId[];
  readonly contactRecordIds: readonly EntityId[];
  readonly afternoonsBefore: number;
  readonly racesWonBefore: number;
  readonly basis: typeof CAMPAIGN_RECOGNITION_PROFILE;
}

/** Races this person won that were decided before this campaign's contest. */
function racesWonBefore(world: World, campaign: CampaignRecord): number {
  const contests = world.history.electionContests ?? [];
  const own = contests.find((contest) => contest.id === campaign.contestId);
  if (!own) return 0;
  return (world.history.electionContestResults ?? []).filter(
    (result) =>
      result.winnerPersonId === campaign.candidatePersonId &&
      result.contestId !== own.id &&
      result.resolvedAt < own.electionDate,
  ).length;
}

export function doorKnockingReturn(
  world: World,
  campaign: CampaignRecord,
  excludingActionId: EntityId | null = null,
): DoorReturn {
  const finished = new Set(
    campaignActionResultRecords(world).map((result) => result.campaignActionId),
  );
  const afternoonsBefore = campaignActions(world, campaign.id).filter(
    (action) =>
      action.kind === "outreach" &&
      action.id !== excludingActionId &&
      finished.has(action.id),
  ).length;
  const won = racesWonBefore(world, campaign);
  const adultResidentIds = [...new Set(world.personOrder)].filter((id) => {
    const person = world.people[id];
    return (
      person &&
      id !== campaign.candidatePersonId &&
      person.homeJurisdictionId === campaign.jurisdictionId &&
      ageOnDate(person.birthDate, world.currentDate) >= 18
    );
  });
  const residents = new Set(adultResidentIds);
  const excludedEvents = new Set(
    campaignActionResultRecords(world)
      .filter((result) => result.campaignActionId === excludingActionId)
      .map((result) => result.outcomeEventId),
  );
  const recognized = new Set<EntityId>();
  const contactRecordIds: EntityId[] = [];
  // Reuse the existing PEOPLE per-person grouping of these same records.
  for (const contact of recordsByKey(
    world.history.relationshipInteractions,
    "relationship-interactions-by-person",
    (row) => row.personIds,
    campaign.candidatePersonId,
  )) {
    if (
      !contact.tags.includes("campaign.contact") ||
      !contact.eventId ||
      contact.occurredAt > world.currentDate ||
      excludedEvents.has(contact.eventId)
    )
      continue;
    const event = eventById(world, contact.eventId);
    if (
      !event ||
      event.occurredAt !== contact.occurredAt ||
      event.occurredAt > world.currentDate
    )
      continue;
    const other = contact.personIds.find(
      (id) => id !== campaign.candidatePersonId,
    );
    if (!other || !residents.has(other)) continue;
    const present = new Set(
      event.participants
        .filter(
          (row) =>
            row.role.startsWith("presence:") || row.role.startsWith("agency:"),
        )
        .map((row) => row.personId),
    );
    if (!present.has(campaign.candidatePersonId) || !present.has(other))
      continue;
    recognized.add(other);
    contactRecordIds.push(contact.id);
  }
  return {
    percent:
      residents.size === 0 ? 0 : (100 * recognized.size) / residents.size,
    adultResidentIds,
    recognizedPersonIds: [...recognized],
    contactRecordIds,
    afternoonsBefore,
    racesWonBefore: won,
    basis: CAMPAIGN_RECOGNITION_PROFILE,
  };
}
