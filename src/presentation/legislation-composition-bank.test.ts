import { expect, it } from "vitest";
import { createLegislativeScenario, serializeWorld } from "../simulation";
import { BillConfigurationError } from "../simulation/legislation-drafting";
import {
  legalInstrumentRule,
  programConfigurations,
  programVariant,
  type ProgramParameterValue,
} from "../simulation/legislation-program-families";
import { availableAuthorities, fileDraft } from "./legislation-docket";
import {
  currentCompositionDraft,
  previewBillComposition,
} from "./legislation-composition";

it.each(programConfigurations())(
  "compares compatible typed edits for $familyKey / $variantKey",
  (configuration) => {
    // The existing source/catalog fixture is confined to this compiler test.
    const fixture = createLegislativeScenario("kentucky");
    const jurisdictionId =
      fixture.world.history.legislativeMeasures![0]!.jurisdictionId;
    let world = fixture.world;
    const { variant } = programVariant(
      configuration.familyKey,
      configuration.variantKey,
    );
    const rule = legalInstrumentRule(variant.instrument);
    const authority = rule.requiresPredicateAuthority
      ? availableAuthorities(world, {
          scenarioKey: "kentucky",
          playerPersonId: fixture.playerPersonId,
        }).find(
          (a) => !rule.predicateMustAuthorizeSpending || a.authorizesSpending,
        )
      : undefined;
    if (rule.requiresPredicateAuthority) expect(authority).toBeDefined();
    const filed = fileDraft(world, {
      ...configuration,
      scenarioKey: "kentucky",
      jurisdictionId,
      playerPersonId: fixture.playerPersonId,
      ...(authority ? { authorityKey: authority.authorityKey } : {}),
    });
    world = filed.world;
    const before = serializeWorld(world);
    const base = currentCompositionDraft(
      world,
      filed.bill,
      fixture.playerPersonId,
    );
    const edits: Record<string, ProgramParameterValue> = {};
    for (const spec of base.parameters) {
      const candidates: ProgramParameterValue[] =
        spec.kind === "enumerated"
          ? spec.options.map((o) => ({ kind: "enumerated", value: o.value }))
          : spec.kind === "money"
            ? [spec.minMinorUnits, spec.maxMinorUnits].map((minorUnits) => ({
                kind: "money",
                minorUnits,
                currency: spec.currency,
              }))
            : spec.kind === "integer"
              ? [spec.min, spec.max].map((value) => ({
                  kind: "integer",
                  value,
                }))
              : [spec.minYears, spec.maxYears].map((years) => ({
                  kind: "duration-years",
                  years,
                }));
      for (const candidate of candidates) {
        if (
          JSON.stringify(candidate) ===
          JSON.stringify(base.parameterValues[spec.key])
        )
          continue;
        try {
          previewBillComposition(world, filed.bill, fixture.playerPersonId, {
            ...edits,
            [spec.key]: candidate,
          });
          edits[spec.key] = candidate;
          break;
        } catch (error) {
          if (!(error instanceof BillConfigurationError)) throw error;
          // A bound may exceed the existing predicate authority; try another typed value.
        }
      }
    }
    const preview = previewBillComposition(
      world,
      filed.bill,
      fixture.playerPersonId,
      edits,
    );
    expect(
      preview.changes.length,
      `${configuration.familyKey}/${configuration.variantKey}`,
    ).toBeGreaterThan(0);
    expect(serializeWorld(world)).toBe(before);
  },
);
