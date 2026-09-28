import { describe, expect, it } from "vitest";

import { compileBillDraft } from "../simulation/legislation-drafting";
import {
  programConfigurations,
  standingAuthorities,
  type PredicateAuthority,
} from "../simulation/legislation-program-families";
import { draftFiscalNote } from "./legislation-analysis";
import { bargainingSubjectFactsForDraft } from "./legislative-bargaining-brief";

/**
 * Spec 3, step 2: every bill in the bank shows a fiscal note when drafted.
 * Each section either carries an estimate or names the input the world is
 * missing; a missing input is never shown as zero.
 */
function draftFor(familyKey: string, variantKey: string) {
  let lastError: unknown = null;
  for (const authority of [undefined, ...standingAuthorities()] as (
    PredicateAuthority | undefined
  )[]) {
    try {
      return compileBillDraft({
        familyKey,
        variantKey,
        scenarioKey: "kentucky",
        jurisdictionId: "jurisdiction_test" as never,
        rulePackId: "us-ky-general-assembly",
        designation: "HB 1",
        filedOn: "2026-01-14" as never,
        ...(authority ? { predicateAuthority: authority } : {}),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

describe("a fiscal note on every drafted bill", () => {
  const configurations = programConfigurations();

  it("covers the whole bank", () => {
    expect(configurations.length).toBeGreaterThanOrEqual(43);
  });

  it.each(configurations.map((c) => [c.familyKey, c.variantKey] as const))(
    "%s / %s",
    (familyKey, variantKey) => {
      const note = draftFiscalNote(draftFor(familyKey, variantKey));
      expect(note.status).toBe("draft");
      expect(note.parts.length).toBeGreaterThan(0);
      for (const part of note.parts) {
        expect(part.lever, part.provisionKey).not.toBe("unclassified");
        if (part.forecastMinorUnits === null)
          expect(part.missingInput, part.provisionKey).toBeTruthy();
        expect(part.statedAmountMinorUnits, part.provisionKey).not.toBe(0);
      }
    },
  );

  it("reads an appropriation as money provided, not as nothing", () => {
    const draft = draftFor("appropriations", "single-programme");
    expect(draft.appropriatedLabel).not.toBeNull();
    const money = draftFiscalNote(draft).parts.find(
      (part) => part.amountKind === "appropriation",
    );
    expect(money?.statedAmountMinorUnits).toBe(draft.appropriatedMinorUnits);
  });
});

describe("the sitting's fiscal facts", () => {
  it("say what a spending bill provides instead of calling it nothing", () => {
    const draft = draftFor("appropriations", "single-programme");
    const facts = bargainingSubjectFactsForDraft({
      draft,
      measureId: "legislative-measure_test" as never,
      measureStableKey: "test",
      chamberName: "House",
      nextStepLabel: "final passage",
      fiscalNoteEventStableKey: "test:note",
      analystPersonId: "person_a" as never,
      advocatePersonId: "person_b" as never,
      guardianPersonId: "person_c" as never,
    });
    expect(facts.billAmountLabel).toBe(draft.appropriatedLabel);
    expect(facts.billAmountLabel).not.toContain("nothing");
  });
});
