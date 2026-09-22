import { describe, expect, it } from "vitest";

import { programFamilies } from "../simulation/legislation-program-families";
import {
  bargainingScenePeople,
  PLACE_LABEL,
  type BargainingAdvocateCause,
} from "./legislative-bargaining-brief";
import type { EntityId } from "../simulation";

/**
 * Who is in the room, and whether the room is about this bill.
 *
 * The subject of a generated sitting was already built from the bill on the
 * docket, but the cast reads were not: both routes called one constructor that
 * named Ashland outright, so a broadband bill in Nevada seated an advocate who
 * "represents Ashland and the counties around it". The bill was generated and
 * the politics were borrowed, which is the failure the brief module refuses in
 * every other direction.
 *
 * These hold the reads to their own invitation. The test that matters is not
 * that the word "Ashland" is gone — the transit family's beneficiary really is
 * the Ashland authority — but that a sitting says Ashland only when its own
 * invitation does.
 */

const ADVOCATE = "person:advocate" as EntityId;
const GUARDIAN = "person:guardian" as EntityId;

function scene(cause?: BargainingAdvocateCause) {
  return bargainingScenePeople({
    chamberName: "House of Representatives",
    advocatePersonId: ADVOCATE,
    guardianPersonId: GUARDIAN,
    advocatePriorWork: "none",
    cause,
  });
}

function causeFor(invitation: {
  readonly sectionNumber: number;
  readonly beneficiaryLabel: string;
}): BargainingAdvocateCause {
  return {
    sectionLabel: `Section ${invitation.sectionNumber}`,
    beneficiaryLabel: invitation.beneficiaryLabel,
  };
}

describe("the authored Kentucky sitting keeps the reads it was accepted with", () => {
  it("still names Ashland when no cause is supplied", () => {
    const [advocate] = scene();
    expect(advocate.role).toBe(
      `Represents ${PLACE_LABEL} and the counties around it`,
    );
    expect(advocate.inferredRead).toContain(`what ${PLACE_LABEL} needs`);
  });

  it("does not put a place into the fiscal member's read either way", () => {
    for (const people of [
      scene(),
      scene(
        causeFor({
          sectionNumber: 5,
          beneficiaryLabel: "cooperatives below the customer threshold",
        }),
      ),
    ]) {
      const guardian = people[1];
      expect(guardian.role).toBe(
        "Has said in public what this session can commit",
      );
      expect(guardian.inferredRead).not.toContain(PLACE_LABEL);
    }
  });
});

describe("a generated sitting is about its own bill", () => {
  it("names the section and beneficiary the invitation carries", () => {
    const [advocate] = scene(
      causeFor({
        sectionNumber: 5,
        beneficiaryLabel: "counties that have waited longest for an award",
      }),
    );
    expect(advocate.role).toBe(
      "Wants Section 5 written for counties that have waited longest for an award",
    );
  });

  it("carries the manner without bending a place phrase into a sentence", () => {
    // "statewide" is a real label in the bank and is not a town, so the
    // inferred read states how the member presses rather than what a place
    // needs.
    const [advocate] = scene(
      causeFor({ sectionNumber: 2, beneficiaryLabel: "the smallest systems" }),
    );
    expect(advocate.inferredRead).toBe(
      "Direct about the ask and unembarrassed about making it. You do not know how far they will go for it.",
    );
    expect(advocate.inferredRead).not.toContain(PLACE_LABEL);
  });

  it("keeps the history read, which is about the record and not the bill", () => {
    const cause = causeFor({
      sectionNumber: 4,
      beneficiaryLabel: "the rural electric cooperatives",
    });
    const reads = (["none", "acquaintance", "shared-work"] as const).map(
      (evidence) =>
        bargainingScenePeople({
          chamberName: "Senate",
          advocatePersonId: ADVOCATE,
          guardianPersonId: GUARDIAN,
          advocatePriorWork: evidence,
          cause,
        })[0].qualitativeRead,
    );
    expect(new Set(reads).size).toBe(3);
  });
});

describe("no configuration in the bank borrows another one's politics", () => {
  const variants = programFamilies().flatMap((family) =>
    family.variants.map((variant) => ({
      familyKey: family.familyKey,
      variantKey: variant.variantKey,
      invitation: variant.amendmentInvitation,
    })),
  );

  it("has configurations to check", () => {
    expect(variants.length).toBeGreaterThan(10);
  });

  it("says Ashland only where the invitation itself says it", () => {
    for (const entry of variants) {
      const [advocate] = scene(causeFor(entry.invitation));
      const ownLabelNamesAshland =
        entry.invitation.beneficiaryLabel.includes(PLACE_LABEL);
      const readNamesAshland =
        `${advocate.role} ${advocate.inferredRead}`.includes(PLACE_LABEL);
      expect(
        readNamesAshland,
        `${entry.familyKey}/${entry.variantKey} read: ${advocate.role}`,
      ).toBe(ownLabelNamesAshland);
    }
  });

  it("states every configuration's own beneficiary verbatim", () => {
    for (const entry of variants) {
      const [advocate] = scene(causeFor(entry.invitation));
      expect(advocate.role, `${entry.familyKey}/${entry.variantKey}`).toContain(
        entry.invitation.beneficiaryLabel,
      );
      expect(advocate.role).toContain(
        `Section ${entry.invitation.sectionNumber}`,
      );
    }
  });
});
