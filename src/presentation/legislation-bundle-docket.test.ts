import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { MeasureBundleError } from "../simulation/legislation-bundle";
import { assertDraftLineageIntegrity } from "../simulation/legislation-draft-lineage";
import { appropriationFromEnactedMeasure } from "../simulation/governing/program-governing";
import type { MeasureStepKey } from "../simulation/legislation";
import { applyLegislativeStep } from "./legislation-session";
import {
  fileBundleDraft,
  recompileSavedBundle,
  type FileBundleComponentInput,
} from "./legislation-bundle-docket";
import { bundleMeasureView } from "./legislation-bundle-composition";
import {
  docketBill,
  fileDraft,
  recompileSavedBill,
} from "./legislation-docket";

/**
 * NATIONWIDE1 sections 4 through 6: a multi-part measure that is actually
 * filed, read back, rendered and applied.
 *
 * The compiler tests next door prove a bundle compiles. These prove it
 * survives contact with the rest of the game: that filing one writes through
 * the records a single-family bill already writes, that a save and reload
 * finds every part with the configuration it was filed from, that one reading
 * feeds text, provisions, money and controls alike, and that enacting a
 * measure with two appropriating parts creates two separate spending
 * authorities rather than one netted figure or one part silently dropped.
 *
 * Every component is a real configuration from the shipped bank, and the world
 * is the shipped Kentucky scenario, because a fixture-only bundle would prove
 * only that the fixture agrees with itself.
 */

interface Fixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
}

function kentucky(): Fixture {
  const scenario = createLegislativeScenario("kentucky");
  return {
    world: scenario.world,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId: (scenario.world.history.legislativeMeasures ?? [])[0]!
      .jurisdictionId,
  };
}

function component(
  componentKey: string,
  familyKey: string,
  variantKey: string,
  extra: Partial<FileBundleComponentInput> = {},
): FileBundleComponentInput {
  return {
    componentKey,
    familyKey,
    variantKey,
    subject: "transit",
    ...extra,
  };
}

/** Route service, fare eligibility, reporting and the money for it. */
function transitPackage(): readonly FileBundleComponentInput[] {
  return [
    component("routes", "transit-access", "unserved-county-formula"),
    component("fares", "transit-access", "enrollment-fare-relief"),
    component("reporting", "agency-reporting", "annual-legislative-report", {
      subject: "administration",
    }),
    component("money", "appropriations", "transit-staged-service-v1", {
      authorityKey: "standing:rural-transit-assistance",
      dependsOn: ["routes"],
    }),
  ];
}

function fileTransitPackage(
  fixture: Fixture = kentucky(),
  components: readonly FileBundleComponentInput[] = transitPackage(),
) {
  return fileBundleDraft(fixture.world, {
    scenarioKey: "kentucky",
    playerPersonId: fixture.playerPersonId,
    jurisdictionId: fixture.jurisdictionId,
    subjectRule: "unrestricted",
    components,
  });
}

