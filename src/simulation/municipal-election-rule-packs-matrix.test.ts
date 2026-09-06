import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import corpus from "../../data/municipal-elections/92O-national-state-baseline.json";
import {
  MUNICIPAL_CORPUS_CONFLICTS,
  MUNICIPAL_CORPUS_READINGS,
  MUNICIPAL_ELECTION_RULE_PACKS,
  MUNICIPAL_RULES_AUDIT_GATE,
  MUNICIPAL_RULE_PACK_JURISDICTIONS,
  municipalRulePackFor,
} from "./municipal-election-rule-packs";
import {
  municipalRuleOptions,
  municipalRuleSource,
  municipalValueOrNull,
  type MunicipalElectionRulePack,
  type MunicipalRule,
} from "./municipal-election-rules";

const PACKS = Object.values(MUNICIPAL_ELECTION_RULE_PACKS);

/** Every rule a pack carries, flattened, so invariants can sweep all of them. */
function everyRule(
  pack: MunicipalElectionRulePack,
): readonly MunicipalRule<unknown>[] {
  return [
    pack.homeRuleFoundation,
    pack.electoral.ballotStructure,
    pack.electoral.electionTiming,
    pack.electoral.runoffRule,
    pack.electoral.majorityTriggerPercent,
    pack.electoral.administration,
    pack.vacancy.rule,
    pack.vacancy.specialElectionCutoffMonths,
    pack.vacancy.partyCaucusSuccession,
    pack.vacancy.citizenPetitionOverride,
    pack.directDemocracy.recallDoctrine,
    pack.directDemocracy.recallGroundsRequired,
    pack.directDemocracy.recallPetitionThreshold,
    pack.directDemocracy.recallCirculationWindowDays,
    pack.directDemocracy.initiativeForm,
    pack.directDemocracy.initiativePetitionThreshold,
    pack.directDemocracy.protestReferendum,
    pack.directDemocracy.protestReferendumWindowDays,
    pack.directDemocracy.protestReferendumSuspendsOrdinance,
    pack.directDemocracy.protestReferendumThreshold,
  ];
}

describe("wave coverage", () => {
  it("carries the fifty states and the District of Columbia, once each", () => {
    expect(MUNICIPAL_RULE_PACK_JURISDICTIONS).toHaveLength(51);
    expect(new Set(MUNICIPAL_RULE_PACK_JURISDICTIONS).size).toBe(51);
    expect(MUNICIPAL_RULE_PACK_JURISDICTIONS).toContain("DC");
    // Sorted, so a diff of this corpus is readable.
    expect([...MUNICIPAL_RULE_PACK_JURISDICTIONS].sort()).toEqual([
      ...MUNICIPAL_RULE_PACK_JURISDICTIONS,
    ]);
  });

  it("looks a pack up case-insensitively and returns null for a non-jurisdiction", () => {
    expect(municipalRulePackFor("ky")?.stateName).toBe("Kentucky");
    expect(municipalRulePackFor("PR")).toBeNull();
  });

  it("resolves the rules this wave was compiled to resolve", () => {
    // Ballot structure, timing, runoff rule, recall doctrine and vacancy rule
    // are the spine of the wave. Each must be settled for every jurisdiction —
    // as a single value, or as an option set state law actually names.
    for (const pack of PACKS) {
      for (const [label, rule] of [
        ["ballot structure", pack.electoral.ballotStructure],
        ["election timing", pack.electoral.electionTiming],
        ["runoff rule", pack.electoral.runoffRule],
        ["administration", pack.electoral.administration],
        ["home rule foundation", pack.homeRuleFoundation],
        ["vacancy rule", pack.vacancy.rule],
        ["recall doctrine", pack.directDemocracy.recallDoctrine],
        ["initiative form", pack.directDemocracy.initiativeForm],
        ["protest referendum", pack.directDemocracy.protestReferendum],
      ] as const) {
        expect(
          ["known", "locally-selectable"].includes(rule.kind),
          `${pack.usps} ${label} is ${rule.kind}`,
        ).toBe(true);
      }
    }
  });
});

