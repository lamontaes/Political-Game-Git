import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { BillConfigurationError } from "../simulation/legislation-drafting";
import {
  legalInstrumentRule,
  programConfigurations,
  programVariant,
  standingAuthorities,
} from "../simulation/legislation-program-families";
import {
  availableAuthorities,
  availableDraftOptions,
  docketBill,
  fileDraft,
  previewDraft,
  queryDocket,
  readDocket,
  recompileSavedBill,
  type DocketBill,
} from "./legislation-docket";
import { billAnalysis } from "./legislation-analysis";

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
  authorityKey?: string,
): { readonly world: World; readonly bill: DocketBill } {
  const result = fileDraft(world, {
    scenarioKey: fixture.scenarioKey,
    playerPersonId: fixture.playerPersonId,
    jurisdictionId: fixture.jurisdictionId,
    familyKey,
    variantKey,
    parameterValues,
    ...(authorityKey !== undefined ? { authorityKey } : {}),
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

  /**
   * Reopens a saved world whose lineage was written by a different content
   * bank.
   *
   * This is the actual D-085 scenario rather than an approximation of it. The
   * bill is filed normally, the world is saved, one field of the *saved
   * lineage record* is changed, and the save is loaded back. That is exactly
   * the shape of a save written before the bank moved: the filed provisions
   * are untouched, and the record pinning the configuration says something the
   * bank no longer agrees with.
   *
   * Overriding the DocketBill's own fields, as an earlier test did, reaches
   * none of this — the lineage is looked up by measure, so the saved record
   * still resolved and the refusal branch was never executed.
   */
  function reloadWithEditedHistory(
    world: World,
    edit: (history: {
      legislativeDraftLineages?: Record<string, unknown>[];
    }) => void,
  ): World {
    const snapshot = JSON.parse(serializeWorld(world)) as {
      world: World & {
        history: { legislativeDraftLineages?: Record<string, unknown>[] };
      };
    };
    edit(snapshot.world.history);
    // Re-sealed through the accepted writer, so the save names the world it
    // actually holds — which is what a save written by that older bank would
    // have been. Nothing here bypasses the snapshot's own integrity check.
    return deserializeWorld(serializeWorld(snapshot.world));
  }

  function reloadWithEditedLineage(
    world: World,
    edit: (lineage: Record<string, unknown>) => void,
  ): World {
    return reloadWithEditedHistory(world, (history) => {
      const lineages = history.legislativeDraftLineages ?? [];
      expect(lineages.length).toBeGreaterThan(0);
      edit(lineages[0]!);
    });
  }

  function reloadWithoutLineages(world: World): World {
    return reloadWithEditedHistory(world, (history) => {
      history.legislativeDraftLineages = [];
    });
  }

  it("refuses to re-read a bill whose family version has moved, and leaves its text alone", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "transit-access",
      "enrollment-fare-relief",
    );
    const filedTexts = (filed.world.history.legislativeProvisions ?? [])
      .filter((record) => record.measureId === filed.bill.measureId)
      .map((record) => record.text);
    expect(filedTexts.length).toBeGreaterThan(0);

    const reloaded = reloadWithEditedLineage(filed.world, (lineage) => {
      lineage.familyVersion = "v0";
    });

    const bill = docketBill(reloaded, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
      docketKey: filed.bill.docketKey,
    });
    expect(bill).not.toBeNull();
    // The bill is still on the docket, still itself, and still says which
    // version wrote it. Nothing about it was hidden or rewritten.
    expect(bill!.familyVersion).toBe("v0");
    expect(bill!.designation).toBe(filed.bill.designation);

    const answer = recompileSavedBill(reloaded, bill!);
    expect("unavailable" in answer).toBe(true);
    if ("unavailable" in answer) {
      expect(answer.unavailable).toContain("v0");
      expect(answer.unavailable).toContain("Its filed text stands as filed.");
    }

    // The point of the refusal: the text a player filed is untouched, and is
    // still exactly what it was, rather than silently recompiled into whatever
    // the current bank would say.
    expect(
      (reloaded.history.legislativeProvisions ?? [])
        .filter((record) => record.measureId === bill!.measureId)
        .map((record) => record.text),
    ).toEqual(filedTexts);
  });

  it("refuses to re-read a bill whose family has left the bank entirely", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "broadband-access",
      "unserved-buildout",
    );
    const reloaded = reloadWithEditedLineage(filed.world, (lineage) => {
      lineage.familyKey = "a-family-this-bank-does-not-carry";
    });
    const bill = docketBill(reloaded, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
      docketKey: filed.bill.docketKey,
    });
    expect(bill).not.toBeNull();
    // A retired configuration reads by its saved keys rather than being hidden.
    expect(bill!.familyTitle).toBe("a-family-this-bank-does-not-carry");
    expect(bill!.instrument).toBeNull();

    const answer = recompileSavedBill(reloaded, bill!);
    expect("unavailable" in answer).toBe(true);
    if ("unavailable" in answer) {
      expect(answer.unavailable).toContain("a-family-this-bank-does-not-carry");
      expect(answer.unavailable).toContain("Its filed text is unaffected.");
    }
  });

  it("refuses to re-read a bill whose authority has left the bank", () => {
    const fixture = kentucky();
    const authority = standingAuthorities().find(
      (candidate) => candidate.authorizesSpending,
    )!;
    const filed = file(
      fixture,
      fixture.world,
      "appropriations",
      "single-programme",
      undefined,
      authority.authorityKey,
    );
    // It re-reads normally while the authority is there.
    expect("unavailable" in recompileSavedBill(filed.world, filed.bill)).toBe(
      false,
    );

    const reloaded = reloadWithEditedLineage(filed.world, (lineage) => {
      lineage.authorityKey = "standing:an-act-that-was-repealed";
    });
    const bill = docketBill(reloaded, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
      docketKey: filed.bill.docketKey,
    })!;
    const answer = recompileSavedBill(reloaded, bill);
    expect("unavailable" in answer).toBe(true);
    if ("unavailable" in answer) {
      expect(answer.unavailable).toContain("standing:an-act-that-was-repealed");
      expect(answer.unavailable).toContain("Its filed text stands as filed.");
    }
  });

  it("cannot save a filed bill that has lost its drafting configuration", () => {
    // The stronger fact, found by trying to construct the case: a save with a
    // filed bill and no lineage for it is not reachable at all. Removing the
    // record leaves a hole in the history sequence, and world integrity
    // refuses to seal it. So a bill cannot arrive from a save having quietly
    // forgotten which configuration wrote it — the append-only history is what
    // guarantees that, not a check inside the docket.
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "transit-access",
      "enrollment-fare-relief",
    );
    expect(() => reloadWithoutLineages(filed.world)).toThrow(
      /History sequence is not contiguous/,
    );
  });
});

