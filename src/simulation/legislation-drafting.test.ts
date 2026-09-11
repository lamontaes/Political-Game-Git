import { describe, expect, it } from "vitest";

import {
  BillConfigurationError,
  compareDrafts,
  compileBillDraft,
  designationPrefix,
  draftClauseDimensions,
  nonMoneyClauses,
  type CompiledBillDraft,
} from "./legislation-drafting";
import {
  legalInstrumentRule,
  legalInstrumentRules,
  programConfigurations,
  programFamilies,
  programFamily,
  programVariant,
  standingAuthorities,
  type ClauseDimension,
  type PredicateAuthority,
  type ProgramParameterValue,
} from "./legislation-program-families";
import { createStableId } from "./ids";
import { makeIsoDate } from "./dates";

/**
 * The content bank and its compiler, checked as content rather than as code.
 *
 * The claim this feature has to make good on is that four families produce
 * materially different bills — not four labels on one mechanism. Several tests
 * below therefore assert *difference* directly: distinct mechanisms, distinct
 * clause keys, and eight configurations that are not each other. A rename would
 * pass a shallow test and fail these.
 */

const KENTUCKY = createStableId("jurisdiction", "us-ky");
const NEBRASKA = createStableId("jurisdiction", "us-ne");
const FILED_ON = makeIsoDate("2026-01-14");

function compile(
  familyKey: string,
  variantKey: string,
  overrides?: {
    readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
    readonly scenarioKey?: string;
    readonly jurisdictionId?: string;
    readonly predicateAuthority?: PredicateAuthority;
  },
): CompiledBillDraft {
  return compileBillDraft({
    familyKey,
    variantKey,
    parameterValues: overrides?.parameterValues,
    scenarioKey: overrides?.scenarioKey ?? "kentucky",
    jurisdictionId: (overrides?.jurisdictionId ?? KENTUCKY) as typeof KENTUCKY,
    rulePackId: "us-ky-general-assembly",
    designation: "HB 900",
    filedOn: FILED_ON,
    ...(overrides?.predicateAuthority !== undefined
      ? { predicateAuthority: overrides.predicateAuthority }
      : {}),
  });
}

/**
 * Compiles a configuration whatever its instrument, supplying an authority
 * where one is required.
 *
 * The sweeps below run over the whole bank, and half the bank acts on something
 * that already exists. Picking a standing authority that satisfies the rule is
 * the test harness doing what the docket does in play, not the test relaxing a
 * requirement: an instrument that needs an authority and is given none is
 * asserted to fail, separately and on purpose.
 */
function compileAnywhere(
  familyKey: string,
  variantKey: string,
): CompiledBillDraft {
  const { variant } = programVariant(familyKey, variantKey);
  const rule = legalInstrumentRule(variant.instrument);
  if (!rule.requiresPredicateAuthority) return compile(familyKey, variantKey);
  const authority = standingAuthorities().find((candidate) =>
    rule.predicateMustAuthorizeSpending ? candidate.authorizesSpending : true,
  );
  expect(authority).toBeDefined();
  return compile(familyKey, variantKey, {
    predicateAuthority: authority as PredicateAuthority,
  });
}

