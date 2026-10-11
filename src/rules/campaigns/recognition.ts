// STOPGAP(RULES3-CAM-004): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/campaign-recognition.ts; RULES-3, 2026-10-11.
import { ageOnDate } from "./dates";
import type {
  CampaignRecord,
  EntityId,
  IsoDate,
  World,
} from "../../simulation/types";

export const CAMPAIGN_RECOGNITION_PROFILE =
  "campaign-contact-share-of-adults/v2";

export interface DoorReturn {
  /** The share of the ordinary return this candidate gets, in percent. */
  readonly percent: number;
  readonly adultResidentIds: readonly EntityId[];
  /** The adults the race reaches: the town's estimate, or the recorded ones. */
  readonly electorate: number;
  readonly recognizedPersonIds: readonly EntityId[];
  readonly contactRecordIds: readonly EntityId[];
  readonly afternoonsBefore: number;
  readonly racesWonBefore: number;
  readonly basis: typeof CAMPAIGN_RECOGNITION_PROFILE;
}

export function racesWonBefore(
  electionContests: World["history"]["electionContests"],
  electionContestResults: World["history"]["electionContestResults"],
  campaign: CampaignRecord,
): number {
  const contests = electionContests ?? [];
  const own = contests.find((contest) => contest.id === campaign.contestId);
  if (!own) return 0;
  return (electionContestResults ?? []).filter(
    (result) =>
      result.winnerPersonId === campaign.candidatePersonId &&
      result.contestId !== own.id &&
      result.resolvedAt < own.electionDate,
  ).length;
}

export function doorKnockingReturn(
  campaign: CampaignRecord,
  excludingActionId: EntityId | null,
  facts: {
    readonly today: IsoDate;
    readonly jurisdictionKind: string | undefined;
    readonly personOrder: readonly EntityId[];
    readonly peopleById: Readonly<
      Record<
        EntityId,
        | Pick<World["people"][string], "birthDate" | "homeJurisdictionId">
        | undefined
      >
    >;
    readonly electionContests: World["history"]["electionContests"];
    readonly electionContestResults: World["history"]["electionContestResults"];
    readonly results: NonNullable<World["history"]["campaignActionResults"]>;
    readonly actions: NonNullable<World["history"]["campaignActions"]>;
    readonly homesByPerson: ReadonlyMap<
      EntityId,
      readonly {
        readonly location: { readonly jurisdictionId: EntityId } | null;
      }[]
    >;
    readonly contacts: World["history"]["relationshipInteractions"];
    readonly eventsById: ReadonlyMap<
      EntityId,
      World["history"]["events"][number]
    >;
    readonly townAdultEstimate: number;
  },
): DoorReturn {
  const finished = new Set(
    facts.results.map((result) => result.campaignActionId),
  );
  const afternoonsBefore = facts.actions.filter(
    (action) =>
      action.kind === "outreach" &&
      action.id !== excludingActionId &&
      finished.has(action.id),
  ).length;
  const won = racesWonBefore(
    facts.electionContests,
    facts.electionContestResults,
    campaign,
  );
  const adultResidentIds = [...new Set(facts.personOrder)].filter((id) => {
    const person = facts.peopleById[id];
    if (
      !person ||
      id === campaign.candidatePersonId ||
      ageOnDate(person.birthDate, facts.today) < 18
    )
      return false;
    const homes = (facts.homesByPerson.get(id) ?? []).flatMap((row) =>
      row.location ? [row.location.jurisdictionId] : [],
    );
    return homes.length
      ? homes.includes(campaign.jurisdictionId)
      : person.homeJurisdictionId === campaign.jurisdictionId;
  });
  const residents = new Set(adultResidentIds);
  const excludedEvents = new Set(
    facts.results
      .filter((result) => result.campaignActionId === excludingActionId)
      .map((result) => result.outcomeEventId),
  );
  const recognized = new Set<EntityId>();
  const contactRecordIds: EntityId[] = [];
  // Reuse the existing PEOPLE per-person grouping of these same records.
  for (const contact of facts.contacts) {
    if (
      !contact.tags.includes("campaign.contact") ||
      !contact.eventId ||
      contact.occurredAt > facts.today ||
      excludedEvents.has(contact.eventId)
    )
      continue;
    const event = facts.eventsById.get(contact.eventId);
    if (
      !event ||
      event.occurredAt !== contact.occurredAt ||
      event.occurredAt > facts.today
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
  // Story-only residents the campaign met at the door, from its results.
  const actions = new Set(
    facts.actions
      .filter((action) => action.id !== excludingActionId)
      .map((action) => action.id),
  );
  for (const result of facts.results) {
    if (
      !actions.has(result.campaignActionId) ||
      result.completedAt > facts.today
    )
      continue;
    for (const personId of result.canvass?.storyPersonIds ?? [])
      if (!facts.peopleById[personId]) recognized.add(personId);
  }
  const kind: string | undefined = facts.jurisdictionKind;
  const electorate = Math.max(
    residents.size,
    kind === "census-place" || kind === "territory-place"
      ? facts.townAdultEstimate
      : 0,
  );
  return {
    percent: electorate === 0 ? 0 : (100 * recognized.size) / electorate,
    adultResidentIds,
    electorate,
    recognizedPersonIds: [...recognized],
    contactRecordIds,
    afternoonsBefore,
    racesWonBefore: won,
    basis: CAMPAIGN_RECOGNITION_PROFILE,
  };
}
