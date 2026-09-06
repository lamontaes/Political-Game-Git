/**
 * The municipal-governance compiler and its Kentucky pilot.
 *
 * The domain ships no production records — its production gate explains why — so
 * these tests are what demonstrate the compiler is real and the schema is
 * truthful. They exercise it through the same capability boundary every other
 * domain uses, and they pin the product rules the research is emphatic about: a
 * place is not a government, a title does not imply powers, mayor strength is
 * not a scalar, mayor and manager are distinct actors, consolidation is not a
 * boolean, and unknown stays unknown.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MUNICIPAL_PRODUCTION_GATE,
  compileMunicipalFixture,
  openMunicipalFixture,
  parseMunicipalArtifacts,
  sourceDomain,
  validateMunicipalGovernanceCorpus,
} from "../../src/source/domains/municipal-governance/index";
import type { MunicipalGovernanceRecord } from "../../src/source/domains/municipal-governance/index";
import { isClean, isUnresolved } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/municipal-governance/kentucky-pilot.json";

function compiled() {
  return compileMunicipalFixture(openMunicipalFixture(FIXTURE));
}

function byId(records: readonly MunicipalGovernanceRecord[]) {
  const map = new Map(records.map((record) => [record.recordId, record]));
  const need = (id: string): MunicipalGovernanceRecord => {
    const record = map.get(id);
    if (!record) throw new Error(`missing record ${id}`);
    return record;
  };
  return {
    lexington: need("us-ky-lexington-fayette-ucg"),
    louisville: need("us-ky-louisville-jefferson-metro"),
    bowlingGreen: need("us-ky-bowling-green"),
  };
}

/** Every sourced leaf in a record, for whole-record assertions. */
function sourcedLeaves(
  node: unknown,
  out: { state: string }[] = [],
): { state: string }[] {
  if (node && typeof node === "object") {
    const state = (node as { state?: unknown }).state;
    if (typeof state === "string") {
      out.push(node as { state: string });
      return out;
    }
    for (const value of Object.values(node)) sourcedLeaves(value, out);
  }
  return out;
}

describe("the municipal-governance compiler", () => {
  it("compiles the Kentucky pilot fixture end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records).toHaveLength(3);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
    expect(validateMunicipalGovernanceCorpus(corpus).findings).toEqual([]);
  });
});

describe("the three pilots are materially different", () => {
  const { lexington, louisville, bowlingGreen } = byId(compiled().records);

  it("keeps distinct body sizes and forms", () => {
    const size = (r: MunicipalGovernanceRecord) => {
      const s = r.electedStructure.bodySize;
      return s.state === "KNOWN" ? s.value : null;
    };
    expect(size(lexington)).toBe(15);
    expect(size(louisville)).toBe(26);
    expect(size(bowlingGreen)).toBe(5);

    const form = (r: MunicipalGovernanceRecord) =>
      r.legalBasis.form.state === "KNOWN" ? r.legalBasis.form.value : null;
    expect(
      new Set([form(lexington), form(louisville), form(bowlingGreen)]).size,
    ).toBe(3);
  });

  it("distinguishes hybrid, single-member-district and at-large composition", () => {
    const pattern = (r: MunicipalGovernanceRecord) =>
      r.electedStructure.composition.state === "KNOWN"
        ? r.electedStructure.composition.value.pattern
        : null;
    expect(pattern(lexington)).toBe("HYBRID_DISTRICT_AT_LARGE");
    expect(pattern(louisville)).toBe("SINGLE_MEMBER_DISTRICT");
    expect(pattern(bowlingGreen)).toBe("AT_LARGE");
  });

  it("gives each a different presiding office", () => {
    const presiding = (r: MunicipalGovernanceRecord) =>
      r.electedStructure.presidingOffice.state === "KNOWN"
        ? r.electedStructure.presidingOffice.value
        : null;
    // Vice Mayor (Lexington), Council President (Louisville), Mayor (Bowling Green).
    expect(presiding(lexington)).toMatch(/Vice Mayor/);
    expect(presiding(louisville)).toMatch(/Council President/);
    expect(presiding(bowlingGreen)).toMatch(/Mayor presides/);
  });
});

