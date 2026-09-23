import { isTerritoryUsps } from "../state-reference";
import type { World } from "../types";
import {
  ensureStateExecutiveIncumbent,
  homeStateUsps,
  stateExecutiveOffice,
} from "./state-executives";

/**
 * A territory life saved before territories had a Governor.
 *
 * A new game seats the home jurisdiction's chief executive when the life
 * opens. Saves made before Puerto Rico, Guam, the U.S. Virgin Islands, American
 * Samoa and the Northern Mariana Islands had one never got it, so a long
 * territory life would go on with nobody in the office. The first time such a
 * save moves forward, the played person's home territory has its Governor
 * seated through the same writer a new game uses, dated from the term in
 * progress today on the game's calendar.
 *
 * Nothing earlier is written: no past Governors, no past election. A save
 * whose territory already has its office, a save played outside a territory,
 * and a save with nobody played are returned unchanged, so running this again
 * changes nothing.
 */
export function catchUpTerritoryGovernor(world: World): World {
  if (world.control.kind !== "person") return world;
  const personId = world.control.personId;
  if (!world.people[personId]) return world;
  const usps = homeStateUsps(world, personId);
  if (!usps || !isTerritoryUsps(usps)) return world;
  const office = stateExecutiveOffice(usps);
  if (!office) return world;
  if (
    world.history.organizations.some(
      (organization) => organization.stableKey === office.organizationStableKey,
    )
  )
    return world;
  return ensureStateExecutiveIncumbent(world, personId, usps);
}
