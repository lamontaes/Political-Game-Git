import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  candidacyEligibility,
  candidacyPackForJurisdiction,
  electiveOfficesForJurisdiction,
} from "./candidacy";
import * as packs from "./candidacy-packs";
import { projectCampaignGuidance } from "./campaign-life-activities";
import { addDays, isoDateFromParts, makeIsoDate, yearOf } from "./dates";
import { officeFamilyForChamberKey } from "./office-qualification-rules";
import { settledQualification } from "./settled-qualifications";
import { lifePlaceStateIdentities } from "./life-places";
import { unknownRule, notApplicableRule } from "./legislature-rules";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import type { EntityId, World } from "./types";
import { drawRandomPlace } from "../../tests/support/random-place";

const identities = lifePlaceStateIdentities();
const seed = "a116-recorded-office-age";
const datedAgeOffices = identities.flatMap((place) => {
  const pack = packs.stateCandidacyPack(place.jurisdictionKey);
  return (pack?.offices ?? []).flatMap((office) => {
    const family = officeFamilyForChamberKey(
      office.officeKey.split(":").at(-1)!,
    );
    const row =
      family === null
        ? null
        : settledQualification(place.jurisdictionKey, "MINIMUM_AGE", family);
    return row?.validFrom === undefined ? [] : [{ place, office, row }];
  });
});
afterEach(() => vi.restoreAllMocks());

function atAge(world: World, personId: EntityId, age: number): World {
  const person = world.people[personId]!;
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        birthDate: isoDateFromParts(yearOf(world.currentDate) - age, 1, 1),
      },
    },
  };
}

function eligibility(
  world: World,
  personId: EntityId,
  office: ElectiveOfficeOption,
) {
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    officeKey: office.officeKey,
    alreadyACandidate: false,
  });
}