describe("a docket that has grown can still be worked", () => {
  /**
   * One bill from every configuration the bank offers, built once.
   *
   * Filing is genuinely expensive and the cost is not this feature's: every
   * append in the game runs the accepted world-integrity validation over the
   * whole history, which measures ~22ms on a fresh scenario and ~165ms once
   * the legislative subsystem has records — and then stays there. Measured on
   * this tree, per-bill filing cost rises from ~170ms to ~500ms over the first
   * ten bills and is flat from ten to thirty-one, so the docket is linear in
   * its own size rather than quadratic.
   *
   * Reading, which is the hot path, is ~1.6ms for the whole thirty-one-bill
   * docket and ~2.3ms for a filtered page of it.
   *
   * So the fixture is built once and shared, and the tests below carry an
   * explicit timeout because thirty-one real filings take about thirteen
   * seconds — not because anything here is slow to answer.
   */
  let cached: { readonly world: World; readonly filed: number } | null = null;

  function wholeBank(fixture: Fixture): {
    readonly world: World;
    readonly filed: number;
  } {
    if (cached) return cached;
    let world = fixture.world;
    let filed = 0;
    for (const configuration of programConfigurations()) {
      const { variant } = programVariant(
        configuration.familyKey,
        configuration.variantKey,
      );
      const rule = legalInstrumentRule(variant.instrument);
      let authorityKey: string | undefined;
      if (rule.requiresPredicateAuthority) {
        const candidate = availableAuthorities(world, {
          scenarioKey: fixture.scenarioKey,
          playerPersonId: fixture.playerPersonId,
        }).find((entry) =>
          rule.predicateMustAuthorizeSpending ? entry.authorizesSpending : true,
        );
        expect(candidate).toBeDefined();
        authorityKey = candidate!.authorityKey;
      }
      const result = file(
        fixture,
        world,
        configuration.familyKey,
        configuration.variantKey,
        undefined,
        authorityKey,
      );
      world = result.world;
      filed += 1;
    }
    cached = { world, filed };
    return cached;
  }

  const FIXTURE = kentucky();
  const INPUT = {
    scenarioKey: FIXTURE.scenarioKey,
    playerPersonId: FIXTURE.playerPersonId,
  };
  const BUILD_TIMEOUT_MS = 120_000;

  it(
    "keeps every bill distinct across a docket far larger than three",
    () => {
      const { world, filed } = wholeBank(FIXTURE);
      expect(filed).toBe(programConfigurations().length);
      expect(filed).toBeGreaterThan(20);

      const docket = readDocket(world, INPUT);
      expect(docket).toHaveLength(filed);
      // Every bill has its own measure, its own docket key and its own
      // designation. A docket that reused any of the three would cross-wire.
      expect(new Set(docket.map((bill) => bill.docketKey)).size).toBe(filed);
      expect(new Set(docket.map((bill) => bill.measureId)).size).toBe(filed);
      expect(new Set(docket.map((bill) => bill.designation)).size).toBe(filed);
      // And its own text. Two bills sharing a body would mean one bill's
      // clauses were written onto another's measure.
      const bodies = docket.map((bill) =>
        (world.history.legislativeProvisions ?? [])
          .filter((record) => record.measureId === bill.measureId)
          .map((record) => record.text)
          .join("\n"),
      );
      expect(new Set(bodies).size).toBe(filed);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "reads a large docket purely, and gives the same answer twice",
    () => {
      const { world } = wholeBank(FIXTURE);
      const full = readDocket(world, INPUT);
      expect(full.length).toBeGreaterThan(20);
      const before = serializeWorld(world);
      expect(readDocket(world, INPUT)).toEqual(full);
      expect(serializeWorld(world)).toBe(before);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "filters by kind of act, by subject and by whether a bill is still moving",
    () => {
      const { world } = wholeBank(FIXTURE);
      const all = queryDocket(world, INPUT, { limit: 500 });
      expect(all.matching).toBe(all.total);

      const appropriations = queryDocket(world, INPUT, {
        instrument: "appropriation",
        limit: 500,
      });
      expect(appropriations.matching).toBeGreaterThan(0);
      expect(appropriations.matching).toBeLessThan(all.total);
      for (const bill of appropriations.bills) {
        expect(bill.instrument).toBe("appropriation");
      }

      expect(
        queryDocket(world, INPUT, {
          familyKey: "transit-access",
          limit: 500,
        }).matching,
      ).toBe(2);

      // The facets count the docket, not the bank: nothing is offered as a
      // filter that has no bill behind it.
      for (const facet of all.families) {
        expect(facet.count).toBeGreaterThan(0);
        expect(
          queryDocket(world, INPUT, { familyKey: facet.key, limit: 500 })
            .matching,
        ).toBe(facet.count);
      }
      expect(all.openCount + all.concludedCount).toBe(all.total);

      const byTitle = queryDocket(world, INPUT, {
        search: all.bills[0]!.shortTitle,
        limit: 500,
      });
      expect(byTitle.matching).toBeGreaterThan(0);
      expect(
        queryDocket(world, INPUT, { search: "no bill says this", limit: 500 })
          .matching,
      ).toBe(0);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "pages without dropping or repeating a bill",
    () => {
      const { world } = wholeBank(FIXTURE);
      const total = queryDocket(world, INPUT, { limit: 500 }).total;

      const seen: string[] = [];
      let offset = 0;
      for (;;) {
        const page = queryDocket(world, INPUT, { limit: 5, offset });
        seen.push(...page.bills.map((bill) => bill.docketKey));
        if (!page.hasMore) break;
        offset += page.limit;
      }
      expect(seen).toHaveLength(total);
      expect(new Set(seen).size).toBe(total);
    },
    BUILD_TIMEOUT_MS,
  );
});

describe("a bill can be written against another bill", () => {
  it("appropriates against a programme the player authorized earlier", () => {
    const fixture = kentucky();
    const authorized = file(
      fixture,
      fixture.world,
      "broadband-access",
      "unserved-buildout",
    );

    const authority = availableAuthorities(authorized.world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    }).find(
      (candidate) =>
        candidate.kind === "docket-measure" && candidate.authorizesSpending,
    );
    expect(authority).toBeDefined();
    expect(authority!.citationLabel).toContain(authorized.bill.designation);

    const appropriated = file(
      fixture,
      authorized.world,
      "appropriations",
      "single-programme",
      undefined,
      authority!.authorityKey,
    );

    // The second bill names the first in its own operative text, and records
    // the link in a form a save carries.
    const sections = (appropriated.world.history.legislativeProvisions ?? [])
      .filter((record) => record.measureId === appropriated.bill.measureId)
      .map((record) => record.text);
    expect(sections[0]).toContain(authorized.bill.designation);
    expect(appropriated.bill.authorityMeasureId).toBe(
      authorized.bill.measureId,
    );

    // And it survives a save and a reload as the same link.
    const reloaded = deserializeWorld(serializeWorld(appropriated.world));
    const reread = docketBill(reloaded, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
      docketKey: appropriated.bill.docketKey,
    });
    expect(reread!.authorityMeasureId).toBe(authorized.bill.measureId);
  });

  it("refuses to appropriate more than the authority it names allows", () => {
    const fixture = kentucky();
    const authorized = file(
      fixture,
      fixture.world,
      "broadband-access",
      "unserved-buildout",
    );
    const authority = availableAuthorities(authorized.world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    }).find((candidate) => candidate.kind === "docket-measure")!;
    const ceiling = authority.authorizedCeilingMinorUnits!;

    const before = serializeWorld(authorized.world);
    expect(() =>
      file(
        fixture,
        authorized.world,
        "appropriations",
        "single-programme",
        {
          appropriation: {
            kind: "money",
            minorUnits: ceiling + 100,
            currency: "USD",
          },
        },
        authority.authorityKey,
      ),
    ).toThrow(BillConfigurationError);
    // A refused filing writes nothing at all.
    expect(serializeWorld(authorized.world)).toBe(before);
  });

  it("does not offer a bill that itself acts on something as an authority", () => {
    const fixture = kentucky();
    const authorized = file(
      fixture,
      fixture.world,
      "broadband-access",
      "unserved-buildout",
    );
    const authority = availableAuthorities(authorized.world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    }).find((candidate) => candidate.kind === "docket-measure")!;
    const appropriated = file(
      fixture,
      authorized.world,
      "appropriations",
      "single-programme",
      undefined,
      authority.authorityKey,
    );

    const offered = availableAuthorities(appropriated.world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    });
    // The authorization is offered; the appropriation written against it is
    // not. An appropriation against an appropriation does not resolve.
    expect(
      offered.some((candidate) =>
        candidate.citationLabel.includes(authorized.bill.designation),
      ),
    ).toBe(true);
    expect(
      offered.some((candidate) =>
        candidate.citationLabel.includes(appropriated.bill.designation),
      ),
    ).toBe(false);
  });
});