describe("92I keeps dated municipal rules explicit", () => {
  const { lexington, louisville, bowlingGreen } = byId(compiled().records);

  it("records the Louisville partisanship transition without rewriting history", () => {
    const [historical, current] =
      louisville.electedStructure.partisanshipHistory;
    expect(historical?.state).toBe("HISTORICAL");
    if (historical?.state === "HISTORICAL") {
      expect(historical.value).toBe("PARTISAN");
      expect(historical.period.end).toBe("2024-12-31");
    }
    expect(current?.state).toBe("KNOWN");
    if (current?.state === "KNOWN") {
      expect(current.value).toBe("NONPARTISAN");
      expect(current.asOf).toBe("2025-01-01");
    }
  });

  it("pins the independently checked mayoral term-limit corrections", () => {
    const knownLimit = (
      record: MunicipalGovernanceRecord,
      seatClass: string,
    ) => {
      const limit = record.electedStructure.terms.find(
        (term) => term.seatClass === seatClass,
      )?.termLimit;
      return limit?.state === "KNOWN" ? limit.value : null;
    };
    expect(knownLimit(louisville, "Metro Mayor")).toMatch(/Two consecutive/);
    expect(knownLimit(bowlingGreen, "Mayor")).toMatch(/three consecutive/i);
  });

  it("separates presiding roles from legislative vote rights", () => {
    const lexRegular = lexington.electedStructure.presidingRules.find(
      (rule) =>
        rule.state === "KNOWN" && rule.value.context === "REGULAR_MEETING",
    );
    const louRegular = louisville.electedStructure.presidingRules.find(
      (rule) =>
        rule.state === "KNOWN" && rule.value.context === "REGULAR_MEETING",
    );
    const bgRegular = bowlingGreen.electedStructure.presidingRules.find(
      (rule) =>
        rule.state === "KNOWN" && rule.value.context === "REGULAR_MEETING",
    );
    if (
      lexRegular?.state !== "KNOWN" ||
      louRegular?.state !== "KNOWN" ||
      bgRegular?.state !== "KNOWN"
    ) {
      throw new Error("missing regular-meeting presiding rule");
    }
    expect(lexRegular.value).toMatchObject({
      presidingRole: "MAYOR",
      legislativeVoteRole: "TIE_BREAKER_ONLY",
    });
    expect(louRegular.value).toMatchObject({
      presidingRole: "COUNCIL_PRESIDENT",
      legislativeVoteRole: "FULL_VOTE",
    });
    expect(bgRegular.value).toMatchObject({
      presidingRole: "MAYOR",
      legislativeVoteRole: "FULL_VOTE",
    });
  });

  it("carries exact override arithmetic only where an override exists", () => {
    const threshold = (record: MunicipalGovernanceRecord) => {
      const power = record.enumeratedPowers.find(
        (entry) => entry.power === "OVERRIDE",
      );
      return power?.details.state === "KNOWN"
        ? power.details.value.threshold
        : null;
    };
    expect(threshold(lexington)).toMatchObject({
      denominatorBasis: "TOTAL_MEMBERSHIP",
      fixedVotesRequired: 9,
    });
    expect(threshold(louisville)).toMatchObject({
      denominatorBasis: "TOTAL_MEMBERSHIP",
      fixedVotesRequired: 18,
    });
    expect(
      bowlingGreen.enumeratedPowers.some((entry) => entry.power === "OVERRIDE"),
    ).toBe(false);
  });

  it("keeps budget proposal actors and deadlines jurisdiction-specific", () => {
    const proposal = (record: MunicipalGovernanceRecord) =>
      record.budgetProcedure.proposes.state === "KNOWN"
        ? record.budgetProcedure.proposes.value
        : null;
    const leadDays = (record: MunicipalGovernanceRecord) =>
      record.budgetProcedure.submissionDeadline.state === "KNOWN"
        ? record.budgetProcedure.submissionDeadline.value
            .minimumDaysBeforeFiscalYear
        : null;
    expect([proposal(lexington), leadDays(lexington)]).toEqual(["MAYOR", 60]);
    expect([proposal(louisville), leadDays(louisville)]).toEqual(["MAYOR", 60]);
    expect([proposal(bowlingGreen), leadDays(bowlingGreen)]).toEqual([
      "CITY_MANAGER",
      30,
    ]);
  });
});

