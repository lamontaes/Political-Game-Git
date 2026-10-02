import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  candidacyEligibility,
  candidacyPackForJurisdiction,
} from "./candidacy";
import * as packs from "./candidacy-packs";
import { projectCampaignGuidance } from "./campaign-life-activities";
import { isoDateFromParts, yearOf } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import { unknownRule, notApplicableRule } from "./legislature-rules";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import type { EntityId, World } from "./types";

const identities = lifePlaceStateIdentities();
const seed = "a116-recorded-office-age";
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
          office.qualification.minimumAge.kind,
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
    const office = pack?.offices.find(
      (row) =>
        row.qualification.minimumAge.kind === "known" &&
        row.qualification.minimumAge.source.verification === "game-profile",
    );
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
