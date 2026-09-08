import { describe, expect, it } from "vitest";

import {
  currentMeasureProvisions,
  deserializeWorld,
  measureAmendments,
  serializeWorld,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { applyLegislativeStep } from "./legislation-session";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { offerNegotiatedAmendment } from "./legislative-bargaining-actions";
import { fileDraft, readDocket } from "./legislation-docket";
import { programConfigurations } from "../simulation/legislation-program-families";
import { compileBillDraft } from "../simulation/legislation-drafting";
import { bargainingSubjectFactsForDraft } from "./legislative-bargaining-brief";
import {
  legislativeBlueprint,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
} from "../simulation";

/**
 * The bargaining that already exists, about a bill it was not written for.
 *
 * The accepted sitting could only ever be about a transit local match: the
 * amendment action reached past its own facts to module constants naming a
 * transit authority in Ashland. The politics were general; only the producer
 * was hard-wired. These tests hold the generalisation to its claim — that a
 * broadband bill is bargained over broadband — through the ordinary player
 * route, with the accepted authority guards intact.
 */

function wonSeat() {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "leg-content1-family-bargaining",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  let world = fileForOffice(openOrdinaryLife(built.world, personId), personId);
  world = spendAnAfternoon(world, personId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = passOrdinaryDays(world);
    world = spendAnAfternoon(world, personId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, personId).phase === "active";
    day += 1
  ) {
    world = passOrdinaryDays(world);
  }
  expect(projectCampaign(world, personId).phase).toBe("won");
  return { world, personId };
}

/** Files a docket bill and walks it to the member's own floor. */
function billOnTheFloor(familyKey: string, variantKey: string) {
  const seat = wonSeat();
  const capabilities = resolvePlayerCapabilities(seat.world);
  const scenarioKey = capabilities.legislativeScenarioKey!;
  const jurisdictionId = capabilities.legislativeJurisdictionId!;

  const filed = fileDraft(seat.world, {
    scenarioKey,
    playerPersonId: seat.personId,
    jurisdictionId,
    familyKey,
    variantKey,
  });

  const blueprint = legislativeBlueprint(scenarioKey);
  let world = filed.world;
  const procedure = {
    pack: blueprint.pack,
    measureId: filed.bill.measureId,
    bodies: blueprint.pack.chambers.map((chamber, index) =>
      seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
        index === 0
          ? [
              {
                personId: seat.personId,
                name: personName(world.people[seat.personId]!),
              },
            ]
          : [],
        blueprint.nonpartisan,
      ),
    ),
    committeeMemberCount:
      blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
    votePlan: blueprint.votePlan,
    governorAction: blueprint.governorAction,
    governorRationale: blueprint.governorRationale,
  };
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeStep(procedure, world, step).world;
  }
  return {
    world,
    personId: seat.personId,
    scenarioKey,
    bill: filed.bill,
  };
}

describe("a sitting is about the bill that is actually on the floor", () => {
  it("opens bargaining on a broadband bill with broadband facts", () => {
    const staged = billOnTheFloor("broadband-access", "unserved-buildout");
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    const facts = entry.seat.progress.subjectFacts;
    expect(facts.designation).toBe(staged.bill.designation);
    expect(facts.shortTitle).toBe("Unserved Area Buildout");
    // The narrower section under discussion is this family's own ask.
    expect(facts.requestedProvisionKey).toBe("cooperative-award-preference");
    expect(facts.requestedBeneficiaryLabel).toContain("cooperative");
    expect(facts.requestedSegmentKey).toBe(
      "broadband.cooperative-award-preference",
    );
    // Nothing transit remains anywhere in what the sitting is about.
    const everything = JSON.stringify(facts);
    expect(everything).not.toMatch(/Ashland|transit|local match/i);
  });

  it("refuses a docket key that is not on this character's docket", () => {
    const staged = billOnTheFloor("broadband-access", "unserved-buildout");
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: "legislative-docket:kentucky:bill-099",
    });
    expect(entry.kind).toBe("unavailable");
    if (entry.kind === "unavailable") {
      expect(entry.reason).toMatch(/not on this character's docket/);
    }
  });
});

