import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  authoredScenarioSeatCount,
  currentMeasureProvisions,
  deserializeWorld,
  dispositionsFromCounts,
  legislativeBlueprint,
  measureAmendments,
  offerFloorAmendment,
  personName,
  seatBodyForPack,
  serializeWorld,
} from "../simulation";
import {
  campaignUntilDecided,
  fileForOffice,
} from "../../tests/fixtures/campaign-fixture";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectCampaign } from "./campaign-projection";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { applyLegislativeStep } from "./legislation-session";
import { fileBundleDraft } from "./legislation-bundle-docket";
import {
  carryAdoptedBundleComposition,
  previewBundleComposition,
  saveBundleComposition,
  savedBundleComposition,
} from "./legislation-bundle-composition";

/**
 * NATIONWIDE1 section 5, on a measure a seated member actually holds.
 *
 * The question these answer is not whether an edit compiles — the compiler
 * tests cover that — but whether editing one part of a multi-part measure
 * behaves like editing a bill: nothing moves until an adopted amendment says
 * it does, the working copy stays the author's own, a stale comparison is
 * refused rather than merged, and the section that changes is the one the
 * edited component wrote and only that one.
 *
 * The route is the player's own: a character who runs, wins, is seated, files
 * a measure with parts, and walks it to their own floor.
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
  /*
   * Plays through the shared helper rather than the weaker hand-rolled
   * sequence that used to live here: one fundraising afternoon, three outreach
   * afternoons, then sixty idle days. That sequence won only against a single
   * opponent. A contest now opens with two to four, so the idle days lost the
   * race and this fixture reported "lost" — the campaign stopped working, not
   * the measure-editing rules these cases exist to prove. The assertion is
   * unchanged; only the effort that reaches it is, and it is now the same
   * effort every other seated-member fixture uses.
   */
  let world = fileForOffice(openOrdinaryLife(built.world, personId), personId);
  world = campaignUntilDecided(world, personId);
  expect(projectCampaign(world, personId).phase).toBe("won");
  return { world: enterSupportedTerm(world, personId), personId };
}

