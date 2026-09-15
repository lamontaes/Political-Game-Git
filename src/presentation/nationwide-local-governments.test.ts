import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  US_STATE_USPS,
  deserializeWorld,
  ensureHomeLocalGovernments,
  governingJurisdictionIdFor,
  homeLocalGovernmentStatus,
  lifePlaceByKey,
  localGovernmentOrganizationKey,
  organizationProfileAt,
  serializeWorld,
} from "../simulation";
import {
  allGovernmentUnits,
  countyGovernmentUnitsForPlace,
  governmentUnitsForPlace,
  governmentUnitsForState,
} from "../simulation/government-units";
import { NATIONAL_PLACES_ROWS } from "../simulation/national-places.generated";
import { municipalGovernmentForUnit } from "../simulation/rule-capability-resolver";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { projectWorld39News } from "./world39-news";

function openAt(placeKey: string, seed: string) {
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 40,
    questionnaire: "skipped" as const,
  };
  return {
    setup,
    game: generateOpeningLife(prepareOpeningLife(setup)).game!,
  };
}

/** A municipality in this state that the life-place corpus can start in. */
function uncompiledMunicipality(usps: string) {
  return (
    governmentUnitsForState(usps).find(
      (unit) =>
        unit.unitType === "municipality" &&
        unit.functionalActive &&
        unit.placeGeoid !== null &&
        unit.countyGeoid !== null &&
        lifePlaceByKey(unit.placeGeoid) !== null &&
        !municipalGovernmentForUnit(unit),
    ) ?? null
  );
}

describe("NATIONWIDE local governments: full catalog coverage", () => {
  it("maps every government unit to one jurisdiction and classifies every place", () => {
    const units = allGovernmentUnits();
    const ids = new Map<string, number>();
    const byType: Record<string, number> = {};
    for (const unit of units) {
      const id = governingJurisdictionIdFor({ kind: "local", unit });
      expect(id).not.toBeNull();
      ids.set(id!, (ids.get(id!) ?? 0) + 1);
      byType[unit.unitType] = (byType[unit.unitType] ?? 0) + 1;
    }
    const sharedJurisdictions = [...ids.values()].filter((n) => n > 1).length;

    const rows = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
    const places = {
      withMunicipalGovernment: 0,
      withoutGovernment: 0,
      withoutGovernmentButCountyGoverned: 0,
      multiCountyPlaces: 0,
    };
    const states = new Set<string>();
    for (const [geoid, , usps] of rows) {
      states.add(usps);
      if (
        governmentUnitsForPlace(geoid).some(
          (unit) => unit.unitType === "municipality",
        )
      )
        places.withMunicipalGovernment += 1;
      else {
        places.withoutGovernment += 1;
        if (countyGovernmentUnitsForPlace(geoid).length > 0)
          places.withoutGovernmentButCountyGoverned += 1;
      }
      if (countyGovernmentUnitsForPlace(geoid).length > 1)
        places.multiCountyPlaces += 1;
    }
    const municipal = units.filter((u) => u.unitType === "municipality");
    const municipalWithCounty = municipal.filter(
      (u) =>
        u.countyGeoid !== null &&
        units.some(
          (c) => c.unitType === "county" && c.countyGeoid === u.countyGeoid,
        ),
    ).length;

    const coverage = {
      units: units.length,
      byType,
      jurisdictionsSharedByMoreThanOneUnit: sharedJurisdictions,
      places: rows.length,
      ...places,
      municipalUnits: municipal.length,
      municipalUnitsWithCountyGovernment: municipalWithCounty,
      states: states.size,
    };
    if (process.env.NATIONWIDE_LOCAL_COVERAGE_OUT)
      writeFileSync(
        process.env.NATIONWIDE_LOCAL_COVERAGE_OUT,
        JSON.stringify(coverage, null, 2),
      );
    expect(units.length).toBe(38_704);
    expect(places.withMunicipalGovernment + places.withoutGovernment).toBe(
      rows.length,
    );
    expect(places.withMunicipalGovernment).toBeGreaterThan(15_000);
  });
});