describe("epistemic discipline", () => {
  it("never leaves an unresolved rule without a reason", () => {
    for (const pack of PACKS) {
      for (const rule of everyRule(pack)) {
        if (rule.kind === "unknown" || rule.kind === "not-applicable") {
          expect(
            rule.note.trim().length,
            `${pack.usps} bare ${rule.kind}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("cites an instrument behind every resolved rule", () => {
    for (const pack of PACKS) {
      for (const rule of everyRule(pack)) {
        if (rule.kind !== "known" && rule.kind !== "locally-selectable")
          continue;
        const source = municipalRuleSource(rule);
        expect(
          source,
          `${pack.usps} resolved rule with no source`,
        ).not.toBeNull();
        expect(source!.citation.trim().length).toBeGreaterThan(0);
        expect(source!.corpusId).toBe(corpus.meta.packetId);
      }
    }
  });

  it("marks the whole wave as unaudited secondary source", () => {
    // Nothing in this wave was read at the instrument it cites. If any value
    // ever claims `primary-text-read`, the audit that earned it must also
    // update docs/systems/municipal-election-rule-sources.md, and this test is
    // the place that will notice.
    for (const pack of PACKS) {
      for (const rule of everyRule(pack)) {
        const source = municipalRuleSource(rule);
        if (source)
          expect(source.verification).toBe("secondary-synthesis-only");
      }
    }
    expect(MUNICIPAL_RULES_AUDIT_GATE).toMatch(/secondary-synthesis-only/);
  });

  it("never leaves a locally-selectable rule with fewer than two real options", () => {
    for (const pack of PACKS) {
      for (const rule of everyRule(pack)) {
        if (rule.kind !== "locally-selectable") continue;
        expect(municipalRuleOptions(rule).length).toBeGreaterThanOrEqual(2);
        expect(new Set(municipalRuleOptions(rule)).size).toBe(
          municipalRuleOptions(rule).length,
        );
      }
    }
  });
});

describe("doctrine dependents", () => {
  it("gives a jurisdiction with no recall election no recall mechanics", () => {
    const noElection = PACKS.filter((pack) => {
      const doctrine = municipalValueOrNull(
        pack.directDemocracy.recallDoctrine,
      );
      return (
        doctrine === "prohibited" || doctrine === "judicial-cause-removal-trial"
      );
    });
    // Seventeen prohibitions plus Iowa and Virginia, which route removal
    // through a court instead. The corpus's own summary names fourteen; the
    // conflict register records the disagreement.
    expect(noElection.map((p) => p.usps)).toEqual([
      "AL",
      "CT",
      "DE",
      "IA",
      "IL",
      "IN",
      "KY",
      "MA",
      "MD",
      "MN",
      "NC",
      "NH",
      "NY",
      "PA",
      "SC",
      "UT",
      "VA",
      "VT",
      "WV",
    ]);
    for (const pack of noElection) {
      expect(pack.directDemocracy.recallPetitionThreshold.kind).toBe(
        "not-applicable",
      );
      expect(pack.directDemocracy.recallGroundsRequired.kind).toBe(
        "not-applicable",
      );
      expect(pack.directDemocracy.recallCirculationWindowDays.kind).toBe(
        "not-applicable",
      );
    }
  });

  it("gives a plurality jurisdiction no majority threshold", () => {
    const plurality = PACKS.filter(
      (pack) =>
        municipalValueOrNull(pack.electoral.runoffRule) === "pure-plurality",
    );
    expect(plurality.length).toBe(28);
    for (const pack of plurality) {
      expect(pack.electoral.majorityTriggerPercent.kind).toBe("not-applicable");
    }
  });

  it("keeps a locally-selectable runoff from asserting an operative trigger", () => {
    const selectable = PACKS.filter(
      (pack) => pack.electoral.runoffRule.kind === "locally-selectable",
    );
    expect(selectable.map((p) => p.usps)).toEqual([
      "AK",
      "FL",
      "IA",
      "NC",
      "NJ",
      "SC",
    ]);
    for (const pack of selectable) {
      expect(pack.electoral.majorityTriggerPercent.kind).toBe("unknown");
    }
  });

  it("records both states where a party caucus fills the seat outright", () => {
    const caucus = PACKS.filter(
      (pack) =>
        municipalValueOrNull(pack.vacancy.rule) ===
        "party-precinct-committeeperson-caucus",
    );
    expect(caucus.map((p) => p.usps)).toEqual(["IN", "OH"]);
    for (const pack of caucus) {
      expect(municipalValueOrNull(pack.vacancy.partyCaucusSuccession)).toBe(
        true,
      );
      expect(pack.vacancy.specialElectionCutoffMonths.kind).toBe(
        "not-applicable",
      );
    }
  });
});

describe("the readings cannot drift from the corpus", () => {
  it("records a reading for every jurisdiction and no others", () => {
    expect(Object.keys(MUNICIPAL_CORPUS_READINGS).sort()).toEqual(
      [...corpus.jurisdictions].map((row) => row.usps).sort(),
    );
  });

  it("quotes what each judgment was read from", () => {
    for (const [usps, reading] of Object.entries(MUNICIPAL_CORPUS_READINGS)) {
      expect(reading.readFrom.trim().length, `${usps} reading`).toBeGreaterThan(
        20,
      );
    }
  });

  it("only resolves a threshold where the corpus carries a percentage", () => {
    for (const row of corpus.jurisdictions) {
      const reading = MUNICIPAL_CORPUS_READINGS[row.usps]!;
      if (reading.initiativeThreshold.kind === "resolved") {
        expect(
          row.initiativePetitionPercent,
          `${row.usps} initiative`,
        ).not.toBeNull();
      }
      if (reading.referendumThreshold.kind === "resolved") {
        expect(
          row.protestReferendumPercent,
          `${row.usps} referendum`,
        ).not.toBeNull();
      }
    }
  });

  it("only enumerates runoff options where the corpus says the choice is local", () => {
    for (const row of corpus.jurisdictions) {
      const reading = MUNICIPAL_CORPUS_READINGS[row.usps]!;
      expect(
        reading.runoffOptions !== undefined,
        `${row.usps} runoff options`,
      ).toBe(row.runoffRule === "locally_selectable");
    }
  });

  it("compiles a threshold percentage straight from the corpus row", () => {
    for (const row of corpus.jurisdictions) {
      const pack = MUNICIPAL_ELECTION_RULE_PACKS[row.usps]!;
      const initiative = pack.directDemocracy.initiativePetitionThreshold;
      if (initiative.kind === "known") {
        expect(initiative.value.percent, `${row.usps} initiative percent`).toBe(
          row.initiativePetitionPercent,
        );
      }
      const recall = pack.directDemocracy.recallPetitionThreshold;
      if (recall.kind === "known") {
        expect(recall.value.percent, `${row.usps} recall percent`).toBe(
          row.recallPetitionPercent,
        );
      }
    }
  });

  it("surfaces the corpus's own internal conflicts rather than hiding them", () => {
    expect(MUNICIPAL_CORPUS_CONFLICTS.length).toBeGreaterThanOrEqual(10);
    for (const conflict of MUNICIPAL_CORPUS_CONFLICTS) {
      expect(conflict.id).toMatch(/^[a-z0-9-]+$/);
      expect(conflict.summary.length).toBeGreaterThan(20);
      expect(conflict.resolution.length).toBeGreaterThan(20);
    }
  });
});

/** Every file under `src/` that reads the compiled packs. */
function packReaders(): readonly string[] {
  const out = execFileSync(
    "grep",
    [
      "-rl",
      "--include=*.ts",
      "--include=*.tsx",
      "municipal-election-rule-packs",
      "src",
    ],
    { encoding: "utf-8", cwd: process.cwd() },
  );
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
}

describe("the lane boundary", () => {
  it("is not yet consumed by candidacy, election or player-facing code", () => {
    // This wave builds source authority. Wiring it into a surface is a later,
    // separately authorised step that must clear the audit gate first, so this
    // test is the only thing in the tree that reads the compiled packs. When a
    // consumer is authorised, it lands here deliberately rather than by drift.
    expect(packReaders()).toEqual([
      "src/simulation/municipal-election-rule-packs-matrix.test.ts",
    ]);
  });
});

describe("the shape the provenance document describes", () => {
  it("conditions citizen initiative on municipal form in exactly fifteen jurisdictions", () => {
    // docs/systems/municipal-election-rule-sources.md names these, and an audit
    // that resolves one must move it out of this list in the same change.
    const byForm = PACKS.filter(
      (pack) =>
        pack.directDemocracy.initiativeForm.kind === "locally-selectable",
    ).map((pack) => pack.usps);
    expect(byForm).toEqual([
      "CT",
      "FL",
      "KY",
      "MA",
      "MI",
      "MO",
      "MS",
      "ND",
      "NJ",
      "NM",
      "RI",
      "TN",
      "TX",
      "WA",
      "WY",
    ]);
  });

  it("resolves election timing to one model for thirty-three jurisdictions", () => {
    const resolved = PACKS.filter(
      (pack) => pack.electoral.electionTiming.kind === "known",
    );
    expect(resolved).toHaveLength(33);
    expect(PACKS.length - resolved.length).toBe(18);
  });
});
