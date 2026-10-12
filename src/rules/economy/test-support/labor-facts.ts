/** Same-World raw records plus separately owned dated life record frontiers. */
import * as life from "../../../simulation/life-queries";
import type { World } from "../../../simulation/types";
import type { LaborReadingFacts } from "../labor-readings";
export function laborReadingFacts(world: World): LaborReadingFacts {
  return {
    onDate: world.currentDate,
    records: world.history,
    people: world.people,
    personOrder: world.personOrder,
    macroEconomy: world.macroEconomy,
    work: new Map(
      world.personOrder.map((id) => [
        id,
        life.activeWorkRelationshipsAt(world, id),
      ]),
    ),
    enrollment: new Map(
      world.personOrder.map((id) => [
        id,
        life.activeEducationEnrollmentsAt(world, id),
      ]),
    ),
    care: new Map(
      world.personOrder.map((id) => [
        id,
        life.activeCareResponsibilitiesAt(world, id),
      ]),
    ),
    workHistory: new Map(
      world.personOrder.map((id) => [
        id,
        life.workRelationshipHistoryForPerson(world, id),
      ]),
    ),
    statusHistory: new Map(
      world.history.workRelationships.map((row) => [
        row.id,
        life.workStatusHistory(world, row.id),
      ]),
    ),
  };
}
