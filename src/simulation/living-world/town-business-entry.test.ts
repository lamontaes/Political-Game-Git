import { describe, expect, it } from "vitest";
import type { World } from "../types";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../life-places";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { withWorldIntegrityDeferred } from "../world";
import { SeededRng, pickDistinct } from "../rng";
import { createLightweightPerson } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import { recordOrganizationProfile } from "../life";
import { organizationProfileAt } from "../life-queries";
import { TOWN_WORKPLACES, writeTownEmployer } from "./town-employment";
import { countyGovernmentUnitsForPlace } from "../government-units";
import { countyDisplayName } from "./town-employment";
import { localInstitutionsFor } from "../local-institutions";
import {
  townBusinesses,
  townBusinessEntryGaps,
  reviewTownBusinesses,
  TOWN_BUSINESS_WORKPLACES,
} from "./town-businesses";

const seed = "team4-a59-recorded-comparable-towns";
const catalog = lifePlaceStateIdentities();
const sampled = pickDistinct(new SeededRng(seed), catalog, 5);
const line = TOWN_WORKPLACES.find((row) =>
  TOWN_BUSINESS_WORKPLACES.has(row.key),
)!;
function fixture(state: string) {
  const target = smallWorld({
    place: state,
    seed: `${seed}:${state}:target`,
    people: 8,
    date: "2026-01-01",
  });
  const peers = catalog
    .filter((row) => row.jurisdictionKey !== state)
    .slice(0, 2)
    .map((row, index) =>
      smallWorld({
        place: row.jurisdictionKey,
        seed: `${seed}:${state}:peer:${index}`,
        people: 4 + index * 2,
        date: "2026-01-01",
      }),
    );
  const parts = [target, ...peers];
  let world: World = {
    ...target.world,
    jurisdictions: Object.fromEntries(
      parts.flatMap((part) => Object.entries(part.world.jurisdictions)),
    ),
    jurisdictionOrder: [
      ...new Set(parts.flatMap((part) => part.world.jurisdictionOrder)),
    ],
  };
  for (const [index, peer] of peers.entries()) {
    for (let resident = 0; resident < 4 + index * 2; resident += 1) {
      const person = createLightweightPerson({
        worldId: world.id,
        worldSeed: `${seed}:${state}:peer:${index}:${resident}`,
        currentDate: world.currentDate,
        homeJurisdictionId: peer.jurisdictionId,
        index: 100 + index * 10 + resident,
      });
      world = {
        ...world,
        people: { ...world.people, [person.id]: person },
        personOrder: [...world.personOrder, person.id],
      };
    }
  }
  for (const part of parts)
    world = writeTownEmployer(
      world,
      part.jurisdictionId,
      line,
      0,
      world.currentDate,
    );
  return { world, town: target.jurisdictionId, peers };
}