describe("NATIONWIDE local governments at the opening", () => {
  it.each([...US_STATE_USPS, "DC"])(
    "%s: a city life records its city and county governments once; a county life its county",
    (usps) => {
      const unit = uncompiledMunicipality(usps);
      if (!unit) {
        // No city here can be started from a Census place (Hawaii's only city
        // unit is the consolidated City and County of Honolulu), so the state
        // is proven through a county life instead of being skipped.
        const countyUnit = governmentUnitsForState(usps).find(
          (candidate) =>
            candidate.unitType === "county" &&
            candidate.countyGeoid !== null &&
            lifePlaceByKey(`county:${candidate.countyGeoid}`) !== null &&
            !municipalGovernmentForUnit(candidate),
        );
        expect(countyUnit).toBeDefined();
        const { world, playerPersonId } = openAt(
          `county:${countyUnit!.countyGeoid}`,
          `local-county-only-${usps}`,
        ).game;
        const status = homeLocalGovernmentStatus(world, playerPersonId);
        expect(status.units.countyStatus).toBe("established");
        const county = status.governments.find(
          (g) => g.unitId === countyUnit!.id,
        )!;
        expect(county.organizationId).not.toBeNull();
        expect(
          organizationProfileAt(world, county.organizationId!)?.classification,
        ).toBe("service:county-government");
        expect(ensureHomeLocalGovernments(world, playerPersonId)).toBe(world);
        expect(
          homeLocalGovernmentStatus(
            deserializeWorld(serializeWorld(world)),
            playerPersonId,
          ),
        ).toEqual(status);
        return;
      }
      const { game } = openAt(unit.placeGeoid!, `local-city-${usps}`);
      const { world, playerPersonId } = game;
      const status = homeLocalGovernmentStatus(world, playerPersonId);
      expect(status.units.municipal.map((u) => u.id)).toContain(unit.id);
      const city = status.governments.find((g) => g.unitId === unit.id)!;
      expect(city.organizationId).not.toBeNull();
      const profile = organizationProfileAt(world, city.organizationId!);
      expect(profile?.classification).toBe("service:municipal-government");
      expect(profile?.locationJurisdictionId).toBe(
        world.people[playerPersonId]!.homeJurisdictionId,
      );
      // No members are invented where RULES has not admitted the body.
      expect(city.membershipMissing).toContain("body.seats");
      if (status.units.countyStatus === "established") {
        for (const county of status.governments.filter(
          (g) => g.unitType === "county" && g.compiledGovernmentKey === null,
        ))
          expect(county.organizationId).not.toBeNull();
      }
      // News tells the city government through the existing reader.
      const news = projectWorld39News(world, playerPersonId);
      expect(
        news.standing.some((item) => item.recordId === city.organizationId),
      ).toBe(true);

      // Once only: repeat, reopen.
      expect(establishOpeningOfficeholders(world, playerPersonId)).toBe(world);
      expect(ensureHomeLocalGovernments(world, playerPersonId)).toBe(world);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(homeLocalGovernmentStatus(reopened, playerPersonId)).toEqual(
        status,
      );

      if (unit.countyGeoid && lifePlaceByKey(`county:${unit.countyGeoid}`)) {
        const county = openAt(
          `county:${unit.countyGeoid}`,
          `local-county-${usps}`,
        ).game;
        const countyStatus = homeLocalGovernmentStatus(
          county.world,
          county.playerPersonId,
        );
        expect(countyStatus.units.placeScope).toBe("county");
        expect(countyStatus.units.municipal).toEqual([]);
        expect(["established", "no-county-government"]).toContain(
          countyStatus.units.countyStatus,
        );
      }
    },
    60_000,
  );

  it("a place with no government of its own gets no fictional city and is governed by its county", () => {
    const { world, playerPersonId } = openAt("3200500", "local-alamo").game;
    const status = homeLocalGovernmentStatus(world, playerPersonId);
    expect(status.units.municipal).toEqual([]);
    expect(status.units.countyStatus).toBe("established");
    expect(status.units.countyShares).toEqual([
      { unitId: "gus2025:108905", landAreaShare: 1 },
    ]);
    const local = world.history.organizations.filter((o) =>
      o.stableKey.startsWith("local-government:"),
    );
    expect(local.map((o) => o.stableKey)).toEqual([
      "local-government:gus2025:108905",
    ]);
    expect(ensureHomeLocalGovernments(world, playerPersonId)).toBe(world);
  });

  it("a city spanning counties is served by every county government, none chosen", () => {
    const { world, playerPersonId } = openAt("4055000", "local-okc").game;
    const status = homeLocalGovernmentStatus(world, playerPersonId);
    const shares = status.units.countyShares!;
    expect(shares.length).toBe(4);
    expect(
      shares.reduce((sum, share) => sum + share.landAreaShare, 0),
    ).toBeCloseTo(1, 6);
    expect(shares[0]!.landAreaShare).toBeGreaterThanOrEqual(
      shares[1]!.landAreaShare,
    );
    for (const county of status.governments.filter(
      (g) => g.unitType === "county" && g.compiledGovernmentKey === null,
    ))
      expect(county.organizationId).not.toBeNull();
  });

  it("an independent city records no county government", () => {
    const { world, playerPersonId } = openAt("5114968", "local-cville").game;
    const status = homeLocalGovernmentStatus(world, playerPersonId);
    expect(status.units.counties).toEqual([]);
    expect(
      world.history.organizations.some(
        (o) =>
          o.stableKey.startsWith("local-government:") &&
          status.governments.every(
            (g) => `local-government:${g.unitId}` !== o.stableKey,
          ),
      ),
    ).toBe(false);
  });

  it("a compiled government keeps its own install path and is not duplicated", () => {
    const { world, playerPersonId } = openAt(
      "lexington-fayette",
      "local-lexington",
    ).game;
    const status = homeLocalGovernmentStatus(world, playerPersonId);
    for (const government of status.governments.filter(
      (g) => g.compiledGovernmentKey !== null,
    ))
      expect(government.organizationId).toBeNull();
  });

  it("measures the save cost of the home local governments", () => {
    const unit = uncompiledMunicipality("OH")!;
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "local-size",
      placeKey: unit.placeGeoid!,
      startAge: 40,
      questionnaire: "skipped" as const,
    };
    const base = createNewGameWorld(setup);
    const opened = generateOpeningLife(prepareOpeningLife(setup)).game!.world;
    const added =
      serializeWorld(opened).length - serializeWorld(base.world).length;
    // Governor + federal holders + a city and its county governments, not a state's catalog.
    expect(added).toBeLessThan(25_000);
    expect(
      opened.history.organizations.filter((o) =>
        o.stableKey.startsWith("local-government:"),
      ).length,
    ).toBeLessThanOrEqual(6);
    expect(localGovernmentOrganizationKey(unit)).toBe(
      `local-government:${unit.id}`,
    );
  });
});