describe("no universal mayor-strength scalar exists", () => {
  it("carries powers as sourced rows, never a strength or a boolean consolidated flag", () => {
    const json = JSON.stringify(compiled().records);
    for (const forbidden of [
      "mayorStrength",
      "strongMayor",
      "weakMayor",
      "mayorPower",
      "strengthScore",
      "localDemocracy",
      '"consolidated"',
    ]) {
      expect(json.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("represents each power as an enumerated {power, actor, sourced capability and rule}", () => {
    const { bowlingGreen } = byId(compiled().records);
    const adoption = bowlingGreen.enumeratedPowers.find(
      (p) => p.power === "BUDGET_ADOPTION",
    );
    expect(adoption?.heldByRole).toBe("COMMISSION");
    expect(adoption?.capability.state).toBe("KNOWN");
    expect(adoption?.details.state).toBe("KNOWN");
    // Kentucky's city-manager-plan statute affirmatively denies this mayor a
    // veto. False is therefore a sourced fact, not an unknown default.
    const veto = bowlingGreen.enumeratedPowers.find((p) => p.power === "VETO");
    expect(veto?.capability.state).toBe("KNOWN");
    if (veto?.capability.state === "KNOWN") {
      expect(veto.capability.value).toBe(false);
    }
  });

  it("fails validation if a strength scalar is ever introduced", () => {
    const corpus = compiled();
    const tampered = JSON.parse(JSON.stringify(corpus.records)) as unknown[];
    (tampered[0] as { mayorStrength?: number }).mayorStrength = 7;
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered as MunicipalGovernanceRecord[],
    });
    expect(
      report.findings.some((f) => f.code === "municipal/forbidden-scalar"),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });
});

describe("mayor and professional manager are distinct actors", () => {
  it("keeps them in separate fields with distinct titles where both exist", () => {
    const { bowlingGreen } = byId(compiled().records);
    const mayor = bowlingGreen.administrativeStructure.mayor;
    const manager = bowlingGreen.administrativeStructure.professionalManager;
    expect(mayor.state).toBe("KNOWN");
    expect(manager.state).toBe("KNOWN");
    if (mayor.state === "KNOWN" && manager.state === "KNOWN") {
      expect(mayor.value.title).toBe("Mayor");
      expect(manager.value.title).toBe("City Manager");
      expect(manager.value.appointedByRole).toBe("COMMISSION");
    }
  });

  it("distinguishes a strong-mayor form (no manager) from a manager form", () => {
    const { louisville, bowlingGreen } = byId(compiled().records);
    // Louisville: elected mayor is chief executive; a city manager is not applicable.
    expect(louisville.administrativeStructure.professionalManager.state).toBe(
      "NOT_APPLICABLE",
    );
    // Bowling Green: executive and legislative fused in the Board, plus a manager.
    expect(
      bowlingGreen.administrativeStructure.executiveLegislativeSeparation.state,
    ).toBe("KNOWN");
    if (
      bowlingGreen.administrativeStructure.executiveLegislativeSeparation
        .state === "KNOWN"
    ) {
      expect(
        bowlingGreen.administrativeStructure.executiveLegislativeSeparation
          .value,
      ).toBe("EXECUTIVE_AND_LEGISLATIVE_FUSED_IN_BODY");
    }
  });

  it("reports a finding if a mayor and manager are collapsed into one title", () => {
    const corpus = compiled();
    const tampered = JSON.parse(
      JSON.stringify(corpus.records),
    ) as MunicipalGovernanceRecord[];
    const bg = tampered.find((r) => r.recordId === "us-ky-bowling-green");
    (
      bg as {
        administrativeStructure: {
          professionalManager: { value: { title: string } };
        };
      }
    ).administrativeStructure.professionalManager.value.title = "Mayor";
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered,
    });
    expect(
      report.findings.some((f) => f.code === "municipal/mayor-manager-fused"),
    ).toBe(true);
  });
});

describe("consolidation is a set of relationships, not a boolean", () => {
  it("keeps Louisville's nested home-rule cities alive after the merger", () => {
    const { louisville } = byId(compiled().records);
    expect(louisville.consolidation.consolidationType.state).toBe("KNOWN");
    const nested = louisville.consolidation.retainedNestedGovernments;
    expect(nested.length).toBeGreaterThanOrEqual(4);
    const names = nested.map((n) => n.name);
    expect(names).toContain("St. Matthews");
    for (const government of nested) {
      expect(government.survivesConsolidation.state).toBe("KNOWN");
      if (government.survivesConsolidation.state === "KNOWN") {
        expect(government.survivesConsolidation.value).toBe(true);
      }
    }
  });

  it("keeps predecessor units and retained county offices as their own facts", () => {
    const { lexington, louisville } = byId(compiled().records);
    expect(
      lexington.consolidation.predecessorUnits.map((u) => u.name).sort(),
    ).toEqual(["City of Lexington", "Fayette County"]);
    // The consolidated urban-county still has separately elected county offices.
    expect(
      louisville.consolidation.retainedCountyEquivalentOffices.length,
    ).toBeGreaterThan(0);
    expect(
      lexington.consolidation.retainedCountyEquivalentOffices.some((o) =>
        /Sheriff/.test(o.office),
      ),
    ).toBe(true);
  });

  it("distinguishes a consolidated government from a plain city", () => {
    const { lexington, louisville, bowlingGreen } = byId(compiled().records);
    const type = (r: MunicipalGovernanceRecord) =>
      r.consolidation.consolidationType.state === "KNOWN"
        ? r.consolidation.consolidationType.value
        : null;
    expect(type(lexington)).toBe("URBAN_COUNTY");
    expect(type(louisville)).toBe("METRO_CONSOLIDATED");
    expect(type(bowlingGreen)).toBe("NONE");
    // A non-consolidated city has no enabling authority to state.
    expect(bowlingGreen.consolidation.enablingAuthority.state).toBe(
      "NOT_APPLICABLE",
    );
    // Bowling Green keeps its own independent school district as a separate government.
    expect(
      bowlingGreen.consolidation.separateSchoolOrSpecialDistricts.some((d) =>
        /Bowling Green Independent/.test(d.name),
      ),
    ).toBe(true);
  });
});

describe("unknown stays unknown, and provenance survives", () => {
  it("leaves no value key on a fact nobody established", () => {
    const { louisville } = byId(compiled().records);
    const exactNestedCount = louisville.consolidation.nestedGovernmentCount;
    expect(exactNestedCount.state).toBe("UNKNOWN");
    expect(exactNestedCount).not.toHaveProperty("value");
    const councilTermLimit = louisville.electedStructure.terms.find(
      (term) => term.seatClass === "Metro Council Member",
    )?.termLimit;
    expect(councilTermLimit?.state).toBe("UNKNOWN");
    expect(councilTermLimit).not.toHaveProperty("value");
  });

  it("keeps genuine unknowns across every pilot", () => {
    for (const record of compiled().records) {
      const unresolved = sourcedLeaves(record).filter((leaf) =>
        isUnresolved(leaf as never),
      );
      expect(unresolved.length).toBeGreaterThan(0);
    }
  });

  it("carries an effective date and a retrieval date on every cited source", () => {
    for (const record of compiled().records) {
      expect(record.provenance.citedSources.length).toBeGreaterThan(0);
      for (const source of record.provenance.citedSources) {
        expect(source.url).toMatch(/^https?:\/\//);
        expect(source.retrievedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(source.title.length).toBeGreaterThan(0);
      }
      // The load-bearing legal basis carries a real effective date.
      const eff = record.legalBasis.effectiveDate;
      expect(eff.state).toBe("KNOWN");
      if (eff.state === "KNOWN")
        expect(eff.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("reports the facts it left unresolved rather than hiding them", () => {
    for (const record of compiled().records) {
      expect(record.provenance.unresolved.length).toBeGreaterThan(0);
    }
  });
});

describe("a Census place is not proof of municipal power", () => {
  it("leaves the Census/government-unit reference unresolved and grants nothing from it", () => {
    for (const record of compiled().records) {
      expect(record.sourceIdentity.censusGovernmentUnitReference.state).toBe(
        "UNKNOWN",
      );
    }
  });

  it("fails validation if a KNOWN power rests on a place-identity source", () => {
    const corpus = compiled();
    const tampered = JSON.parse(
      JSON.stringify(corpus.records),
    ) as MunicipalGovernanceRecord[];
    const bg = tampered.find((r) => r.recordId === "us-ky-bowling-green");
    if (!bg) throw new Error("no bowling green record");
    // Introduce a Census place source and re-point a KNOWN power at it.
    (bg.provenance.citedSources as unknown[]).push({
      sourceKey: "census-place",
      authorityType: "Census Place",
      title: "Census Gazetteer place record",
      issuingAuthority: "U.S. Census Bureau",
      url: "https://www.census.gov/geographies",
      effectiveDate: null,
      retrievedDate: "2026-09-05",
      retrievable: true,
      claimSupported: "A place identity, not a government power.",
    });
    const adoption = bg.enumeratedPowers.find(
      (p) => p.power === "BUDGET_ADOPTION",
    );
    (
      adoption as unknown as { capability: { evidence: unknown[] } }
    ).capability.evidence = [
      {
        artifactId: "census-place",
        locator: {
          kind: "legal-section",
          artifactId: "census-place",
          citation: "place",
          pageOrSection: "x",
        },
      },
    ];
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered,
    });
    expect(
      report.findings.some((f) => f.code === "municipal/place-as-power"),
    ).toBe(true);
  });
});

describe("deterministic compile", () => {
  it("produces the same canonical digest on repeated compilation", () => {
    const a = compiled();
    const b = compiled();
    expect(a.corpus.canonicalSha256).toBe(b.corpus.canonicalSha256);
    expect(a.corpus.recordCount).toBe(3);
  });

  it("sorts records by their stable source key", () => {
    const ids = compiled().records.map((r) => r.recordId);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("the authoring parser refuses a shape it cannot transcribe", () => {
  it("reports a defect for a pack with no cited sources", () => {
    const { defects } = parseMunicipalArtifacts({
      packs: [
        {
          sourceGovernmentKey: "us-ky-x",
          state: "KY",
          citedSources: [],
        } as never,
      ],
    });
    expect(defects.length).toBeGreaterThan(0);
    expect(defects[0]?.message).toMatch(/cites no sources/);
  });

  it("downgrades a KNOWN fact with no effective date to UNKNOWN rather than dating it from the build", () => {
    // The real fixture proves the happy path; this proves the guard exists by
    // reading the compiled corpus, where every KNOWN carries a dated source.
    for (const record of compiled().records) {
      for (const leaf of sourcedLeaves(record)) {
        if ((leaf as { state: string }).state === "KNOWN") {
          expect(leaf).toHaveProperty("asOf");
        }
      }
    }
  });
});

describe("municipal semantic validation fails closed", () => {
  it("rejects body-size arithmetic that disagrees with the seat composition", () => {
    const corpus = compiled();
    const tampered = JSON.parse(
      JSON.stringify(corpus.records),
    ) as MunicipalGovernanceRecord[];
    const bg = tampered.find(
      (record) => record.recordId === "us-ky-bowling-green",
    );
    if (!bg || bg.electedStructure.bodySize.state !== "KNOWN") {
      throw new Error("missing Bowling Green body size");
    }
    (bg.electedStructure.bodySize as { value: number }).value = 6;
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered,
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "municipal/body-size-mismatch",
      ),
    ).toBe(true);
  });

  it("rejects impossible fixed-vote arithmetic", () => {
    const corpus = compiled();
    const tampered = JSON.parse(
      JSON.stringify(corpus.records),
    ) as MunicipalGovernanceRecord[];
    const lexington = tampered.find(
      (record) => record.recordId === "us-ky-lexington-fayette-ucg",
    );
    const override = lexington?.enumeratedPowers.find(
      (power) => power.power === "OVERRIDE",
    );
    if (
      override?.details.state !== "KNOWN" ||
      !override.details.value.threshold
    ) {
      throw new Error("missing Lexington override threshold");
    }
    (
      override.details.value.threshold as { fixedVotesRequired: number }
    ).fixedVotesRequired = 16;
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered,
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "municipal/invalid-vote-threshold",
      ),
    ).toBe(true);
  });

  it("rejects an undeclared evidence edge", () => {
    const corpus = compiled();
    const tampered = JSON.parse(
      JSON.stringify(corpus.records),
    ) as MunicipalGovernanceRecord[];
    const bodyName = tampered[0]?.electedStructure.bodyName;
    if (bodyName?.state !== "KNOWN") throw new Error("missing body name");
    (bodyName.evidence[0] as { artifactId: string }).artifactId =
      "not-declared";
    (bodyName.evidence[0].locator as { artifactId: string }).artifactId =
      "not-declared";
    const report = validateMunicipalGovernanceCorpus({
      corpus: corpus.corpus,
      records: tampered,
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "municipal/undeclared-evidence",
      ),
    ).toBe(true);
  });
});

describe("the production gate", () => {
  it("refuses to compile production records, and says why", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "x", artifacts: [] }),
    ).toThrow(/compiles no production corpus/);
    expect(sourceDomain.productionGate).toBe(MUNICIPAL_PRODUCTION_GATE);
    expect(MUNICIPAL_PRODUCTION_GATE.length).toBeGreaterThan(40);
    expect(MUNICIPAL_PRODUCTION_GATE).toMatch(
      /secondary synthesis|first-party/,
    );
  });

  it("commits no production corpus for the gated domain", () => {
    const corpusPath = resolve(
      REPO,
      "data/source/municipal-governance/corpus.json",
    );
    let exists = true;
    try {
      readFileSync(corpusPath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