describe("a measure with parts is filed through the records a bill already uses", () => {
  it("writes one measure whose sections carry every component, numbered once through", () => {
    const filed = fileTransitPackage();
    const provisions = currentMeasureProvisions(
      filed.world,
      filed.bill.measureId,
    );
    expect(provisions.length).toBe(
      filed.bundle.components.reduce(
        (total, part) => total + part.clauses.length,
        0,
      ),
    );
    expect(provisions.map((row) => row.sectionNumber)).toEqual(
      provisions.map((_, index) => index + 1),
    );
    // Each section says which part of the measure wrote it, in the key it
    // already carries. There is no second index to disagree with this.
    for (const part of filed.bundle.components) {
      const own = provisions.filter((row) =>
        row.provisionKey.startsWith(`${part.componentKey}:`),
      );
      expect(own.length).toBe(part.clauses.length);
    }
  });

  it("records one drafting configuration per component, and the world still loads", () => {
    const filed = fileTransitPackage();
    const lineages = (
      filed.world.history.legislativeDraftLineages ?? []
    ).filter((row) => row.measureId === filed.bill.measureId);
    expect(lineages.map((row) => row.componentKey)).toEqual([
      "routes",
      "fares",
      "reporting",
      "money",
    ]);
    expect(lineages.every((row) => row.familyVersion.length > 0)).toBe(true);
    expect(() => assertDraftLineageIntegrity(filed.world)).not.toThrow();
  });

  it("keeps a single-family bill exactly as it was: one lineage, still readable", () => {
    const fixture = kentucky();
    const single = fileDraft(fixture.world, {
      scenarioKey: "kentucky",
      playerPersonId: fixture.playerPersonId,
      jurisdictionId: fixture.jurisdictionId,
      familyKey: "transit-access",
      variantKey: "unserved-county-formula",
    });
    expect(single.bill.componentKeys).toEqual([]);
    const reread = recompileSavedBill(single.world, single.bill);
    expect("unavailable" in reread).toBe(false);
    expect(() => assertDraftLineageIntegrity(single.world)).not.toThrow();
  });

  it("tells a surface that a measure has parts, so no part is shown as the whole", () => {
    const filed = fileTransitPackage();
    expect(filed.bill.componentKeys).toEqual([
      "routes",
      "fares",
      "reporting",
      "money",
    ]);
    // The single-configuration reader refuses rather than answering with the
    // first component's family, which would be a part presented as the bill.
    const asSingle = recompileSavedBill(filed.world, filed.bill);
    expect(asSingle).toEqual({
      unavailable:
        "This measure was filed in parts, so it cannot be read as a single configuration.",
    });
  });

  it("refuses the whole measure before writing anything when one part will not compile", () => {
    const fixture = kentucky();
    const before = fixture.world.history.legislativeMeasures?.length ?? 0;
    expect(
      () =>
        fileTransitPackage(fixture, [
          component("routes", "transit-access", "unserved-county-formula"),
          component("money", "appropriations", "transit-staged-service-v1"),
        ]),
      // The refusal names the part, and arrives as the envelope's own error:
      // a component that is not a bill is a fact about this measure.
    ).toThrow(MeasureBundleError);
    expect(fixture.world.history.legislativeMeasures?.length ?? 0).toBe(before);
    expect(fixture.world.history.legislativeDraftLineages ?? []).toEqual([]);
  });

  it("refuses a measure its jurisdiction's profile does not allow to carry two subjects", () => {
    const fixture = kentucky();
    expect(() =>
      fileBundleDraft(fixture.world, {
        scenarioKey: "kentucky",
        playerPersonId: fixture.playerPersonId,
        jurisdictionId: fixture.jurisdictionId,
        subjectRule: "single-subject",
        components: transitPackage(),
      }),
    ).toThrow(MeasureBundleError);
    expect(fixture.world.history.legislativeDraftLineages ?? []).toEqual([]);
  });

  it("names the component whose authority no longer answers, rather than the measure", () => {
    const fixture = kentucky();
    expect(() =>
      fileTransitPackage(fixture, [
        component("routes", "transit-access", "unserved-county-formula"),
        component("money", "appropriations", "transit-staged-service-v1", {
          authorityKey: "standing:nothing-answers-to-this",
        }),
      ]),
    ).toThrow(/Component 'money'/);
  });
});

