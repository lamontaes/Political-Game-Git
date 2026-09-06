import { describe, expect, it } from "vitest";
import {
  assertMunicipalElectionRulePack,
  knownMunicipalRule,
  locallySelectableMunicipalRule,
  municipalRuleOptions,
  municipalRuleSource,
  municipalValueOrNull,
  notApplicableMunicipalRule,
  requireKnownMunicipalRule,
  resolveRequiredSignatures,
  unknownMunicipalRule,
  type MunicipalElectionRulePack,
  type MunicipalRule,
  type MunicipalSourceRef,
  type PetitionThreshold,
} from "./municipal-election-rules";

const SOURCE: MunicipalSourceRef = {
  authority: "state-statute",
  citation: "Fictional Code § 1-1",
  corpusId: "test-corpus",
  asOf: "2026-01-01",
  readOn: "2026-01-02",
  verification: "secondary-synthesis-only",
  note: null,
};

describe("municipal rule values", () => {
  it("keeps unknown, not-applicable and locally-selectable apart", () => {
    const unknown = unknownMunicipalRule<string>("no source resolved it");
    const absent = notApplicableMunicipalRule<string>(
      "the concept does not exist",
    );
    const local = locallySelectableMunicipalRule(["a", "b"], "a", SOURCE);

    expect(municipalValueOrNull(unknown)).toBeNull();
    expect(municipalValueOrNull(absent)).toBeNull();
    // A locally-selectable rule reads as no value even though it names a
    // default: the default applies absent a local choice, and this corpus never
    // resolves whether one was made.
    expect(municipalValueOrNull(local)).toBeNull();

    expect(() => requireKnownMunicipalRule(unknown, "Rule")).toThrow(
      /unresolved/,
    );
    expect(() => requireKnownMunicipalRule(absent, "Rule")).toThrow(
      /does not apply/,
    );
    expect(() => requireKnownMunicipalRule(local, "Rule")).toThrow(
      /chosen locally/,
    );
  });

  it("reads a known value and its citation", () => {
    const rule = knownMunicipalRule("pure-plurality", SOURCE);
    expect(requireKnownMunicipalRule(rule, "Runoff")).toBe("pure-plurality");
    expect(municipalRuleSource(rule)).toEqual(SOURCE);
    expect(municipalRuleOptions(rule)).toEqual(["pure-plurality"]);
  });

  it("enumerates the option space of a locally-selectable rule", () => {
    const rule = locallySelectableMunicipalRule(["a", "b", "c"], null, SOURCE);
    expect(municipalRuleOptions(rule)).toEqual(["a", "b", "c"]);
    expect(municipalRuleOptions(unknownMunicipalRule<string>("x"))).toEqual([]);
  });

  it("refuses a locally-selectable rule that resolves nothing", () => {
    expect(() =>
      locallySelectableMunicipalRule(["only"], null, SOURCE),
    ).toThrow(/at least two options/);
    expect(() =>
      locallySelectableMunicipalRule(["a", "a"], null, SOURCE),
    ).toThrow(/repeats an option/);
    expect(() =>
      locallySelectableMunicipalRule(["a", "b"], "c", SOURCE),
    ).toThrow(/must be one of its options/);
  });

  it("refuses an unexplained unknown or not-applicable", () => {
    expect(() => unknownMunicipalRule("  ")).toThrow(
      /explain what is unresolved/,
    );
    expect(() => notApplicableMunicipalRule(" ")).toThrow(/explain why/);
  });

  it("refuses a known value with no usable citation", () => {
    expect(() => knownMunicipalRule("x", { ...SOURCE, citation: " " })).toThrow(
      /cite an instrument/,
    );
    expect(() => knownMunicipalRule("x", { ...SOURCE, asOf: "2026" })).toThrow(
      /ISO as-of and read dates/,
    );
  });
});

describe("signature arithmetic", () => {
  it("always rounds a fractional requirement up to a whole signature", () => {
    const ten: PetitionThreshold = { percent: 10, base: "registered-voters" };
    expect(resolveRequiredSignatures(ten, 1000)).toBe(100);
    // 10% of 1001 is 100.1, and a tenth of a signature is not a signature.
    expect(resolveRequiredSignatures(ten, 1001)).toBe(101);
    expect(resolveRequiredSignatures(ten, 0)).toBe(0);
  });

  it("does not round an exact requirement up through float error", () => {
    const third: PetitionThreshold = {
      percent: 33.3,
      base: "registered-voters",
    };
    expect(resolveRequiredSignatures(third, 1000)).toBe(333);
  });

  it("refuses a percentage outside (0, 100] or a fractional electorate", () => {
    const bad = { percent: 0, base: "registered-voters" } as const;
    expect(() => resolveRequiredSignatures(bad, 10)).toThrow(/percentage in/);
    const ok: PetitionThreshold = { percent: 15, base: "registered-voters" };
    expect(() => resolveRequiredSignatures(ok, 10.5)).toThrow(
      /non-negative integer/,
    );
    expect(() => resolveRequiredSignatures(ok, -1)).toThrow(
      /non-negative integer/,
    );
  });
});

