import { describe, expect, it } from "vitest";

import {
  assertExecutiveAuthorityPackIntegrity,
  isPluralExecutive,
  resolvePresentmentAuthority,
  type ExecutiveAuthorityRulePack,
} from "./executive-authority-rules";
import {
  ALASKA_EXECUTIVE_PACK,
  EXECUTIVE_AUTHORITY_RULE_PACKS,
  ILLINOIS_EXECUTIVE_PACK,
  KENTUCKY_EXECUTIVE_PACK,
  MINNESOTA_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  UNRESEARCHED_JURISDICTIONS,
  US_FEDERAL_EXECUTIVE_PACK,
  executiveRulePackById,
  executiveRulePackForJurisdiction,
} from "./executive-authority-rule-packs";
import {
  ALASKA_RULE_PACK,
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  rulePackById,
} from "./legislature-rule-packs";
import { isKnown, knownValueOrNull } from "./legislature-rules";

describe("executive-authority pack integrity", () => {
  it("every registered pack is internally coherent and fully sourced", () => {
    expect(EXECUTIVE_AUTHORITY_RULE_PACKS.length).toBe(6);
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
      expect(pack.sources.length).toBeGreaterThan(0);
    }
  });

  it("has unique pack ids and jurisdiction keys", () => {
    const packIds = EXECUTIVE_AUTHORITY_RULE_PACKS.map((pack) => pack.packId);
    const jurisdictionKeys = EXECUTIVE_AUTHORITY_RULE_PACKS.map(
      (pack) => pack.jurisdictionKey,
    );
    expect(new Set(packIds).size).toBe(packIds.length);
    expect(new Set(jurisdictionKeys).size).toBe(jurisdictionKeys.length);
  });

  it("resolves packs by id and jurisdiction, and rejects the unknown", () => {
    expect(executiveRulePackById("us-ak-governor-v1")).toBe(
      ALASKA_EXECUTIVE_PACK,
    );
    expect(executiveRulePackForJurisdiction("US-IL")).toBe(
      ILLINOIS_EXECUTIVE_PACK,
    );
    expect(executiveRulePackForJurisdiction("US-XX")).toBeNull();
    expect(() => executiveRulePackById("nope")).toThrow(/No executive/);
  });

  it("rejects a pack that claims a plural branch but lists no officers", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...ALASKA_EXECUTIVE_PACK,
      office: {
        ...ALASKA_EXECUTIVE_PACK.office,
        branchStructure: {
          kind: "known",
          value: "plural",
          source: ALASKA_EXECUTIVE_PACK.office.source,
        },
      },
      pluralExecutive: [],
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /plural executive but lists no independent officers/,
    );
  });
});

describe("executive-authority: real jurisdictional differences", () => {
  it("separates a unitary executive from a plural one, from sourced facts", () => {
    // The federal executive and Alaska are unitary; the other four states are
    // plural. This is not a label: the plural states list independently elected
    // officers, and the unitary ones list none.
    expect(isPluralExecutive(US_FEDERAL_EXECUTIVE_PACK)).toBe(false);
    expect(isPluralExecutive(ALASKA_EXECUTIVE_PACK)).toBe(false);
    expect(US_FEDERAL_EXECUTIVE_PACK.pluralExecutive).toHaveLength(0);
    expect(ALASKA_EXECUTIVE_PACK.pluralExecutive).toHaveLength(0);

    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(isPluralExecutive(pack)).toBe(true);
      expect(pack.pluralExecutive.length).toBeGreaterThan(0);
      // Every listed officer is a resolved, independently-elected constraint.
      for (const officer of pack.pluralExecutive) {
        expect(knownValueOrNull(officer.independentlyElected)).toBe(true);
      }
    }

    // Kentucky and Illinois genuinely differ in which officers they elect.
    const kyOffices = KENTUCKY_EXECUTIVE_PACK.pluralExecutive.map(
      (officer) => officer.officeLabel,
    );
    const ilOffices = ILLINOIS_EXECUTIVE_PACK.pluralExecutive.map(
      (officer) => officer.officeLabel,
    );
    expect(kyOffices).toContain("Commissioner of Agriculture");
    expect(ilOffices).not.toContain("Commissioner of Agriculture");
    expect(ilOffices).toContain("Comptroller");
    expect(kyOffices).not.toContain("Comptroller");
  });

  it("distinguishes appointment-confirmation regimes that the research resolved", () => {
    // Alaska resolved a real confirmation body — the Legislature in joint
    // session — and Illinois resolved Senate advice and consent. Kentucky,
    // Nebraska and Minnesota did not resolve a general confirmation rule, so it
    // stays unknown rather than defaulting to false.
    expect(
      knownValueOrNull(
        ALASKA_EXECUTIVE_PACK.appointment.legislativeConfirmationRequired,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(ALASKA_EXECUTIVE_PACK.appointment.confirmingBody),
    ).toMatch(/joint session/);

    expect(
      knownValueOrNull(
        ILLINOIS_EXECUTIVE_PACK.appointment.legislativeConfirmationRequired,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(ILLINOIS_EXECUTIVE_PACK.appointment.confirmingBody),
    ).toBe("the Senate");

    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
    ]) {
      expect(pack.appointment.legislativeConfirmationRequired.kind).toBe(
        "unknown",
      );
    }
  });

  it("keeps the federal Article II clemency power distinct and sole", () => {
    // The federal pardon power is executive-sole and resolved; no state pack
    // asserts a clemency model, because the state research never reached it.
    expect(knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.clemency.model)).toBe(
      "executive-sole",
    );
    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      ALASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(pack.clemency.model.kind).toBe("unknown");
    }
  });

  it("carries the unresearched dimensions as unknown in every state pack", () => {
    // The nine dimensions 92A never researched must be unknown — not zero, not
    // not-applicable — everywhere.
    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      ALASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(pack.specialSession.executiveMayConvene.kind).toBe("unknown");
      expect(pack.executiveDirective.hasDirectiveAuthority.kind).toBe(
        "unknown",
      );
      expect(pack.reorganization.executiveMayReorganize.kind).toBe("unknown");
      expect(pack.emergencyDeclaration.executiveMayDeclare.kind).toBe(
        "unknown",
      );
      expect(pack.budgetSubmission.executiveMustSubmit.kind).toBe("unknown");
      expect(pack.administrative.faithfulExecutionDuty.kind).toBe("unknown");
      expect(pack.guard.commandsMilitia.kind).toBe("unknown");
      expect(pack.removal.mode.kind).toBe("unknown");
    }
  });

  it("resolves the federal special-session/take-care clauses the states leave unknown", () => {
    // The one place the federal and state packs invert: Article II resolves the
    // convening power and the take-care duty, which no state pack reached.
    expect(
      knownValueOrNull(
        US_FEDERAL_EXECUTIVE_PACK.specialSession.executiveMayConvene,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(
        US_FEDERAL_EXECUTIVE_PACK.administrative.faithfulExecutionDuty,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.guard.commandsMilitia),
    ).toBe(true);
  });
});