describe("A59 recorded same-line town entry", () => {
  it("names an existing public-school employer from its local district row", () => {
    const fixture = smallWorld({
      place: "5363000",
      seed: `${seed}:public-employer-name`,
    });
    const district = localInstitutionsFor(fixture.world, fixture.jurisdictionId)
      .districts[0]!;
    const workplace = TOWN_WORKPLACES.find(
      (row) => row.key === "public-school",
    )!;
    const world = writeTownEmployer(
      fixture.world,
      fixture.jurisdictionId,
      workplace,
      99,
      fixture.world.currentDate,
    );
    const organization = world.history.organizations.find((row) =>
      row.stableKey.endsWith(":employer:public-school:99"),
    )!;
    expect(organizationProfileAt(world, organization.id)?.name).toBe(
      district.name,
    );
    expect(organization.provenance).toMatchObject({
      kind: "source-record",
      reference: `${district.sourceKey}:${district.sourceId} (directory as of ${district.asOf}); historical name estimated before directory vintage`,
      asOf: fixture.world.currentDate,
    });
  });

  it("names generated private businesses from local families or counties", () => {
    const fixture = smallWorld({ place: "NV", seed: `${seed}:private-names` });
    let world = fixture.world;
    const familyNames = new Set(
      Object.values(world.people)
        .filter(
          (person) => person.homeJurisdictionId === fixture.jurisdictionId,
        )
        .map((person) => person.familyName),
    );
    const place = lifePlaceByJurisdictionId(fixture.jurisdictionId)!;
    const county = place.sourceGeoid
      ? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit
      : undefined;
    const countyName = county ? countyDisplayName(county.name) : null;
    const names: string[] = [];
    for (const key of [
      "bank",
      "clinic",
      "hospital",
      "inn",
      "retail",
    ] as const) {
      const workplace = TOWN_WORKPLACES.find((row) => row.key === key)!;
      world = writeTownEmployer(
        world,
        fixture.jurisdictionId,
        workplace,
        names.length,
        world.currentDate,
      );
      const organization = world.history.organizations.find((row) =>
        row.stableKey.endsWith(`:employer:${key}:${names.length}`),
      )!;
      const name = organizationProfileAt(world, organization.id)!.name;
      names.push(name);
      expect(organization.provenance).toMatchObject({
        kind: "generated",
        generatorKey: "town-employment-v1:estimated-local-name",
      });
      expect(
        [...familyNames].some((family) => name.includes(family)) ||
          (countyName !== null && name.includes(countyName)),
      ).toBe(true);
      expect(name).not.toMatch(
        /\b(Walmart|Target|Costco|CVS|Walgreens|McDonald'?s|Starbucks)\b/i,
      );
      expect(name).not.toMatch(
        /\b(Main|Oak|Maple|Pine|Cedar|Elm|Park|Washington|Lake|Hill|Church|Mill|Depot|Front|Second|Railroad) (Street|Avenue)\b/i,
      );
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it("samples five distinct places from all 56", () => {
    expect(catalog).toHaveLength(56);
    expect(new Set(sampled.map((row) => row.jurisdictionKey)).size).toBe(5);
  });
  it("opens one ordinary new game in a seeded random place before READY", () => {
    const state = sampled[0]!;
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0]!;
    const game = withWorldIntegrityDeferred(
      () =>
        generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            placeKey: place.key,
            seed: `${seed}:ordinary-new-game`,
            questionnaire: "skipped",
          }),
        ).game,
    );
    expect(game).toBeDefined();
    expect(
      game!.world.jurisdictions[place.context.jurisdiction.id],
    ).toBeDefined();
    expect(game!.world.control.kind).toBe("person");
    expect(game!.world.personOrder.length).toBeGreaterThan(0);
  });
  for (const state of sampled) {
    it(`uses recorded peer towns, without an authored job-mix fallback (${state.jurisdictionKey})`, () => {
      const { world, town } = fixture(state.jurisdictionKey);
      const before = serializeWorld(world);
      expect(townBusinessEntryGaps(world, town).get(line.key)).toBeCloseTo(
        8 / 5 - 1,
      );
      expect(
        townBusinessEntryGaps(world, town).has("unrecorded-business-line"),
      ).toBe(false);
      expect(serializeWorld(world)).toBe(before);
      expect(townBusinessEntryGaps(deserializeWorld(before), town)).toEqual(
        townBusinessEntryGaps(world, town),
      );
      const reviewed = reviewTownBusinesses(
        world,
        town,
        null,
        "a59-actual-entry",
      );
      expect(
        townBusinesses(reviewed, town).some(
          (business) =>
            business.workplace.key === line.key &&
            business.outlet >= line.outlets,
        ),
      ).toBe(true);
      expect(
        reviewTownBusinesses(reviewed, town, null, "a59-actual-entry"),
      ).toBe(reviewed);
      const otherSeed = { ...world, seed: "another-seed-does-not-draw-entry" };
      expect(townBusinessEntryGaps(otherSeed, town)).toEqual(
        townBusinessEntryGaps(world, town),
      );
    });
    it(`does not count a closed peer and does not supply missing peers (${state.jurisdictionKey})`, () => {
      const { world, town, peers } = fixture(state.jurisdictionKey);
      let next = world;
      for (const peer of peers) {
        const business = townBusinesses(next, peer.jurisdictionId)[0]!;
        const profile = organizationProfileAt(next, business.organizationId)!;
        next = recordOrganizationProfile(next, {
          stableKey: `a59-test-close:${business.organizationId}`,
          organizationId: business.organizationId,
          effectiveAt: next.currentDate,
          name: profile.name,
          classification: profile.classification,
          locationJurisdictionId: profile.locationJurisdictionId,
          closed: { reason: "Recorded fixture closure" },
          supersedesProfileId: profile.id,
          provenance: {
            kind: "authored",
            note: "Controlled saved A59 peer closure, not empirical coverage",
          },
        });
      }
      expect(townBusinessEntryGaps(next, town).size).toBe(0);
      const reviewed = reviewTownBusinesses(next, town, null, "a59-no-peers");
      expect(reviewed.history.organizations).toEqual(
        next.history.organizations,
      );
    });
  }
});
