/** Raw work/events plus catalog paths and separately owned life entry/status receipts. */
import { LIFE_PATHS2_CATALOG } from "../../../simulation/life-paths2-catalog";
import {
  pathForRelationship,
  lifePathEntryReason,
} from "../../../simulation/life-paths2";
import { workStatusAt } from "../../../simulation/life-queries";
import type { World } from "../../../simulation/types";
import type { CareerEligibilityFacts } from "../career-eligibility";
export function careerEligibilityFacts(world: World): CareerEligibilityFacts {
  return {
    control: world.control,
    records: world.history,
    paths: new Map(LIFE_PATHS2_CATALOG.map((path) => [path.id, path])),
    heldPaths: new Map(
      world.history.workRelationships.map((work) => [
        work.id,
        pathForRelationship(world, work.id) ?? null,
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((work) => [
        work.id,
        workStatusAt(world, work.id),
      ]),
    ),
    entryReasons: new Map(
      world.personOrder.flatMap((id) =>
        LIFE_PATHS2_CATALOG.map(
          (path) =>
            [
              JSON.stringify([id, path.id]),
              lifePathEntryReason(world, id, path),
            ] as const,
        ),
      ),
    ),
  };
}
