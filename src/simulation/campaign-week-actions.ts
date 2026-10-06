import {
  activeCampaignForCandidate,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignTreasuryPosition,
} from "./campaign-queries";
import {
  offerCampaignLifeActivity,
  planCampaignLifeRequest,
} from "./campaign-life-activities";
import { campaignLifeCatalogEntry } from "./campaign-life-catalog";
import type {
  CampaignFieldReach,
  CampaignLifeForm,
} from "./campaign-life-types";
import { addDays, addSimulationMinutes } from "./dates";
import {
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { createStableId } from "./ids";
import { workStatusAt } from "./life-queries";
import { publicPartyAffiliation } from "./living-world/congress";
import { homePartyChapters } from "./living-world/party-chapters";
import { personName } from "./people";
import type {
  CampaignRecord,
  EntityId,
  IsoDate,
  MoneyAmount,
  SimulationMoment,
  World,
} from "./types";

/**
 * A bounded player-campaign choice route. Research 2's action catalog
 * establishes that these kinds of work occur; the existing campaign-life
 * catalog supplies game-authored times and actual venue/host rules. Its null
 * minutes, costs, contact rates and effects are never interpreted as zero.
 */
// These four choices map the research catalog's action families to the game's
// recorded campaign-life forms. Each form supplies its own time and venue;
// absent catalog prices or effects are not interpreted as zero.
const ACTIONS: readonly {
  readonly form: CampaignLifeForm;
  readonly researchActionId: string;
}[] = [
  { form: "door-canvass", researchActionId: "survey-canvass" },
  { form: "phone-shift", researchActionId: "persuasion-phonebank" },
  { form: "fundraiser", researchActionId: "donor-meeting" },
  { form: "town-hall", researchActionId: "community-meeting" },
];

export interface CampaignWeekActionChoice {
  readonly id: EntityId;
  readonly researchActionId: string;
  readonly form: CampaignLifeForm;
  readonly hostOrganizationId: EntityId;
  readonly hostPersonId: EntityId;
  readonly hostName: string;
  readonly organizationName: string;
  readonly place: string;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly activityMinutes: number;
  readonly outboundTravelMinutes: number;
  /** Unknown in the research catalog; this route books no cash expense. */
  readonly cashCost: null;
}

export interface CampaignWeekActionResult {
  readonly activityId: EntityId;
  readonly form: CampaignLifeForm;
  readonly completedAt: IsoDate;
  readonly contactPersonIds: readonly EntityId[];
  readonly contactNames: readonly string[];
  readonly fieldReach: CampaignFieldReach | null;
  readonly raisedAmount: MoneyAmount | null;
  readonly summary: string;
}

export interface CampaignWeekActionView {
  readonly campaignId: EntityId;
  readonly weekStart: IsoDate;
  readonly weekEnd: IsoDate;
  readonly committeeTreasury: MoneyAmount;
  readonly proposerPersonId: EntityId | null;
  readonly proposerName: string | null;
  readonly choices: readonly CampaignWeekActionChoice[];
  readonly availabilityReason: "needs-host" | "calendar-full" | null;
  readonly recentResults: readonly CampaignWeekActionResult[];
  readonly revision: string;
}

export interface ChooseCampaignWeekActionInput {
  readonly campaignId: EntityId;
  readonly choiceId: EntityId;
  readonly revision: string;
}

function activeStaff(world: World, campaign: CampaignRecord): EntityId[] {
  return campaign.staffWorkRelationshipIds.flatMap((id) => {
    const work = world.history.workRelationships.find((item) => item.id === id);
    return work && workStatusAt(world, id)?.status === "active"
      ? [work.personId]
      : [];
  });
}

function hostOrganizationId(
  world: World,
  campaign: CampaignRecord,
  staff: readonly EntityId[],
): EntityId | null {
  if (staff.length > 0) return campaign.organizationId;
  const activities = new Map(
    campaignLifeActivityRecords(world).map((activity) => [
      activity.id,
      activity,
    ]),
  );
  const latestSupport = new Map<EntityId, string>();
  for (const outcome of campaignLifeOutcomeRecords(world)) {
    const activity = activities.get(outcome.activityId);
    if (
      activity?.campaignId !== campaign.id ||
      activity.form !== "support-request" ||
      !outcome.supportDecision ||
      outcome.supportDecision.organizationId !== activity.hostOrganizationId
    )
      continue;
    latestSupport.set(
      outcome.supportDecision.organizationId,
      outcome.supportDecision.decision,
    );
  }
  const chapters = homePartyChapters(world)
    .filter(
      (chapter) =>
        chapter.organizerPersonId !== null &&
        latestSupport.get(chapter.organizationId) === "granted",
    )
    .sort((a, b) => a.organizationId.localeCompare(b.organizationId));
  const partyId = publicPartyAffiliation(world, campaign.candidatePersonId);
  return (
    chapters.find((chapter) => chapter.partyOrganizationId === partyId)
      ?.organizationId ??
    chapters[0]?.organizationId ??
    null
  );
}

function weekEnd(world: World, campaign: CampaignRecord): IsoDate {
  const election = requireElectionContest(
    world,
    campaign.contestId,
  ).electionDate;
  const lastCampaignDay = addDays(election, -1);
  const seventhDay = addDays(world.currentDate, 6);
  return lastCampaignDay < seventhDay ? lastCampaignDay : seventhDay;
}

function recentResults(
  world: World,
  campaign: CampaignRecord,
): CampaignWeekActionResult[] {
  const records = campaignLifeActivityRecords(world);
  return campaignLifeOutcomeRecords(world)
    .filter((outcome) =>
      records.some(
        (activity) =>
          activity.id === outcome.activityId &&
          activity.campaignId === campaign.id &&
          ACTIONS.some((action) => action.form === activity.form),
      ),
    )
    .slice(-5)
    .map((outcome) => {
      const activity = records.find((item) => item.id === outcome.activityId)!;
      const event = world.history.events.find(
        (item) => item.id === outcome.outcomeEventId,
      );
      return {
        activityId: activity.id,
        form: activity.form,
        completedAt: outcome.completedAt,
        contactPersonIds: [...outcome.contactPersonIds],
        contactNames: outcome.contactPersonIds.map((id) =>
          personName(world.people[id]!),
        ),
        fieldReach: outcome.fieldReach
          ? {
              ...outcome.fieldReach,
              estimatedDoorKnocks: outcome.fieldReach.estimatedDoorKnocks
                ? { ...outcome.fieldReach.estimatedDoorKnocks }
                : null,
              estimatedPhoneDials: outcome.fieldReach.estimatedPhoneDials
                ? { ...outcome.fieldReach.estimatedPhoneDials }
                : null,
              estimatedCompletedConversations: outcome.fieldReach
                .estimatedCompletedConversations
                ? { ...outcome.fieldReach.estimatedCompletedConversations }
                : null,
              sourceObservationIds: [
                ...outcome.fieldReach.sourceObservationIds,
              ],
            }
          : null,
        raisedAmount: outcome.raisedAmount ? { ...outcome.raisedAmount } : null,
        summary: event?.summary ?? "",
      };
    });
}

/** Reading this view never schedules time, spends money or creates people. */
export function projectCampaignWeekActions(
  world: World,
  personId: EntityId,
): CampaignWeekActionView | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) return null;
  if (electionContestStatus(world, campaign.contestId) !== "pending")
    return null;

  const end = weekEnd(world, campaign);
  const staff = activeStaff(world, campaign);
  const organizationId = hostOrganizationId(world, campaign, staff);
  const choices: CampaignWeekActionChoice[] = [];
  if (organizationId && end >= world.currentDate) {
    for (const action of ACTIONS) {
      try {
        const planned = planCampaignLifeRequest(world, personId, {
          form: action.form,
          hostOrganizationId: organizationId,
          earliestDate: world.currentDate,
        });
        if (planned.start.date > end) continue;
        const entry = campaignLifeCatalogEntry(action.form);
        const host = world.people[planned.hostPersonId];
        if (!host) continue;
        const name =
          world.history.organizationProfiles
            .filter((profile) => profile.organizationId === organizationId)
            .at(-1)?.name ?? "Campaign organization";
        choices.push({
          id: createStableId(
            "campaign-action",
            `${world.id}:${planned.stableKey}:${planned.start.date}`,
          ),
          researchActionId: action.researchActionId,
          form: action.form,
          hostOrganizationId: organizationId,
          hostPersonId: planned.hostPersonId,
          hostName: personName(host),
          organizationName: name,
          place: entry.locationLabel,
          start: planned.start,
          end: addSimulationMinutes(planned.start, entry.defaultMinutes),
          activityMinutes: entry.defaultMinutes,
          outboundTravelMinutes: entry.journeyMinutes,
          cashCost: null,
        });
      } catch {
        // The existing planner is the authority for host, date and calendar
        // availability. An unavailable option is simply not offered.
      }
    }
  }
  const treasury = campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  const results = recentResults(world, campaign);
  const revision = [
    campaign.id,
    world.currentMoment.date,
    world.currentMoment.minuteOfDay,
    world.history.scheduledActivities.length,
    world.history.scheduledActivityStates.length,
    campaignLifeActivityRecords(world).length,
    campaignLifeOutcomeRecords(world).length,
    staff.join(","),
    choices.map((choice) => choice.id).join(","),
  ].join("|");
  return {
    campaignId: campaign.id,
    weekStart: world.currentDate,
    weekEnd: end,
    committeeTreasury: { ...treasury },
    proposerPersonId: staff[0] ?? null,
    proposerName: staff[0] ? personName(world.people[staff[0]]!) : null,
    choices,
    availabilityReason:
      organizationId === null
        ? "needs-host"
        : choices.length === 0
          ? "calendar-full"
          : null,
    recentResults: results,
    revision,
  };
}

/**
 * Confirm one of the exact choices just shown. The established campaign-life
 * writer books the calendar hold, including its real host and journey.
 */
export function chooseCampaignWeekAction(
  world: World,
  personId: EntityId,
  input: ChooseCampaignWeekActionInput,
): World {
  const view = projectCampaignWeekActions(world, personId);
  if (!view || view.campaignId !== input.campaignId)
    throw new Error("That campaign is no longer active.");
  if (view.revision !== input.revision)
    throw new Error(
      "The campaign calendar changed. Review this week's choices.",
    );
  const choice = view.choices.find((item) => item.id === input.choiceId);
  if (!choice) throw new Error("That campaign choice is no longer available.");
  const plan = planCampaignLifeRequest(world, personId, {
    form: choice.form,
    hostOrganizationId: choice.hostOrganizationId,
    earliestDate: world.currentDate,
  });
  if (
    plan.hostPersonId !== choice.hostPersonId ||
    plan.start.date !== choice.start.date ||
    plan.start.minuteOfDay !== choice.start.minuteOfDay
  ) {
    throw new Error(
      "The campaign calendar changed. Review this week's choices.",
    );
  }
  return offerCampaignLifeActivity(world, plan);
}
