import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  introduceMeasure,
  legislativeBlueprint,
  legislativeScenarioKeysForPlace,
  nextMeasureDesignation,
  serializeWorld,
} from "../simulation";
import { LEGISLATIVE_RULE_PACKS } from "../simulation/legislature-rule-packs";
import { chamberByKey } from "../simulation/legislature-rules";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import {
  openingMeasureContentKey,
  openLegislativeWork,
} from "./legislation-world";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * DIRECTOR42 ROLE B — a bill is this world's, not the bank's.
 *
 * Production used to copy an authored scenario's designation onto the measure
 * it filed, so every Kentucky life in every save opened on "HB 214" and a
 * screen could be written expecting that literal to be there. These are the
 * acceptance proofs for removing that: what a fresh life gets now comes from
 * the world it is lived in, an old save keeps exactly what it was played with,
 * and the developer fixture stays where it is.
 */

const BASE: Omit<NewGameSetup, "seed" | "placeKey"> = {
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

/** One ordinary new life, opened on the bill its office is carrying. */
function ordinaryLife(seed: string, placeKey: string) {
  const game = createNewGameWorld({ ...BASE, placeKey, seed });
  const capabilities = resolvePlayerCapabilities(game.world);
  const jurisdictionId = capabilities.legislativeJurisdictionId;
  if (!jurisdictionId)
    throw new Error(`${placeKey} seats no legislative work.`);
  const scenarioKey = capabilities.legislativeScenarioKey;
  if (!scenarioKey) throw new Error(`${placeKey} has no legislative surface.`);
  const opened = openLegislativeWork(game.world, {
    scenarioKey,
    playerPersonId: game.playerPersonId,
    jurisdictionId,
  });
  const measure = opened.world.history.legislativeMeasures.find(
    (record) => record.id === opened.assignment.measureId,
  );
  if (!measure) throw new Error("The opened bill is not in the world.");
  return { ...opened, measure, jurisdictionId, scenarioKey, game };
}

/**
 * Seeds whose Kentucky lives differ.
 *
 * Named rather than searched for at run time: a test that hunts for a seed that
 * makes it pass proves only that one exists.
 */
const SEED_A = "dehardwire-seed-a";
const SEED_B = "dehardwire-seed-b";

describe("the opening measure comes from the world, not from a literal", () => {
  it("does not hand two different lives the same bill", () => {
    const a = ordinaryLife(SEED_A, "kentucky");
    const b = ordinaryLife(SEED_B, "kentucky");

    expect(a.game.world.seed).not.toBe(b.game.world.seed);
    // Same legislature, same rules, different bill: the identity a player sees
    // is a fact about their own world.
    expect(a.measure.designation).not.toBe(b.measure.designation);
  });

  it("replays a seed exactly", () => {
    const first = ordinaryLife(SEED_A, "kentucky");
    const again = ordinaryLife(SEED_A, "kentucky");

    expect(again.measure.designation).toBe(first.measure.designation);
    expect(again.measure.shortTitle).toBe(first.measure.shortTitle);
    expect(again.measure.id).toBe(first.measure.id);
    expect(again.assignment.procedure.votePlan).toEqual(
      first.assignment.procedure.votePlan,
    );
  });

  it("numbers the bill in the origin chamber of the legislature it is filed in", () => {
    const kentucky = ordinaryLife(SEED_A, "kentucky");
    expect(kentucky.measure.designation).toMatch(/^HB \d+$/);
    expect(kentucky.measure.originChamberKey).toBe("house");

    // A named ordinary start that is not Kentucky, exercised the same way.
    const nebraska = ordinaryLife(SEED_A, "nebraska");
    expect(nebraska.measure.designation).toMatch(/^LB \d+$/);
    expect(nebraska.measure.originChamberKey).toBe("legislature");
  });

  it("gives a second bill in the same chamber its own number", () => {
    const first = ordinaryLife(SEED_A, "kentucky");
    const kentucky = LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === "US-KY",
    )!;
    const second = nextMeasureDesignation(first.world, {
      jurisdictionId: first.jurisdictionId,
      originChamber: chamberByKey(kentucky, "house"),
    });
    expect(second).not.toBe(first.measure.designation);
    expect(second).toMatch(/^HB \d+$/);
  });

  it("needs no route through HB 214 to open ordinary legislative work", () => {
    // Every named ordinary start that seats legislative work, opened the way a
    // player opens it. None of them may depend on the authored literal.
    for (const placeKey of ["kentucky", "nebraska", "alaska"]) {
      for (const seed of [SEED_A, SEED_B, "dehardwire-seed-c"]) {
        const life = ordinaryLife(seed, placeKey);
        expect(life.measure.designation.trim().length).toBeGreaterThan(0);
        expect(life.measure.designation).not.toBe("HB 214");
      }
    }
  });
});

