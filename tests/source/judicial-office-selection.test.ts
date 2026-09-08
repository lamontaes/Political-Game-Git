/** Independent structural oracles for the completed 92L source domain. */

import { describe, expect, it } from "vitest";
import { readLock } from "../../scripts/source/compile";
import { isClean } from "../../src/source/core/index";
import type { CompiledCorpus, Sourced } from "../../src/source/core/index";
import {
  EXPECTED_ACTIVE_JUDICIAL_OFFICES,
  EXPECTED_JUDICIAL_JURISDICTIONS,
  EXPECTED_JUDICIAL_SLOTS,
  NO_INTERMEDIATE_APPELLATE,
  parseResearchTranscription,
  sourceDomain,
  validateJudicialOfficeSelectionCorpus,
} from "../../src/source/domains/judicial-office-selection/index";
import type {
  AtomicSelectionMechanism,
  JudicialOfficeSelectionRecord,
} from "../../src/source/domains/judicial-office-selection/index";

function compiled(): CompiledCorpus<
  JudicialOfficeSelectionRecord,
  "production"
> {
  return sourceDomain.compileProduction(readLock(sourceDomain));
}

function record(id: string): JudicialOfficeSelectionRecord {
  const found = compiled().records.find((entry) => entry.recordId === id);
  if (!found) throw new Error(`Missing judicial record ${id}.`);
  return found;
}

function value<T>(sourced: Sourced<T>): T {
  if (sourced.state !== "KNOWN") {
    throw new Error(`Expected KNOWN, got ${sourced.state}.`);
  }
  return sourced.value;
}

function initialMechanisms(id: string): readonly AtomicSelectionMechanism[] {
  return value(record(id).initialSelection).paths.flatMap((path) =>
    path.stages.map((stage) => stage.mechanism),
  );
}

function renewalMechanisms(id: string): readonly AtomicSelectionMechanism[] {
  return value(record(id).renewal).paths.flatMap((path) =>
    path.stages.map((stage) => stage.mechanism),
  );
}

describe("92L national coverage", () => {
  it("compiles the declared national universe", () => {
    const corpus = compiled();
    expect(corpus.records).toHaveLength(EXPECTED_JUDICIAL_SLOTS);
    expect(
      new Set(corpus.records.map((entry) => entry.jurisdictionId)).size,
    ).toBe(EXPECTED_JUDICIAL_JURISDICTIONS);
    expect(
      corpus.records.filter((entry) => value(entry.officeExists)).length,
    ).toBe(EXPECTED_ACTIVE_JUDICIAL_OFFICES);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(true);
    expect(corpus.corpus.asOf).toBe("2026-09-05");
  });

  it("keeps all eight absent intermediate courts as explicit non-applicable slots", () => {
    for (const jurisdictionId of NO_INTERMEDIATE_APPELLATE) {
      const office = record(`${jurisdictionId}:intermediate_appellate`);
      expect(value(office.officeExists)).toBe(false);
      expect(office.courtName.state).toBe("NOT_APPLICABLE");
      expect(office.initialSelection.state).toBe("NOT_APPLICABLE");
      expect(office.tenure.state).toBe("NOT_APPLICABLE");
      expect(office.renewal.state).toBe("NOT_APPLICABLE");
      expect(office.courtName).not.toHaveProperty("value");
    }
  });
});

describe("atomic selection and ordered pipelines", () => {
  it("keeps appointment, popular election, merit selection, and legislative election distinct", () => {
    expect(initialMechanisms("us-fed:highest_court")).toEqual([
      "EXECUTIVE_NOMINATION",
      "LEGISLATIVE_CONFIRMATION",
    ]);
    expect(initialMechanisms("us-ky:highest_court")).toEqual([
      "NONPARTISAN_GENERAL_ELECTION",
    ]);
    expect(initialMechanisms("us-tx:highest_court_civil")).toEqual([
      "PARTISAN_GENERAL_ELECTION",
    ]);
    expect(initialMechanisms("us-mo:highest_court")).toEqual([
      "MERIT_COMMISSION_SHORTLIST",
      "EXECUTIVE_APPOINTMENT",
    ]);
    expect(initialMechanisms("us-va:highest_court")).toEqual([
      "LEGISLATIVE_SCREENING",
      "LEGISLATIVE_ELECTION",
    ]);
  });

  it("keeps New York's assisted appointment and later reappointment pipelines ordered", () => {
    expect(initialMechanisms("us-ny:highest_court")).toEqual([
      "MERIT_COMMISSION_SHORTLIST",
      "EXECUTIVE_APPOINTMENT",
      "LEGISLATIVE_CONFIRMATION",
    ]);
    expect(renewalMechanisms("us-ny:highest_court")).toEqual([
      "MERIT_COMMISSION_SHORTLIST",
      "EXECUTIVE_REAPPOINTMENT",
      "LEGISLATIVE_CONFIRMATION",
    ]);
  });

  it("retains every reported workflow stage in original order", () => {
    for (const office of compiled().records) {
      if (!value(office.officeExists)) continue;
      const selection = value(office.initialSelection);
      expect(selection.reportedWorkflowStages.length).toBeGreaterThan(0);
      for (const selectionPath of selection.paths) {
        expect(selectionPath.stages.map((stage) => stage.order)).toEqual(
          selectionPath.stages.map((_, index) => index + 1),
        );
      }
    }
  });

  it("preserves alternative local-option paths instead of flattening them", () => {
    const kansasTrial = value(record("us-ks:general_trial").initialSelection);
    expect(kansasTrial.paths.map((path) => path.pathId)).toEqual([
      "merit-appointment",
      "partisan-election",
    ]);
    const arizonaTrial = value(record("us-az:general_trial").initialSelection);
    expect(arizonaTrial.paths.length).toBeGreaterThan(1);
  });
});