describe("executive-authority: presentment composition, not duplication", () => {
  it("resolves presentment from the legislative pack that owns it", () => {
    // Kentucky, Nebraska and Alaska each reference a compiled legislative pack.
    // The reader returns that pack's own executive rule — the same object,
    // proving the executive pack stores no copy of presentment/veto.
    const kyLegis = rulePackById("us-ky-general-assembly-v1");
    const resolved = resolvePresentmentAuthority(
      KENTUCKY_EXECUTIVE_PACK,
      kyLegis,
    );
    expect(resolved).toBe(KENTUCKY_RULE_PACK.executive);
    // The line-item veto lives in the legislative pack, and only there.
    expect(knownValueOrNull(resolved.lineItemVeto)).toBe(true);
    expect(resolved.override.kind).toBe("each-chamber");

    // Nebraska's override is a three-fifths bar; Alaska's is a joint session.
    const neResolved = resolvePresentmentAuthority(
      NEBRASKA_EXECUTIVE_PACK,
      NEBRASKA_RULE_PACK,
    );
    expect(neResolved.override.kind).toBe("each-chamber");
    if (neResolved.override.kind === "each-chamber") {
      expect(neResolved.override.threshold.numerator).toBe(3);
      expect(neResolved.override.threshold.denominatorParts).toBe(5);
    }

    const akResolved = resolvePresentmentAuthority(
      ALASKA_EXECUTIVE_PACK,
      ALASKA_RULE_PACK,
    );
    expect(akResolved.override.kind).toBe("joint-session");
  });

  it("rejects a legislative pack that is not the one referenced", () => {
    // Kentucky's executive pack must not resolve against Nebraska's legislature.
    expect(() =>
      resolvePresentmentAuthority(KENTUCKY_EXECUTIVE_PACK, NEBRASKA_RULE_PACK),
    ).toThrow(/references legislative pack/);
  });

  it("refuses to resolve presentment where no legislative pack is referenced", () => {
    // Minnesota, Illinois and the federal executive have no compiled
    // legislative pack, so the reference is unknown and the reader fails closed
    // instead of inventing one.
    expect(
      MINNESOTA_EXECUTIVE_PACK.presentment.legislativeRulePackId.kind,
    ).toBe("unknown");
    expect(ILLINOIS_EXECUTIVE_PACK.presentment.legislativeRulePackId.kind).toBe(
      "unknown",
    );
    expect(
      US_FEDERAL_EXECUTIVE_PACK.presentment.legislativeRulePackId.kind,
    ).toBe("unknown");
    expect(() =>
      resolvePresentmentAuthority(MINNESOTA_EXECUTIVE_PACK, KENTUCKY_RULE_PACK),
    ).toThrow(/does not reference a legislative pack/);
  });
});

describe("executive-authority: honest corpus boundaries", () => {
  it("names Wisconsin as an unresearched gap rather than fabricating a pack", () => {
    expect(executiveRulePackForJurisdiction("US-WI")).toBeNull();
    const wisconsin = UNRESEARCHED_JURISDICTIONS.find(
      (entry) => entry.jurisdictionKey === "US-WI",
    );
    expect(wisconsin).toBeDefined();
    expect(wisconsin?.reason).toMatch(/no.*research/i);
  });

  it("marks federal Article II sources as not independently verified", () => {
    // The federal clauses are asserted but their evidence is unresolved: the
    // pack does not pretend to have retrieved and checked the text.
    for (const src of US_FEDERAL_EXECUTIVE_PACK.sources) {
      expect(src.verification).toBe("unresolved");
      expect(src.note).toMatch(/not retrieved and verified/);
    }
    // The known Article II values still carry those sources.
    expect(isKnown(US_FEDERAL_EXECUTIVE_PACK.office.branchStructure)).toBe(
      true,
    );
  });
});
