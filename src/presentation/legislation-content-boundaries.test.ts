import { describe, expect, it } from "vitest";
import {
  availableMeasureSteps,
  createLegislativeScenario,
  currentMeasureProvisions,
  deserializeWorld,
  measurePosition,
  recordFiledProvision,
  serializeWorld,
} from "../simulation";
import {
  programVariant,
  standingAuthorities,
} from "../simulation/legislation-program-families";
import { billFiscalReading } from "./legislation-analysis";
import {
  availableAuthorities,
  fileDraft,
  previewDraft,
  resolveAuthority,
} from "./legislation-docket";
import { applyLegislativeStep } from "./legislation-session";

function setup(
  familyKey = "broadband-access",
  variantKey = "unserved-buildout",
) {
  const scenario = createLegislativeScenario("kentucky");
  const jurisdictionId =
    scenario.world.history.legislativeMeasures![0]!.jurisdictionId;
  const input = {
    scenarioKey: "kentucky",
    jurisdictionId,
    playerPersonId: scenario.playerPersonId,
    familyKey,
    variantKey,
  };
  return { scenario, input, ...fileDraft(scenario.world, input) };
}

describe("expanded content keeps proposed law and fiscal meanings separate", () => {
  it("makes every section of a linked pending bill conditional, then refuses a failed reference", () => {
    const staged = setup();
    const key = `docket:${staged.bill.docketKey}`;
    const authority = resolveAuthority(staged.world, staged.input, key)!;
    expect(authority.kind).toBe("docket-measure");
    if (authority.kind === "docket-measure")
      expect(authority.legalStatus).toBe("proposed");
    expect(
      availableAuthorities(staged.world, staged.input).find(
        (a) => a.authorityKey === key,
      )!.note,
    ).toContain("not law");
    const linked = fileDraft(staged.world, {
      ...staged.input,
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: key,
    });
    expect(
      currentMeasureProvisions(linked.world, linked.bill.measureId).every((p) =>
        p.text.startsWith(
          `This section takes effect only if ${authority.citationLabel} has become law.`,
        ),
      ),
    ).toBe(true);
    const context = {
      ...staged.scenario,
      measureId: staged.bill.measureId,
      votePlan: Object.fromEntries(
        Object.keys(staged.scenario.votePlan).map((k) => [
          k,
          { yea: 0, nay: 1 },
        ]),
      ),
    };
    let world = applyLegislativeStep(
      context,
      linked.world,
      "request-referral",
    ).world;
    world = applyLegislativeStep(context, world, "move-committee-report").world;
    expect(measurePosition(world, staged.bill.measureId).phase).toBe("failed");
    expect(resolveAuthority(world, staged.input, key)).toBeNull();
    const before = serializeWorld(world);
    expect(() =>
      fileDraft(world, {
        ...staged.input,
        familyKey: "appropriations",
        variantKey: "single-programme",
        authorityKey: key,
      }),
    ).toThrow();
    expect(serializeWorld(world)).toBe(before);
    expect(currentMeasureProvisions(world, linked.bill.measureId)).toEqual(
      currentMeasureProvisions(linked.world, linked.bill.measureId),
    );
  });

  it("recognizes recorded enactment without treating passage as spent money", () => {
    const staged = setup();
    const context = {
      ...staged.scenario,
      measureId: staged.bill.measureId,
      governorAction: "signed" as const,
    };
    let world = staged.world;
    for (
      let i = 0;
      i < 30 &&
      measurePosition(world, staged.bill.measureId).phase !== "enacted";
      i++
    ) {
      const step = availableMeasureSteps(world, staged.bill.measureId).find(
        (s) => s !== "offer-amendment",
      );
      expect(step).toBeDefined();
      world = applyLegislativeStep(context, world, step!).world;
    }
    expect(measurePosition(world, staged.bill.measureId).phase).toBe("enacted");
    const authority = resolveAuthority(
      world,
      staged.input,
      `docket:${staged.bill.docketKey}`,
    )!;
    expect(authority.kind === "docket-measure" && authority.legalStatus).toBe(
      "enacted",
    );
    expect(world.history.policyRealizations).toEqual(
      staged.world.history.policyRealizations,
    );
  });

  it("preserves annual caps through filing/save and refuses a whole-programme comparison", () => {
    const staged = setup("public-workforce", "authorize-positions");
    const world = deserializeWorld(serializeWorld(staged.world));
    const cap = currentMeasureProvisions(world, staged.bill.measureId).find(
      (p) => p.fiscalExposureMinorUnits !== null,
    )!;
    expect(cap.fiscalPeriod).toBe("annual");
    expect(billFiscalReading(world, staged.bill).statedCeilingLabel).toContain(
      "per year",
    );
    const key = `docket:${staged.bill.docketKey}`;
    expect(resolveAuthority(world, staged.input, key)!.authorizesSpending).toBe(
      false,
    );
    const before = serializeWorld(world);
    expect(() =>
      fileDraft(world, {
        ...staged.input,
        familyKey: "appropriations",
        variantKey: "single-programme",
        authorityKey: key,
      }),
    ).toThrow();
    expect(serializeWorld(world)).toBe(before);
    const invalid = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map((p) =>
          p.id === cap.id ? { ...p, fiscalPeriod: "monthly" as "annual" } : p,
        ),
      },
    };
    expect(() => serializeWorld(invalid)).toThrow(/annual fiscal period/);
  });

  it("does not add annual and one-time amounts", () => {
    const staged = setup("public-workforce", "authorize-positions");
    const world = recordFiledProvision(staged.world, {
      stableKey: "test:one-time-setup",
      measureId: staged.bill.measureId,
      provisionKey: "setup",
      sectionNumber: 20,
      heading: "One-time setup",
      text: "A one-time setup ceiling of $100.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the proposed programme",
      },
      applicationScope: {
        jurisdictionId: staged.input.jurisdictionId,
        segmentKey: null,
      },
      fiscalExposureMinorUnits: 10_000,
      fiscalExposureLabel: "$100 total",
    });
    const reading = billFiscalReading(world, staged.bill);
    expect(reading.statedCeilingMinorUnits).toBeNull();
    expect(reading.effect.kind).toBe("unclassified-amount");
    expect(reading.basis).toContain("not added together");
  });

  it("uses the revenue instrument and keeps the transaction unit in the reading", () => {
    const variant = programVariant("service-charges", "flat-permit-fee");
    const staged = setup(variant.family.familyKey, variant.variant.variantKey);
    const reading = billFiscalReading(staged.world, staged.bill);
    expect(reading.effect.kind).toBe("collects-charge");
    expect(reading.statedCeilingLabel).toContain("per permit");
    expect(reading.basis).toContain("not total revenue");
    const renamed = {
      ...staged.world,
      history: {
        ...staged.world.history,
        legislativeProvisions: staged.world.history.legislativeProvisions!.map(
          (p) =>
            p.measureId === staged.bill.measureId &&
            p.fiscalExposureMinorUnits !== null
              ? { ...p, fiscalExposureLabel: "Permit charge" }
              : p,
        ),
      },
    };
    expect(billFiscalReading(renamed, staged.bill).effect.kind).toBe(
      "collects-charge",
    );
  });

  it("states a replacement expiration without inventing the previous expiration", () => {
    const staged = setup();
    const draft = previewDraft({
      ...staged.input,
      familyKey: "program-sunset",
      variantKey: "extend-authority",
      filedOn: staged.world.currentDate,
      provisionalSequence: 2,
      predicateAuthority: standingAuthorities()[0]!,
    });
    expect(draft.clauses.map((c) => c.text).join(" ")).toContain(
      "expiration date",
    );
    expect(draft.clauses.map((c) => c.text).join(" ")).not.toContain(
      "extended by",
    );
    expect(
      draft.parameters.find((p) => p.key === "extension-term")!.label,
    ).toContain("from filing");
  });
});