describe("one recorded office-age route across all places", () => {
  it("returns nonblank filing terms through the gate across the 56 places", () => {
    expect(identities).toHaveLength(56);
    for (const place of identities) {
      const { world, personId } = smallWorld({
        place: place.jurisdictionKey,
        seed,
      });
      const pack = candidacyPackForJurisdiction(
        world.people[personId]!.homeJurisdictionId,
      );
      const offices = pack?.offices ?? [];
      const officeKeys =
        offices.length > 0
          ? offices.map((office) => office.officeKey)
          : ["unknown-office"];
      for (const officeKey of officeKeys) {
        const result = candidacyEligibility(world, {
          personId,
          jurisdictionId: world.people[personId]!.homeJurisdictionId,
          officeKey,
          alreadyACandidate: false,
        });
        expect(result.filingTerms, `${place.usps}/${officeKey}`).not.toBeNull();
        expect(result.filingTerms!.feeMinorUnits).toBeGreaterThan(0);
        expect(result.filingTerms!.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("gives an unread place estimated terms without adding a filing-research block", () => {
    const place = identities.find(
      (candidate) =>
        packs.stateCandidacyPack(candidate.jurisdictionKey) === null,
    )!;
    const { world, personId } = smallWorld({
      place: place.jurisdictionKey,
      seed,
    });
    const result = candidacyEligibility(world, {
      personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      officeKey: "unresearched-office",
      alreadyACandidate: false,
    });
    expect(result.filingTerms?.estimated).toBe(true);
    expect(
      result.blocks.some((block) =>
        /filing terms|petition|fee research/i.test(block.reason),
      ),
    ).toBe(false);
  });

  it("opens a new game in a randomly selected accepted place", () => {
    const placeDrawSeed = "b01-part1-new-random-place-proof";
    const place = drawRandomPlace(
      placeDrawSeed,
      (candidate) =>
        candidate.scope === "locality" &&
        Boolean(
          candidate.stateJurisdictionKey &&
          packs.stateCandidacyPack(candidate.stateJurisdictionKey)?.offices
            .length,
        ),
    );
    const gameSeed = `${placeDrawSeed}:${place.key}`;
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed: gameSeed,
    });
    const office = packs.stateCandidacyPack(place.stateJurisdictionKey!)!
      .offices[0]!;
    const filing = candidacyEligibility(built.world, {
      personId: built.playerPersonId,
      jurisdictionId:
        built.world.people[built.playerPersonId]!.homeJurisdictionId,
      officeKey: office.officeKey,
      alreadyACandidate: false,
    }).filingTerms!;
    expect(built.place.key).toBe(place.key);
    expect(Object.keys(built.world.people).length).toBeGreaterThan(0);
    process.stdout.write(
      `${JSON.stringify({
        receipt: "B01 Part 1 random-place new-game filing terms",
        placeKey: place.key,
        placeDrawSeed,
        gameSeed,
        worldId: built.world.id,
        currentDate: built.world.currentDate,
        officeKey: office.officeKey,
        filingTerms: filing,
      })}\n`,
    );
  });
  it("includes every newly sourced missing office in the date-bound proof", () => {
    expect(datedAgeOffices).toHaveLength(16);
  });
  it.each(datedAgeOffices)(
    "enforces $office.officeKey from its own sourced age and refuses unproved history",
    ({ place, office, row }) => {
      const { world, personId } = smallWorld({
        place: place.jurisdictionKey,
        seed,
      });
      const observed = makeIsoDate(row.source.retrievedAt!.slice(0, 10));
      const datedWorld = { ...world, currentDate: observed };
      const young = eligibility(
        atAge(datedWorld, personId, row.value - 1),
        personId,
        office,
      );
      expect(young.blocks.map((block) => block.kind)).toContain(
        "sourced-minimum-age",
      );
      const oldEnough = eligibility(
        atAge(datedWorld, personId, row.value),
        personId,
        office,
      );
      expect(oldEnough.blocks.map((block) => block.kind)).not.toContain(
        "sourced-minimum-age",
      );
      const early = {
        ...world,
        currentDate: addDays(makeIsoDate(row.validFrom!), -1),
      };
      const unavailable = eligibility(
        atAge(early, personId, row.value),
        personId,
        office,
      );
      expect(unavailable.blocks.map((block) => block.kind)).toContain(
        "unproved-sourced-qualification",
      );
      expect(row.source.citation).not.toBe("");
      expect(row.source.sourceUrl).not.toBeNull();
      expect(row.source.verification).toBe("partial");
      const shown = projectCampaignGuidance(datedWorld, personId).offices.find(
        (item) => item.officeKey === office.officeKey,
      );
      expect(shown?.minimumAge.state).toBe("known");
      const historical = projectCampaignGuidance(early, personId).offices.find(
        (item) => item.officeKey === office.officeKey,
      );
      expect(historical?.minimumAge.state).toBe("unknown");
    },
  );
  it.each(identities)(
    "keeps $usps office guidance free of a universal age",
    (place) => {
      const { world, personId } = smallWorld({
        place: place.jurisdictionKey,
        seed,
      });
      const guidance = projectCampaignGuidance(world, personId);
      expect(guidance).not.toHaveProperty("gameAdultCandidacyAge");
      const pack = candidacyPackForJurisdiction(
        world.people[personId]!.homeJurisdictionId,
      );
      for (const office of pack?.offices ?? []) {
        const result = eligibility(world, personId, office);
        expect(result.blocks.map((block) => block.kind)).not.toContain(
          "below-game-adult-age",
        );
        const shown = guidance.offices.find(
          (row) => row.officeKey === office.officeKey,
        );
        expect(shown?.minimumAge.state).toBe(
          electiveOfficesForJurisdiction(
            world.people[personId]!.homeJurisdictionId,
            world.currentDate,
          ).find((item) => item.officeKey === office.officeKey)!.qualification
            .minimumAge.kind,
        );
      }
    },
  );
});

// Exercise an existing profile office through its real jurisdiction/office path.
// The source marker changes here only to prove provenance cannot skip its age.
function profileFixture() {
  for (const place of identities) {
    const small = smallWorld({ place: place.jurisdictionKey, seed });
    const pack = candidacyPackForJurisdiction(
      small.world.people[small.personId]!.homeJurisdictionId,
    );
    const office = pack?.offices.find((row) => {
      const family = officeFamilyForChamberKey(
        row.officeKey.split(":").at(-1)!,
      );
      // Synthetic rule tests need an office without an overriding settled row.
      return (
        row.qualification.minimumAge.kind === "known" &&
        row.qualification.minimumAge.source.verification === "game-profile" &&
        (family === null ||
          settledQualification(place.jurisdictionKey, "MINIMUM_AGE", family) ===
            null)
      );
    });
    if (pack && office) return { ...small, pack, office };
  }
  throw new Error("No existing profile office with a recorded age.");
}

function replaceOffice(
  fixture: ReturnType<typeof profileFixture>,
  office: ElectiveOfficeOption,
) {
  const pack = {
    ...fixture.pack,
    offices: fixture.pack.offices.map((row) =>
      row.officeKey === office.officeKey ? office : row,
    ),
  };
  const read = packs.candidacyPackById;
  vi.spyOn(packs, "candidacyPackById").mockImplementation((id) =>
    id === pack.packId ? pack : read(id),
  );
  vi.spyOn(packs, "stateCandidacyPack").mockReturnValue(pack);
}

describe("recorded age, missing age and no age requirement stay distinct", () => {
  it("enforces a recorded known age regardless of source marker, including its birthday boundary", () => {
    const fixture = profileFixture();
    const rule = fixture.office.qualification.minimumAge;
    if (rule.kind !== "known") throw new Error("Known age required.");
    replaceOffice(fixture, {
      ...fixture.office,
      qualification: {
        ...fixture.office.qualification,
        minimumAge: {
          ...rule,
          source: { ...rule.source, verification: "partial" },
        },
      },
    });
    const below = eligibility(
      atAge(fixture.world, fixture.personId, rule.value - 1),
      fixture.personId,
      fixture.office,
    );
    expect(
      below.blocks.some((block) => block.kind === "sourced-minimum-age"),
    ).toBe(true);
    const on = eligibility(
      atAge(fixture.world, fixture.personId, rule.value),
      fixture.personId,
      fixture.office,
    );
    expect(
      on.blocks.some((block) => block.kind === "sourced-minimum-age"),
    ).toBe(false);
  });
  it("leaves an unread age unresolved for both controlled and noncontrolled people", () => {
    const fixture = profileFixture();
    const note = "This office's minimum age has not been established.";
    replaceOffice(fixture, {
      ...fixture.office,
      qualification: {
        ...fixture.office.qualification,
        minimumAge: unknownRule(note),
      },
    });
    for (const personId of fixture.world.personOrder) {
      const result = eligibility(fixture.world, personId, fixture.office);
      expect(result.blocks).toContainEqual({
        kind: "unproved-sourced-qualification",
        reason: note,
      });
      expect(result.eligible).toBe(false);
    }
  });
  it("adds no age refusal when the office records that no requirement applies", () => {
    const fixture = profileFixture();
    replaceOffice(fixture, {
      ...fixture.office,
      qualification: {
        ...fixture.office.qualification,
        minimumAge: notApplicableRule("No minimum age requirement applies."),
      },
    });
    const result = eligibility(fixture.world, fixture.personId, fixture.office);
    expect(
      result.blocks.some(
        (block) =>
          block.kind === "sourced-minimum-age" ||
          block.kind === "profile-minimum-age",
      ),
    ).toBe(false);
  });
});