describe("a filed measure reads back with every part intact", () => {
  it("recompiles each component from the configuration it was filed at", () => {
    const filed = fileTransitPackage();
    const reread = recompileSavedBundle(filed.world, filed.bill);
    if ("unavailable" in reread) throw new Error(reread.unavailable);
    expect(reread.components.map((part) => part.componentKey)).toEqual([
      "routes",
      "fares",
      "reporting",
      "money",
    ]);
    expect(reread.subjects).toEqual(["transit", "administration"]);
    for (const [index, part] of reread.components.entries()) {
      const filedPart = filed.bundle.components[index]!;
      expect(part.draft.familyKey).toBe(filedPart.draft.familyKey);
      expect(part.draft.variantKey).toBe(filedPart.draft.variantKey);
      expect(part.clauses.map((clause) => clause.text)).toEqual(
        filedPart.clauses.map((clause) => clause.text),
      );
    }
  });

  it("survives a save and a reload with each part still knowing what it is", () => {
    const filed = fileTransitPackage();
    const reloaded = deserializeWorld(serializeWorld(filed.world));
    const bill = docketBill(reloaded, {
      scenarioKey: "kentucky",
      playerPersonId: filed.bill.sponsorPersonId!,
      docketKey: filed.bill.docketKey,
    })!;
    const reread = recompileSavedBundle(reloaded, bill);
    if ("unavailable" in reread) throw new Error(reread.unavailable);
    expect(reread.components.map((part) => part.componentKey)).toEqual([
      "routes",
      "fares",
      "reporting",
      "money",
    ]);
    expect(reread.components.at(-1)!.draft.predicateAuthority).not.toBeNull();
    expect(reread.totals).toEqual(filed.bundle.totals);
  });

  it("reports the whole measure unavailable when one part cannot be re-read", () => {
    const filed = fileTransitPackage();
    const moved: World = {
      ...filed.world,
      history: {
        ...filed.world.history,
        legislativeDraftLineages: (
          filed.world.history.legislativeDraftLineages ?? []
        ).map((row) =>
          row.componentKey === "fares"
            ? { ...row, familyVersion: "0.0.0-not-the-shipped-version" }
            : row,
        ),
      },
    };
    const reread = recompileSavedBundle(moved, filed.bill);
    expect("unavailable" in reread).toBe(true);
    if ("unavailable" in reread) {
      expect(reread.unavailable).toMatch(/Component 'fares'/);
      expect(reread.unavailable).toMatch(/stands as filed/);
    }
  });
});

describe("one reading feeds the text, the provisions, the money and the controls", () => {
  it("shows every section beside the provision it currently is", () => {
    const filed = fileTransitPackage();
    const view = bundleMeasureView(filed.world, filed.bill, filed.bundle);
    expect(view.components.map((part) => part.componentKey)).toEqual([
      "routes",
      "fares",
      "reporting",
      "money",
    ]);
    for (const part of view.components) {
      for (const section of part.sections) {
        expect(section.filed).not.toBeNull();
        expect(section.divergedFromFiled).toBe(false);
        expect(section.filed!.text).toBe(section.text);
      }
    }
    expect(view.unaccountedProvisions).toEqual([]);
  });

  it("keeps the ceiling, the appropriation and any charge as three separate readings", () => {
    const filed = fileTransitPackage();
    const view = bundleMeasureView(filed.world, filed.bill, filed.bundle);
    expect(view.funding.appropriatedMinorUnits.USD).toBeGreaterThan(0);
    expect(view.funding.authorizedCeilingMinorUnits.USD).toBeGreaterThan(0);
    // Nothing anywhere in the view is a net of two of them.
    expect(view.funding.appropriatedMinorUnits.USD).not.toBe(
      view.funding.authorizedCeilingMinorUnits.USD,
    );
    const money = view.funding.byComponent.find(
      (part) => part.componentKey === "money",
    )!;
    expect(money.appropriatedMinorUnits).toBeGreaterThan(0);
    expect(money.currency).toBe("USD");
    // The currency comes from the typed value, so a component that states no
    // money states no currency either rather than defaulting to one.
    const reporting = view.funding.byComponent.find(
      (part) => part.componentKey === "reporting",
    )!;
    expect(reporting.appropriatedMinorUnits).toBeNull();
  });

  it("offers each component's own controls, attributed to that component", () => {
    const filed = fileTransitPackage();
    const view = bundleMeasureView(filed.world, filed.bill, filed.bundle);
    expect(view.controls.length).toBeGreaterThan(0);
    for (const control of view.controls) {
      expect(
        view.components.some((p) => p.componentKey === control.componentKey),
      ).toBe(true);
    }
    // Two components of one family each carry their own controls; they are
    // told apart by the component, not by the parameter key.
    const routeControls = view.controls.filter(
      (control) => control.componentKey === "routes",
    );
    const fareControls = view.controls.filter(
      (control) => control.componentKey === "fares",
    );
    expect(routeControls.length).toBeGreaterThan(0);
    expect(fareControls.length).toBeGreaterThan(0);
  });

  it("reads the measure without spending a day or writing a fact", () => {
    const filed = fileTransitPackage();
    const before = serializeWorld(filed.world);
    bundleMeasureView(filed.world, filed.bill, filed.bundle);
    expect(serializeWorld(filed.world)).toBe(before);
  });
});

