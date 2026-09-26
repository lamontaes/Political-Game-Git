import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./government-units";
import { requireLifePlace } from "./life-places";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "./local-ordinance-game-profile";
import { ensureCountyCouncilOpening } from "./municipal-council-opening";
import {
  municipalGovernmentJurisdictionId,
  municipalOrganizationFor,
  municipalSeats,
} from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";

describe("current county board opening", () => {
  it("seats Autauga's admitted board on its one canonical county organization", () => {
    const county = governmentUnit("gus2025:100001")!;
    const place = requireLifePlace("county:01001");
    const packId = `${county.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
    const scope = localFiscalGameAuthorityForRulePackId(packId)!;
    expect(scope.authority.level).toBe("county");
    expect(scope.jurisdictionId).toBe(governmentUnitJurisdictionId(county));
    expect(place.context.jurisdiction.id).toBe(scope.jurisdictionId);

    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "county-board-opening-autauga",
        placeKey: place.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    const world = game.world;
    const canonical = world.history.organizations.find(
      (organization) =>
        organization.stableKey === `local-government:${county.id}`,
    )!;
    expect(canonical).toBeDefined();
    expect(municipalOrganizationFor(world, county.id)?.id).toBe(canonical.id);
    expect(municipalGovernmentJurisdictionId(world, county.id)).toBe(
      scope.jurisdictionId,
    );
    expect(
      world.history.organizations.filter(
        (organization) =>
          organization.stableKey === `municipal-government:${county.id}`,
      ),
    ).toEqual([]);

    const seats = municipalSeats(world, county.id).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    );
    expect(seats).toHaveLength(5);
    expect(new Set(seats.map((seat) => seat.personId)).size).toBe(5);
    expect(
      seats.every((seat) => {
        const participation = world.history.organizationParticipations.find(
          (record) => record.id === seat.participationId,
        );
        return (
          participation?.organizationId === canonical.id &&
          participation.provenance.kind === "simulated-event"
        );
      }),
    ).toBe(true);
    expect(ensureCountyCouncilOpening(world, county.id)).toBe(world);

    const reloaded = deserializeWorld(serializeWorld(world));
    expect(municipalOrganizationFor(reloaded, county.id)?.id).toBe(
      canonical.id,
    );
    expect(municipalSeats(reloaded, county.id)).toEqual(
      municipalSeats(world, county.id),
    );
  }, 900_000);
});