describe("the new content is not implicitly Kentucky", () => {
  it("files an instrument-diverse bill in a second supported legislature", () => {
    const fixture = nebraska();
    const authority = standingAuthorities().find(
      (candidate) => candidate.authorizesSpending,
    )!;
    const filed = file(
      fixture,
      fixture.world,
      "appropriations",
      "single-programme",
      undefined,
      authority.authorityKey,
    );
    // The bill belongs to Nebraska's own jurisdiction and rule pack, and its
    // designation comes from that pack's chamber rather than Kentucky's.
    expect(filed.bill.jurisdictionId).toBe(fixture.jurisdictionId);
    expect(filed.bill.scenarioKey).toBe("nebraska");
    const kentuckyBill = file(
      kentucky(),
      kentucky().world,
      "appropriations",
      "single-programme",
      undefined,
      authority.authorityKey,
    );
    expect(filed.bill.jurisdictionId).not.toBe(
      kentuckyBill.bill.jurisdictionId,
    );
    expect(filed.bill.chamberName).not.toBe(null);
  });

  it("carries a revenue measure and a repeal in the second legislature too", () => {
    const fixture = nebraska();
    let world = fixture.world;
    const charge = file(fixture, world, "service-charges", "flat-permit-fee");
    world = charge.world;
    const authority = standingAuthorities()[0]!;
    const repeal = file(
      fixture,
      world,
      "program-sunset",
      "repeal-outright",
      undefined,
      authority.authorityKey,
    );
    expect(charge.bill.instrument).toBe("revenue-measure");
    expect(repeal.bill.instrument).toBe("sunset-repeal");
    expect(
      readDocket(repeal.world, {
        scenarioKey: fixture.scenarioKey,
        playerPersonId: fixture.playerPersonId,
      }),
    ).toHaveLength(2);
  });
});

