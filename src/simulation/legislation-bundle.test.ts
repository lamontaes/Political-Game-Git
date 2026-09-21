import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  MeasureBundleError,
  bundleClauses,
  compileMeasureBundle,
  componentForProvision,
  type MeasureComponentInput,
} from "./legislation-bundle";
import { standingAuthority } from "./legislation-program-families";

/**
 * NATIONWIDE1 section 4: a measure that actually combines parts.
 *
 * Every component here is a real configuration from the shipped content bank,
 * not a fixture written to make the envelope look like it works. A bundle that
 * only composes invented families would prove nothing about whether the
 * existing compiler can be reused as a component adapter, which is the whole
 * question this module exists to answer.
 *
 * The worked example is the one the contract names: a deficient service area
 * combining route service, fare eligibility, public reporting and money.
 */

const KENTUCKY = {
  scenarioKey: "kentucky",
  jurisdictionId: createStableId("jurisdiction", "us-ky"),
  rulePackId: "us-ky-general-assembly",
} as const;

const transitFund = () =>
  standingAuthority("standing:rural-transit-assistance")!;

function component(
  componentKey: string,
  familyKey: string,
  variantKey: string,
  extra: Partial<MeasureComponentInput> = {},
): MeasureComponentInput {
  return {
    componentKey,
    familyKey,
    variantKey,
    jurisdictionId: KENTUCKY.jurisdictionId,
    rulePackId: KENTUCKY.rulePackId,
    subject: "transit",
    ...extra,
  };
}

/** Route service, fare eligibility, reporting and the money for it. */
function transitPackage(): readonly MeasureComponentInput[] {
  return [
    component("routes", "transit-access", "unserved-county-formula"),
    component("fares", "transit-access", "enrollment-fare-relief"),
    component("reporting", "agency-reporting", "annual-legislative-report"),
    component("money", "appropriations", "transit-staged-service-v1", {
      predicateAuthority: transitFund(),
      dependsOn: ["routes"],
    }),
  ];
}

const bundleOf = (
  components: readonly MeasureComponentInput[],
  rule: "unrestricted" | "single-subject" = "unrestricted",
) =>
  compileMeasureBundle({
    scenarioKey: KENTUCKY.scenarioKey,
    designation: "HB 900",
    filedOn: makeIsoDate("2026-01-14"),
    components,
    subjectRule: rule,
  });

describe("NATIONWIDE1: a measure carries more than one part", () => {
  it("compiles four real configurations into one measure", () => {
    const bundle = bundleOf(transitPackage());
    expect(bundle.components.map((entry) => entry.componentKey).sort()).toEqual(
      ["fares", "money", "reporting", "routes"],
    );
    // Every component is a real bill in its own right; the envelope adds no
    // clause of its own and invents no text.
    for (const entry of bundle.components) {
      expect(entry.clauses.length).toBeGreaterThan(0);
      expect(entry.draft.clauses.length).toBe(entry.clauses.length);
    }
  });

  it("numbers the measure's sections once through, across components", () => {
    const clauses = bundleClauses(bundleOf(transitPackage()));
    expect(clauses.map((clause) => clause.sectionNumber)).toEqual(
      clauses.map((_, index) => index + 1),
    );
  });

  it("namespaces each provision under its component, so two of a family do not collide", () => {
    const bundle = bundleOf(transitPackage());
    const keys = bundleClauses(bundle).map((clause) => clause.provisionKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of bundle.components) {
      for (const clause of entry.clauses) {
        expect(clause.provisionKey.startsWith(`${entry.componentKey}:`)).toBe(
          true,
        );
      }
    }
    // Both transit components come from one family, so without the namespace
    // their provision keys would be the same strings.
    const routeKeys = bundle.components
      .find((entry) => entry.componentKey === "routes")!
      .draft.clauses.map((clause) => clause.provisionKey);
    const fareKeys = bundle.components
      .find((entry) => entry.componentKey === "fares")!
      .draft.clauses.map((clause) => clause.provisionKey);
    expect(routeKeys.some((key) => fareKeys.includes(key))).toBe(true);
  });

  it("finds the component a namespaced provision belongs to", () => {
    const bundle = bundleOf(transitPackage());
    const clause = bundleClauses(bundle).at(-1)!;
    expect(
      componentForProvision(bundle, clause.provisionKey)?.componentKey,
    ).toBe(bundle.components.at(-1)!.componentKey);
    expect(componentForProvision(bundle, "nothing:here")).toBeNull();
  });
});

describe("NATIONWIDE1: the money stays three different claims", () => {
  it("keeps ceilings, appropriations and charges apart and never nets them", () => {
    const bundle = bundleOf(transitPackage());
    const { totals } = bundle;
    // The appropriation provides money; the authorizations state ceilings.
    // Neither figure is folded into the other, and no net appears anywhere.
    expect(totals.appropriatedMinorUnits.USD).toBeGreaterThan(0);
    expect(totals.authorizedCeilingMinorUnits.USD).toBeGreaterThan(0);
    expect(totals.revenueMinorUnits).toEqual({});
    expect(Object.keys(totals)).toEqual([
      "authorizedCeilingMinorUnits",
      "appropriatedMinorUnits",
      "revenueMinorUnits",
    ]);
  });

  it("adds a charge into its own total, not against what is spent", () => {
    const bundle = bundleOf([
      component("routes", "transit-access", "unserved-county-formula"),
      component("fee", "service-charges", "flat-permit-fee"),
    ]);
    expect(bundle.totals.revenueMinorUnits.USD).toBeGreaterThan(0);
    expect(bundle.totals.authorizedCeilingMinorUnits.USD).toBeGreaterThan(0);
    expect(bundle.totals.appropriatedMinorUnits).toEqual({});
  });

  it("groups by currency rather than adding across them", () => {
    const bundle = bundleOf(transitPackage());
    for (const total of Object.values(bundle.totals)) {
      expect(Object.keys(total).every((code) => /^[A-Z]{3}$/.test(code))).toBe(
        true,
      );
    }
  });
});

