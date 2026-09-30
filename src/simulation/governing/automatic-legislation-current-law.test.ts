import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stateJurisdictionForKey } from "../life-places";
import { introduceMeasure } from "../legislation";
import { compileBillDraft, draftScope } from "../legislation-drafting";
import { recordFiledProvision } from "../legislative-politics";
import { recordDraftLineage } from "../legislation-draft-lineage";
import type { EntityId, World } from "../types";
import type { ProgramParameterValue } from "../legislation-program-families";
import {
  compileAutomaticLawDraft,
  stateTransitAutomaticLawContext,
} from "./automatic-legislation";

const date = makeIsoDate;
const id = (key: string) => key as EntityId;

/** Authored compiler fixture: this does not claim a watched enactment. */
function fixture() {
  const jurisdiction = stateJurisdictionForKey("US-KY")!;
  let world = createWorld({
    seed: "explicit-saved-law-compiler-fixture",
    currentDate: date("2026-01-01"),
    jurisdictions: [jurisdiction],
    people: [],
    policyCatalog: createProductionPolicyCatalog(),
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey.endsWith("additional-rural-transit-service-hours"),
  )!;
  const context = stateTransitAutomaticLawContext(world, jurisdiction.id)!;
  const draft = compileBillDraft({
    familyKey: "appropriations",
    variantKey: "transit-staged-service-v2",
    parameterValues: {
      appropriation: { kind: "money", minorUnits: 1234567, currency: "USD" },
      "service-window": { kind: "enumerated", value: "weekend" },
    },
    scenarioKey: context.scenarioKey,
    jurisdictionId: jurisdiction.id,
    rulePackId: context.rulePackId,
    designation: "HB 100",
    filedOn: world.currentDate,
    predicateAuthority: context.predicateAuthority,
  });
  world = introduceMeasure(world, {
    stableKey: "explicit-current-law",
    jurisdictionId: jurisdiction.id,
    rulePackId: context.rulePackId,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    originChamberKey: "house",
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const clause of draft.clauses) {
    world = recordFiledProvision(world, {
      stableKey: `explicit-current-law:${clause.provisionKey}`,
      measureId,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: draftScope(draft),
      fiscalExposureLabel: clause.fiscalExposureLabel,
      fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
      ...(clause.operativeEffect
        ? { operativeEffect: clause.operativeEffect }
        : {}),
      ...(clause.fiscalPeriod ? { fiscalPeriod: clause.fiscalPeriod } : {}),
    });
  }
  world = recordDraftLineage(world, {
    stableKey: "explicit-current-law:lineage",
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    parameterValues: draft.parameterValues,
    compiledAt: draft.filedOn,
    authorityKey: context.predicateAuthority.authorityKey,
    provenanceNote: "Explicit saved-law unit fixture, not runtime proof.",
  });
  world = {
    ...world,
    currentDate: date("2026-01-05"),
    currentMoment: { ...world.currentMoment, date: date("2026-01-05") },
    history: {
      ...world.history,
      legislativeEnactments: [
        {
          id: id("fixture-enactment"),
          stableKey: "fixture-enactment",
          sequence: world.history.nextSequence,
          measureId,
          resolvedAt: date("2026-01-02"),
          outcome: "enacted",
          actDesignation: null,
          effectiveAt: date("2026-01-03"),
          outcomeEventId: id("fixture-enactment-event"),
        },
      ],
    },
  };
  const compile = (
    saved: World = world,
    intakeKey = "new-intake",
    sponsorParameterChanges?: Readonly<Record<string, ProgramParameterValue>>,
  ) =>
    compileAutomaticLawDraft({
      world: saved,
      jurisdictionId: jurisdiction.id,
      propositionId: proposition.id,
      answer: "yes",
      designation: "HB 101",
      intakeKey,
      ...(sponsorParameterChanges ? { sponsorParameterChanges } : {}),
    });
  return { world, compile, proposition, measureId, draft };
}

describe("automatic draft parameters from current saved law", () => {
  it("uses explicit sponsor changes without changing saved law or filling defaults", () => {
    const { world, compile, draft } = fixture();
    const before = JSON.stringify(world);
    const changes = {
      appropriation: {
        kind: "money" as const,
        minorUnits: 2345678,
        currency: "USD",
      },
      "service-window": { kind: "enumerated" as const, value: "weekday" },
    };
    const proposed = compile(world, "explicit-sponsor", changes);
    expect(proposed?.parameterValues).toEqual(changes);
    expect(proposed?.appropriatedMinorUnits).toBe(2345678);
    expect(compile()?.parameterValues).toEqual(draft.parameterValues);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("refuses unknown, invalid and below-bound sponsor changes instead of clamping", () => {
    const { world, compile } = fixture();
    expect(
      compile(world, "bad-key", { unknown: { kind: "integer", value: 1 } }),
    ).toBeNull();
    expect(
      compile(world, "bad-option", {
        "service-window": { kind: "enumerated", value: "invented" },
      }),
    ).toBeNull();
    expect(
      compile(world, "bad-amount", {
        appropriation: { kind: "money", minorUnits: 19999, currency: "USD" },
      }),
    ).toBeNull();
  });

  it("preserves the exact amount and service choice without seed or intake variation", () => {
    const { world, compile, draft } = fixture();
    const before = JSON.stringify(world);
    expect(compile()?.parameterValues).toEqual(draft.parameterValues);
    expect(
      compile({ ...world, seed: "a different world seed" }, "different-intake")
        ?.parameterValues,
    ).toEqual(draft.parameterValues);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("refuses a starting-law answer or missing source instead of bank defaults", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: { ...world.history, legislativeEnactments: [] },
      }),
    ).toBeNull();
  });

  it("refuses an absent saved enumerated parameter rather than filling its default", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeDraftLineages: world.history.legislativeDraftLineages!.map(
            (row) => ({
              ...row,
              parameters: row.parameters.filter(
                (p) => p.parameterKey !== "service-window",
              ),
            }),
          ),
        },
      }),
    ).toBeNull();
  });

  it("does not clamp or round a saved appropriation outside the supported bounds", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeDraftLineages: world.history.legislativeDraftLineages!.map(
            (row) => ({
              ...row,
              parameters: row.parameters.map((p) =>
                p.kind === "money" ? { ...p, minorUnits: 19999 } : p,
              ),
            }),
          ),
        },
      }),
    ).toBeNull();
  });

  it("does not read a future effective law or future lineage", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeEnactments: world.history.legislativeEnactments!.map(
            (row) => ({ ...row, effectiveAt: date("2027-01-01") }),
          ),
        },
      }),
    ).toBeNull();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeDraftLineages: world.history.legislativeDraftLineages!.map(
            (row) => ({ ...row, recordedAt: date("2027-01-01") }),
          ),
        },
      }),
    ).toBeNull();
  });

  it("refuses changed current clauses rather than reusing stale filing parameters", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeProvisions: world.history.legislativeProvisions!.map(
            (row) =>
              row.provisionKey === "amount-provided"
                ? {
                    ...row,
                    text: "An explicitly changed current amount.",
                    originAmendmentId: id("amendment"),
                  }
                : row,
          ),
        },
      }),
    ).toBeNull();
  });

  it("refuses an incompatible bank version or an ambiguous saved lineage", () => {
    const { world, compile } = fixture();
    const lineage = world.history.legislativeDraftLineages![0]!;
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeDraftLineages: [
            { ...lineage, familyVersion: "different-bank-version" },
          ],
        },
      }),
    ).toBeNull();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeDraftLineages: [
            lineage,
            { ...lineage, id: id("another-lineage") },
          ],
        },
      }),
    ).toBeNull();
  });

  it("refuses independently changed saved beneficiaries without restating bank coverage", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeProvisions: world.history.legislativeProvisions!.map(
            (row) =>
              row.provisionKey === "amount-provided"
                ? {
                    ...row,
                    beneficiary: {
                      kind: "general-application" as const,
                      appliesToLabel: "A different saved beneficiary group.",
                    },
                  }
                : row,
          ),
        },
      }),
    ).toBeNull();
  });

  it("refuses a changed annual-versus-whole-program fiscal period", () => {
    const { world, compile } = fixture();
    expect(
      compile({
        ...world,
        history: {
          ...world.history,
          legislativeProvisions: world.history.legislativeProvisions!.map(
            (row) =>
              row.provisionKey === "amount-provided"
                ? {
                    ...row,
                    fiscalPeriod:
                      row.fiscalPeriod === "annual" ? undefined : "annual",
                  }
                : row,
          ),
        },
      }),
    ).toBeNull();
  });
});
