import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../simulation/life";
import {
  projectCongress,
  publicPartyAffiliation,
} from "../simulation/living-world";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_MAP_PREFERENCES, readMapPreferences } from "./map-preferences";
import {
  dateAtStep,
  dayCount,
  fitViewBox,
  zoomViewBox,
  HOME_VIEW,
} from "./map-view";
import {
  districtsHeldBy,
  earliestMapDate,
  inspectRegion,
  playerGeography,
  projectPoliticalMap,
  resolveMapDate,
  stateFipsForUsps,
} from "./political-map-model";

function openLife(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      startAge: 30,
      seed,
    }),
  ).game!;
  const control = game.world.control;
  if (control.kind !== "person")
    throw new Error("The opening life has no controlled person.");
  return { world: game.world, personId: control.personId };
}

const HOUSE_GEOIDS = districtIdentityCatalog()
  .filter(
    (identity) =>
      identity.chamber === "congressional" &&
      !identity.isUnassignedResidual &&
      identity.stateUsps !== "PR",
  )
  .map((identity) => identity.geoid);
const STATE_GEOIDS = [
  ...new Set(districtIdentityCatalog().map((identity) => identity.stateFips)),
]
  .filter((fips) => fips !== "72")
  .concat(["11"]);

// Contrasting routes: Seattle, WA; Columbus, OH; Lexington-Fayette, KY.
const seattle = openLife("5363000", "maps-seattle");
const columbus = openLife("3918000", "maps-columbus");
const lexington = openLife("2146027", "maps-lexington");

describe("political map: national House view", () => {
  it("covers 435 voting districts plus D.C. and colors only recorded facts", () => {
    expect(new Set(HOUSE_GEOIDS).size).toBe(436);
    const model = projectPoliticalMap(seattle.world, {
      mode: "house",
      geoids: HOUSE_GEOIDS,
    });
    expect(model.regions.size).toBe(436);
    const congress = projectCongress(seattle.world)!;
    const counts = new Map<string, number>();
    for (const region of model.regions.values()) {
      counts.set(region.fill.kind, (counts.get(region.fill.kind) ?? 0) + 1);
    }
    // Every voting seat is recorded in a fresh save; nothing falls back.
    expect(counts.get("not-recorded") ?? 0).toBe(0);
    expect(counts.get("vacant") ?? 0).toBe(congress.house.totals.vacancies);
    expect(model.regions.get("1198")?.fill.kind).toBe("no-voting-seat");
    const partyTotal = congress.house.totals.byParty
      .filter((row) => row.partyOrganizationId)
      .reduce((sum, row) => sum + row.members, 0);
    expect(counts.get("party")).toBe(partyTotal);
    // Legend parties are the actual party organization ids, with names.
    const legendParties = model.legend.filter(
      (entry) => entry.fill.kind === "party",
    );
    expect(
      legendParties
        .map(
          (entry) => (entry.fill as { organizationId: string }).organizationId,
        )
        .sort(),
    ).toEqual(
      congress.house.totals.byParty
        .flatMap((row) =>
          row.partyOrganizationId ? [row.partyOrganizationId] : [],
        )
        .sort(),
    );
    expect(legendParties.every((entry) => entry.label.endsWith("Party"))).toBe(
      true,
    );
    expect(new Set(legendParties.map((entry) => entry.slot?.slot)).size).toBe(
      legendParties.length,
    );
  });

  it("colors a Senate delegation split and gives D.C. no Senate seats", () => {
    const model = projectPoliticalMap(seattle.world, {
      mode: "senate",
      geoids: STATE_GEOIDS,
    });
    expect(model.regions.size).toBe(51);
    expect(model.regions.get("11")?.fill.kind).toBe("no-voting-seat");
    for (const [geoid, region] of model.regions) {
      if (geoid === "11") continue;
      expect(["party", "mixed", "no-party", "vacant"]).toContain(
        region.fill.kind,
      );
    }
    // Alaska and Hawaii are present with both senators, not dropped as off-canvas.
    for (const geoid of ["02", "15"]) {
      expect(model.regions.get(geoid)?.summary.split("; ")).toHaveLength(2);
    }
  });

  it("never treats a missing roster as a vacancy or zero", () => {
    const empty = {
      ...seattle.world,
      history: { ...seattle.world.history, events: [] },
    } as World;
    const model = projectPoliticalMap(empty, {
      mode: "house",
      geoids: HOUSE_GEOIDS.slice(0, 5),
    });
    expect(model.established).toBe(false);
    expect(
      [...model.regions.values()].every(
        (region) => region.fill.kind === "not-recorded",
      ),
    ).toBe(true);
    expect(model.legend.map((entry) => entry.fill.kind)).toEqual([
      "not-recorded",
    ]);
    expect(model.notes.join(" ")).toMatch(/not recorded rather than empty/);
  });
});

