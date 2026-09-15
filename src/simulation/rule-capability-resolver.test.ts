import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import {
  GOVERNMENT_UNITS_META,
  governmentUnit,
  governmentUnitsForPlace,
  governmentUnitsForState,
} from "./government-units";
import { municipalGovernmentByKey } from "./municipal-government";
import {
  RULES_CAPABILITY_VERSION,
  municipalGovernmentForUnit,
  resolveCapability,
  resolveCapabilityField,
} from "./rule-capability-resolver";

const OPENING = makeIsoDate("2026-01-05");

function field(resolution: ReturnType<typeof resolveCapability>, name: string) {
  return resolution.fields.find((entry) => entry.field === name)!;
}

describe("rules-capability/v1 at state scope", () => {
  it("admits Nevada's Assembly qualifications from 2025-10-01 and refuses the day before on the named field", () => {
    const on = resolveCapability({
      scope: { kind: "state", stateUsps: "NV" },
      officeKey: "us-nv-legislature-v1:assembly",
      action: "stand-for-office",
      onDate: OPENING,
    });
    expect(on.resolverVersion).toBe(RULES_CAPABILITY_VERSION);
    expect(on.refusal).toBeNull();
    expect(field(on, "qualification.minimumAge")).toMatchObject({
      state: "ADMITTED",
      value: 21,
      ruleScope: "state-statute",
      validFrom: "2025-10-01",
      source: { citation: "NRS 218A.200" },
    });
    expect(field(on, "body.seats").state).toMatch(/ADMITTED|UNKNOWN/);
    // Election timing is not compiled; that never blocks standing for office.
    expect(field(on, "election.date").state).toBe("UNKNOWN");

    const before = resolveCapability({
      scope: { kind: "state", stateUsps: "NV" },
      officeKey: "us-nv-legislature-v1:assembly",
      action: "stand-for-office",
      onDate: makeIsoDate("2025-09-30"),
    });
    expect(before.refusal).toMatch(
      /^qualification\.minimumAge is not established: NRS 218A\.200 is supported from 2025-10-01/,
    );
  });

  it("refuses Nevada's Senate on its own missing row without borrowing the Assembly's", () => {
    const senate = resolveCapability({
      scope: { kind: "state", stateUsps: "NV" },
      officeKey: "us-nv-legislature-v1:senate",
      action: "stand-for-office",
      onDate: OPENING,
    });
    expect(field(senate, "qualification.minimumAge").state).toBe("UNKNOWN");
    expect(senate.refusal).toMatch(/qualification\.minimumAge/);
    expect(field(senate, "institution.form")).toMatchObject({
      state: "ADMITTED",
      value: "bicameral",
    });
  });

  it("reads Alaska's rule set and Kentucky's term rule, and keeps an uncompiled state inspectable", () => {
    const alaska = resolveCapability({
      scope: { kind: "state", stateUsps: "AK" },
      officeKey: "us-ak-legislature-v1:house",
      action: "stand-for-office",
      onDate: makeIsoDate("2026-09-10"),
    });
    expect(field(alaska, "qualification.minimumAge")).toMatchObject({
      state: "ADMITTED",
      value: 21,
    });

    const kentucky = resolveCapability({
      scope: { kind: "state", stateUsps: "KY" },
      officeKey: "us-ky-general-assembly-v1:senate",
      action: "enter-office-term",
      onDate: OPENING,
    });
    expect(kentucky.refusal).toBeNull();
    expect(field(kentucky, "term.years")).toMatchObject({
      state: "ADMITTED",
      value: 4,
    });
    // term.start is the frozen v1 tagged union; term.expiry is derived from it.
    expect(field(kentucky, "term.start").value).toEqual({
      kind: "january-first-following-election",
    });
    expect(field(kentucky, "term.expiry").value).toEqual({
      kind: "derived-from-start",
      years: 4,
    });

    const texas = resolveCapability({
      scope: { kind: "state", stateUsps: "TX" },
      action: "inspect",
      onDate: OPENING,
    });
    expect(texas.refusal).toBeNull();
    expect(field(texas, "institution.form").state).toBe("UNKNOWN");
    expect(
      resolveCapability({
        scope: { kind: "state", stateUsps: "TX" },
        officeKey: "us-tx-legislature-v1:house",
        action: "stand-for-office",
        onDate: OPENING,
      }).refusal,
    ).toMatch(/qualification\.minimumAge/);
  });
});

