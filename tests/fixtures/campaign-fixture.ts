import {
  addDays,
  candidacyPackForJurisdiction,
  districtSeatMustBeNamed,
  recordedDistrictMembership,
} from "../../src/simulation";
import type {
  DistrictSeatBinding,
  EntityId,
  World,
} from "../../src/simulation";
import { gazetteerChamberForOfficeChamberKey } from "../../src/districts/query";
import {
  bindingForDistrict,
  offeredDistricts,
} from "../../src/presentation/district-selection";
import {
  fileForOffice as fileSelectedOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import { contributeOwnMoneyToCampaign } from "../../src/simulation/campaign-money-sources";
import { createResourcePosition, money } from "../../src/simulation/resources";
import { ensureWorldStartingConditions } from "../../src/simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../../src/simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";

/**
 * A scenario world is built without the opening's political starting
 * conditions. Campaign work reads a district's recorded lean to estimate
 * support (`campaign-polling-estimate.ts`), and a save without it has none to
 * read, so a fixture that runs campaign actions records them the way a new
 * life's opening does.
 */
export function withRecordedStartingConditions(world: World): World {
  return ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
}

/** Legacy scenario fixtures deliberately name their intended provider office.
 * Production callers must supply an explicit office key; this is not UI policy.
 */
export function fileForOffice(
  startWorld: World,
  personId: EntityId,
  binding: DistrictSeatBinding | null = null,
): World {
  // Filing starts a campaign, and campaign work reads recorded district leans.
  const world = withRecordedStartingConditions(startWorld);
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
  const officeKey = option?.officeKey ?? "fixture:no-supported-office";
  // The authored scenario explicitly chooses a Gazetteer seat. It prefers
  // the World-recorded home district where one exists, and otherwise names
  // the first published seat without claiming the home lies in it. Any real
  // district-residence rule still decides eligibility in the filing writer.
  const selectedBinding =
    binding ?? namedSeatForFixture(world, personId, officeKey);
  // A short authored race, as these scenarios were written against. Play
  // files on the office's own election calendar; see campaign-calendar tests.
  return fileSelectedOffice(
    world,
    personId,
    selectedBinding,
    officeKey,
    addDays(world.currentDate, 28),
  );
}

/** A test's explicit seat choice; never a new home-membership record. */
export function namedSeatForFixture(
  world: World,
  personId: EntityId,
  officeKey: string,
): DistrictSeatBinding | null {
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home || !districtSeatMustBeNamed(home, officeKey)) return null;
  const chamberKey = officeKey.split(":").at(-1) ?? "";
  const chamber = gazetteerChamberForOfficeChamberKey(chamberKey);
  if (!chamber) return null;
  const recorded = recordedDistrictMembership(
    world,
    personId,
    chamber,
    world.currentDate,
  )?.binding;
  if (recorded) return recorded;
  const first = offeredDistricts(world, home, officeKey)[0];
  return first ? bindingForDistrict(first) : null;
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

/**
 * Puts recorded money in a candidate's committee the way a candidate does it:
 * their own savings go in through the shared own-money writer. A fundraising
 * session no longer raises anything on its own (it needs a dated monetary ask
 * and a contribution-cap law term), so a fixture that needs a funded committee
 * seeds one here instead of relying on a session's yield.
 */
export function fundCommitteeFromCandidate(
  world: World,
  personId: EntityId,
  minorUnits: number,
  reserveMinorUnits = 1_000_00,
): World {
  // The candidate's savings are opened once, with a reserve left over so a
  // fixture can put in more later.
  const funded = world.history.resourcePositions.some(
    (position) =>
      position.owner.kind === "person" && position.owner.personId === personId,
  )
    ? world
    : createResourcePosition(world, {
        stableKey: `fixture:candidate-savings:${personId}`,
        owner: { kind: "person", personId },
        openedAt: world.currentDate,
        openingBalance: money(minorUnits + reserveMinorUnits, "USD"),
        provenance: {
          kind: "authored",
          note: "Fixture savings for a funded committee.",
        },
      });
  return contributeOwnMoneyToCampaign(funded, personId, minorUnits);
}
