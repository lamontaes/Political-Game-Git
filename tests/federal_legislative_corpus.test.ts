/**
 * Federal Legislative Source Corpus - Test Suite
 *
 * Automated verification of:
 * - Provenance & cryptographic hash integrity
 * - Deterministic builds & idempotence
 * - Text-version identity & deduplication
 * - Amendment deduplication
 * - Action chronological ordering & index preservation
 * - Veto vs. Veto-Override distinction
 * - Provider separation & absence preservation (House roll calls vs unrecorded Senate vote shapes)
 * - Resolution lifecycles vs Public Law bills
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileFederalLegislativeCorpus,
  buildFederalCoverageManifest,
  validateFederalCorpusBundle,
  validateFederalMeasure,
  parseCongressGovBillPayload,
  parseCongressGovHouseVotePayload,
  parseGovInfoTextVersion,
  mergeGovInfoTextVersions,
  hashDataStructure,
  type CongressGovBillPayload,
  type CongressGovHouseVotePayload,
  type GovInfoPackageSummary,
  type FederalTextVersionRecord,
} from "../src/federal_legislative_corpus/index.js";

const FIXTURES_DIR = join(
  __dirname,
  "../data/federal_legislative_source/fixtures",
);

function loadFixture<T>(filename: string): T {
  const filePath = join(FIXTURES_DIR, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

describe("Federal Legislative Source Corpus", () => {
  const enactedLawPayload = loadFixture<CongressGovBillPayload>(
    "ordinary_enacted_law_hr5376.json",
  );
  const vetoPayload = loadFixture<CongressGovBillPayload>(
    "veto_unoverridden_hjres30.json",
  );
  const vetoOverridePayload = loadFixture<CongressGovBillPayload>(
    "veto_override_enacted_hr6395.json",
  );
  const failedBillPayload = loadFixture<CongressGovBillPayload>(
    "failed_floor_vote_hr.json",
  );
  const unresolvedBillPayload = loadFixture<CongressGovBillPayload>(
    "unresolved_session_ended_s.json",
  );
  const amendmentBillPayload = loadFixture<CongressGovBillPayload>(
    "amendment_fixture_hamdt.json",
  );
  const simpleResPayload = loadFixture<CongressGovBillPayload>(
    "simple_resolution_hres.json",
  );
  const concurrentResPayload = loadFixture<CongressGovBillPayload>(
    "concurrent_resolution_sconres.json",
  );
  const houseVotePayload = loadFixture<CongressGovHouseVotePayload>(
    "house_roll_call_vote.json",
  );
  const govinfoSummaries = loadFixture<GovInfoPackageSummary[]>(
    "govinfo_package_sample.json",
  );

  describe("1. Provenance and Hash Stability", () => {
    it("generates deterministic SHA-256 hashes regardless of object key order", () => {
      const objA = { z: 1, a: 2, m: { b: "hello", a: 10 } };
      const objB = { a: 2, z: 1, m: { a: 10, b: "hello" } };

      const hashA = hashDataStructure(objA);
      const hashB = hashDataStructure(objB);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);
    });

    it("creates valid provenance metadata matching computed record hash", () => {
      const measure = parseCongressGovBillPayload(enactedLawPayload);
      expect(measure.provenance.primarySource).toBe("Congress.gov API");
      expect(measure.provenance.secondaryDocumentSource).toBe("GovInfo API");
      expect(measure.provenance.schemaVersion).toBe("1.0.0");

      const issues = validateFederalMeasure(measure);
      expect(
        issues.filter((i) => i.code === "PROVENANCE_HASH_MISMATCH"),
      ).toHaveLength(0);
    });
  });

  describe("2. Deterministic Compilation & Build Idempotence", () => {
    it("produces identical bundle output across multiple compilation runs", () => {
      const input = {
        billPayloads: [
          enactedLawPayload,
          vetoPayload,
          vetoOverridePayload,
          failedBillPayload,
          unresolvedBillPayload,
          amendmentBillPayload,
          simpleResPayload,
          concurrentResPayload,
        ],
        govinfoSummaries,
        houseVotePayloads: [houseVotePayload],
        generationTimestamp: "2026-08-28T00:00:00.000Z",
      };

      const build1 = compileFederalLegislativeCorpus(input);
      const build2 = compileFederalLegislativeCorpus(input);

      expect(build1.corpusSha256).toBe(build2.corpusSha256);
      expect(JSON.stringify(build1)).toBe(JSON.stringify(build2));
    });

    it("passes all integrity checks on compiled bundle", () => {
      const input = {
        billPayloads: [
          enactedLawPayload,
          vetoPayload,
          vetoOverridePayload,
          failedBillPayload,
          unresolvedBillPayload,
          amendmentBillPayload,
          simpleResPayload,
          concurrentResPayload,
        ],
        govinfoSummaries,
        houseVotePayloads: [houseVotePayload],
        generationTimestamp: "2026-08-28T00:00:00.000Z",
      };

      const bundle = compileFederalLegislativeCorpus(input);
      const report = validateFederalCorpusBundle(bundle);

      expect(report.isValid).toBe(true);
      expect(report.errorCount).toBe(0);
      expect(report.totalMeasuresChecked).toBe(8);
      expect(report.totalVotesChecked).toBe(1);
    });
  });

  describe("3. Text-Version Identity and GovInfo Enrichment", () => {
    it("correctly maps GovInfo package summaries and formats", () => {
      const summary = govinfoSummaries[0];
      const parsed = parseGovInfoTextVersion(summary);

      expect(parsed.versionCode).toBe("enr");
      expect(parsed.versionName).toBe("Enrolled Bill");
      expect(parsed.govinfoPackageId).toBe("BILLS-117hr5376enr");
      expect(parsed.formats.length).toBeGreaterThan(0);
      expect(parsed.formats.some((f) => f.formatType === "pdf")).toBe(true);
      expect(parsed.formats.some((f) => f.formatType === "xml")).toBe(true);
    });

    it("merges GovInfo versions into measure text versions without duplicate keys", () => {
      const existing: FederalTextVersionRecord[] = [
        {
          versionCode: "ih",
          versionName: "Introduced in House",
          date: "2021-09-27",
          formats: [{ formatType: "txt", url: "https://example.com/ih.txt" }],
        },
      ];

      const merged = mergeGovInfoTextVersions(existing, govinfoSummaries);
      expect(merged.length).toBe(3); // ih, enr, pl

      const enrolled = merged.find((v) => v.versionCode === "enr");
      expect(enrolled).toBeDefined();
      expect(enrolled?.govinfoPackageId).toBe("BILLS-117hr5376enr");
    });

    it("deduplicates identical text version entries from source payload", () => {
      const duplicateTextPayload: CongressGovBillPayload = {
        ...enactedLawPayload,
        textVersions: {
          items: [
            {
              type: "ih",
              date: "2021-09-27",
              formats: [{ type: "PDF", url: "https://example.com/1.pdf" }],
            },
            {
              type: "ih",
              date: "2021-09-27",
              formats: [{ type: "PDF", url: "https://example.com/1.pdf" }],
            },
          ],
        },
      };

      const measure = parseCongressGovBillPayload(duplicateTextPayload);
      expect(measure.textVersions.length).toBe(1);
    });
  });

  describe("4. Amendment Deduplication and Integrity", () => {
    it("strictly deduplicates duplicate amendments in source payload", () => {
      // amendmentBillPayload contains two identical H.Amdt 150 items
      const measure = parseCongressGovBillPayload(amendmentBillPayload);
      expect(measure.amendments.length).toBe(1);
      expect(measure.amendments[0].amendmentNumber).toBe(150);
      expect(measure.amendments[0].amendmentId).toBe("us_fed_117_hamdt_150");
      expect(measure.amendments[0].isAgreedTo).toBe(true);
    });

    it("verifies amendment parent linkage", () => {
      const measure = parseCongressGovBillPayload(amendmentBillPayload);
      for (const amd of measure.amendments) {
        expect(amd.parentMeasureId).toBe(measure.measureId);
      }
    });
  });

  describe("5. Action Chronological Ordering & 1-Based Indexing", () => {
    it("sorts actions chronologically and assigns 1-based sequential indices", () => {
      const measure = parseCongressGovBillPayload(enactedLawPayload);
      expect(measure.actions.length).toBeGreaterThan(0);

      for (let i = 0; i < measure.actions.length; i += 1) {
        const act = measure.actions[i];
        expect(act.sequence).toBe(i + 1);
        expect(act.actionId).toBe(`${measure.measureId}_act_${i + 1}`);

        if (i > 0) {
          const prev = measure.actions[i - 1];
          expect(act.actionDate >= prev.actionDate).toBe(true);
        }
      }
    });
  });

  describe("6. Presidential Veto vs. Veto Override Distinction", () => {
    it("correctly classifies ordinary enacted law as signed-became-law with Public Law identifier", () => {
      const measure = parseCongressGovBillPayload(enactedLawPayload);
      expect(measure.derivedLifecycle.status).toBe("signed-became-law");
      expect(measure.publicLawNumber).toBe("Public Law 117-169");
      expect(measure.derivedLifecycle.enactmentDate).toBe("2022-08-16");
      expect(measure.derivedLifecycle.vetoDate).toBeUndefined();
    });

    it("correctly classifies sustained Presidential veto without override as vetoed", () => {
      const measure = parseCongressGovBillPayload(vetoPayload);
      expect(measure.derivedLifecycle.status).toBe("vetoed");
      expect(measure.derivedLifecycle.vetoDate).toBe("2023-03-20");
      expect(measure.derivedLifecycle.vetoOverrideDate).toBeUndefined();
      expect(measure.derivedLifecycle.enactmentDate).toBeUndefined();
      expect(measure.derivedLifecycle.detail).toContain("veto sustained");
    });

    it("correctly classifies successful two-chamber override as veto-override into Public Law", () => {
      const measure = parseCongressGovBillPayload(vetoOverridePayload);
      expect(measure.derivedLifecycle.status).toBe("veto-override");
      expect(measure.publicLawNumber).toBe("Public Law 116-283");
      expect(measure.derivedLifecycle.vetoDate).toBe("2020-12-23");
      expect(measure.derivedLifecycle.vetoOverrideDate).toBe("2021-01-01");
      expect(measure.derivedLifecycle.enactmentDate).toBe("2021-01-01");
      expect(measure.derivedLifecycle.detail).toContain(
        "Enacted into law over Presidential veto",
      );
    });
  });

  describe("7. Failed Bills and Session-Ended Unresolved Status", () => {
    it("correctly classifies floor vote defeat as explicitly-failed-or-withdrawn", () => {
      const measure = parseCongressGovBillPayload(failedBillPayload);
      expect(measure.derivedLifecycle.status).toBe(
        "explicitly-failed-or-withdrawn",
      );
      expect(measure.derivedLifecycle.failureReason).toContain(
        "Failed by the Yeas and Nays",
      );
    });

    it("preserves unresolved status when session ends sine die without floor defeat or enactment", () => {
      const measure = parseCongressGovBillPayload(unresolvedBillPayload, {
        congressSineDie: true,
      });
      expect(measure.derivedLifecycle.status).toBe("unresolved");
      expect(measure.derivedLifecycle.detail).toContain(
        "adjourned sine die without final floor action",
      );
    });
  });

  describe("8. Resolution Lifecycles (Simple vs Concurrent vs Joint/Bills)", () => {
    it("correctly classifies simple resolution as chamber-passed without presidential presentation", () => {
      const measure = parseCongressGovBillPayload(simpleResPayload);
      expect(measure.measureType).toBe("hres");
      expect(measure.derivedLifecycle.status).toBe("chamber-passed");
      expect(measure.derivedLifecycle.detail).toContain(
        "Agreed to in House (Simple Resolution)",
      );
    });

    it("correctly classifies concurrent resolution as both-chambers-passed without presidential presentation", () => {
      const measure = parseCongressGovBillPayload(concurrentResPayload);
      expect(measure.measureType).toBe("sconres");
      expect(measure.derivedLifecycle.status).toBe("both-chambers-passed");
      expect(measure.derivedLifecycle.detail).toContain(
        "Agreed to in both House and Senate (Concurrent Resolution)",
      );
    });
  });

  describe("9. Provider Separation & Absence Preservation (House Roll Calls vs Senate Votes)", () => {
    it("faithfully parses House roll-call vote payload with member tallies and party totals", () => {
      const vote = parseCongressGovHouseVotePayload(houseVotePayload);
      expect(vote.voteId).toBe("us_fed_117_house_roll_420");
      expect(vote.congress).toBe(117);
      expect(vote.rollNumber).toBe(420);
      expect(vote.totals.yea).toBe(220);
      expect(vote.totals.nay).toBe(207);
      expect(vote.totals.notVoting).toBe(4);
      expect(vote.memberVotes?.length).toBe(4);
      expect(vote.relatedMeasureId).toBe("us_fed_117_hr_5376");
    });

    it("preserves absence of fabricated Senate vote objects when Senate roll calls are not supplied in API shape", () => {
      // Senate actions in fixtures contain text and record vote numbers (e.g. "Record Vote Number: 303")
      // Invariant: No fake House-like roll call records are fabricated for Senate actions without official endpoint support
      const bundle = compileFederalLegislativeCorpus({
        billPayloads: [enactedLawPayload],
        houseVotePayloads: [houseVotePayload],
        generationTimestamp: "2026-08-28T00:00:00.000Z",
      });

      expect(bundle.houseVotes.every((v) => v.chamber === "house")).toBe(true);
      const measure = bundle.measures[0];
      const senatePassAction = measure.actions.find(
        (a) =>
          a.actingChamber === "senate" &&
          a.rawDescription.includes("Record Vote Number"),
      );
      expect(senatePassAction).toBeDefined();
      // Senate vote is preserved faithfully in action text without fabricated vote object
      expect(senatePassAction?.recordedVoteRef).toBeNull();
    });
  });

  describe("10. Coverage Manifest Generator", () => {
    it("builds accurate national federal coverage manifest", () => {
      const bundle = compileFederalLegislativeCorpus({
        billPayloads: [
          enactedLawPayload,
          vetoPayload,
          vetoOverridePayload,
          failedBillPayload,
          unresolvedBillPayload,
          amendmentBillPayload,
          simpleResPayload,
          concurrentResPayload,
        ],
        houseVotePayloads: [houseVotePayload],
        generationTimestamp: "2026-08-28T00:00:00.000Z",
      });

      const manifest = buildFederalCoverageManifest(bundle);

      expect(manifest.manifestVersion).toBe("1.0.0");
      expect(manifest.totalMeasures).toBe(8);
      expect(manifest.totalEnactedLaws).toBe(1);
      expect(manifest.totalVetoes).toBe(1);
      expect(manifest.totalVetoOverrides).toBe(1);
      expect(manifest.totalHouseVotes).toBe(1);
      expect(manifest.totalAmendments).toBe(2);

      const c117 = manifest.congresses.find((c) => c.congressNumber === 117);
      expect(c117).toBeDefined();
      expect(c117?.measureCount).toBe(4);
    });
  });
});