describe("the programme bank offers genuinely different families", () => {
  /**
   * No configuration count is asserted anywhere in this file.
   *
   * An earlier tranche pinned four families and eight configurations, and that
   * number became a ceiling: a test that says "eight" fails when the bank grows
   * and passes when somebody adds a ninth rename. Every check below asserts a
   * property that a rename breaks and an honest addition does not, so the bank
   * can grow without editing an expectation, and cannot grow by duplication.
   */
  it("has more than one family and more than one configuration in each", () => {
    expect(programFamilies().length).toBeGreaterThan(1);
    expect(programConfigurations().length).toBeGreaterThan(
      programFamilies().length,
    );
  });

  it("gives every family a mechanism no other family shares", () => {
    const mechanisms = programFamilies().map((family) => family.mechanism);
    expect(new Set(mechanisms).size).toBe(mechanisms.length);
  });

  it("gives every family and configuration a key no other one shares", () => {
    const familyKeys = programFamilies().map((family) => family.familyKey);
    expect(new Set(familyKeys).size).toBe(familyKeys.length);
    const configurationKeys = programConfigurations().map(
      (configuration) =>
        `${configuration.familyKey}/${configuration.variantKey}`,
    );
    expect(new Set(configurationKeys).size).toBe(configurationKeys.length);
  });

  it("compiles every configuration in the bank", () => {
    for (const configuration of programConfigurations()) {
      const draft = compileAnywhere(
        configuration.familyKey,
        configuration.variantKey,
      );
      expect(draft.clauses.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every configuration an operative text no other one has", () => {
    // The failure this guards against is renamed bus bills. Comparing the
    // operative sections — not the titles — is what makes the check mean
    // something: two configurations that differ only in their label produce the
    // same body here and collapse the set.
    const bodies = programConfigurations().map((configuration) =>
      compileAnywhere(configuration.familyKey, configuration.variantKey)
        .clauses.map((clause) => clause.text)
        .join("\n"),
    );
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it("gives every configuration a synopsis no other one has", () => {
    const synopses = programFamilies().flatMap((family) =>
      family.variants.map((variant) => variant.synopsis),
    );
    expect(new Set(synopses).size).toBe(synopses.length);
  });

  it("does not reuse one family's operative clause keys in another", () => {
    // Two clause roles are structural rather than operative and are legitimately
    // shared: the purpose section, and the section naming what the Act acts
    // upon. Both are the same role in every family that has one, and their
    // texts are asserted to differ separately, below. Everything else is the
    // programme's own mechanism and has to be its own.
    const operativeKeysByFamily = programFamilies().map(
      (family) =>
        new Set(
          family.variants.flatMap((variant) =>
            variant.clauses
              .filter(
                (clause) =>
                  clause.provisionKey !== "purpose" &&
                  clause.dimension !== "authority-reference",
              )
              .map((clause) => clause.provisionKey),
          ),
        ),
    );
    for (let left = 0; left < operativeKeysByFamily.length; left += 1) {
      for (
        let right = left + 1;
        right < operativeKeysByFamily.length;
        right += 1
      ) {
        const shared = [...operativeKeysByFamily[left]!].filter((key) =>
          operativeKeysByFamily[right]!.has(key),
        );
        expect(shared).toEqual([]);
      }
    }
  });

  it("writes a different authority clause in every family that has one", () => {
    // The shared key is a shared role, not shared content. Each family says
    // something different about what its Act does to the thing it names, and a
    // family that copied another's sentence would collapse this set.
    const texts = new Set<string>();
    let seen = 0;
    for (const configuration of programConfigurations()) {
      const draft = compileAnywhere(
        configuration.familyKey,
        configuration.variantKey,
      );
      for (const clause of draft.clauses) {
        if (clause.dimension !== "authority-reference") continue;
        texts.add(clause.text);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(texts.size).toBe(seen);
  });

  it("gives every amendment invitation a segment key no other one has", () => {
    const segments = programFamilies().flatMap((family) =>
      family.variants.map((variant) => variant.amendmentInvitation.segmentKey),
    );
    expect(new Set(segments).size).toBe(segments.length);
  });

  it("covers every clause dimension the bank declares", () => {
    const dimensions = new Set<ClauseDimension>();
    for (const configuration of programConfigurations()) {
      for (const dimension of draftClauseDimensions(
        compileAnywhere(configuration.familyKey, configuration.variantKey),
      )) {
        dimensions.add(dimension);
      }
    }
    expect(dimensions.has("funding-cap")).toBe(true);
    expect(dimensions.has("eligibility-scope")).toBe(true);
    expect(dimensions.has("timing")).toBe(true);
    expect(dimensions.has("oversight")).toBe(true);
    expect(dimensions.has("revenue")).toBe(true);
    expect(dimensions.has("authority-reference")).toBe(true);
  });

  it("labels every authored number and every source example", () => {
    for (const configuration of programConfigurations()) {
      const draft = compileAnywhere(
        configuration.familyKey,
        configuration.variantKey,
      );
      expect(draft.evidence.length).toBeGreaterThan(0);
      for (const evidence of draft.evidence) {
        expect([
          "source-example",
          "authored-parameter",
          "forecast-claim",
        ]).toContain(evidence.kind);
        if (evidence.kind === "source-example") {
          expect(evidence.reference.length).toBeGreaterThan(0);
          expect(evidence.establishes.length).toBeGreaterThan(0);
        }
      }
      // A parameter a player can move is either authored fiction or a source
      // example that establishes the *shape* of the choice. Nothing driving a
      // clause is ever an unlabelled assertion.
      for (const spec of draft.parameters) {
        expect(["authored-parameter", "source-example"]).toContain(
          spec.evidence.kind,
        );
      }
    }
  });

  it("names a distinct missing series for every family's intended outcome", () => {
    const metricKeys = programFamilies().map(
      (family) => family.intendedOutcome.metricStableKey,
    );
    expect(new Set(metricKeys).size).toBe(metricKeys.length);
    const seriesKeys = programFamilies().map(
      (family) => family.intendedOutcome.baselineSeriesKey,
    );
    expect(new Set(seriesKeys).size).toBe(seriesKeys.length);
  });
});

describe("the bank writes more than one kind of legal act", () => {
  /**
   * The failure this guards against is subtler than a rename and was the
   * actual state of the first tranche: eight configurations across four
   * subjects, every one of them the same kind of act. A bank that can only
   * authorize programmes is a funding slider with several titles, whatever the
   * subjects are called.
   */
  it("puts at least one configuration behind every declared instrument", () => {
    const used = new Set(
      programFamilies().flatMap((family) =>
        family.variants.map((variant) => variant.instrument),
      ),
    );
    for (const rule of legalInstrumentRules()) {
      expect(used.has(rule.instrument)).toBe(true);
    }
  });

  it("does not let one instrument account for most of the bank", () => {
    const counts = new Map<string, number>();
    for (const family of programFamilies()) {
      for (const variant of family.variants) {
        counts.set(
          variant.instrument,
          (counts.get(variant.instrument) ?? 0) + 1,
        );
      }
    }
    const total = programConfigurations().length;
    for (const count of counts.values()) {
      expect(count).toBeLessThan(total / 2);
    }
  });

  it("keeps a ceiling, an appropriation and a charge in three fields", () => {
    const authorization = compile("transit-access", "enrollment-fare-relief");
    expect(authorization.authorizedCeilingMinorUnits).not.toBeNull();
    expect(authorization.appropriatedMinorUnits).toBeNull();
    expect(authorization.revenueMinorUnits).toBeNull();

    const appropriation = compileAnywhere("appropriations", "single-programme");
    expect(appropriation.appropriatedMinorUnits).not.toBeNull();
    expect(appropriation.authorizedCeilingMinorUnits).toBeNull();
    expect(appropriation.revenueMinorUnits).toBeNull();

    const charge = compile("service-charges", "flat-permit-fee");
    expect(charge.revenueMinorUnits).not.toBeNull();
    expect(charge.authorizedCeilingMinorUnits).toBeNull();
    expect(charge.appropriatedMinorUnits).toBeNull();
  });

  it("states no amount at all on an instrument that provides none", () => {
    for (const configuration of programConfigurations()) {
      const { variant } = programVariant(
        configuration.familyKey,
        configuration.variantKey,
      );
      const rule = legalInstrumentRule(variant.instrument);
      if (rule.mayAuthorizeAppropriation) continue;
      const draft = compileAnywhere(
        configuration.familyKey,
        configuration.variantKey,
      );
      expect(draft.authorizedCeilingMinorUnits).toBeNull();
      expect(draft.appropriatedMinorUnits).toBeNull();
      // A revenue measure states a charge, which is not an amount it spends.
      for (const clause of draft.clauses) {
        if (clause.dimension === "revenue") continue;
        expect(clause.fiscalExposureMinorUnits).toBeNull();
      }
    }
  });
});

describe("acting on something that already exists is refused when it does not", () => {
  const spendingAuthority = standingAuthorities().find(
    (authority) => authority.authorizesSpending,
  ) as PredicateAuthority;
  const nonSpendingAuthority = standingAuthorities().find(
    (authority) => !authority.authorizesSpending,
  ) as PredicateAuthority;

  it("refuses an appropriation with nothing to appropriate for", () => {
    expect(() => compile("appropriations", "single-programme")).toThrow(
      BillConfigurationError,
    );
    expect(() => compile("appropriations", "single-programme")).toThrow(
      /was given no authority to act on/,
    );
  });

  it("refuses an appropriation against an authority that spends nothing", () => {
    expect(() =>
      compile("appropriations", "single-programme", {
        predicateAuthority: nonSpendingAuthority,
      }),
    ).toThrow(/authorizes no spending/);
  });

  it("refuses an appropriation larger than the authority allows", () => {
    const ceiling = spendingAuthority.authorizedCeilingMinorUnits;
    expect(ceiling).not.toBeNull();
    expect(() =>
      compile("appropriations", "single-programme", {
        predicateAuthority: spendingAuthority,
        parameterValues: {
          appropriation: {
            kind: "money",
            minorUnits: (ceiling as number) + 100,
            currency: "USD",
          },
        },
      }),
    ).toThrow(/which authorizes/);
  });

  it("allows an appropriation exactly at the ceiling", () => {
    const ceiling = spendingAuthority.authorizedCeilingMinorUnits as number;
    const draft = compile("appropriations", "single-programme", {
      predicateAuthority: spendingAuthority,
      parameterValues: {
        appropriation: { kind: "money", minorUnits: ceiling, currency: "USD" },
      },
    });
    expect(draft.appropriatedMinorUnits).toBe(ceiling);
  });

  it("refuses to write an authorization against an authority", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        predicateAuthority: spendingAuthority,
      }),
    ).toThrow(/creates rather than amends/);
  });

  it("names the authority in the operative text of every act that takes one", () => {
    for (const configuration of programConfigurations()) {
      const { variant } = programVariant(
        configuration.familyKey,
        configuration.variantKey,
      );
      const rule = legalInstrumentRule(variant.instrument);
      if (!rule.requiresPredicateAuthority) continue;
      const draft = compileAnywhere(
        configuration.familyKey,
        configuration.variantKey,
      );
      const referenceClause = draft.clauses.find(
        (clause) => clause.dimension === "authority-reference",
      );
      expect(referenceClause).toBeDefined();
      expect(referenceClause?.text).toContain(
        (draft.predicateAuthority as PredicateAuthority).citationLabel,
      );
    }
  });
});

describe("transit v2 retains its clauses with the authorized American English correction", () => {
  it("compiles the three transit clauses with American English", () => {
    const draft = compile("transit-access", "enrollment-fare-relief");
    expect(draft.clauses.map((clause) => clause.text)).toEqual([
      "It is the purpose of this Act to test whether removing the fare barrier increases access to work, care and school for riders who already qualify for state assistance. Nothing in this Act creates an entitlement to service.",
      "A rider is eligible under this Act if the rider is enrolled in a state assistance program at the time of boarding. A participating provider shall not require a separate application.",
      "There is appropriated for the two-year pilot a sum not to exceed $8,000,000, to be distributed among participating providers in proportion to eligible boardings. No provider is named in this section.",
    ]);
    expect(draft.clauses[2]!.fiscalExposureMinorUnits).toBe(800_000_000);
    expect(draft.clauses[2]!.provisionKey).toBe("pilot-support-limit");
  });

  it("keeps the accepted local-match ask as this variant's invitation", () => {
    const draft = compile("transit-access", "enrollment-fare-relief");
    expect(draft.amendmentInvitation.provisionKey).toBe("local-project-match");
    expect(draft.amendmentInvitation.requestedMinorUnits).toBe(140_000_000);
    expect(draft.amendmentInvitation.cappedMinorUnits).toBe(60_000_000);
    expect(draft.amendmentInvitation.render("$1,400,000")).toContain(
      "Ashland–Boyd County Transit Authority",
    );
  });
});

describe("moving a parameter changes typed state and the clause text", () => {
  it("is degree-sensitive to an exact amount", () => {
    const lower = compile("bridge-maintenance", "worst-first-condition", {
      parameterValues: {
        "repair-authorization": {
          kind: "money",
          minorUnits: 900_000_000,
          currency: "USD",
        },
      },
    });
    const higher = compile("bridge-maintenance", "worst-first-condition", {
      parameterValues: {
        "repair-authorization": {
          kind: "money",
          minorUnits: 5_400_000_000,
          currency: "USD",
        },
      },
    });
    expect(lower.authorizedCeilingMinorUnits).toBe(900_000_000);
    expect(higher.authorizedCeilingMinorUnits).toBe(5_400_000_000);
    expect(lower.authorizedCeilingLabel).toBe("$9,000,000");
    expect(higher.authorizedCeilingLabel).toBe("$54,000,000");
    // The text moved with the number, rather than the number moving alone.
    expect(lower.clauses[2]!.text).toContain("$9,000,000");
    expect(higher.clauses[2]!.text).toContain("$54,000,000");
    expect(lower.clauses[2]!.text).not.toEqual(higher.clauses[2]!.text);
  });

  it("is sensitive to a scope choice that is not money at all", () => {
    const strict = compile("bridge-maintenance", "worst-first-condition", {
      parameterValues: { "condition-threshold": { kind: "integer", value: 2 } },
    });
    const wide = compile("bridge-maintenance", "worst-first-condition", {
      parameterValues: { "condition-threshold": { kind: "integer", value: 6 } },
    });
    expect(strict.clauses[1]!.text).toContain("condition rating of 2 or below");
    expect(wide.clauses[1]!.text).toContain("condition rating of 6 or below");
    expect(strict.clauses[1]!.beneficiary).not.toEqual(
      wide.clauses[1]!.beneficiary,
    );
    // The money is untouched, so this is a scope change and not a funding one.
    expect(strict.authorizedCeilingMinorUnits).toBe(
      wide.authorizedCeilingMinorUnits,
    );
  });

  it("rewrites the timing clause rather than filling a blank in it", () => {
    const short = compile("transit-access", "enrollment-fare-relief", {
      parameterValues: { "pilot-term": { kind: "duration-years", years: 1 } },
    });
    const long = compile("transit-access", "enrollment-fare-relief", {
      parameterValues: { "pilot-term": { kind: "duration-years", years: 4 } },
    });
    expect(short.clauses[2]!.text).toContain("the one-year pilot");
    expect(long.clauses[2]!.text).toContain("the four-year pilot");
    expect(short.endsOn).toBe("2027-01-14");
    expect(long.endsOn).toBe("2030-01-14");
  });
});

describe("a family refuses combinations it cannot carry", () => {
  it("refuses an amount outside the declared bounds rather than clamping it", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        parameterValues: {
          "support-limit": {
            kind: "money",
            minorUnits: 90_000_000_000,
            currency: "USD",
          },
        },
      }),
    ).toThrow(BillConfigurationError);
  });

  it("refuses a currency the clause is not authorized in", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        parameterValues: {
          "support-limit": {
            kind: "money",
            minorUnits: 800_000_000,
            currency: "EUR",
          },
        },
      }),
    ).toThrow(/authorized in USD/);
  });

  it("refuses a scope value the configuration does not offer", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        parameterValues: {
          "rider-eligibility": { kind: "enumerated", value: "everybody" },
        },
      }),
    ).toThrow(/does not offer 'everybody'/);
  });

  it("refuses money on a configuration that appropriates nothing", () => {
    // The unfunded mandate exposes no funding-cap setting at all, so the
    // refusal comes from the configuration not having one rather than from a
    // downstream check. That is the honest boundary: there is no cap to set,
    // and the caller is told which configuration they are looking at.
    const { variant } = programVariant(
      "water-service-lines",
      "inventory-and-plan",
    );
    expect(variant.authorizesAppropriation).toBe(false);
    expect(
      variant.parameters.filter((spec) => spec.dimension === "funding-cap"),
    ).toEqual([]);
    expect(() =>
      compile("water-service-lines", "inventory-and-plan", {
        parameterValues: {
          "replacement-fund": {
            kind: "money",
            minorUnits: 1_000_000_000,
            currency: "USD",
          },
        },
      }),
    ).toThrow(/has no 'replacement-fund' to set/);
  });

  it("refuses a parameter belonging to another configuration of the same family", () => {
    expect(() =>
      compile("water-service-lines", "inventory-and-plan", {
        parameterValues: {
          "priority-order": {
            kind: "enumerated",
            value: "highest-share-first",
          },
        },
      }),
    ).toThrow(/has no 'priority-order' to set/);
  });

  it("refuses a value of the wrong type", () => {
    expect(() =>
      compile("bridge-maintenance", "worst-first-condition", {
        parameterValues: {
          "condition-threshold": {
            kind: "money",
            minorUnits: 4,
            currency: "USD",
          },
        },
      }),
    ).toThrow(/is a integer parameter/);
  });

  it("refuses an ongoing term where the configuration requires one", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        parameterValues: {
          "pilot-term": { kind: "duration-years", years: null },
        },
      }),
    ).toThrow(/must state a term/);
  });

  it("refuses a legislature with no drafting authority", () => {
    expect(() =>
      compile("transit-access", "enrollment-fare-relief", {
        scenarioKey: "lexington",
      }),
    ).toThrow(/No drafting authority is supported/);
  });

  it("refuses an unknown family or configuration", () => {
    expect(() => compile("housing-vouchers", "any")).toThrow(
      /No program family is defined/,
    );
    expect(() => compile("transit-access", "moon-base")).toThrow(
      /has no 'moon-base' configuration/,
    );
  });
});

