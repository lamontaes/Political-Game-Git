/** Raw life record/availability frontiers only; no applicant/offer/timing/ranking math is borrowed. */
import * as life from "../../../simulation/life-queries";
import { isPersonAliveAt } from "../../../simulation/vitality-integrity";
import type { World } from "../../../simulation/types";
import type { JobDecisionFacts } from "../job-decisions";
export function jobDecisionFacts(world: World): JobDecisionFacts {
  return {
    id: world.id,
    currentDate: world.currentDate,
    records: world.history,
    people: world.people,
    control: world.control,
    work: new Map(
      world.personOrder.map((id) => [
        id,
        life.activeWorkRelationshipsAt(world, id),
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((row) => [
        row.id,
        life.workStatusAt(world, row.id),
      ]),
    ),
    profiles: new Map(
      world.history.organizations.map((row) => [
        row.id,
        life.organizationProfileAt(world, row.id),
      ]),
    ),
    closings: new Map(
      world.history.organizations.map((row) => [
        row.id,
        life.organizationClosingAt(world, row.id),
      ]),
    ),
    alive: new Map(
      world.personOrder.map((id) => [
        id,
        isPersonAliveAt(world, id, life.currentLifeCutoff(world)),
      ]),
    ),
  };
}
