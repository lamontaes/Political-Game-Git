import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalSeats,
  seatMunicipalMember,
} from "../municipal-public-work";
import { drawTownResident } from "../living-world/local-government-seats";
import { dcCouncilSeatLabels } from "../municipal-seat-identity";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";

export { dcCouncilSeatLabels } from "../municipal-seat-identity";

/**
 * The Council of the District of Columbia, with a person in each of its
 * thirteen seats.
 *
 * D.C. Code § 1-204.01(b)(1): the Chairman and four members are elected at
 * large, and one member from each of the eight wards. The state legislature
 * opening seats a home state's chambers; the District's legislature is this
 * Council, described in the municipal data, so it is seated here instead,
 * once, when a life starts in the District.
 *
 * Seats are participations in the Council's municipal organization, the same
 * records a campaign winner gets, so the Council's votes are the votes of
 * these people and a player who wins a seat joins the same body.
 *
 * Members are residents of the District drawn from its household roster,
 * as every other council's are (`drawTownResident`), so their ages are the
 * ages of real District households. A member must be a qualified elector of
 * the District (D.C. Code § 1-204.02), and an elector is 18 or older
 * (§ 1-1001.02(2)).
 *
 * The opening records no party for a member. The save has no District party
 * share from which to derive one, and holding a Council seat does not establish
 * an affiliation. This is a recorded absence, not an inferred affiliation.
 */

export const DC_COUNCIL_OPENING_VERSION = "dc-council-opening/v1" as const;
export const DC_GOVERNMENT_KEY = "us-dc-washington";

/** A qualified elector of the District: 18 or older. */
const DC_COUNCIL_MINIMUM_AGE = 18;

const V = DC_COUNCIL_OPENING_VERSION;
const openingKey = `${V}:opening`;

export function dcCouncilSeated(world: World): boolean {
  return world.history.events.some((event) => event.stableKey === openingKey);
}

export function ensureDistrictOfColumbiaCouncilOpening(
  world: World,
  excludePersonIds: readonly EntityId[] = [],
): World {
  if (dcCouncilSeated(world)) return world;
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY);
  if (!government) return world;
  const reading = primaryReading(government);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  );
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId]) return world;
  let next = installMunicipalGovernment(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  const labels = dcCouncilSeatLabels();
  // A seat someone already holds (a player who won one) is not seated again.
  const open = Math.max(
    0,
    (reading.bodySize ?? labels.length) -
      municipalSeats(next, DC_GOVERNMENT_KEY).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      ).length,
  );
  // Members are grown residents of the District, from the same roster its
  // employers and every other council draw on, so a member's age is the
  // age a real District household gives them, not a number drawn for the
  // seat. Anyone given to exclude (the player's household) is passed over.
  const excluded = new Set<EntityId>([
    ...excludePersonIds,
    ...municipalSeats(next, DC_GOVERNMENT_KEY).map((seat) => seat.personId),
  ]);
  const taken = new Set<string>();
  const seatedIds: EntityId[] = [];
  labels.slice(0, open).forEach((seat, index) => {
    const found = drawTownResident(
      next,
      jurisdictionId,
      `local-government:${DC_GOVERNMENT_KEY}`,
      index,
      DC_COUNCIL_MINIMUM_AGE,
      excluded,
      taken,
    );
    next = found.world;
    if (!found.personId) return;
    excluded.add(found.personId);
    next = seatMunicipalMember(next, {
      governmentKey: DC_GOVERNMENT_KEY,
      personId: found.personId,
      startedAt: next.currentDate,
      role: seat.presiding ? "presiding-member" : "member",
      seatLabel: seat.label,
    });
    seatedIds.push(found.personId);
  });
  return recordWorldEvent(next, {
    stableKey: openingKey,
    type: "world.dc-council-opening",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: seatedIds,
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `seated:${seatedIds.length}`],
    summary: `${reading.bodyName ?? "The Council"} is seated: ${seatedIds.length} of ${reading.bodySize ?? labels.length} members.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