function basePack(): MunicipalElectionRulePack {
  const na = <T>(why: string): MunicipalRule<T> =>
    notApplicableMunicipalRule<T>(why);
  return {
    usps: "ZZ",
    stateName: "Testland",
    optionFamily: "midwestern-optional-charter",
    homeRuleFoundation: knownMunicipalRule("constitutional-home-rule", SOURCE),
    electoral: {
      ballotStructure: knownMunicipalRule("nonpartisan-mandatory", SOURCE),
      electionTiming: knownMunicipalRule(
        "odd-year-november-consolidated",
        SOURCE,
      ),
      runoffRule: knownMunicipalRule("pure-plurality", SOURCE),
      majorityTriggerPercent: na<number>("plurality has no threshold"),
      administration: knownMunicipalRule(
        "county-election-board-coordinated",
        SOURCE,
      ),
    },
    vacancy: {
      rule: knownMunicipalRule("council-appointment-full-term", SOURCE),
      specialElectionCutoffMonths: unknownMunicipalRule<number>("not resolved"),
      partyCaucusSuccession: knownMunicipalRule(false, SOURCE),
      citizenPetitionOverride: knownMunicipalRule(false, SOURCE),
    },
    directDemocracy: {
      recallDoctrine: knownMunicipalRule("prohibited", SOURCE),
      recallGroundsRequired: na<boolean>("no recall exists"),
      recallPetitionThreshold: na<PetitionThreshold>("no recall exists"),
      recallCirculationWindowDays: na<number>("no recall exists"),
      initiativeForm: knownMunicipalRule("prohibited", SOURCE),
      initiativePetitionThreshold: na<PetitionThreshold>(
        "no initiative exists",
      ),
      initiativeExemptSubjects: ["all-general-ordinances"],
      protestReferendum: knownMunicipalRule("prohibited", SOURCE),
      protestReferendumWindowDays: na<number>("no referendum exists"),
      protestReferendumSuspendsOrdinance: na<boolean>("no referendum exists"),
      protestReferendumThreshold: na<PetitionThreshold>("no referendum exists"),
    },
  };
}

describe("pack self-consistency", () => {
  it("accepts a coherent pack", () => {
    expect(() => assertMunicipalElectionRulePack(basePack())).not.toThrow();
  });

  it("rejects a plurality jurisdiction carrying a majority trigger", () => {
    const pack = basePack();
    const broken: MunicipalElectionRulePack = {
      ...pack,
      electoral: {
        ...pack.electoral,
        majorityTriggerPercent: knownMunicipalRule(50, SOURCE),
      },
    };
    expect(() => assertMunicipalElectionRulePack(broken)).toThrow(
      /pure-plurality jurisdiction cannot carry a majority trigger/,
    );
  });

  it("rejects a prohibited recall that still carries a petition threshold", () => {
    const pack = basePack();
    const broken: MunicipalElectionRulePack = {
      ...pack,
      directDemocracy: {
        ...pack.directDemocracy,
        recallPetitionThreshold: knownMunicipalRule(
          { percent: 25, base: "registered-voters" },
          SOURCE,
        ),
      },
    };
    expect(() => assertMunicipalElectionRulePack(broken)).toThrow(
      /has no recall election/,
    );
  });

  it("rejects a judicial-removal jurisdiction that carries recall election rules", () => {
    const pack = basePack();
    const broken: MunicipalElectionRulePack = {
      ...pack,
      directDemocracy: {
        ...pack.directDemocracy,
        recallDoctrine: knownMunicipalRule(
          "judicial-cause-removal-trial",
          SOURCE,
        ),
        recallGroundsRequired: knownMunicipalRule(true, SOURCE),
      },
    };
    expect(() => assertMunicipalElectionRulePack(broken)).toThrow(
      /has no recall election/,
    );
  });

  it("rejects a prohibited initiative or referendum carrying its mechanics", () => {
    const pack = basePack();
    expect(() =>
      assertMunicipalElectionRulePack({
        ...pack,
        directDemocracy: {
          ...pack.directDemocracy,
          initiativePetitionThreshold: knownMunicipalRule(
            { percent: 10, base: "registered-voters" },
            SOURCE,
          ),
        },
      }),
    ).toThrow(/prohibited initiative cannot carry a petition threshold/);

    expect(() =>
      assertMunicipalElectionRulePack({
        ...pack,
        directDemocracy: {
          ...pack.directDemocracy,
          protestReferendumWindowDays: knownMunicipalRule(30, SOURCE),
        },
      }),
    ).toThrow(/prohibited protest referendum cannot carry a window/);
  });

  it("rejects a party-caucus vacancy rule that denies party caucus succession", () => {
    const pack = basePack();
    expect(() =>
      assertMunicipalElectionRulePack({
        ...pack,
        vacancy: {
          ...pack.vacancy,
          rule: knownMunicipalRule(
            "party-precinct-committeeperson-caucus",
            SOURCE,
          ),
        },
      }),
    ).toThrow(/must record party caucus succession as true/);
  });

  it("rejects a malformed identity or repeated exempt subject", () => {
    const pack = basePack();
    expect(() =>
      assertMunicipalElectionRulePack({ ...pack, usps: "zzz" }),
    ).toThrow(/two upper-case letters/);
    expect(() =>
      assertMunicipalElectionRulePack({
        ...pack,
        directDemocracy: {
          ...pack.directDemocracy,
          initiativeExemptSubjects: ["tax-levies", "tax-levies"],
        },
      }),
    ).toThrow(/exempt subjects repeat/);
  });
});
