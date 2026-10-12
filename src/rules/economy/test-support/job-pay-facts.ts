/** Raw dated life/kin/household/minimum-law receipts plus full own business/wage/pay/settlement closures. */
import * as life from "../../../simulation/life-queries";
import { minimumWageSettingAt } from "../../../simulation/minimum-wage";
import { addDays } from "../../../simulation/dates";
import { townSettlementFacts } from "./town-settlement-facts";
import { jobListingFacts } from "./job-listing-facts";
import { employerWageFacts } from "./employer-wage-facts";
import { payJobFacts } from "./pay-job-facts";
import { jobPaySourceKey, type JobPayFacts } from "../job-pay-effects";
import type { TownCompensationPeriod } from "../town-settlement";
import type { World, IsoDate } from "../../../simulation/types";
export function jobPayFacts(world: World, since: IsoDate): JobPayFacts {
  const periods: TownCompensationPeriod[] = [];
  for (const flow of world.history.resourceFlows)
    for (let week = 0; week < 520; week++) {
      const starts = addDays(flow.startsAt, week * 7),
        onDate = addDays(starts, 7);
      if (onDate > world.currentDate) break;
      periods.push({
        payFlowId: flow.id,
        activityId: flow.id,
        stableKey: "raw-source-window:" + flow.id + ":" + week,
        periodStartsAt: starts,
        periodEndsAt: addDays(onDate, -1),
        onDate,
      });
    }
  const base = townSettlementFacts(world, since, periods),
    listing = jobListingFacts(world),
    minimum = new Map();
  for (const id of [null, ...world.jurisdictionOrder])
    minimum.set(
      jobPaySourceKey(id, world.currentDate),
      minimumWageSettingAt(world, id, world.currentDate),
    );
  return {
    ...base,
    listing,
    minimum,
    employerWage: employerWageFacts(world),
    payStart: payJobFacts(world, world.currentDate),
    business: {
      currentDate: world.currentDate,
      people: world.people,
      records: world.history,
      profiles: listing.profiles,
      closings: listing.closings,
    },
    active: new Map(
      world.personOrder.map((id) => [
        id,
        life.activeWorkRelationshipsAt(world, id),
      ]),
    ),
    kin: new Map(
      world.personOrder.map((id) => [
        id,
        life.kinshipRelationshipsAt(world, id),
      ]),
    ),
    homes: new Map(
      world.personOrder.map((id) => [
        id,
        life.householdMembershipsAt(world, id),
      ]),
    ),
  };
}