describe("political map: a third party and history", () => {
  // Found a third party today and move one House member into it; the day
  // before is the history the map must not recolor.
  const base = seattle.world;
  const congress = projectCongress(base)!;
  const seat = congress.house.seats.find(
    (candidate) => candidate.occupant.kind === "member",
  )!;
  const member = (
    seat.occupant as {
      member: {
        personId: EntityId;
        partyOrganizationId: EntityId | null;
        startedAt: string | null;
      };
    }
  ).member;
  const oldParty = member.partyOrganizationId;
  const before = dateAtStep(base.currentDate, -1);
  let world = base;
  const changeDate = world.currentDate;
  world = createOrganization(world, {
    stableKey: "maps-test:party:forward",
    formedAt: changeDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "map test third party" },
    initialProfile: {
      name: "Forward Party",
      classification: "membership:political-party",
      locationJurisdictionId: null,
    },
  });
  const forwardId = world.history.organizations.at(-1)!.id;
  if (oldParty) {
    // Participation records outrank the roll's tag once any exist, so record
    // the earlier affiliation first, then end it on the change date.
    world = createOrganizationParticipation(world, {
      stableKey: "maps-test:affiliation:old",
      personId: member.personId,
      organizationId: oldParty,
      startedAt: member.startedAt ?? before,
      initialStatus: "active",
      kind: "affiliation:political-party",
      roleKind: "member:public-affiliation",
      context: "Public party affiliation",
      provenance: { kind: "authored", note: "map test" },
    });
    const oldParticipation = world.history.organizationParticipations.at(-1)!;
    const oldState = world.history.organizationParticipationStates.at(-1)!;
    world = recordOrganizationParticipationState(world, {
      stableKey: "maps-test:affiliation:old:ended",
      participationId: oldParticipation.id,
      effectiveAt: changeDate,
      status: "ended",
      roleKind: "member:public-affiliation",
      context: "Left the party",
      provenance: { kind: "authored", note: "map test" },
      supersedesStateId: oldState.id,
    });
  }
  world = createOrganizationParticipation(world, {
    stableKey: "maps-test:affiliation:forward",
    personId: member.personId,
    organizationId: forwardId,
    startedAt: changeDate,
    initialStatus: "active",
    kind: "affiliation:political-party",
    roleKind: "member:public-affiliation",
    context: "Public party affiliation",
    provenance: { kind: "authored", note: "map test" },
  });
  const geoid = `${stateFipsForUsps(seat.stateUsps)}${seat.district}`;

  it("shows three parties with three distinct colors today", () => {
    expect(publicPartyAffiliation(world, member.personId)).toBe(forwardId);
    const model = projectPoliticalMap(world, {
      mode: "house",
      geoids: HOUSE_GEOIDS,
    });
    const parties = model.legend.filter((entry) => entry.fill.kind === "party");
    expect(parties.length).toBeGreaterThanOrEqual(3);
    expect(parties.map((entry) => entry.label)).toContain("Forward Party");
    expect(new Set(parties.map((entry) => entry.slot?.slot)).size).toBe(
      parties.length,
    );
    expect(model.regions.get(geoid)?.fill).toEqual({
      kind: "party",
      organizationId: forwardId,
    });
  });

  it("an earlier date keeps the old party and does not change the world", () => {
    const snapshot = JSON.stringify(world);
    const model = projectPoliticalMap(world, {
      mode: "house",
      geoids: HOUSE_GEOIDS,
      asOf: before,
    });
    expect(model.date).toEqual({ asOf: before, isHistorical: true });
    expect(model.regions.get(geoid)?.fill).toEqual(
      oldParty
        ? { kind: "party", organizationId: oldParty }
        : { kind: "no-party" },
    );
    expect(model.legend.map((entry) => entry.label)).not.toContain(
      "Forward Party",
    );
    const inspection = inspectRegion(world, seattle.personId, {
      layer: "congressional",
      geoid,
      stateUsps: seat.stateUsps,
      asOf: before,
    });
    expect(inspection.notes.join(" ")).toMatch(
      /Nothing here changes the current day/,
    );
    expect(JSON.stringify(world)).toBe(snapshot);
  });

  it("clamps a future date to today and reports the save's earliest day", () => {
    expect(resolveMapDate(world, "2999-01-01")).toEqual({
      asOf: world.currentDate,
      isHistorical: false,
    });
    expect(earliestMapDate(world) <= before).toBe(true);
  });

  it("highlights the districts a focused person holds", () => {
    expect(districtsHeldBy(world, [member.personId])).toEqual([
      { layer: "congressional", geoid, personId: member.personId },
    ]);
  });
});