describe("save, reopen and carry on", () => {
  it("reopens the same bill without rerolling it", () => {
    const opened = ordinaryLife(SEED_A, "kentucky");

    const reloaded = deserializeWorld(serializeWorld(opened.world));
    const again = openLegislativeWork(reloaded, {
      scenarioKey: opened.scenarioKey,
      playerPersonId: resolvePlayerCapabilities(reloaded).personId,
      jurisdictionId: opened.jurisdictionId,
    });

    expect(again.assignment.measureId).toBe(opened.assignment.measureId);
    // Reopening files nothing: the bill is found where it was left.
    expect(again.world.history.legislativeMeasures).toHaveLength(
      opened.world.history.legislativeMeasures.length,
    );
    const measure = again.world.history.legislativeMeasures.find(
      (record) => record.id === again.assignment.measureId,
    );
    expect(measure?.designation).toBe(opened.measure.designation);
    expect(measure?.shortTitle).toBe(opened.measure.shortTitle);
    // The selected authored entry comes back too, so the procedure a player
    // was part way through is the one they continue.
    expect(again.assignment.procedure.votePlan).toEqual(
      opened.assignment.procedure.votePlan,
    );
  });
});

describe("a save written before any of this", () => {
  it("keeps the bill it was played with, and its procedure", () => {
    const game = createNewGameWorld({
      ...BASE,
      placeKey: "kentucky",
      seed: SEED_B,
    });
    const capabilities = resolvePlayerCapabilities(game.world);
    const jurisdictionId = capabilities.legislativeJurisdictionId!;
    const authored = legislativeBlueprint("kentucky");

    // Exactly what the old production path wrote: the authored designation and
    // short title, at the stable key that path used.
    const old = introduceMeasure(game.world, {
      stableKey: "legislative-work:kentucky:measure",
      jurisdictionId,
      rulePackId: authored.pack.packId,
      designation: authored.authoredDesignation,
      shortTitle: authored.shortTitle,
      summary: authored.summary,
      origin: "member-introduction",
      subjectClass: authored.subjectClass,
    });

    const reopened = openLegislativeWork(old, {
      scenarioKey: "kentucky",
      playerPersonId: game.playerPersonId,
      jurisdictionId,
    });
    const measure = reopened.world.history.legislativeMeasures.find(
      (record) => record.id === reopened.assignment.measureId,
    );

    expect(measure?.designation).toBe("HB 214");
    expect(measure?.shortTitle).toBe("Transit Access Pilot");
    // No second bill was filed alongside the one already there.
    expect(reopened.world.history.legislativeMeasures).toHaveLength(1);
    // And the authored entry recovered from the filed bill is the one whose
    // votes and governor this save was always going to get.
    expect(reopened.assignment.procedure.votePlan).toEqual(authored.votePlan);
    expect(reopened.assignment.procedure.governorRationale).toBe(
      authored.governorRationale,
    );
  });
});

describe("the authored bank", () => {
  it("still holds its written measures, and production does not copy them", () => {
    const keys = legislativeScenarioKeysForPlace(
      legislativeBlueprint("kentucky").context.jurisdiction.id,
    );
    // Authored content is preserved: this is a content bank, not a blank.
    expect(keys.length).toBeGreaterThan(1);
    for (const key of keys) {
      const blueprint = legislativeBlueprint(key);
      expect(blueprint.authoredDesignation.trim().length).toBeGreaterThan(0);
      expect(blueprint.shortTitle.trim().length).toBeGreaterThan(0);
      // The production projection exposes no `designation`, so a production
      // path cannot copy one onto a measure even by accident.
      expect("designation" in blueprint).toBe(false);
    }
  });

  it("chooses a world's opening measure from the eligible authored entries", () => {
    const game = createNewGameWorld({
      ...BASE,
      placeKey: "kentucky",
      seed: SEED_A,
    });
    const jurisdictionId = resolvePlayerCapabilities(
      game.world,
    ).legislativeJurisdictionId!;
    const chosen = openingMeasureContentKey(game.world, {
      scenarioKey: "kentucky",
      jurisdictionId,
    });
    expect(legislativeScenarioKeysForPlace(jurisdictionId)).toContain(chosen);
  });
});

describe("the institutional work route", () => {
  /**
   * The nationwide route composed in #255 files its measure through the same
   * producer, from a seated member's own chamber. It carried `designation:
   * "WORK 1"` — the HB 214 defect generalized, one fixed bill identity for
   * every registered legislature — which the `authoredDesignation` rename
   * caught the moment the two were composed.
   */
  it("names no bill in its template, so no world can be handed one", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const blueprint = legislativeBlueprint(`institution:${pack.packId}`);
      expect(blueprint.authoredDesignation).toBeNull();
      expect(blueprint.pack.packId).toBe(pack.packId);
    }
  });

  it("can number a bill in every chamber a registered legislature has", () => {
    // Template compatibility against the registry, not a hand-kept list: a
    // member filing in any registered chamber gets a number, not an error.
    const world = createNewGameWorld({
      ...BASE,
      placeKey: "kentucky",
      seed: SEED_A,
    }).world;
    const jurisdictionId =
      resolvePlayerCapabilities(world).legislativeJurisdictionId!;
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      for (const chamber of pack.chambers) {
        const designation = nextMeasureDesignation(world, {
          jurisdictionId,
          originChamber: chamber,
        });
        expect(designation, `${pack.packId}/${chamber.chamberKey}`).toMatch(
          /^[A-Z]{2,4} \d+$/,
        );
      }
    }
  });
});
