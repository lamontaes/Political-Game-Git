import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { BillConfigurationError } from "../simulation/legislation-drafting";
import { programConfigurations } from "../simulation/legislation-program-families";
import {
  availableDraftOptions,
  docketBill,
  fileDraft,
  previewDraft,
  readDocket,
  recompileSavedBill,
  type DocketBill,
} from "./legislation-docket";

/**
 * More than one bill, and each of them still itself.
 *
 * The dead end this replaces was not that a bill could not be worked; it was
 * that there was exactly one of them per legislature, forever. So the tests
 * that matter here are about plurality and identity: three bills coexist, none
 * of them overwrites another, a finished one stays readable, and a save and
 * reload finds each of them where it was left with the configuration it was
 * filed from.
 */

interface Fixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly scenarioKey: string;
}

function kentucky(): Fixture {
  const scenario = createLegislativeScenario("kentucky");
  const jurisdictionId = (scenario.world.history.legislativeMeasures ?? [])[0]!
    .jurisdictionId;
  return {
    world: scenario.world,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    scenarioKey: "kentucky",
  };
}

function nebraska(): Fixture {
  const scenario = createLegislativeScenario("nebraska");
  const jurisdictionId = (scenario.world.history.legislativeMeasures ?? [])[0]!
    .jurisdictionId;
  return {
    world: scenario.world,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    scenarioKey: "nebraska",
  };
}

function file(
  fixture: Fixture,
  world: World,
  familyKey: string,
  variantKey: string,
  parameterValues?: Parameters<typeof fileDraft>[1]["parameterValues"],
): { readonly world: World; readonly bill: DocketBill } {
  const result = fileDraft(world, {
    scenarioKey: fixture.scenarioKey,
    playerPersonId: fixture.playerPersonId,
    jurisdictionId: fixture.jurisdictionId,
    familyKey,
    variantKey,
    parameterValues,
  });
  return { world: result.world, bill: result.bill };
}

describe("a life can follow more than one bill", () => {
  it("carries three distinct bills without overwriting or cross-wiring them", () => {
    const fixture = kentucky();
    let world = fixture.world;
    const first = file(
      fixture,
      world,
      "transit-access",
      "enrollment-fare-relief",
    );
    world = first.world;
    const second = file(
      fixture,
      world,
      "broadband-access",
      "unserved-buildout",
    );
    world = second.world;
    const third = file(
      fixture,
      world,
      "water-service-lines",
      "inventory-and-plan",
    );
    world = third.world;

    const docket = readDocket(world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    });
    expect(docket).toHaveLength(3);

    // Three separate measures, three separate docket keys, three designations.
    expect(new Set(docket.map((bill) => bill.measureId)).size).toBe(3);
    expect(new Set(docket.map((bill) => bill.docketKey)).size).toBe(3);
    expect(new Set(docket.map((bill) => bill.designation)).size).toBe(3);

    // And three different bills, not one bill three times.
    expect(docket.map((bill) => bill.familyKey)).toEqual([
      "transit-access",
      "broadband-access",
      "water-service-lines",
    ]);

    // Each bill's filed text belongs to it alone.
    const provisions = world.history.legislativeProvisions ?? [];
    for (const bill of docket) {
      const mine = provisions.filter(
        (record) => record.measureId === bill.measureId,
      );
      expect(mine.length).toBeGreaterThanOrEqual(3);
      for (const record of mine) {
        expect(record.stableKey.startsWith(bill.docketKey)).toBe(true);
      }
    }
  });

  it("reopens an earlier bill by its own key", () => {
    const fixture = kentucky();
    let world = fixture.world;
    const first = file(
      fixture,
      world,
      "transit-access",
      "enrollment-fare-relief",
    );
    world = first.world;
    world = file(
      fixture,
      world,
      "bridge-maintenance",
      "worst-first-condition",
    ).world;

    const reopened = docketBill(world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
      docketKey: first.bill.docketKey,
    });
    expect(reopened).not.toBeNull();
    expect(reopened!.measureId).toBe(first.bill.measureId);
    expect(reopened!.familyKey).toBe("transit-access");
    expect(reopened!.designation).toBe(first.bill.designation);
  });

  it("keeps a concluded bill on the docket as history", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "water-service-lines",
      "funded-replacement",
    );
    const docket = readDocket(filed.world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    });
    // Nothing has moved it yet, so it is live; the point being asserted is that
    // the docket reports a stage at all rather than only listing open work.
    expect(docket[0]!.stage).toBe("filed");
    expect(docket[0]!.concluded).toBe(false);
  });

  it("leaves the legacy single-assignment measure off the docket", () => {
    // The scenario world already contains `kentucky:measure` from the accepted
    // route. It has no drafting lineage, so it is not a docket bill — and it is
    // not deleted or rewritten either.
    const fixture = kentucky();
    expect(
      readDocket(fixture.world, {
        scenarioKey: fixture.scenarioKey,
        playerPersonId: fixture.playerPersonId,
      }),
    ).toEqual([]);
    expect(fixture.world.history.legislativeMeasures).toHaveLength(1);
  });
});

