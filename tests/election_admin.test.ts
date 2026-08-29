import { describe, expect, it } from "vitest";
import type {
  CpsCalibrationRecord,
  RawCpsInput,
  RawEavsInput,
  RawHistoricalTurnoutSeriesInput,
  RawPolicySurveyInput,
} from "../src/election_admin";
import {
  compileElectionAdminCorpus,
  loadJsonFixturesFromDir,
  normalizeEavsRecord,
  normalizePolicySurveyRecord,
  parseAdminNumber,
  validateElectionAdminCorpus,
} from "../src/election_admin";

describe("Election Administration & Participation Source Compiler", () => {
  const eavsFixtures = loadJsonFixturesFromDir<RawEavsInput>(
    "data/election_administration/fixtures/eavs",
  );
  const policyFixtures = loadJsonFixturesFromDir<RawPolicySurveyInput>(
    "data/election_administration/fixtures/policy_survey",
  );
  const cpsFixtures = loadJsonFixturesFromDir<RawCpsInput>(
    "data/election_administration/fixtures/cps",
  );
  const histFixtures = loadJsonFixturesFromDir<RawHistoricalTurnoutSeriesInput>(
    "data/election_administration/fixtures/historical",
  );

  // -------------------------------------------------------------------------
  // 1. Admin vs Survey Separation
  // -------------------------------------------------------------------------
  describe("CRITICAL SEMANTIC RULE: Admin vs Survey Separation", () => {
    it("strictly isolates administrative official records from survey sample estimates", () => {
      const corpus = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        "2026-08-28T18:00:00.000Z",
      );

      // EAVS records must ALWAYS be administrative_official
      for (const eavs of corpus.eavsRecords) {
        expect(eavs.sourceType).toBe("administrative_official");
      }

      // Policy Survey records must ALWAYS be administrative_official
      for (const ps of corpus.policySurveys) {
        expect(ps.sourceType).toBe("administrative_official");
      }

      // CPS calibration records must ALWAYS be survey_sample_estimate
      for (const cps of corpus.cpsCalibrations) {
        expect(cps.sourceType).toBe("survey_sample_estimate");
      }

      // Historical turnout series entries must explicitly separate admin and survey sources
      for (const hist of corpus.historicalSeries) {
        for (const entry of hist.seriesEntries) {
          expect(entry.officialAdministrativeTurnout.sourceType).toBe(
            "administrative_official",
          );
          expect(entry.cpsSurveyReportedTurnout.sourceType).toBe(
            "survey_sample_estimate",
          );
        }
      }
    });

    it("detects and rejects invalid source types during validation", () => {
      const corpus = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        "2026-08-28T18:00:00.000Z",
      );

      // Mutate one record's sourceType to test validation rejection
      const mutatedCorpus = {
        ...corpus,
        cpsCalibrations: [
          {
            ...corpus.cpsCalibrations[0]!,
            sourceType:
              "administrative_official" as unknown as CpsCalibrationRecord["sourceType"],
          },
          ...corpus.cpsCalibrations.slice(1),
        ],
      };

      const result = validateElectionAdminCorpus(mutatedCorpus);
      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.rule === "admin_vs_survey_isolation"),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. No Missing-As-Zero Invariant
  // -------------------------------------------------------------------------
  describe("No Missing-As-Zero Invariant", () => {
    it("preserves missing/uncollected administrative metrics as null instead of zero", () => {
      expect(parseAdminNumber(null)).toBeNull();
      expect(parseAdminNumber(undefined)).toBeNull();
      expect(parseAdminNumber("")).toBeNull();
      expect(parseAdminNumber("NA")).toBeNull();
      expect(parseAdminNumber("N/A")).toBeNull();
      expect(parseAdminNumber("-999999")).toBeNull();
      expect(parseAdminNumber("Data not available")).toBeNull();
      expect(parseAdminNumber(0)).toBe(0);
      expect(parseAdminNumber("0")).toBe(0);
      expect(parseAdminNumber(42)).toBe(42);
      expect(parseAdminNumber("1,234,567")).toBe(1234567);
    });

    it("preserves uncollected territorial in-person turnout without coercing to zero", () => {
      const prRecord = eavsFixtures.find((f) => f.stateAbbr === "PR" && !f.countyFips);
      expect(prRecord).toBeDefined();

      const normalized = normalizeEavsRecord(prRecord!);
      expect(normalized.sectionD_inPersonAndPolling.totalParticipants).toBeNull();
      expect(
        normalized.sectionD_inPersonAndPolling.inPersonElectionDayVotes,
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Year & Vintage Safety
  // -------------------------------------------------------------------------
  describe("Year & Vintage Safety", () => {
    it("validates biennial cycles and chronological ordering", () => {
      const corpus = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        "2026-08-28T18:00:00.000Z",
      );

      for (const hist of corpus.historicalSeries) {
        expect(hist.startYear).toBeLessThan(hist.endYear);
        let lastYear = 0;
        for (const entry of hist.seriesEntries) {
          expect(entry.year).toBeGreaterThan(lastYear);
          lastYear = entry.year;
        }
      }
    });

    it("rejects non-monotonic historical turnout series", () => {
      const rawInvalidHist: RawHistoricalTurnoutSeriesInput = {
        stateAbbr: "KY",
        fips: "21",
        jurisdictionName: "Kentucky",
        startYear: 2024,
        endYear: 2020, // Invalid: startYear > endYear
        retrievalDate: "2025-01-01",
        sourceUrl: "https://example.com",
        seriesEntries: [
          {
            year: 2024,
            electionType: "presidential",
            officialAdministrativeTurnout: { highestOfficeVotesCast: 100 },
            cpsSurveyReportedTurnout: {
              reportedVotedCount: 100,
              reportedVotedRatePercent: 50,
              marginOfError90Percent: 1.0,
            },
          },
          {
            year: 2020, // Invalid: descending year
            electionType: "presidential",
            officialAdministrativeTurnout: { highestOfficeVotesCast: 90 },
            cpsSurveyReportedTurnout: {
              reportedVotedCount: 90,
              reportedVotedRatePercent: 45,
              marginOfError90Percent: 1.0,
            },
          },
        ],
      };

      expect(() =>
        compileElectionAdminCorpus(
          eavsFixtures,
          policyFixtures,
          cpsFixtures,
          [rawInvalidHist],
          "2026-08-28T18:00:00.000Z",
        ),
      ).toThrow(/Corpus compilation validation failed/);
    });
  });

  // -------------------------------------------------------------------------
  // 4. County & State Identity
  // -------------------------------------------------------------------------
  describe("County & State Geography Hierarchy", () => {
    it("enforces FIPS length, county prefix matching, and parent links", () => {
      const corpus = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        "2026-08-28T18:00:00.000Z",
      );

      const fayette = corpus.eavsRecords.find(
        (r) => r.jurisdictionId === "us_ky_21067",
      );
      expect(fayette).toBeDefined();
      expect(fayette!.level).toBe("county");
      expect(fayette!.fips).toBe("21067");
      expect(fayette!.stateFips).toBe("21");
      expect(fayette!.parentJurisdictionId).toBe("us_ky");

      const multnomah = corpus.eavsRecords.find(
        (r) => r.jurisdictionId === "us_or_41051",
      );
      expect(multnomah).toBeDefined();
      expect(multnomah!.level).toBe("county");
      expect(multnomah!.fips).toBe("41051");
      expect(multnomah!.stateFips).toBe("41");
      expect(multnomah!.parentJurisdictionId).toBe("us_or");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Methodology Preservation for Survey Estimates
  // -------------------------------------------------------------------------
  describe("CPS Survey Methodology Preservation", () => {
    it("preserves sample weights, SE, 90% MOE, and universe definitions", () => {
      const corpus = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        "2026-08-28T18:00:00.000Z",
      );

      const nationalCps = corpus.cpsCalibrations.find(
        (c) => c.jurisdictionId === "us_fed",
      );
      expect(nationalCps).toBeDefined();
      expect(nationalCps!.surveyUniverse).toBe("citizen_voting_age_population");
      expect(nationalCps!.weightingVariable).toBe("PWSSWGT");
      expect(nationalCps!.sampleSizeUnweighted).toBeGreaterThan(50000);
      expect(nationalCps!.reportedRegistration.marginOfError90Percent).toBe(0.39);
      expect(nationalCps!.reportedVoting.marginOfError90Percent).toBe(0.43);

      // Verify demographics cross-tabulations exist
      expect(nationalCps!.demographics?.byAge?.length).toBeGreaterThanOrEqual(4);
      expect(nationalCps!.demographics?.bySex?.length).toBe(2);
      expect(
        nationalCps!.demographics?.byRaceHispanic?.length,
      ).toBeGreaterThanOrEqual(4);
      expect(nationalCps!.demographics?.byEducation?.length).toBe(4);
      expect(nationalCps!.demographics?.byFamilyIncome?.length).toBe(6);

      // Verify reasons for not voting are preserved
      expect(nationalCps!.reasonsForNotVoting?.length).toBeGreaterThanOrEqual(8);
      expect(
        nationalCps!.reasonsForNotRegistering?.length,
      ).toBeGreaterThanOrEqual(5);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Deterministic Builds & Provenance
  // -------------------------------------------------------------------------
  describe("Deterministic Builds & Provenance", () => {
    it("produces identical SHA-256 hashes across repeated compilations", () => {
      const fixedTimestamp = "2026-08-28T18:00:00.000Z";

      const run1 = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        fixedTimestamp,
      );

      const run2 = compileElectionAdminCorpus(
        eavsFixtures,
        policyFixtures,
        cpsFixtures,
        histFixtures,
        fixedTimestamp,
      );

      expect(run1.manifest.corpusFileHashes.normalizedCorpusSha256).toBe(
        run2.manifest.corpusFileHashes.normalizedCorpusSha256,
      );
      expect(run1.manifest.corpusFileHashes.eavsPartitionSha256).toBe(
        run2.manifest.corpusFileHashes.eavsPartitionSha256,
      );
      expect(run1.manifest.corpusFileHashes.cpsPartitionSha256).toBe(
        run2.manifest.corpusFileHashes.cpsPartitionSha256,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 7. Policy Survey Classification & State Models
  // -------------------------------------------------------------------------
  describe("Policy Survey Model Variations", () => {
    it("correctly models Kentucky SB 2 / HB 574 election administration laws", () => {
      const kyPolicy = policyFixtures.find((p) => p.stateAbbr === "KY");
      expect(kyPolicy).toBeDefined();

      const normalized = normalizePolicySurveyRecord(kyPolicy!);
      expect(normalized.voterIdPolicy.inPersonRequirement).toBe("strict_photo");
      expect(normalized.earlyVotingPolicy.inPersonEarlyVotingAllowed).toBe(true);
      expect(normalized.earlyVotingPolicy.earlyVotingWindowDays).toBe(3);
      expect(normalized.mailVotingPolicy.model).toBe("excuse_required_absentee");
      expect(normalized.governanceStructure.localAdministrationStructure).toBe(
        "elected_county_clerk",
      );
    });

    it("correctly models Oregon Universal Vote-by-Mail policy", () => {
      const orPolicy = policyFixtures.find((p) => p.stateAbbr === "OR");
      expect(orPolicy).toBeDefined();

      const normalized = normalizePolicySurveyRecord(orPolicy!);
      expect(normalized.mailVotingPolicy.model).toBe("universal_all_mail");
      expect(normalized.registrationPolicy.automaticVoterRegistration).toBe(true);
      expect(normalized.mailVotingPolicy.prepaidReturnPostage).toBe(true);
      expect(normalized.earlyVotingPolicy.inPersonEarlyVotingAllowed).toBe(false);
    });

    it("correctly models Wisconsin municipal decentralized election administration", () => {
      const wiPolicy = policyFixtures.find((p) => p.stateAbbr === "WI");
      expect(wiPolicy).toBeDefined();

      const normalized = normalizePolicySurveyRecord(wiPolicy!);
      expect(normalized.registrationPolicy.sameDayRegistration).toBe(true);
      expect(normalized.governanceStructure.localAdministrationStructure).toBe(
        "municipal_clerks",
      );
      expect(normalized.governanceStructure.chiefStateElectionOfficial).toBe(
        "bipartite_commission",
      );
    });

    it("correctly models Georgia SB 202 mandatory early voting and risk-limiting audits", () => {
      const gaPolicy = policyFixtures.find((p) => p.stateAbbr === "GA");
      expect(gaPolicy).toBeDefined();

      const normalized = normalizePolicySurveyRecord(gaPolicy!);
      expect(normalized.earlyVotingPolicy.earlyVotingWindowDays).toBe(21);
      expect(normalized.earlyVotingPolicy.weekendVotingMandatory).toBe(true);
      expect(normalized.postElectionAuditPolicy.auditType).toBe("risk_limiting");
    });
  });
});