/** Files a measure with parts and walks it to the member's own floor. */
function packageOnTheFloor() {
  const seat = wonSeat();
  const capabilities = resolvePlayerCapabilities(seat.world);
  const scenarioKey = capabilities.legislativeScenarioKey!;
  const jurisdictionId = capabilities.legislativeJurisdictionId!;

  const filed = fileBundleDraft(seat.world, {
    scenarioKey,
    playerPersonId: seat.personId,
    jurisdictionId,
    subjectRule: "unrestricted",
    components: [
      {
        componentKey: "routes",
        familyKey: "transit-access",
        variantKey: "unserved-county-formula",
        subject: "transit",
      },
      {
        componentKey: "reporting",
        familyKey: "agency-reporting",
        variantKey: "annual-legislative-report",
        subject: "administration",
      },
    ],
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

const EDITS = {
  routes: {
    "formula-addition": {
      kind: "money" as const,
      minorUnits: 900_000_000,
      currency: "USD",
    },
  },
};

function saveInput(staged: ReturnType<typeof packageOnTheFloor>) {
  return {
    scenarioKey: staged.scenarioKey,
    playerPersonId: staged.personId,
    edits: EDITS,
    expectedProvisionIds: currentMeasureProvisions(
      staged.world,
      staged.bill.measureId,
    ).map((provision) => provision.id),
  };
}

describe("editing one part of a measure changes that part and nothing else", () => {
  it("proposes a change only to the sections the edited component wrote", () => {
    const staged = packageOnTheFloor();
    const preview = previewBundleComposition(
      staged.world,
      staged.bill,
      staged.personId,
      EDITS,
    );
    expect(preview.changes.length).toBeGreaterThan(0);
    for (const change of preview.changes) {
      expect(change.componentKey).toBe("routes");
      expect(change.after.provisionKey.startsWith("routes:")).toBe(true);
    }
    // The other part of the measure is untouched by an edit to this one.
    const reporting = preview.proposed.components.find(
      (part) => part.componentKey === "reporting",
    )!;
    const before = preview.baseline.components.find(
      (part) => part.componentKey === "reporting",
    )!;
    expect(reporting.clauses.map((clause) => clause.text)).toEqual(
      before.clauses.map((clause) => clause.text),
    );
  });

  it("writes no section of the measure when a change is only previewed", () => {
    const staged = packageOnTheFloor();
    const before = serializeWorld(staged.world);
    previewBundleComposition(staged.world, staged.bill, staged.personId, EDITS);
    expect(serializeWorld(staged.world)).toBe(before);
  });

  it("keeps a saved working copy private and readable after a reload, with the bill unchanged", () => {
    const staged = packageOnTheFloor();
    const textBefore = currentMeasureProvisions(
      staged.world,
      staged.bill.measureId,
    ).map((provision) => provision.text);
    const saved = saveBundleComposition(
      staged.world,
      staged.bill,
      saveInput(staged),
    );
    // Saving proposes; it does not amend. Every section still reads as filed.
    expect(
      currentMeasureProvisions(saved.world, staged.bill.measureId).map(
        (provision) => provision.text,
      ),
    ).toEqual(textBefore);

    const reloaded = deserializeWorld(serializeWorld(saved.world));
    const read = savedBundleComposition(reloaded, staged.bill, staged.personId);
    expect(read?.routes?.["formula-addition"]).toEqual(
      EDITS.routes["formula-addition"],
    );
    expect(() => assertWorldIntegrity(reloaded)).not.toThrow();
  });

  it("refuses a comparison the measure has moved past, and an unknown component", () => {
    const staged = packageOnTheFloor();
    expect(() =>
      saveBundleComposition(staged.world, staged.bill, {
        ...saveInput(staged),
        expectedProvisionIds: [],
      }),
    ).toThrow(/Review its current text first/);
    expect(() =>
      previewBundleComposition(staged.world, staged.bill, staged.personId, {
        "no-such-part": {
          "formula-addition": {
            kind: "money",
            minorUnits: 900_000_000,
            currency: "USD",
          },
        },
      }),
    ).toThrow(/no 'no-such-part' component/);
  });

  it("carries the text only once an adopted amendment records this working copy", () => {
    const staged = packageOnTheFloor();
    const input = saveInput(staged);
    const saved = saveBundleComposition(staged.world, staged.bill, input);

    // Without an adopted amendment, the working copy stays a working copy.
    expect(() =>
      carryAdoptedBundleComposition(saved.world, staged.bill, {
        ...input,
        proposalEventId: saved.proposalEventId,
        amendmentId: saved.proposalEventId,
      }),
    ).toThrow(/No adopted amendment/);

    const body = staged.procedure.bodies[0]!;
    const voted = offerFloorAmendment(saved.world, {
      stableKey: `bundle-composition-test:${saved.world.history.nextSequence}`,
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
    const carried = carryAdoptedBundleComposition(voted, staged.bill, {
      ...input,
      proposalEventId: saved.proposalEventId,
      amendmentId: amendment.id,
    });

    const after = currentMeasureProvisions(carried, staged.bill.measureId);
    const changed = after.filter((provision) =>
      provision.provisionKey.startsWith("routes:"),
    );
    const unchanged = after.filter((provision) =>
      provision.provisionKey.startsWith("reporting:"),
    );
    expect(
      changed.some((provision) => provision.originAmendmentId !== null),
    ).toBe(true);
    // The other component's sections were never part of this amendment.
    expect(
      unchanged.every((provision) => provision.originAmendmentId === null),
    ).toBe(true);
    // Append-only: the measure still numbers its sections once through and the
    // world loads with the revision in place.
    expect(after.map((provision) => provision.sectionNumber)).toEqual(
      after.map((_, index) => index + 1),
    );
    expect(() => assertWorldIntegrity(carried)).not.toThrow();
  });
});
