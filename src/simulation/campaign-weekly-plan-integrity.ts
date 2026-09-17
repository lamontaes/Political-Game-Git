import {
  assertCampaignRecordIdentity,
  assertCampaignRecordsOrdered,
} from "./campaign-integrity";
import type {
  CampaignAdChannel,
  CampaignPlanEmphasis,
} from "./campaign-life-types";
import { campaignWeeklyPlanRecords } from "./campaign-queries";
import { addDays } from "./dates";
import type {
  CampaignActionKind,
  CampaignActionRecord,
  CampaignRecord,
  EntityId,
  IsoDate,
  World,
} from "./types";

const EMPHASES: readonly CampaignPlanEmphasis[] = [
  "field",
  "communications",
  "relationships",
];

const REFUSALS: readonly string[] = [
  "insufficient-funds",
  "no-free-time",
  "election-passed",
  "channel-capacity",
  "empty-plan",
];

/*
 * Mirrors the authored catalog in campaign-weekly-plans.ts. It is repeated here
 * rather than imported because the writer module imports the campaign writers,
 * which import world integrity, which imports this file.
 */
const CHANNEL_GEOGRAPHY: Readonly<
  Record<CampaignAdChannel, readonly ("jurisdiction" | "district")[]>
> = {
  digital: ["jurisdiction", "district"],
  radio: ["jurisdiction"],
  print: ["jurisdiction", "district"],
  mail: ["jurisdiction", "district"],
};

const EMPHASIS_KIND: Readonly<
  Record<CampaignPlanEmphasis, CampaignActionKind>
> = {
  field: "outreach",
  communications: "advertising",
  relationships: "fundraising",
};

function wholeCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Integrity for CRUNCH46 weekly campaign plans.
 *
 * A plan is a decision record: it names what was offered, what was chosen and
 * the balance it was chosen against. A refused plan booked nothing; a committed
 * plan points at exactly the campaign actions it booked that day, carrying the
 * same proposer, and its advertising actions spend exactly the planned amount.
 */