describe("an adopted amendment revises the bill it belongs to", () => {
  it("writes this family's section, not a transit local match", () => {
    const staged = billOnTheFloor("broadband-access", "unserved-buildout");
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    const result = offerNegotiatedAmendment(
      entry.world,
      entry.seat,
      entry.seat.progress,
      "as-asked",
    );

    const amendments = measureAmendments(result.world, staged.bill.measureId);
    expect(amendments).toHaveLength(1);
    expect(amendments[0]!.description).toContain(
      "Preference for cooperative applicants",
    );

    // The Kentucky pack's authored amendment counts carry it, so this is a
    // deterministic adoption rather than a branch on either outcome.
    expect(result.adopted).toBe(true);
    const provisions = currentMeasureProvisions(
      result.world,
      staged.bill.measureId,
    );
    const added = provisions.find(
      (record) => record.provisionKey === "cooperative-award-preference",
    );
    expect(added).toBeDefined();
    expect(added!.text).toContain("organized as cooperatives");
    expect(added!.applicationScope.segmentKey).toBe(
      "broadband.cooperative-award-preference",
    );
    expect(added!.beneficiary.kind).toBe("particularized");
    // The bill's own sections survive the amendment, unrewritten.
    expect(
      provisions.some((record) => record.provisionKey === "eligible-areas"),
    ).toBe(true);
    expect(
      provisions.some((record) => record.provisionKey === "service-standard"),
    ).toBe(true);
  });

  it("keeps the amended bill through a save and a reload", () => {
    const staged = billOnTheFloor("water-service-lines", "funded-replacement");
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    const result = offerNegotiatedAmendment(
      entry.world,
      entry.seat,
      entry.seat.progress,
      "capped",
    );
    const reloaded = deserializeWorld(serializeWorld(result.world));
    expect(
      measureAmendments(reloaded, staged.bill.measureId).map(
        (record) => record.stableKey,
      ),
    ).toEqual(
      measureAmendments(result.world, staged.bill.measureId).map(
        (record) => record.stableKey,
      ),
    );
    expect(
      readDocket(reloaded, {
        scenarioKey: staged.scenarioKey,
        playerPersonId: staged.personId,
      }),
    ).toHaveLength(1);
  });
});

describe("every configuration produces a sitting about itself", () => {
  it("gives each of the eight configurations its own requested section", () => {
    const keys = programConfigurations().map((configuration) => {
      const draft = compileBillDraft({
        familyKey: configuration.familyKey,
        variantKey: configuration.variantKey,
        scenarioKey: "kentucky",
        jurisdictionId: "jurisdiction_test" as never,
        rulePackId: "us-ky-general-assembly",
        designation: "HB 401",
        filedOn: "2026-01-14" as never,
      });
      const facts = bargainingSubjectFactsForDraft({
        draft,
        measureId: "legislative-measure_test" as never,
        measureStableKey: "test",
        chamberName: "House",
        nextStepLabel: "final passage",
        fiscalNoteEventStableKey: "test:note",
        analystPersonId: "person_a" as never,
        advocatePersonId: "person_b" as never,
        guardianPersonId: "person_c" as never,
      });
      return facts.requestedProvisionKey;
    });
    expect(new Set(keys).size).toBe(8);
  });

  it("says a mandate commits nothing rather than showing it as zero", () => {
    const draft = compileBillDraft({
      familyKey: "water-service-lines",
      variantKey: "inventory-and-plan",
      scenarioKey: "kentucky",
      jurisdictionId: "jurisdiction_test" as never,
      rulePackId: "us-ky-general-assembly",
      designation: "HB 401",
      filedOn: "2026-01-14" as never,
    });
    const facts = bargainingSubjectFactsForDraft({
      draft,
      measureId: "legislative-measure_test" as never,
      measureStableKey: "test",
      chamberName: "House",
      nextStepLabel: "final passage",
      fiscalNoteEventStableKey: "test:note",
      analystPersonId: "person_a" as never,
      advocatePersonId: "person_b" as never,
      guardianPersonId: "person_c" as never,
    });
    expect(facts.billAmountLabel).toBe(
      "nothing; this Act appropriates no money",
    );
    expect(facts.billAmountLabel).not.toContain("$0");
    // With no funding section, the sitting is about the bill's duty instead.
    expect(facts.programProvisionKey).toBe("plan-contents");
  });
});

describe("the docket bill's sitting keeps the accepted write boundary", () => {
  it("never seeds the authored transit text onto a docket bill", () => {
    const staged = billOnTheFloor(
      "bridge-maintenance",
      "worst-first-condition",
    );
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    const provisions = currentMeasureProvisions(
      entry.world,
      staged.bill.measureId,
    );
    expect(
      provisions.some(
        (record) => record.provisionKey === "pilot-support-limit",
      ),
    ).toBe(false);
    expect(
      provisions.some(
        (record) => record.provisionKey === "eligible-structures",
      ),
    ).toBe(true);
  });

  it("opens twice without writing a second copy of anything", () => {
    const staged = billOnTheFloor("transit-access", "unserved-county-formula");
    const first = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(first.kind).toBe("available");
    if (first.kind !== "available") return;
    const second = openLegislativeBargaining(first.world, {
      playerPersonId: staged.personId,
      docketKey: staged.bill.docketKey,
    });
    expect(second.kind).toBe("available");
    if (second.kind !== "available") return;
    // Re-entry is idempotent: the second open leaves the world byte-identical.
    expect(serializeWorld(second.world)).toEqual(serializeWorld(first.world));
  });
});