describe("political map: player places and ambiguous membership", () => {
  it.each([
    ["Seattle", seattle, "WA", "5363000"],
    ["Columbus", columbus, "OH", "3918000"],
    ["Lexington", lexington, "KY", "2146027"],
  ])(
    "%s: home is the chosen place, not a guessed district",
    (_, life, usps, placeGeoid) => {
      const geography = playerGeography(life.world, life.personId);
      expect(geography.home).toMatchObject({
        layer: "place",
        geoid: placeGeoid,
        stateUsps: usps,
      });
      const house = geography.homeDistricts.congressional;
      // A large city spans several districts: the save lists them, never picks.
      expect(house.kind).not.toBe("unknown");
      if (house.kind === "candidates") {
        expect(house.geoids.length).toBeGreaterThan(1);
        expect(
          house.geoids.every((geoid) =>
            geoid.startsWith(stateFipsForUsps(usps)!),
          ),
        ).toBe(true);
      }
      for (const chamber of ["state-upper", "state-lower"] as const) {
        const relation = geography.homeDistricts[chamber];
        if (relation.kind === "candidates")
          expect(relation.geoids.length).toBeGreaterThan(1);
      }
    },
  );

  it("a split city's inspector lists every candidate district and picks none", () => {
    const inspection = inspectRegion(seattle.world, seattle.personId, {
      layer: "place",
      geoid: "5363000",
      stateUsps: "WA",
    });
    expect(inspection.relations).toContain("Your home is here.");
    expect(inspection.membership.join(" ")).toMatch(
      /Split across state (senate|house) districts .*an address decides which/,
    );
    expect(inspection.membership.join(" ")).toMatch(
      /Possible congressional districts: .*does not pick one/,
    );
  });

  it("a candidate district says the home may be there, not that it is", () => {
    const geography = playerGeography(seattle.world, seattle.personId);
    const relation = geography.homeDistricts.congressional;
    expect(relation.kind).toBe("candidates");
    if (relation.kind !== "candidates") return;
    const inspection = inspectRegion(seattle.world, seattle.personId, {
      layer: "congressional",
      geoid: relation.geoids[0]!,
      stateUsps: "WA",
    });
    expect(inspection.relations.join(" ")).toMatch(/may be in this district/);
    expect(inspection.relations.join(" ")).not.toMatch(
      /Your home is in this district/,
    );
  });

  it("an at-large state is a known district without guessing", () => {
    const anchorage = openLife("0203000", "maps-anchorage");
    const geography = playerGeography(anchorage.world, anchorage.personId);
    expect(geography.homeDistricts.congressional).toMatchObject({
      kind: "known",
      geoid: "0200",
    });
    const inspection = inspectRegion(anchorage.world, anchorage.personId, {
      layer: "congressional",
      geoid: "0200",
      stateUsps: "AK",
    });
    expect(inspection.relations).toContain("Your home is in this district.");
    expect(inspection.offices[0]?.title).toMatch(/Alaska's at-large/);
  }, 120_000);

  it("inspecting a state names its senators and says what is not recorded", () => {
    const inspection = inspectRegion(columbus.world, columbus.personId, {
      layer: "state",
      geoid: "53",
      stateUsps: "WA",
    });
    expect(
      inspection.offices.filter((line) =>
        line.title.startsWith("U.S. Senator"),
      ),
    ).toHaveLength(2);
    const governor = inspection.offices.find(
      (line) => line.title === "Governor",
    );
    expect(governor?.status.kind).toBe("not-recorded");
    const dc = inspectRegion(columbus.world, columbus.personId, {
      layer: "state",
      geoid: "11",
      stateUsps: "DC",
    });
    expect(dc.offices[0]?.status.kind).toBe("no-voting-seat");
  });

  it("inspection is read-only", () => {
    const snapshot = JSON.stringify(lexington.world);
    inspectRegion(lexington.world, lexington.personId, {
      layer: "state",
      geoid: "21",
      stateUsps: "KY",
    });
    inspectRegion(lexington.world, lexington.personId, {
      layer: "state-lower",
      geoid: "21045",
      stateUsps: "KY",
    });
    projectPoliticalMap(lexington.world, {
      mode: "state-lower",
      stateUsps: "KY",
      geoids: ["21045"],
    });
    expect(JSON.stringify(lexington.world)).toBe(snapshot);
  });
});

describe("map preferences and view helpers", () => {
  it("restores saved preferences and repairs damaged ones field by field", () => {
    const saved = {
      mode: "state-lower",
      stateUsps: "OH",
      labels: false,
      presentation: "list",
    };
    expect(readMapPreferences(JSON.parse(JSON.stringify(saved)))).toEqual(
      saved,
    );
    expect(readMapPreferences({ mode: "county", stateUsps: null })).toEqual(
      DEFAULT_MAP_PREFERENCES,
    );
    expect(
      readMapPreferences({ mode: "bogus", stateUsps: "ohio", labels: "yes" }),
    ).toEqual(DEFAULT_MAP_PREFERENCES);
    expect(readMapPreferences(null)).toEqual(DEFAULT_MAP_PREFERENCES);
  });

  it("fits and zooms without distorting the canvas", () => {
    const fitted = fitViewBox([100, 100, 110, 140]);
    expect(fitted.w / fitted.h).toBeCloseTo(1.6);
    expect(fitted.x).toBeLessThan(100);
    const zoomed = zoomViewBox(HOME_VIEW, 2);
    expect(zoomed.w).toBe(480);
    expect(dayCount("2026-01-01", "2026-03-01")).toBe(59);
    expect(dateAtStep("2026-01-01", 59)).toBe("2026-03-01");
  });
});
