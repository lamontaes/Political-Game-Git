import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  introduceMeasure,
  legislativeBlueprint,
  measurePosition,
  serializeWorld,
} from "../simulation";
import type { World } from "../simulation";
import {
  openingMeasureContentKey,
  applyLegislativeCommand,
  legislativeWorkAvailableIn,
  openLegislativeWork,
} from "./legislation-world";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { projectMeasureBriefing } from "./legislation-projection";
import { fileDraft } from "./legislation-docket";

/**
 * A bill belongs to the save it was moved through.
 *
 * The audit found legislation running in a world of its own, kept in its own
 * corner of local storage — so two different lives in the same state shared one
 * bill's history, and a player's own save had no record of the work they did.
 */

const BASE: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

function staffer(seed: string, placeKey = "kentucky") {
  const game = createNewGameWorld({ ...BASE, placeKey, seed });
  const capabilities = resolvePlayerCapabilities(game.world);
  return { ...game, capabilities };
}

let seatFixture: ReturnType<typeof suppliedLegislativeSeat> | undefined;
function recorded(stableKey = "recorded-member-bill") {
  const seat = (seatFixture ??= suppliedLegislativeSeat("US-KY", "house"));
  const blueprint = legislativeBlueprint("kentucky");
  const world = introduceMeasure(seat.world, {
    stableKey,
    jurisdictionId: seat.jurisdictionId,
    rulePackId: seat.packId,
    designation: "HB 1",
    shortTitle: blueprint.shortTitle,
    summary: blueprint.summary,
    origin: "member-introduction",
    subjectClass: blueprint.subjectClass,
    originChamberKey: "house",
    sponsorPersonId: seat.personId,
  });
  return {
    ...seat,
    world,
    measure: world.history.legislativeMeasures!.at(-1)!,
    input: {
      scenarioKey: "kentucky",
      playerPersonId: seat.personId,
      jurisdictionId: seat.jurisdictionId,
    },
  };
}

describe("Legislative work reads recorded measures and seated members", () => {
  it("opens an eligible measure without creating a bill, person or outcome", () => {
    const ready = recorded();
    const before = serializeWorld(ready.world);
    const opened = openLegislativeWork(ready.world, ready.input);
    expect(opened.world).toBe(ready.world);
    expect(serializeWorld(opened.world)).toBe(before);
    expect(opened.assignment.measureId).toBe(ready.measure.id);
    expect(opened.assignment.sponsorPersonId).toBe(ready.personId);
    expect(opened.assignment.procedure.votePlan).toEqual({});
    expect(opened.assignment.procedure.governorAction).toBeNull();
  });

  it("keeps the recorded measure and source through save and reload", () => {
    const ready = recorded();
    const loaded = deserializeWorld(serializeWorld(ready.world));
    const reopened = openLegislativeWork(loaded, ready.input);
    expect(reopened.world).toBe(loaded);
    expect(reopened.assignment.measureId).toBe(ready.measure.id);
    expect(reopened.world.history.legislativeMeasures).toEqual(
      ready.world.history.legislativeMeasures,
    );
  });

  it("preserves an older saved office bill's identity and authored procedure", () => {
    const ready = recorded("legislative-work:kentucky:measure");
    const opened = openLegislativeWork(ready.world, ready.input);
    expect(opened.world).toBe(ready.world);
    expect(opened.assignment.measureId).toBe(ready.measure.id);
    expect(opened.assignment.scenarioKey).toBe("kentucky");
    expect(
      openingMeasureContentKey(ready.world, {
        ...ready.input,
        filed: ready.measure,
      }),
    ).toBe("kentucky");
  });

  it("keeps a saved office bill's recorded step through reopening", () => {
    const ready = recorded("legislative-work:kentucky:measure");
    const opened = openLegislativeWork(ready.world, ready.input);
    const moved = applyLegislativeCommand(ready.world, opened.assignment, {
      kind: "take-step",
      step: "request-referral",
    }).world;
    const loaded = deserializeWorld(serializeWorld(moved));
    const reopened = openLegislativeWork(loaded, ready.input);
    expect(reopened.world).toBe(loaded);
    expect(reopened.assignment.measureId).toBe(ready.measure.id);
    expect(measurePosition(loaded, ready.measure.id).phase).toBe(
      measurePosition(moved, ready.measure.id).phase,
    );
    expect(loaded.history.legislativeReferrals).toEqual(
      moved.history.legislativeReferrals,
    );
  });

  it("does not fabricate an opening bill when the actual docket is empty", () => {
    const ready = recorded();
    const empty = seatFixture!.world;
    const before = serializeWorld(empty);
    expect(() => openLegislativeWork(empty, ready.input)).toThrow(
      /No pending measure with a currently seated sponsor/,
    );
    expect(serializeWorld(empty)).toBe(before);
  });

  it.each(["existing-unseated", null])(
    "rejects an unseated sponsor %s without creating a replacement",
    (sponsorPersonId) => {
      const ready = recorded();
      const world: World = {
        ...ready.world,
        history: {
          ...ready.world.history,
          legislativeMeasures: [
            {
              ...ready.measure,
              sponsorPersonId:
                sponsorPersonId === null
                  ? null
                  : ready.world.personOrder.find(
                      (id) => id !== ready.personId,
                    )!,
            },
          ],
        },
      };
      const before = serializeWorld(world);
      expect(() => openLegislativeWork(world, ready.input)).toThrow(
        /No pending measure with a currently seated sponsor/,
      );
      expect(serializeWorld(world)).toBe(before);
    },
  );

  it("rejects a measure whose sponsor is seated in the other chamber", () => {
    const ready = recorded();
    const world: World = {
      ...ready.world,
      history: {
        ...ready.world.history,
        legislativeMeasures: [{ ...ready.measure, originChamberKey: "senate" }],
      },
    };
    expect(() => openLegislativeWork(world, ready.input)).toThrow(
      /No pending measure with a currently seated sponsor/,
    );
  });

  it("offers only work belonging to the character's legislature", () => {
    const ready = recorded();
    expect(legislativeWorkAvailableIn(ready.jurisdictionId)).toContain(
      "kentucky",
    );
    expect(() =>
      openLegislativeWork(ready.world, {
        ...ready.input,
        scenarioKey: "nebraska",
      }),
    ).toThrow(/No active supported member seat matches/);
  });
});