describe("enacting a measure with parts applies each part once", () => {
  const TO_KENTUCKY_LAW: readonly MeasureStepKey[] = [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
    "move-floor-vote",
    "transmit-to-second-chamber",
    "request-referral",
    "move-committee-report",
    "request-calendar-placement",
    "move-floor-vote",
    "request-enrollment",
    "present-to-executive",
    "await-executive-decision",
    "move-veto-override",
    "record-enactment",
  ];

  function enacted(componentKeys: readonly FileBundleComponentInput[]) {
    const scenario = createLegislativeScenario("kentucky");
    const filed = fileBundleDraft(scenario.world, {
      scenarioKey: "kentucky",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId: (scenario.world.history.legislativeMeasures ?? [])[0]!
        .jurisdictionId,
      subjectRule: "unrestricted",
      components: componentKeys,
    });
    // The real procedure, over the real measure: the same steps a
    // single-family bill takes, with nothing added for a measure with parts.
    const context = { ...scenario, measureId: filed.bill.measureId };
    let world = filed.world;
    for (const step of TO_KENTUCKY_LAW) {
      world = applyLegislativeStep(context, world, step).world;
    }
    return { world, measureId: filed.bill.measureId };
  }

  it("creates one spending authority for each appropriating part", () => {
    const { world, measureId } = enacted([
      component("routes", "transit-access", "unserved-county-formula"),
      // Two appropriations, each acting on a different standing fund. Two
      // acting on the *same* fund would be the conflict the compiler refuses.
      component(
        "transit-money",
        "appropriations",
        "transit-staged-service-v1",
        {
          authorityKey: "standing:rural-transit-assistance",
        },
      ),
      component("schools-money", "appropriations", "single-programme", {
        subject: "schools",
        authorityKey: "standing:school-facilities",
      }),
    ]);
    const applied = appropriationFromEnactedMeasure(world, measureId);
    const appropriations = (applied.history.publicProgramRecords ?? []).filter(
      (record) =>
        record.kind === "appropriation" && record.sourceMeasureId === measureId,
    );
    expect(appropriations).toHaveLength(2);
    // Two separate authorities, not one summed figure: each is the amount its
    // own part's clause states.
    expect(new Set(appropriations.map((record) => record.stableKey)).size).toBe(
      2,
    );
  });

  it("applies each part once, however many times enactment is read", () => {
    const { world, measureId } = enacted([
      component("routes", "transit-access", "unserved-county-formula"),
      component("money", "appropriations", "transit-staged-service-v1", {
        authorityKey: "standing:rural-transit-assistance",
      }),
    ]);
    const once = appropriationFromEnactedMeasure(world, measureId);
    const twice = appropriationFromEnactedMeasure(once, measureId);
    const count = (candidate: World) =>
      (candidate.history.publicProgramRecords ?? []).filter(
        (record) =>
          record.kind === "appropriation" &&
          record.sourceMeasureId === measureId,
      ).length;
    expect(count(once)).toBe(1);
    expect(count(twice)).toBe(1);
  });

  it("writes no spending authority for a measure whose parts appropriate nothing", () => {
    const { world, measureId } = enacted([
      component("routes", "transit-access", "unserved-county-formula"),
      component("reporting", "agency-reporting", "annual-legislative-report", {
        subject: "administration",
      }),
    ]);
    const applied = appropriationFromEnactedMeasure(world, measureId);
    expect(
      (applied.history.publicProgramRecords ?? []).filter(
        (record) =>
          record.kind === "appropriation" &&
          record.sourceMeasureId === measureId,
      ),
    ).toEqual([]);
  });
});