describe("rules-capability/v1 at local scope", () => {
  it("resolves the real government unit, not a statistical place", () => {
    expect(GOVERNMENT_UNITS_META.unitCount).toBe(38704);
    expect(governmentUnitsForPlace("5114968").map((unit) => unit.id)).toEqual([
      "gus2025:194177",
    ]);
    // Alamo, Nevada is a census-designated place with no government of its own.
    expect(governmentUnitsForPlace("3200500")).toEqual([]);
    expect(governmentUnit("gus2025:108905")).toMatchObject({
      name: "COUNTY OF LINCOLN",
      unitType: "county",
      stateUsps: "NV",
      countyGeoid: "32017",
      placeGeoid: null,
    });
    expect(
      new Set(
        ["AL", "AK", "CA", "NY", "TX", "WY"].map(
          (usps) => governmentUnitsForState(usps).length > 0,
        ),
      ),
    ).toEqual(new Set([true]));
  });

  it("admits Charlottesville's ordinance route from its City Code and refuses Richmond on the one field it lacks", () => {
    const cville = resolveCapability({
      scope: { kind: "local", governmentUnitId: "gus2025:194177" },
      action: "pass-ordinance",
      onDate: OPENING,
    });
    expect(cville.unit?.name).toBe("CITY OF CHARLOTTESVILLE");
    expect(cville.refusal).toBeNull();
    expect(field(cville, "ordinance.introductionToPassage")).toMatchObject({
      state: "ADMITTED",
      ruleScope: "local-instrument",
      source: { citation: "City Code § 2-97" },
    });
    expect(field(cville, "ordinance.effective").source?.citation).toBe(
      "City Code § 2-99",
    );
    expect(field(cville, "finance.appropriationVote")).toMatchObject({
      state: "ADMITTED",
      ruleScope: "government-class",
      source: { citation: "Code of Virginia § 15.2-1428" },
    });

    const richmondKey =
      municipalGovernmentByKey("us-va-richmond")!.identity!.publisherId;
    const richmond = resolveCapability({
      scope: { kind: "local", governmentUnitId: `gus2025:${richmondKey}` },
      action: "pass-ordinance",
      onDate: OPENING,
    });
    expect(field(richmond, "body.seats")).toMatchObject({
      state: "ADMITTED",
      value: 9,
    });
    expect(richmond.refusal).not.toBeNull();
  });

  it("gives an uncompiled Virginia town the class statute and only an inherited default for passage", () => {
    const town = governmentUnitsForState("VA").find(
      (unit) =>
        unit.unitType === "municipality" &&
        unit.functionalActive &&
        municipalGovernmentForUnit(unit) === null,
    )!;
    const resolution = resolveCapability({
      scope: { kind: "local", governmentUnitId: town.id },
      action: "pass-appropriation",
      onDate: OPENING,
    });
    expect(field(resolution, "finance.appropriationVote").state).toBe(
      "ADMITTED",
    );
    // No council size is established, so the appropriation still refuses.
    expect(resolution.refusal).toMatch(/^body\.seats/);
    const passage = field(resolution, "ordinance.passage");
    expect(passage.state).toBe("UNKNOWN");
    expect(passage.inheritedDefault?.citation).toBe(
      "Code of Virginia § 15.2-1427(A)",
    );

    expect(
      resolveCapabilityField({
        scope: { kind: "local", governmentUnitId: "gus2025:108905" },
        field: "institution.form",
        onDate: OPENING,
      }).state,
    ).toBe("UNKNOWN");
    expect(
      resolveCapability({
        scope: { kind: "local", governmentUnitId: "gus2025:000000" },
        action: "inspect",
        onDate: OPENING,
      }).refusal,
    ).toMatch(/not a general-purpose government/);
  });
});
