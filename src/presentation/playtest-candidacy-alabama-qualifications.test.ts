import { describe, expect, it } from "vitest";

import { candidacyEligibility } from "../simulation";
import {
  assessCandidateQualification,
  candidateQualificationRuleSet,
} from "../simulation/candidate-qualification";
import { makeIsoDate } from "../simulation/dates";
import { chiefExecutiveJurisdictionId } from "../simulation/nationwide-world/government-jurisdiction";
import { stateExecutiveIdentity } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { createExplicitGeographyLife } from "./new-game-geography";

/**
 * Found by playing Eufaula, Alabama: a twenty-two-year-old was told he could
 * stand for Governor, and the state Senate asked for thirty. Alabama's own
 * requirements are thirty for Governor, twenty-five for the Senate and
 * twenty-one for the House, with the residence periods beside them; the game
 * had drawn the Senate's age from other states and held the governorship to
 * its generic adult floor.
 */

/** Eufaula, Alabama. */
const EUFAULA = "0124568";

const AL_HOUSE = "us-al-legislature-profile-v1:house";
const AL_SENATE = "us-al-legislature-profile-v1:senate";
const AL_GOVERNOR = stateExecutiveIdentity("AL")!.officeKey;

function lifeAged(startAge: number) {
  const created = createExplicitGeographyLife({
    placeKey: EUFAULA,
    seed: `alabama-quals-${startAge}`,
    startAge,
    startKind: "normal",
    depth: "begin-adult-life",
  });
  return { world: created.game.world, personId: created.game.playerPersonId };
}

function verdict(startAge: number, officeKey: string) {
  const { world, personId } = lifeAged(startAge);
  return candidacyEligibility(world, {
    personId,
    jurisdictionId:
      officeKey === AL_GOVERNOR
        ? chiefExecutiveJurisdictionId("AL")
        : world.people[personId]!.homeJurisdictionId,
    officeKey,
    alreadyACandidate: false,
  });
}

function kinds(result: ReturnType<typeof verdict>): string[] {
  return result.blocks.map((block) => block.kind);
}

describe("Alabama holds a candidate to its own qualifications", () => {
  it("refuses a 22-year-old the governorship on age", () => {
    const result = verdict(22, AL_GOVERNOR);
    expect(result.eligible).toBe(false);
    expect(kinds(result)).toContain("sourced-minimum-age");
    expect(kinds(result)).not.toContain("below-game-adult-age");
    const reason =
      result.blocks.find((block) => block.kind === "sourced-minimum-age")
        ?.reason ?? "";
    expect(reason).toContain("30");
  });

  it("refuses a 22-year-old the state Senate at 25, not at a drawn age", () => {
    const result = verdict(22, AL_SENATE);
    expect(result.eligible).toBe(false);
    expect(kinds(result)).toContain("sourced-minimum-age");
    expect(kinds(result)).not.toContain("profile-minimum-age");
    // 25 is Alabama's figure; the drawn one was 30, which a 26-year-old fails.
    expect(verdict(26, AL_SENATE).eligible).toBe(true);
  });

  it("admits a 22-year-old to the state House", () => {
    const result = verdict(22, AL_HOUSE);
    expect(result.blocks).toEqual([]);
    expect(result.eligible).toBe(true);
  });

  it("finds a 30-year-old old enough to be Governor", () => {
    const result = verdict(30, AL_GOVERNOR);
    expect(kinds(result)).not.toContain("sourced-minimum-age");
    expect(result.eligible).toBe(true);
  });

  it("says the requirement and nothing about where it came from", () => {
    for (const result of [verdict(22, AL_GOVERNOR), verdict(22, AL_SENATE)]) {
      for (const block of result.blocks) {
        for (const leak of [
          "sourced",
          "sos.alabama",
          "Secretary of State",
          "Const.",
          "http",
          "drawn",
          "profile",
        ]) {
          expect(block.reason).not.toContain(leak);
        }
      }
    }
  });
});

describe("Alabama's residence periods apply through the canonical checker", () => {
  const onDate = makeIsoDate("2026-06-01");
  const birthDate = makeIsoDate("1980-01-01");

  function refusalFields(
    officeKey: string,
    packId: string,
    stateSince: string | null,
    districtSince: string | null,
  ): string[] {
    const rules = candidateQualificationRuleSet(packId, officeKey, onDate);
    expect(rules).not.toBeNull();
    return assessCandidateQualification(rules!, {
      birthDate,
      onDate,
      stateResidenceSince: stateSince === null ? null : makeIsoDate(stateSince),
      districtResidenceSince:
        districtSince === null ? null : makeIsoDate(districtSince),
    }).refusals.map((refusal) => refusal.field);
  }

  it("asks a Governor for seven years in the state and no district", () => {
    const pack = `${AL_GOVERNOR}:candidacy`;
    expect(refusalFields(AL_GOVERNOR, pack, "2019-06-01", null)).toEqual([]);
    expect(refusalFields(AL_GOVERNOR, pack, "2019-06-02", null)).toEqual([
      "stateResidenceYears",
    ]);
  });

  it("asks a legislator for three years in the state and one in the district", () => {
    const pack = "us-al-legislature-profile-v1:candidacy";
    for (const office of [AL_HOUSE, AL_SENATE]) {
      expect(refusalFields(office, pack, "2023-06-01", "2025-06-01")).toEqual(
        [],
      );
      expect(refusalFields(office, pack, "2023-06-02", "2025-06-01")).toEqual([
        "stateResidenceYears",
      ]);
      expect(refusalFields(office, pack, "2023-06-01", "2025-06-02")).toEqual([
        "districtResidenceYears",
      ]);
    }
  });
});