export function assertCampaignWeeklyPlanIntegrity(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
  actionById: ReadonlyMap<EntityId, CampaignActionRecord>,
): void {
  const plans = campaignWeeklyPlanRecords(world);
  assertCampaignRecordsOrdered(plans, "Campaign weekly plan");
  const committedWindows = new Map<
    EntityId,
    { readonly start: IsoDate; readonly end: IsoDate }[]
  >();
  const claimedActions = new Set<EntityId>();
  const firstActivityStart = new Map<EntityId, IsoDate>();
  if (plans.some((plan) => plan.status === "committed")) {
    for (const state of world.history.scheduledActivityStates) {
      if (!firstActivityStart.has(state.activityId)) {
        firstActivityStart.set(state.activityId, state.start.date);
      }
    }
  }
  const staffPersonIds = (campaign: CampaignRecord): Set<EntityId> =>
    new Set(
      campaign.staffWorkRelationshipIds.flatMap((workId) => {
        const work = world.history.workRelationships.find(
          (candidate) => candidate.id === workId,
        );
        return work ? [work.personId] : [];
      }),
    );
  for (const plan of plans) {
    assertCampaignRecordIdentity(ids, world, plan, "campaign-weekly-plan");
    const campaign = campaignById.get(plan.campaignId);
    if (!campaign || campaign.sequence >= plan.sequence) {
      throw new Error(`Campaign weekly plan linkage is invalid: ${plan.id}`);
    }
    const electionDate =
      (world.history.electionContests ?? []).find(
        (contest) => contest.id === campaign.contestId,
      )?.electionDate ?? null;
    if (
      electionDate === null ||
      // A committed week ends before election day; a refused one may have
      // been decided on it (the "election-passed" refusal).
      (plan.status === "committed" && plan.weekEnd >= electionDate) ||
      plan.weekStart > plan.weekEnd ||
      plan.weekEnd > addDays(plan.weekStart, 6) ||
      plan.createdAt > plan.weekStart ||
      plan.createdAt > world.currentDate ||
      plan.createdAt < campaign.filedAt
    ) {
      throw new Error(`Campaign weekly plan dates are invalid: ${plan.id}`);
    }
    if (
      plan.proposerPersonId !== null &&
      !staffPersonIds(campaign).has(plan.proposerPersonId)
    ) {
      throw new Error(
        `Campaign weekly plan proposer is not campaign staff: ${plan.id}`,
      );
    }
    const offered = plan.offeredEmphases;
    if (
      offered.length < 1 ||
      offered.length > 3 ||
      new Set(offered).size !== offered.length ||
      offered.some((emphasis) => !EMPHASES.includes(emphasis)) ||
      !offered.includes(plan.chosenEmphasis)
    ) {
      throw new Error(`Campaign weekly plan choices are invalid: ${plan.id}`);
    }
    const allocation = plan.allocation;
    if (
      !wholeCount(allocation.fieldShifts) ||
      !wholeCount(allocation.fundraisingSessions) ||
      !wholeCount(allocation.advertisingBuys) ||
      !wholeCount(plan.treasuryAtDecision.minorUnits) ||
      plan.treasuryAtDecision.currency !== campaign.treasuryCurrency
    ) {
      throw new Error(`Campaign weekly plan amounts are invalid: ${plan.id}`);
    }
    if (
      plan.advertising !== null &&
      (!Number.isSafeInteger(plan.advertising.amount.minorUnits) ||
        plan.advertising.amount.minorUnits <= 0 ||
        plan.advertising.amount.currency !== campaign.treasuryCurrency ||
        !Object.hasOwn(CHANNEL_GEOGRAPHY, plan.advertising.channel) ||
        !CHANNEL_GEOGRAPHY[plan.advertising.channel].includes(
          plan.advertising.geographyKind,
        ) ||
        !plan.advertising.geographyKey.startsWith(
          `${plan.advertising.geographyKind}:`,
        ) ||
        plan.advertising.geographyLabel.trim().length === 0)
    ) {
      throw new Error(
        `Campaign weekly plan advertising is invalid: ${plan.id}`,
      );
    }
    if ((plan.advertising === null) !== (allocation.advertisingBuys === 0)) {
      throw new Error(
        `Campaign weekly plan advertising disagrees with its allocation: ${plan.id}`,
      );
    }

    const refused = plan.status === "refused";
    if (
      (plan.status !== "refused" && plan.status !== "committed") ||
      refused !== (plan.refusal !== null) ||
      refused !== (plan.scheduledActionIds.length === 0) ||
      (plan.refusal !== null && !REFUSALS.includes(plan.refusal))
    ) {
      throw new Error(`Campaign weekly plan status is invalid: ${plan.id}`);
    }
    if (refused) continue;

    // One committed plan per week: committed windows never overlap.
    const windows = committedWindows.get(plan.campaignId) ?? [];
    if (
      windows.some(
        (window) =>
          plan.weekStart <= window.end && window.start <= plan.weekEnd,
      )
    ) {
      throw new Error(
        `Campaign already has a committed plan for that week: ${plan.id}`,
      );
    }
    committedWindows.set(plan.campaignId, [
      ...windows,
      { start: plan.weekStart, end: plan.weekEnd },
    ]);

    let advertisingCount = 0;
    let fieldCount = 0;
    let fundraisingCount = 0;
    for (const actionId of plan.scheduledActionIds) {
      if (claimedActions.has(actionId)) {
        throw new Error(
          `Campaign action belongs to more than one weekly plan: ${actionId}`,
        );
      }
      claimedActions.add(actionId);
      const action = actionById.get(actionId);
      if (
        !action ||
        action.campaignId !== plan.campaignId ||
        action.sequence >= plan.sequence ||
        action.createdAt !== plan.createdAt ||
        !action.strategy ||
        action.strategy.proposerPersonId !== plan.proposerPersonId ||
        action.strategy.proposedActionKind !==
          EMPHASIS_KIND[plan.chosenEmphasis]
      ) {
        throw new Error(
          `Campaign weekly plan action linkage is invalid: ${plan.id}`,
        );
      }
      const sessionDate = firstActivityStart.get(action.scheduledActivityId);
      if (
        sessionDate === undefined ||
        sessionDate < plan.weekStart ||
        sessionDate > plan.weekEnd
      ) {
        throw new Error(
          `Campaign weekly plan session falls outside its week: ${plan.id}`,
        );
      }
      const expectedGeographyKey =
        action.kind === "advertising"
          ? (plan.advertising?.geographyKey ?? null)
          : `jurisdiction:${campaign.jurisdictionId}`;
      if (action.strategy.geographyKey !== expectedGeographyKey) {
        throw new Error(
          `Campaign weekly plan action linkage is invalid: ${plan.id}`,
        );
      }
      if (action.kind === "advertising") {
        advertisingCount += 1;
        if (
          !plan.advertising ||
          !action.plannedSpend ||
          action.plannedSpend.minorUnits !==
            plan.advertising.amount.minorUnits ||
          action.plannedSpend.currency !== plan.advertising.amount.currency
        ) {
          throw new Error(
            `Campaign weekly plan advertising spend is invalid: ${plan.id}`,
          );
        }
      } else if (action.kind === "outreach") {
        fieldCount += 1;
      } else {
        fundraisingCount += 1;
      }
    }
    if (
      advertisingCount !== allocation.advertisingBuys ||
      fieldCount !== allocation.fieldShifts ||
      fundraisingCount !== allocation.fundraisingSessions
    ) {
      throw new Error(
        `Campaign weekly plan actions disagree with its allocation: ${plan.id}`,
      );
    }
  }
}