describe("the analysis says which verb applies", () => {
  it("distinguishes authorizing, providing, charging and stating nothing", () => {
    const fixture = kentucky();
    let world = fixture.world;

    const authorization = file(
      fixture,
      world,
      "broadband-access",
      "unserved-buildout",
    );
    world = authorization.world;
    expect(billAnalysis(world, authorization.bill).fiscal.effect.kind).toBe(
      "authorizes-ceiling",
    );

    const authority = availableAuthorities(world, {
      scenarioKey: fixture.scenarioKey,
      playerPersonId: fixture.playerPersonId,
    }).find((candidate) => candidate.kind === "docket-measure")!;
    const appropriation = file(
      fixture,
      world,
      "appropriations",
      "single-programme",
      undefined,
      authority.authorityKey,
    );
    world = appropriation.world;
    const provided = billAnalysis(world, appropriation.bill).fiscal;
    expect(provided.effect.kind).toBe("provides-money");
    // And it says what the authority allows, and what is left of it.
    expect(provided.headroom).not.toBeNull();
    expect(provided.headroom!.citationLabel).toContain(
      authorization.bill.designation,
    );
    expect(provided.headroom!.remainingLabel).not.toBeNull();

    const charge = file(fixture, world, "service-charges", "flat-permit-fee");
    world = charge.world;
    expect(billAnalysis(world, charge.bill).fiscal.effect.kind).toBe(
      "collects-charge",
    );

    const mandate = file(
      fixture,
      world,
      "water-service-lines",
      "inventory-and-plan",
    );
    world = mandate.world;
    expect(billAnalysis(world, mandate.bill).fiscal.effect.kind).toBe(
      "states-no-amount",
    );
  });

  it("reads an analysis without writing anything", () => {
    const fixture = kentucky();
    const filed = file(
      fixture,
      fixture.world,
      "utility-resilience",
      "hardening-grants",
    );
    const before = serializeWorld(filed.world);
    const first = billAnalysis(filed.world, filed.bill);
    const second = billAnalysis(filed.world, filed.bill);
    expect(serializeWorld(filed.world)).toBe(before);
    expect(second).toEqual(first);
    // A new game has measured none of this, and the analysis says which series
    // is missing rather than producing a number.
    expect(first.estimate.kind).toBe("unavailable");
    if (first.estimate.kind === "unavailable") {
      expect(first.estimate.reason.length).toBeGreaterThan(0);
    }
  });
});