describe("tenure, renewal, and vacancy distinctions", () => {
  it("keeps good-behavior tenure separate from a fixed term", () => {
    const federal = value(record("us-fed:highest_court").tenure);
    const texas = value(record("us-tx:highest_court_civil").tenure);
    expect(federal.kind).toBe("GOOD_BEHAVIOR");
    expect(federal.termLengthYears.state).toBe("NOT_APPLICABLE");
    expect(texas.kind).toBe("FIXED_TERM");
    expect(value(texas.termLengthYears)).toBe(6);
  });

  it("keeps retention distinct from contested reelection", () => {
    expect(renewalMechanisms("us-mo:highest_court")).toEqual([
      "RETENTION_ELECTION",
    ]);
    expect(renewalMechanisms("us-tx:highest_court_civil")).toEqual([
      "PARTISAN_GENERAL_ELECTION",
    ]);
    expect(record("us-fed:highest_court").renewal.state).toBe("NOT_APPLICABLE");
    expect(record("us-fed:highest_court").renewal).not.toHaveProperty("value");
  });

  it("preserves the packet's exact non-majority retention thresholds", () => {
    expect(value(value(record("us-il:highest_court").renewal).threshold)).toBe(
      "60%_supermajority",
    );
    expect(value(value(record("us-nm:highest_court").renewal).threshold)).toBe(
      "57%_supermajority",
    );
  });

  it("keeps interim self-succession disqualification explicit", () => {
    for (const jurisdictionId of ["us-ar", "us-la"]) {
      expect(
        value(
          value(record(`${jurisdictionId}:highest_court`).interimVacancy)
            .selfSuccessionPermitted,
        ),
      ).toBe(false);
    }
  });
});

describe("source honesty and value algebra", () => {
  it("binds every record to the retrieved packet without claiming primary-authority retrieval", () => {
    for (const office of compiled().records) {
      expect(office.evidence.providerNativeId).toBe(
        "1zHRVfLrHcQuZnmSwpSKIavwuUEH_vIhs",
      );
      expect(office.researchProvenance.packetStatus).toBe(
        "RETRIEVED_AND_LOCKED",
      );
      expect(office.researchProvenance.primaryAuthorityStatus).toBe(
        "CITATIONS_REPORTED_NOT_RETRIEVED",
      );
    }
  });

  it("does not collapse no-requirement and not-applicable states", () => {
    const federal = record("us-fed:highest_court");
    expect(federal.qualifications.minimumAge.state).toBe(
      "NO_REQUIREMENT_FOUND",
    );
    expect(federal.qualifications.minimumAge).not.toHaveProperty("value");
    expect(value(federal.tenure).termLengthYears.state).toBe("NOT_APPLICABLE");
    expect(value(federal.tenure).termLengthYears).not.toHaveProperty("value");
  });

  it("rejects a malformed companion transcription instead of filling gaps", () => {
    expect(() => parseResearchTranscription("{}")).toThrow(/metadata/);
    expect(() =>
      parseResearchTranscription(
        JSON.stringify({ metadata: {}, jurisdictions: [] }),
      ),
    ).toThrow(/jurisdictions.*object/);
  });

  it("validator catches a promoted primary-authority claim", () => {
    const corpus = compiled();
    const first = corpus.records[0] as JudicialOfficeSelectionRecord;
    const tampered = {
      ...first,
      researchProvenance: {
        ...first.researchProvenance,
        primaryAuthorityStatus: "RETRIEVED",
      },
    } as unknown as JudicialOfficeSelectionRecord;
    const report = validateJudicialOfficeSelectionCorpus({
      corpus: corpus.corpus,
      records: [tampered, ...corpus.records.slice(1)],
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "judicial/claims-primary-retrieval",
      ),
    ).toBe(true);
  });

  it("validates cleanly and compiles deterministically", () => {
    const first = compiled();
    const second = compiled();
    expect(isClean(validateJudicialOfficeSelectionCorpus(first))).toBe(true);
    expect(first.corpus.canonicalSha256).toBe(second.corpus.canonicalSha256);
    expect(first.records.map((entry) => entry.recordId)).toEqual(
      [...first.records.map((entry) => entry.recordId)].sort(),
    );
  });
});
