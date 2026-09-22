import { addDays, candidacyPackForJurisdiction } from "../../src/simulation";
import type {
  DistrictSeatBinding,
  EntityId,
  World,
} from "../../src/simulation";
import { gazetteerChamberForOfficeChamberKey } from "../../src/districts/query";
import {
  fileForOffice as fileSelectedOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";

/** Legacy scenario fixtures deliberately name their intended provider office.
 * Production callers must supply an explicit office key; this is not UI policy.
 */
export function fileForOffice(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding | null = null,
): World {
  const offices =
    candidacyPackForJurisdiction(world.people[personId]!.homeJurisdictionId)
      ?.offices ?? [];
  const option = binding
    ? offices.find(
        (office) =>
          gazetteerChamberForOfficeChamberKey(
            office.officeKey.split(":").at(-1)!,
          ) === binding.chamber,
      )
    : offices.at(0);
  // A short authored race, as these scenarios were written against. Play
  // files on the office's own election calendar; see campaign-calendar tests.
  return fileSelectedOffice(
    world,
    personId,
    binding,
    option?.officeKey ?? "fixture:no-supported-office",
    addDays(world.currentDate, 28),
  );
}

/**
 * Plays a filed candidacy through to a decided election the way a player
 * would: one fundraising afternoon on the filing day, then an outreach
 * afternoon on every day that still has room for one, passing each day as an
 * ordinary morning-to-morning day, until election day decides the race.
 *
 * Rivals campaign every week (CRUNCH46), so a race is no longer won by a
 * handful of sessions and then waiting; this helper does the ordinary work
 * instead of switching the opposition off. It is the one shared route the
 * seated-member fixtures use to reach a recorded win.
 */
export function campaignUntilDecided(
  world: World,
  personId: EntityId,
  maxDays = 120,
): World {
  let next = trySession(world, personId, "fundraising");
  for (
    let day = 0;
    day < maxDays && projectCampaign(next, personId).phase === "active";
    day += 1
  ) {
    if (day > 0) next = trySession(next, personId, "outreach");
    next = passOrdinaryDays(next);
  }
  return next;
}

function trySession(
  world: World,
  personId: EntityId,
  kind: "fundraising" | "outreach",
): World {
  try {
    return spendAnAfternoon(world, personId, kind);
  } catch (error) {
    // Only a day with no room left is skipped; any other refusal is a defect.
    if (error instanceof Error && /already spoken for/.test(error.message)) {
      return world;
    }
    throw error;
  }
}