describe("a bill says which catalog question it bears on", () => {
  it("links a drafted bill only where its configuration fits a shipped question", () => {
    const { world, playerPersonId, capabilities } = staffer("bears-on-draft");
    const draft = (variantKey: string, at: World) =>
      fileDraft(at, {
        scenarioKey: "kentucky",
        playerPersonId,
        jurisdictionId: capabilities.legislativeJurisdictionId!,
        familyKey: "transit-access",
        variantKey,
      });
    const relief = draft("enrollment-fare-relief", world);
    const formula = draft("unserved-county-formula", relief.world);
    expect(
      projectMeasureBriefing(formula.world, relief.bill.measureId).questions,
    ).toEqual(["Should local transit be free to ride?"]);
    // The formula extension decides nothing a shipped question asks, and is
    // left unlinked rather than pinned to the nearest-sounding one.
    expect(
      projectMeasureBriefing(formula.world, formula.bill.measureId).questions,
    ).toEqual([]);
  });

  it("files unlinked in a world whose catalog does not hold the question", () => {
    const { world, playerPersonId, capabilities } = staffer("bears-on-older");
    // A catalog is fixed when its world is made, so a save from before the
    // positions shipped holds none of them. Emptied here, the rest intact.
    const positions = new Set(
      Object.values(world.policyCatalog.propositions)
        .filter((p) => p.stableKey.startsWith("us-policy-positions:"))
        .map((p) => p.id),
    );
    expect(positions.size).toBeGreaterThan(0);
    const older: World = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        propositions: Object.fromEntries(
          Object.entries(world.policyCatalog.propositions).filter(
            ([id]) => !positions.has(id),
          ),
        ),
        propositionOrder: world.policyCatalog.propositionOrder.filter(
          (id) => !positions.has(id),
        ),
      },
    };
    const filed = fileDraft(older, {
      scenarioKey: "kentucky",
      playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
      familyKey: "transit-access",
      variantKey: "enrollment-fare-relief",
    });
    expect(
      filed.world.history.legislativeMeasures!.find(
        (measure) => measure.id === filed.bill.measureId,
      )!.propositionIds,
    ).toEqual([]);
  });
});
