import { describe, expect, it } from "vitest";
import {
  offerFloorAmendment,
  dispositionsFromCounts,
  currentMeasureProvisions,
  deserializeWorld,
  measureAmendments,
  serializeWorld,
  assertWorldIntegrity,
  legislativeBlueprint,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { applyLegislativeStep } from "./legislation-session";
import { fileDraftFromOffice, readDocket } from "./legislation-docket";
import {
  currentCompositionDraft,
  previewBillComposition,
  saveBillComposition,
  savedBillComposition,
  carryAdoptedBillComposition,
} from "./legislation-composition";

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

  const filed = fileDraftFromOffice(seat.world, {
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
    procedure,
  };
}

const edits = {
  "programme-ceiling": {
    kind: "money",
    minorUnits: 500_000_000,
    currency: "USD",
  },
  "operative-choice": { kind: "enumerated", value: "prevent-closure" },
} as const;
function input(staged: ReturnType<typeof billOnTheFloor>) {
  return {
    scenarioKey: staged.scenarioKey,
    docketKey: staged.bill.docketKey,
    playerPersonId: staged.personId,
    parameterValues: edits,
    expectedProvisionIds: currentMeasureProvisions(
      staged.world,
      staged.bill.measureId,
    ).map((p) => p.id),
  };
}

/** Synthetic procedure record supplied by the existing authored fixture, not a forecast. */
function adoptFixture(
  staged: ReturnType<typeof billOnTheFloor>,
  editInput = input(staged),
) {
  const saved = saveBillComposition(staged.world, editInput);
  const body = staged.procedure.bodies[0]!;
  const voted = offerFloorAmendment(saved.world, {
    stableKey: `composition-test:${saved.world.history.nextSequence}`,
    measureId: staged.bill.measureId,
    description: "The saved proposed changes.",
    offeredByPersonId: staged.personId,
    offeredByLabel: "Fixture member",
    dispositions: dispositionsFromCounts(
      body.members,
      staged.procedure.votePlan["amendment:house"]!,
    ),
    presentMembers: body.members.length,
    electedMembers: body.members.length,
    provenance: {
      method: "authored-fixture",
      note: "Existing fixture procedure; no forecast.",
      sourceEntityIds: [saved.proposalEventId],
    },
  });
  const amendment = measureAmendments(voted, staged.bill.measureId).at(-1)!;
  return {
    world: carryAdoptedBillComposition(voted, {
      ...editInput,
      proposalEventId: saved.proposalEventId,
      amendmentId: amendment.id,
    }),
    adopted: amendment.status === "adopted",
  };
}

describe("typed changes to a filed bill", () => {
  it("previews compatible changes without writes, then adopts one package and preserves filed text", () => {
    const staged = billOnTheFloor(
      "education-facilities",
      "school-repair-authorization",
    );
    const before = serializeWorld(staged.world);
    const original = currentMeasureProvisions(
      staged.world,
      staged.bill.measureId,
    );
    const preview = previewBillComposition(
      staged.world,
      staged.bill,
      staged.personId,
      edits,
    );
    expect(preview.changes).toHaveLength(2);
    expect(serializeWorld(staged.world)).toBe(before);
    const result = adoptFixture(staged);
    expect(result.adopted).toBe(true);
    const amendments = measureAmendments(result.world, staged.bill.measureId);
    expect(amendments).toHaveLength(1);
    const current = currentMeasureProvisions(
      result.world,
      staged.bill.measureId,
    );
    expect(
      current.filter((p) => p.originAmendmentId === amendments[0]!.id),
    ).toHaveLength(2);
    expect(
      current.find((p) => p.provisionKey.endsWith("programme-ceiling"))
        ?.fiscalExposureMinorUnits,
    ).toBe(500_000_000);
    for (const section of original)
      expect(result.world.history.legislativeProvisions).toContainEqual(
        section,
      );
    expect(result.world.history.legislativeDraftLineages).toEqual(
      staged.world.history.legislativeDraftLineages,
    );
    expect(result.world.currentDate).toBe(staged.world.currentDate);
    expect(result.world.history.policyEstimates).toEqual(
      staged.world.history.policyEstimates,
    );
    expect(result.world.history.events.at(-1)?.visibility).toBe("private");
    expect(serializeWorld(staged.world)).toBe(before);
    assertWorldIntegrity(result.world);
  });

  it("reloads adopted choices and supports a later edit without undoing the earlier one", () => {
    const staged = billOnTheFloor(
      "education-facilities",
      "school-repair-authorization",
    );
    const first = adoptFixture(staged);
    const world = deserializeWorld(serializeWorld(first.world));
    const bill = readDocket(world, {
      scenarioKey: staged.scenarioKey,
      playerPersonId: staged.personId,
    }).find((b) => b.docketKey === staged.bill.docketKey)!;
    expect(
      currentCompositionDraft(world, bill, staged.personId).parameterValues,
    ).toMatchObject(edits);
    const parameterValues = {
      "programme-ceiling": {
        kind: "money",
        minorUnits: 400_000_000,
        currency: "USD",
      },
    } as const;
    const preview = previewBillComposition(
      world,
      bill,
      staged.personId,
      parameterValues,
    );
    expect(preview.changes).toHaveLength(1);
    const second = adoptFixture(
      { ...staged, world, bill },
      {
        ...input(staged),
        parameterValues,
        expectedProvisionIds: currentMeasureProvisions(
          world,
          bill.measureId,
        ).map((p) => p.id),
      },
    );
    expect(second.adopted).toBe(true);
    expect(
      currentCompositionDraft(second.world, bill, staged.personId)
        .parameterValues,
    ).toMatchObject({ ...edits, ...parameterValues });
    expect(measureAmendments(second.world, bill.measureId)).toHaveLength(2);
    assertWorldIntegrity(second.world);
  });

  it("refuses stale comparisons, unknown parameters and no-op offers without writing", () => {
    const staged = billOnTheFloor(
      "education-facilities",
      "school-repair-authorization",
    );
    const before = serializeWorld(staged.world);
    expect(() =>
      saveBillComposition(staged.world, {
        ...input(staged),
        expectedProvisionIds: [],
      }),
    ).toThrow(/changed after/);
    expect(() =>
      saveBillComposition(staged.world, {
        ...input(staged),
        parameterValues: {},
      }),
    ).toThrow(/at least one/);
    expect(() =>
      previewBillComposition(staged.world, staged.bill, staged.personId, {
        invented: { kind: "boolean", value: true },
      }),
    ).toThrow();
    expect(serializeWorld(staged.world)).toBe(before);
  });

  it("saves a private comparison without changing bill text or recording a vote", () => {
    const staged = billOnTheFloor(
      "education-facilities",
      "school-repair-authorization",
    );
    const saved = saveBillComposition(staged.world, input(staged));
    expect(saved.world.history.legislativeVotes).toEqual(
      staged.world.history.legislativeVotes,
    );
    expect(
      currentMeasureProvisions(saved.world, staged.bill.measureId),
    ).toEqual(currentMeasureProvisions(staged.world, staged.bill.measureId));
    expect(saved.world.currentDate).toBe(staged.world.currentDate);
    const restored = deserializeWorld(serializeWorld(saved.world));
    expect(
      savedBillComposition(restored, staged.bill, staged.personId),
    ).toMatchObject(edits);
    const before = serializeWorld(restored);
    expect(() =>
      carryAdoptedBillComposition(restored, {
        ...input(staged),
        proposalEventId: saved.proposalEventId,
        amendmentId: staged.bill.measureId,
      }),
    ).toThrow(/No adopted amendment/);
    expect(serializeWorld(restored)).toBe(before);
  });

  it("files in the actual member's name and refuses ordinary filing without an office", () => {
    const staged = billOnTheFloor(
      "education-facilities",
      "school-repair-authorization",
    );
    expect(staged.bill.sponsorPersonId).toBe(staged.personId);
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "no-office-filing",
    });
    const before = serializeWorld(built.world);
    expect(() =>
      fileDraftFromOffice(built.world, {
        scenarioKey: staged.scenarioKey,
        jurisdictionId: staged.bill.jurisdictionId,
        playerPersonId: built.playerPersonId,
        familyKey: staged.bill.familyKey,
        variantKey: staged.bill.variantKey,
      }),
    ).toThrow(/no active office/);
    expect(serializeWorld(built.world)).toBe(before);
  });
});