describe("a configuration that appropriates nothing is still a bill", () => {
  it("carries operative clauses and no fiscal exposure", () => {
    const draft = compile("water-service-lines", "inventory-and-plan");
    expect(draft.authorizesAppropriation).toBe(false);
    // Null, not zero. "This Act authorizes nothing" and "this Act authorizes
    // $0" are different statements and the second one is not true.
    expect(draft.authorizedCeilingMinorUnits).toBeNull();
    expect(draft.authorizedCeilingLabel).toBeNull();
    expect(nonMoneyClauses(draft)).toHaveLength(draft.clauses.length);
    expect(
      draft.clauses.some((clause) => clause.dimension === "oversight"),
    ).toBe(true);
  });

  it("gives the non-money oversight clause a structured consumer", () => {
    const draft = compile("water-service-lines", "inventory-and-plan");
    const oversight = draft.clauses.find(
      (clause) => clause.dimension === "oversight",
    );
    expect(oversight).toBeDefined();
    // The clause is not decoration: it names who it reaches through the same
    // canonical beneficiary contract a funded section uses, and it moves with
    // its parameter.
    expect(oversight!.beneficiary.kind).toBe("general-application");
    expect(oversight!.parameterKey).toBe("plan-contents");
    const fuller = compile("water-service-lines", "inventory-and-plan", {
      parameterValues: {
        "plan-contents": {
          kind: "enumerated",
          value: "inventory-sequence-and-cost",
        },
      },
    });
    const fullerOversight = fuller.clauses.find(
      (clause) => clause.dimension === "oversight",
    )!;
    expect(fullerOversight.text).not.toEqual(oversight!.text);
    expect(fullerOversight.text).toContain("estimate of the cost");
  });

  it("still carries a deadline that a player can move", () => {
    const draft = compile("water-service-lines", "inventory-and-plan");
    const deadline = draft.clauses.find(
      (clause) => clause.provisionKey === "filing-deadline",
    )!;
    expect(deadline.text).toContain("January 14, 2029");
    const shorter = compile("water-service-lines", "inventory-and-plan", {
      parameterValues: {
        "compliance-term": { kind: "duration-years", years: 1 },
      },
    });
    expect(
      shorter.clauses.find(
        (clause) => clause.provisionKey === "filing-deadline",
      )!.text,
    ).toContain("January 14, 2027");
  });
});