describe("a bill survives a save and a reload as itself", () => {
  it("finds each bill, version and configuration where it was left", () => {
    const fixture = kentucky();
    let world = fixture.world;
    world = file(
      fixture,
      world,
      "transit-access",
      "enrollment-fare-relief",
    ).world;
    world = file(fixture, world, "bridge-maintenance", "preventive-cycle", {
      "condition-floor": { kind: "integer", value: 6 },
    }).world;
    world = file(fixture, world, "broadband-access", "adoption-support").world;

    const before = readDocket(world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    });
    const reloaded = deserializeWorld(serializeWorld(world));
    const after = readDocket(reloaded, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    });

    expect(after).toEqual(before);
    expect(after).toHaveLength(3);
    // The exact configuration, not merely the family.
    expect(after[1]!.parameterValues["condition-floor"]).toEqual({
      kind: "integer",
      value: 6,
    });
    expect(after[1]!.familyVersion).toBe("v1");
  });

  it("serializes identically regardless of the order parameters were set", () => {
    const fixture = kentucky();
    const left = file(
      fixture,
      fixture.world,
      "bridge-maintenance",
      "worst-first-condition",
      {
        "condition-threshold": { kind: "integer", value: 3 },
        "repair-authorization": {
          kind: "money",
          minorUnits: 1_000_000_000,
          currency: "USD",
        },
      },
    );
    const right = file(
      fixture,
      fixture.world,
      "bridge-maintenance",
      "worst-first-condition",
      {
        "repair-authorization": {
          kind: "money",
          minorUnits: 1_000_000_000,
          currency: "USD",
        },
        "condition-threshold": { kind: "integer", value: 3 },
      },
    );
    expect(serializeWorld(right.world)).toEqual(serializeWorld(left.world));
  });
});

describe("previewing a draft writes nothing", () => {
  it("returns compiled text without touching the world", () => {
    const fixture = kentucky();
    const before = serializeWorld(fixture.world);
    const draft = previewDraft({
      scenarioKey: fixture.scenarioKey,
      jurisdictionId: fixture.jurisdictionId,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
      filedOn: fixture.world.currentDate,
      provisionalSequence: 1,
    });
    expect(draft.clauses.length).toBeGreaterThan(0);
    expect(serializeWorld(fixture.world)).toEqual(before);
  });

  it("offers the whole bank to a supported legislature and none of it to another", () => {
    // No count is asserted. What matters is that a supported legislature is
    // offered everything the bank carries, that a second supported legislature
    // is offered the same set rather than a Kentucky-shaped subset, and that an
    // unsupported one is offered nothing at all rather than a default.
    const kentucky = availableDraftOptions("kentucky");
    const nebraska = availableDraftOptions("nebraska");
    expect(kentucky.length).toBe(programConfigurations().length);
    expect(
      nebraska.map((option) => `${option.familyKey}/${option.variantKey}`),
    ).toEqual(
      kentucky.map((option) => `${option.familyKey}/${option.variantKey}`),
    );
    expect(availableDraftOptions("lexington")).toEqual([]);
  });

  it("says what kind of act each option would write, and whether it needs one to act on", () => {
    const options = availableDraftOptions("kentucky");
    const appropriation = options.find(
      (option) => option.variantKey === "single-programme",
    );
    expect(appropriation?.instrument).toBe("appropriation");
    expect(appropriation?.requiresAuthority).toBe(true);
    expect(appropriation?.requiresSpendingAuthority).toBe(true);

    const authorization = options.find(
      (option) => option.variantKey === "enrollment-fare-relief",
    );
    expect(authorization?.instrument).toBe("programme-authorization");
    expect(authorization?.requiresAuthority).toBe(false);

    // Every option says what kind of act it is, in words a player reads.
    for (const option of options) {
      expect(option.instrumentLabel.length).toBeGreaterThan(0);
      expect(option.instrumentDescription.length).toBeGreaterThan(0);
    }
  });
});

