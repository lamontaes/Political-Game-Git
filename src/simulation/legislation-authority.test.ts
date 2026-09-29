import { describe, expect, it } from "vitest";

import {
  governmentMayEnactVariant,
  programConfigurations,
} from "./legislation-program-families";
import {
  enactingGovernmentForPack,
  packMayEnactVariant,
} from "./legislation-drafting";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "./legislative-institutions";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import {
  localFiscalAuthorityScopeForRulePackId,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "./municipal-government";

const refusedFor = (
  government: Parameters<typeof governmentMayEnactVariant>[0],
) =>
  programConfigurations()
    .filter(
      (row) =>
        !governmentMayEnactVariant(government, row.familyKey, row.variantKey)
          .ok,
    )
    .map((row) => row.variantKey);

describe("one authority rule for every government", () => {
  it("keeps level-written variants at their level and offers every ordinary act", () => {
    expect(refusedFor("federal")).toEqual([
      "local-fix-it-first-v1",
      "transit-staged-service-v2",
    ]);
    expect(refusedFor("state")).toEqual([
      "federal-passenger-rail-v1",
      "local-fix-it-first-v1",
    ]);
    expect(refusedFor("territory")).toEqual(refusedFor("state"));
    expect(refusedFor("municipality")).toEqual([
      "federal-passenger-rail-v1",
      "transit-staged-service-v2",
    ]);
    expect(refusedFor("county")).toEqual(refusedFor("municipality"));
    // D.C. holds state and local powers at once.
    expect(refusedFor("district-of-columbia")).toEqual([
      "federal-passenger-rail-v1",
    ]);
  });

  it("lets only a recorded charter or state law narrow a local government", () => {
    const narrowed = [
      { withheld: ["revenue-measure"] as const, reason: "Withheld." },
    ];
    expect(
      governmentMayEnactVariant(
        "municipality",
        "service-charges",
        "flat-permit-fee",
      ).ok,
    ).toBe(true);
    expect(
      governmentMayEnactVariant(
        "municipality",
        "service-charges",
        "flat-permit-fee",
        narrowed,
      ),
    ).toEqual({ ok: false, reason: "Withheld." });
    // A state is not narrowed by a local record.
    expect(
      governmentMayEnactVariant(
        "state",
        "service-charges",
        "flat-permit-fee",
        narrowed,
      ).ok,
    ).toBe(true);
  });

  it("places each legislature and refuses Kentucky the federal rail money", () => {
    const kentucky = legislativePackForJurisdiction(
      stateJurisdictionForKey("US-KY")!.id,
    )!;
    expect(enactingGovernmentForPack(kentucky)?.government).toBe("state");
    expect(
      packMayEnactVariant(
        kentucky,
        "appropriations",
        "federal-passenger-rail-v1",
      ).ok,
    ).toBe(false);
    const congress = legislativePackForWorkKey("institution:us-congress-v1")!;
    expect(enactingGovernmentForPack(congress)?.government).toBe("federal");
    expect(
      packMayEnactVariant(
        congress,
        "appropriations",
        "federal-passenger-rail-v1",
      ).ok,
    ).toBe(true);
  });

  it("gives the D.C. Council, whose rules are its own recorded charter, ordinary fiscal authority", () => {
    const dc = municipalGovernmentForLifePlace(requireLifePlace("1150000"))!;
    const rules = municipalRulePackFor(dc);
    expect(rules.ok && rules.evidence).toBe("enacted-text");
    if (!rules.ok) return;
    expect(enactingGovernmentForPack(rules.pack)?.government).toBe(
      "district-of-columbia",
    );
    const scope = localFiscalAuthorityScopeForRulePackId(rules.pack.packId);
    expect(scope?.authority.permittedEffects).toEqual([
      "tax-policy",
      "public-program-appropriation",
    ]);
    expect(scope?.authority.rulePackId).toBe(rules.pack.packId);
    // Its council can now draft under its own pack.
    expect(
      legislativePackForWorkKey(`institution:${rules.pack.packId}`),
    ).not.toBeNull();
  });
});