describe("a draft is written for a named legislature, never a default one", () => {
  it("compiles the same configuration for a second jurisdiction", () => {
    const nebraska = compileBillDraft({
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
      scenarioKey: "nebraska",
      jurisdictionId: NEBRASKA,
      rulePackId: "us-ne-legislature",
      designation: "LB 402",
      filedOn: FILED_ON,
    });
    expect(nebraska.jurisdictionId).toBe(NEBRASKA);
    expect(nebraska.jurisdictionId).not.toBe(KENTUCKY);
    expect(nebraska.scenarioKey).toBe("nebraska");
    expect(nebraska.rulePackId).toBe("us-ne-legislature");
    expect(nebraska.designation).toBe("LB 402");
    // Nothing about Kentucky leaked into a Nebraska bill's operative text.
    expect(nebraska.clauses.map((clause) => clause.text).join(" ")).not.toMatch(
      /Kentucky|KRS|Ashland/,
    );
  });

  it("names a bill the way its own chamber does", () => {
    expect(designationPrefix("house")).toBe("HB");
    expect(designationPrefix("senate")).toBe("SB");
    expect(designationPrefix("legislature")).toBe("LB");
    expect(() => designationPrefix("assembly")).toThrow(BillConfigurationError);
  });
});

describe("compilation is pure and repeatable", () => {
  it("produces an identical draft for identical input", () => {
    const once = compile("broadband-access", "adoption-support");
    const twice = compile("broadband-access", "adoption-support");
    expect(JSON.stringify(twice)).toEqual(JSON.stringify(once));
  });

  it("records the family version the draft was compiled at", () => {
    const draft = compile("water-service-lines", "funded-replacement");
    expect(draft.familyVersion).toBe(
      programFamily("water-service-lines").familyVersion,
    );
    expect(draft.variantKey).toBe("funded-replacement");
    expect(Object.keys(draft.parameterValues).sort()).toEqual(
      programVariant("water-service-lines", "funded-replacement")
        .variant.parameters.map((spec) => spec.key)
        .sort(),
    );
  });
});

describe("two configurations can be read side by side", () => {
  it("marks only the sections that actually differ", () => {
    const current = compile("broadband-access", "unserved-buildout");
    const proposed = compile("broadband-access", "unserved-buildout", {
      parameterValues: {
        "unserved-threshold": { kind: "integer", value: 100 },
      },
    });
    const rows = compareDrafts(current, proposed);
    const changed = rows.filter((row) => row.changed);
    expect(changed).toHaveLength(1);
    expect(changed[0]!.provisionKey).toBe("eligible-areas");
    expect(changed[0]!.currentText).toContain("25 megabits");
    expect(changed[0]!.proposedText).toContain("100 megabits");
  });

  it("shows a section one configuration has and the other does not", () => {
    const inventory = compile("water-service-lines", "inventory-and-plan");
    const funded = compile("water-service-lines", "funded-replacement");
    const rows = compareDrafts(inventory, funded);
    const fund = rows.find((row) => row.provisionKey === "replacement-fund")!;
    expect(fund.currentText).toBeNull();
    expect(fund.proposedText).toContain("service line replacement fund");
  });
});