describe("NATIONWIDE1: components take effect in dependency order", () => {
  it("puts an appropriation after the authority it waits on, whatever the caller's order", () => {
    const listedFirst = [
      component("money", "appropriations", "transit-staged-service-v1", {
        predicateAuthority: transitFund(),
        dependsOn: ["routes"],
      }),
      component("routes", "transit-access", "unserved-county-formula"),
    ];
    const order = bundleOf(listedFirst).components.map(
      (entry) => entry.componentKey,
    );
    expect(order).toEqual(["routes", "money"]);
  });

  it("names the members of a cycle rather than reporting that one exists", () => {
    const cyclic = [
      component("a", "transit-access", "unserved-county-formula", {
        dependsOn: ["b"],
      }),
      component("b", "transit-access", "enrollment-fare-relief", {
        dependsOn: ["a"],
      }),
    ];
    expect(() => bundleOf(cyclic)).toThrow(MeasureBundleError);
    expect(() => bundleOf(cyclic)).toThrow(/a -> b -> a|b -> a -> b/);
  });

  it("refuses a dependency the measure does not carry, by name", () => {
    expect(() =>
      bundleOf([
        component("routes", "transit-access", "unserved-county-formula", {
          dependsOn: ["absent"],
        }),
      ]),
    ).toThrow(/waits on 'absent', which this measure does not carry/);
  });

  it("refuses a component that waits on itself", () => {
    expect(() =>
      bundleOf([
        component("routes", "transit-access", "unserved-county-formula", {
          dependsOn: ["routes"],
        }),
      ]),
    ).toThrow(/waits on itself/);
  });
});

describe("NATIONWIDE1: the refusals name what is wrong", () => {
  it("refuses two components sharing a key, because their provisions would merge", () => {
    expect(() =>
      bundleOf([
        component("same", "transit-access", "unserved-county-formula"),
        component("same", "transit-access", "enrollment-fare-relief"),
      ]),
    ).toThrow(/Two components are both called 'same'/);
  });

  it("refuses an empty measure", () => {
    expect(() => bundleOf([])).toThrow(/at least one component/);
  });

  it("surfaces a component's own compile refusal with the component named", () => {
    // An appropriation requires an authority that authorizes spending. Handing
    // it one that does not is refused by the existing compiler, and the bundle
    // says which component asked.
    expect(() =>
      bundleOf([
        component("money", "appropriations", "transit-staged-service-v1", {
          predicateAuthority: standingAuthority("standing:records-retention")!,
        }),
      ]),
    ).toThrow(/Component 'money' is not a bill:/);
  });

  it("refuses two components writing the same provision of the same authority", () => {
    // Same family, same variant, same jurisdiction and the same named
    // authority: whichever text stood, one author's words would be gone.
    expect(() =>
      bundleOf([
        component("first", "program-sunset", "extend-authority", {
          predicateAuthority: transitFund(),
        }),
        component("second", "program-sunset", "extend-authority", {
          predicateAuthority: transitFund(),
        }),
      ]),
    ).toThrow(
      /both write the '.*' provision of the Rural Transit Assistance Act/,
    );
  });

  it("lets the same family act twice when the authorities differ", () => {
    const bundle = bundleOf([
      component("transit", "program-sunset", "extend-authority", {
        predicateAuthority: transitFund(),
      }),
      component("schools", "program-sunset", "extend-authority", {
        predicateAuthority: standingAuthority("standing:school-facilities")!,
        subject: "schools",
      }),
    ]);
    expect(bundle.components).toHaveLength(2);
  });
});

describe("NATIONWIDE1: a subject restriction is one jurisdiction's, not everyone's", () => {
  const twoSubjects = [
    component("routes", "transit-access", "unserved-county-formula"),
    component(
      "schools",
      "education-facilities",
      "school-repair-authorization",
      {
        subject: "schools",
      },
    ),
  ];

  it("carries two subjects where the profile does not restrict them", () => {
    const bundle = bundleOf(twoSubjects, "unrestricted");
    expect(bundle.subjects).toEqual(["transit", "schools"]);
  });

  it("refuses the same measure where the profile declares a single subject, naming both", () => {
    expect(() => bundleOf(twoSubjects, "single-subject")).toThrow(
      /restricts a measure to one subject, and this one carries 2: transit, schools/,
    );
  });

  it("accepts a single-subject measure under the same restriction", () => {
    const bundle = bundleOf(
      [
        component("routes", "transit-access", "unserved-county-formula"),
        component("fares", "transit-access", "enrollment-fare-relief"),
      ],
      "single-subject",
    );
    expect(bundle.subjects).toEqual(["transit"]);
  });
});

describe("NATIONWIDE1: compiling a measure changes nothing", () => {
  it("is pure, so the same components compile to the same measure twice", () => {
    const first = bundleOf(transitPackage());
    const second = bundleOf(transitPackage());
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("records every jurisdiction a component acts on", () => {
    const elsewhere = createStableId("jurisdiction", "us-ne");
    const bundle = bundleOf([
      component("routes", "transit-access", "unserved-county-formula"),
      component("other", "transit-access", "enrollment-fare-relief", {
        jurisdictionId: elsewhere,
      }),
    ]);
    expect(bundle.jurisdictionIds).toEqual([
      KENTUCKY.jurisdictionId,
      elsewhere,
    ]);
  });
});
