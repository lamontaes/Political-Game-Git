import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import {
  candidacyPackById,
  judicialCandidacyPackForSeatId,
  judicialElectionOfficeKey,
} from "../candidacy-packs";
import {
  candidacyEligibility,
  electiveOfficesForJurisdiction,
} from "../candidacy";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import { addJudicialCourt, seatJudge } from "./courts";
import { judicialSeatId } from "./types";

describe("judicial campaign authority", () => {
  it("reconstructs an honest judicial pack and offers only an unoccupied statewide seat", () => {
    let world = ensureStateJurisdictionForKey(
      createDemoWorld("ga-judicial-candidacy", { peopleCount: 3 }),
      "US-GA",
    );
    const jurisdictionId = chiefExecutiveJurisdiction("GA")!.id;
    const courtId = "us-ga:highest_court";
    const seatId = judicialSeatId(courtId, 1);
    world = addJudicialCourt(world, {
      courtId,
      jurisdictionId,
      name: "Supreme Court of Georgia",
      level: "local-highest",
      parentCourtId: null,
      sourceRecordId: courtId,
      identityBasis: "sourced",
      geographyDetail: "exact-court",
      createdAt: world.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: 1,
          basis: "game-profile",
          referenceId: "fixture:size",
        },
        termYears: {
          state: "known",
          value: 6,
          basis: "sourced",
          referenceId: courtId,
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: courtId,
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    const kentuckyCourtId = "us-ky:highest_court";
    const kentuckyJurisdictionId = chiefExecutiveJurisdiction("KY")!.id;
    world = addJudicialCourt(world, {
      courtId: kentuckyCourtId,
      jurisdictionId: kentuckyJurisdictionId,
      name: "Supreme Court of Kentucky",
      level: "local-highest",
      parentCourtId: null,
      sourceRecordId: kentuckyCourtId,
      identityBasis: "sourced",
      geographyDetail: "exact-court",
      createdAt: world.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: 1,
          basis: "game-profile",
          referenceId: "fixture:size",
        },
        termYears: {
          state: "known",
          value: 8,
          basis: "sourced",
          referenceId: kentuckyCourtId,
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: kentuckyCourtId,
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    const snapshot = JSON.stringify(world);
    const pack = judicialCandidacyPackForSeatId(seatId)!;
    expect(pack.authorityKind).toBe("judicial");
    expect(pack.legislativeRulePackId).toBeNull();
    expect(candidacyPackById(pack.packId)).toEqual(pack);
    const officeKey = judicialElectionOfficeKey(seatId);
    expect(
      electiveOfficesForJurisdiction(jurisdictionId, world).some(
        (option) => option.officeKey === officeKey,
      ),
    ).toBe(true);
    expect(
      electiveOfficesForJurisdiction(kentuckyJurisdictionId, world).some(
        (option) =>
          option.officeKey ===
          judicialElectionOfficeKey(judicialSeatId(kentuckyCourtId, 1)),
      ),
    ).toBe(false);
    const eligibility = candidacyEligibility(world, {
      personId: world.personOrder[0]!,
      jurisdictionId,
      officeKey,
      alreadyACandidate: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blocks.map((block) => block.reason).join(" ")).toMatch(
      /election date and term start|dated bar admission|elector qualification/i,
    );
    expect(JSON.stringify(world)).toBe(snapshot);

    world = seatJudge(world, {
      seatId,
      personId: world.personOrder[0]!,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "fixture occupied seat",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    expect(
      electiveOfficesForJurisdiction(jurisdictionId, world).some(
        (option) => option.officeKey === officeKey,
      ),
    ).toBe(false);
  });
});