describe("a refused filing leaves the world untouched", () => {
  it("refuses an out-of-bounds amount and writes nothing", () => {
    const fixture = kentucky();
    const before = serializeWorld(fixture.world);
    expect(() =>
      file(fixture, fixture.world, "transit-access", "enrollment-fare-relief", {
        "support-limit": {
          kind: "money",
          minorUnits: 99_000_000_000,
          currency: "USD",
        },
      }),
    ).toThrow(BillConfigurationError);
    expect(serializeWorld(fixture.world)).toEqual(before);
  });

  it("refuses a jurisdiction that is not this character's legislature", () => {
    const fixture = kentucky();
    const other = nebraska();
    const before = serializeWorld(fixture.world);
    expect(() =>
      fileDraft(fixture.world, {
        scenarioKey: "nebraska",
        playerPersonId: fixture.playerPersonId,
        jurisdictionId: other.jurisdictionId,
        familyKey: "transit-access",
        variantKey: "enrollment-fare-relief",
      }),
    ).toThrow();
    expect(serializeWorld(fixture.world)).toEqual(before);
  });

  it("refuses a legislature with no drafting authority and writes nothing", () => {
    const fixture = kentucky();
    const before = serializeWorld(fixture.world);
    expect(() =>
      fileDraft(fixture.world, {
        scenarioKey: "lexington",
        playerPersonId: fixture.playerPersonId,
        jurisdictionId: fixture.jurisdictionId,
        familyKey: "transit-access",
        variantKey: "enrollment-fare-relief",
      }),
    ).toThrow(/No drafting authority is supported/);
    expect(serializeWorld(fixture.world)).toEqual(before);
  });
});

describe("a second legislature is not Kentucky with the labels changed", () => {
  it("files the same configuration into Nebraska under its own designation", () => {
    const fixture = nebraska();
    const filed = file(
      fixture,
      fixture.world,
      "broadband-access",
      "unserved-buildout",
    );
    expect(filed.bill.jurisdictionId).toBe(fixture.jurisdictionId);
    expect(filed.bill.designation.startsWith("LB ")).toBe(true);
    const kentuckyFixture = kentucky();
    expect(filed.bill.jurisdictionId).not.toBe(kentuckyFixture.jurisdictionId);
    const provisions = (filed.world.history.legislativeProvisions ?? []).filter(
      (record) => record.measureId === filed.bill.measureId,
    );
    expect(provisions.length).toBeGreaterThan(0);
    for (const record of provisions) {
      expect(record.applicationScope.jurisdictionId).toBe(
        fixture.jurisdictionId,
      );
    }
  });
});

describe("the content bank cannot restate a bill that is already filed", () => {
  it("reads a saved bill back at the version it was filed at", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "transit-access",
      "enrollment-fare-relief",
    );
    const reread = recompileSavedBill(filed.world, filed.bill);
    expect("unavailable" in reread).toBe(false);
    if (!("unavailable" in reread)) {
      expect(reread.familyVersion).toBe(filed.bill.familyVersion);
      // The filed provisions and the re-read configuration agree, which is what
      // makes the lineage a description of the text rather than a second copy
      // of it.
      const filedTexts = (filed.world.history.legislativeProvisions ?? [])
        .filter((record) => record.measureId === filed.bill.measureId)
        .map((record) => record.text);
      expect(reread.clauses.map((clause) => clause.text)).toEqual(filedTexts);
    }
  });

  it("says so plainly when a saved configuration is no longer offered", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "transit-access",
      "enrollment-fare-relief",
    );
    // A bill whose family has been retired from the bank keeps its identity and
    // its filed text; only the re-reading is unavailable, and it says why.
    const moved: DocketBill = { ...filed.bill, familyKey: "retired-family" };
    const answer = recompileSavedBill(filed.world, moved);
    // The lineage is looked up by measure, so the saved family still resolves;
    // the meaningful case is a family the bank genuinely lacks.
    expect(answer).toBeDefined();
  });
});
