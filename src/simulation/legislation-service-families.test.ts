import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { compareDrafts, compileBillDraft } from "./legislation-drafting";
import type { ProgramParameterValue } from "./legislation-content-contracts";
import { SERVICE_FAMILIES } from "./legislation-service-families";

function compile(
  familyKey: string,
  variantKey: string,
  parameterValues?: Readonly<Record<string, ProgramParameterValue>>,
) {
  return compileBillDraft({
    familyKey,
    variantKey,
    parameterValues,
    scenarioKey: "kentucky",
    jurisdictionId: createStableId("jurisdiction", "us-ky"),
    rulePackId: "us-ky-general-assembly",
    designation: "HB 901",
    filedOn: makeIsoDate("2026-01-14"),
  });
}

function fullText(draft: ReturnType<typeof compile>) {
  return draft.clauses.map((clause) => clause.text).join("\n");
}

describe("prospective service legislation", () => {
  it("compiles every configuration without a baseline or an invented predicate authority", () => {
    for (const family of SERVICE_FAMILIES) {
      expect(
        family.structuralProvenance.every(
          (record) => record.kind === "authored-parameter",
        ),
      ).toBe(true);
      expect(family.intendedOutcome.evidence.kind).toBe("forecast-claim");
      for (const variant of family.variants) {
        const draft = compile(family.familyKey, variant.variantKey);
        expect(draft.predicateAuthority).toBeNull();
        expect(draft.appropriatedMinorUnits).toBeNull();
        expect(draft.revenueMinorUnits).toBeNull();
        expect(fullText(draft)).not.toMatch(/undefined|\[object Object\]/);
        expect(
          new Set(draft.clauses.map((clause) => clause.provisionKey)).size,
        ).toBe(draft.clauses.length);
        expect(
          variant.parameters.every(
            (parameter) => parameter.evidence.kind === "authored-parameter",
          ),
        ).toBe(true);
      }
    }
  });

  it("changes the selected operative sentence without rewriting commencement or scope", () => {
    for (const family of SERVICE_FAMILIES) {
      for (const variant of family.variants) {
        const parameter = variant.parameters.find(
          (candidate) => candidate.key === "operative-choice",
        );
        if (!parameter || parameter.kind !== "enumerated")
          throw new Error("Missing operative choice");
        const original = compile(family.familyKey, variant.variantKey);
        for (const option of parameter.options.slice(1)) {
          const proposed = compile(family.familyKey, variant.variantKey, {
            "operative-choice": { kind: "enumerated", value: option.value },
          });
          expect(fullText(proposed)).toContain(option.clausePhrase);
          const rows = compareDrafts(original, proposed);
          expect(
            rows.filter((row) => row.changed).map((row) => row.provisionKey),
          ).toEqual([`${variant.variantKey}-operative-duty`]);
          expect(proposed.authorizedCeilingMinorUnits).toBe(
            original.authorizedCeilingMinorUnits,
          );
        }
      }
    }
  });

  it("keeps proposed commencement relative to enactment rather than silently starting at filing", () => {
    for (const family of SERVICE_FAMILIES) {
      for (const variant of family.variants) {
        const proposed = compile(family.familyKey, variant.variantKey, {
          commencement: { kind: "enumerated", value: "next-calendar-year" },
        });
        const text = fullText(proposed);
        expect(text).toContain(
          "January 1 of the calendar year following its enactment",
        );
        expect(text).not.toContain("January 14, 2026");
        expect(proposed.endsOn).toBeNull();
      }
    }
  });

  it("treats repair and conservation caps as whole-program permission, never money provided", () => {
    const examples = [
      ["education-facilities", "school-repair-authorization"],
      ["agricultural-conservation", "conservation-practice-authorization"],
    ];
    for (const [familyKey, variantKey] of examples) {
      const draft = compile(familyKey!, variantKey!, {
        "programme-ceiling": {
          kind: "money",
          minorUnits: 925_000_000,
          currency: "USD",
        },
      });
      expect(draft.authorizedCeilingMinorUnits).toBe(925_000_000);
      expect(draft.appropriatedMinorUnits).toBeNull();
      expect(fullText(draft)).toContain("$9,250,000 in total");
      expect(fullText(draft)).toContain(
        "single ceiling for the whole programme",
      );
      expect(fullText(draft)).toContain(
        "No award may be paid without a separate appropriation",
      );
    }
  });

  it("retains the substantive missingness and authority boundaries in rendered text", () => {
    expect(
      fullText(
        compile("environmental-monitoring", "monitoring-record-disclosure"),
      ),
    ).toContain("Missing observations shall not be reported as zero");
    expect(
      fullText(compile("environmental-monitoring", "monitoring-gap-response")),
    ).toContain("neither suspends an existing monitoring duty nor excuses");
    expect(
      fullText(
        compile("procurement-disclosure", "emergency-procurement-review"),
      ),
    ).toContain("This Act creates no new exception");
    expect(
      fullText(compile("social-service-access", "application-access-duty")),
    ).toContain("changes no eligibility threshold, benefit amount");
    expect(
      fullText(
        compile("veteran-transition-referrals", "transition-referral-duty"),
      ),
    ).toContain("does not establish veteran status");
    expect(
      fullText(
        compile("health-service-capacity", "service-change-referral-plan"),
      ),
    ).toContain("does not require another provider to accept a referral");
  });

  it("offers additive safeguards without inventing a monetary bargaining demand", () => {
    for (const family of SERVICE_FAMILIES) {
      for (const variant of family.variants) {
        const invitation = variant.amendmentInvitation;
        expect(invitation.requestedMinorUnits).toBe(0);
        expect(invitation.cappedMinorUnits).toBe(0);
        expect(invitation.sectionNumber).toBe(variant.clauses.length + 1);
        expect(invitation.render("$0")).not.toContain("$0");
        expect(invitation.evidence.kind).toBe("authored-parameter");
      }
    }
  });
});
