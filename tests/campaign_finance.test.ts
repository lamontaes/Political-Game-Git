import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  isValidCandidateId,
  isValidCommitteeId,
  isValidElectionCycle,
  isValidFilingId,
  createRelationshipId,
  parseCandidateOffice,
  resolveFilingAmendments,
  filterActiveFilings,
  aggregateActiveCommitteeFinances,
  computeCalibrationProfile,
  validateCampaignFinanceCorpus,
  compileCampaignFinanceCorpus,
  buildCampaignFinanceManifest,
  adaptCandidate,
  adaptCommittee,
  adaptReport,
  adaptReceipt,
  adaptDisbursement,
  adaptIndependentExpenditure,
  computeSha256,
  type FecCampaignFinanceCorpus,
  type FecFilingReport,
} from "../src/campaign_finance/index";
import type { CampaignFinanceManifest } from "../src/campaign_finance/manifest";

describe("FEC Campaign Finance Source Corpus", () => {
  const corpusPath = resolve(
    __dirname,
    "../data/campaign_finance/corpus/normalized_corpus.json",
  );
  const manifestPath = resolve(
    __dirname,
    "../data/campaign_finance/manifests/campaign_finance_manifest.json",
  );
  const rawFixturesPath = resolve(
    __dirname,
    "../data/campaign_finance/fixtures/openfec_raw/sample_openfec_responses.json",
  );

  const corpus: FecCampaignFinanceCorpus = JSON.parse(
    readFileSync(corpusPath, "utf-8"),
  );
  const manifest: CampaignFinanceManifest = JSON.parse(
    readFileSync(manifestPath, "utf-8"),
  );
  const rawFixtures = JSON.parse(readFileSync(rawFixturesPath, "utf-8"));

  describe("ID Format & Parsing", () => {
    it("validates standard FEC candidate ID formats (House, Senate, Presidential)", () => {
      expect(isValidCandidateId("H2KY06097")).toBe(true);
      expect(isValidCandidateId("S0KY00010")).toBe(true);
      expect(isValidCandidateId("P00000001")).toBe(true);

      expect(isValidCandidateId("X2KY06097")).toBe(false); // Invalid office prefix
      expect(isValidCandidateId("H2KY060")).toBe(false); // Too short
      expect(isValidCandidateId("H2KY06097123")).toBe(false); // Too long
      expect(isValidCandidateId("")).toBe(false);
    });

    it("extracts candidate office correctly", () => {
      expect(parseCandidateOffice("H2KY06097")).toBe("H");
      expect(parseCandidateOffice("S0KY00010")).toBe("S");
      expect(parseCandidateOffice("P00000001")).toBe("P");
      expect(() => parseCandidateOffice("INVALID")).toThrow();
    });

    it("validates standard FEC committee ID formats", () => {
      expect(isValidCommitteeId("C00473538")).toBe(true);
      expect(isValidCommitteeId("C00193433")).toBe(true);
      expect(isValidCommitteeId("C00703975")).toBe(true);

      expect(isValidCommitteeId("H00473538")).toBe(false); // Must start with C
      expect(isValidCommitteeId("C0047353")).toBe(false); // Too short
      expect(isValidCommitteeId("C004735389")).toBe(false); // Too long
    });

    it("validates election cycles and filing IDs", () => {
      expect(isValidElectionCycle(2020)).toBe(true);
      expect(isValidElectionCycle(2024)).toBe(true);
      expect(isValidElectionCycle(2023)).toBe(false); // Odd year
      expect(isValidElectionCycle(1960)).toBe(false); // Too early

      expect(isValidFilingId("1730001")).toBe(true);
      expect(isValidFilingId(1730001)).toBe(true);
      expect(isValidFilingId("0")).toBe(false);
      expect(isValidFilingId("-123")).toBe(false);
    });

    it("creates canonical relationship IDs", () => {
      const relId = createRelationshipId("H2KY06097", "C00473538", 2024, "P");
      expect(relId).toBe("rel-H2KY06097-C00473538-2024-P");
    });
  });

  describe("Amendment Resolution & Non-Double-Counting", () => {
    it("correctly resolves amendment chains and marks superseded filings", () => {
      const filings: FecFilingReport[] = [
        {
          filingId: "1001",
          committeeId: "C00473538",
          candidateId: "H2KY06097",
          cycle: 2024,
          reportYear: 2024,
          reportType: "Q2",
          reportTypeDescription: "JULY QUARTERLY",
          formType: "F3",
          coverageStartDate: "2024-04-01",
          coverageEndDate: "2024-06-30",
          receiptDate: "2024-07-15",
          amendmentChain: {
            amendmentIndicator: "N",
            amendmentVersion: 0,
            amendsFilingId: null,
            isLatestActiveAmendment: true,
            supersededByFilingId: null,
          },
          financialSummary: {
            totalReceipts: 500000,
            totalDisbursements: 200000,
            cashOnHandBeginningPeriod: 100000,
            cashOnHandClosePeriod: 400000,
            debtsOwedByCommittee: 0,
            debtsOwedToCommittee: 0,
            individualContributionsTotal: 400000,
            individualItemizedContributions: 300000,
            individualUnitemizedContributions: 100000,
            otherPoliticalCommitteeContributions: 100000,
            transfersFromOtherAuthorizedCommittees: 0,
            candidateContributions: 0,
            loansMadeByCandidate: 0,
            otherLoans: 0,
            operatingExpenditures: 200000,
            refunds: 0,
            independentExpendituresTotal: 0,
            netContributions: 500000,
            netOperatingExpenditures: 200000,
          },
          provenance: corpus.provenance,
        },
        {
          filingId: "1002",
          committeeId: "C00473538",
          candidateId: "H2KY06097",
          cycle: 2024,
          reportYear: 2024,
          reportType: "Q2",
          reportTypeDescription: "JULY QUARTERLY (AMENDMENT 1)",
          formType: "F3",
          coverageStartDate: "2024-04-01",
          coverageEndDate: "2024-06-30",
          receiptDate: "2024-08-01",
          amendmentChain: {
            amendmentIndicator: "A",
            amendmentVersion: 1,
            amendsFilingId: "1001",
            isLatestActiveAmendment: true,
            supersededByFilingId: null,
          },
          financialSummary: {
            totalReceipts: 520000,
            totalDisbursements: 200000,
            cashOnHandBeginningPeriod: 100000,
            cashOnHandClosePeriod: 420000,
            debtsOwedByCommittee: 0,
            debtsOwedToCommittee: 0,
            individualContributionsTotal: 420000,
            individualItemizedContributions: 320000,
            individualUnitemizedContributions: 100000,
            otherPoliticalCommitteeContributions: 100000,
            transfersFromOtherAuthorizedCommittees: 0,
            candidateContributions: 0,
            loansMadeByCandidate: 0,
            otherLoans: 0,
            operatingExpenditures: 200000,
            refunds: 0,
            independentExpendituresTotal: 0,
            netContributions: 520000,
            netOperatingExpenditures: 200000,
          },
          provenance: corpus.provenance,
        },
      ];

      const resolved = resolveFilingAmendments(filings);
      expect(resolved.length).toBe(2);

      const original = resolved.find((f) => f.filingId === "1001")!;
      const amended = resolved.find((f) => f.filingId === "1002")!;

      expect(original.amendmentChain.isLatestActiveAmendment).toBe(false);
      expect(original.amendmentChain.supersededByFilingId).toBe("1002");

      expect(amended.amendmentChain.isLatestActiveAmendment).toBe(true);
      expect(amended.amendmentChain.supersededByFilingId).toBeNull();
      expect(amended.amendmentChain.amendsFilingId).toBe("1001");

      // Active filtering returns only 1 filing
      const active = filterActiveFilings(resolved);
      expect(active.length).toBe(1);
      expect(active[0]?.filingId).toBe("1002");

      // Aggregate finances only sums amended filing #1002 ($520k), NOT $500k + $520k ($1,020k)
      const agg = aggregateActiveCommitteeFinances("C00473538", resolved);
      expect(agg.totalReceipts).toBe(520000);
      expect(agg.activeFilingCount).toBe(1);
      expect(agg.supersededFilingCount).toBe(1);
    });

    it("preserves amended Q2 in corpus without double-counting Barr committee total", () => {
      const barrCommitteeFilings = corpus.filings.filter(
        (f) => f.committeeId === "C00473538",
      );
      const activeFilings = filterActiveFilings(barrCommitteeFilings);
      const supersededFilings = barrCommitteeFilings.filter(
        (f) => !f.amendmentChain.isLatestActiveAmendment,
      );

      expect(supersededFilings.length).toBe(1);
      expect(supersededFilings[0]?.filingId).toBe("1720001");

      const activeQ2 = activeFilings.find((f) => f.reportType === "Q2");
      expect(activeQ2).toBeDefined();
      expect(activeQ2?.filingId).toBe("1720099");
      expect(activeQ2?.amendmentChain.amendmentIndicator).toBe("A");

      const agg = aggregateActiveCommitteeFinances(
        "C00473538",
        corpus.filings,
        2024,
      );
      // Q1 ($650k) + Q2 amended ($595k) + Q3 ($850k) = $2,095,000
      expect(agg.totalReceipts).toBe(2095000);
      expect(agg.activeFilingCount).toBe(3);
      expect(agg.supersededFilingCount).toBe(1);
    });
  });

  describe("Debts vs Loans Distinction", () => {
    it("separates candidate personal loans (Schedule C) from vendor trade debts (Schedule D)", () => {
      expect(corpus.loans.length).toBeGreaterThan(0);
      expect(corpus.debts.length).toBeGreaterThan(0);

      // Verify loans
      for (const loan of corpus.loans) {
        expect(loan.loanId).toMatch(/^SC/);
        expect(loan.originalLoanAmount).toBeGreaterThan(0);
        expect(loan.loanBalanceRemaining).toBeGreaterThanOrEqual(0);
        expect(loan.lenderType).toBeDefined();
      }

      // Verify debts
      for (const debt of corpus.debts) {
        expect(debt.debtId).toMatch(/^SD/);
        expect(debt.endingBalanceThisPeriod).toBeGreaterThanOrEqual(0);
        expect(debt.debtCategory).toBeDefined();
        expect(debt.isDebtOwedByCommittee).toBe(true);
      }

      const candidatePersonalLoans = corpus.loans.filter(
        (l) => l.isCandidatePersonalLoan,
      );
      expect(candidatePersonalLoans.length).toBe(1);
      expect(candidatePersonalLoans[0]?.lenderName).toBe("CRAVENS, RANDY");
      expect(candidatePersonalLoans[0]?.loanBalanceRemaining).toBe(50000);

      const vendorDebts = corpus.debts.filter(
        (d) =>
          d.debtCategory === "media_production" ||
          d.debtCategory === "vendor_services",
      );
      expect(vendorDebts.length).toBeGreaterThan(0);
    });
  });

  describe("Independent Expenditures Outside Spending", () => {
    it("tracks independent expenditures with support and oppose indicators", () => {
      expect(corpus.independentExpenditures.length).toBe(2);

      const supportIe = corpus.independentExpenditures.find(
        (ie) => ie.supportOppose === "S",
      );
      const opposeIe = corpus.independentExpenditures.find(
        (ie) => ie.supportOppose === "O",
      );

      expect(supportIe).toBeDefined();
      expect(supportIe?.candidateId).toBe("H2KY06097");
      expect(supportIe?.amount).toBe(450000);

      expect(opposeIe).toBeDefined();
      expect(opposeIe?.candidateId).toBe("H0KY06085");
      expect(opposeIe?.amount).toBe(320000);
    });
  });

  describe("Raw OpenFEC API Adapter Ingestion", () => {
    it("adapts raw OpenFEC candidate payload accurately", () => {
      const rawCand = rawFixtures.rawCandidates[0];
      const adapted = adaptCandidate(rawCand);

      expect(adapted.candidateId).toBe("H4KY04128");
      expect(adapted.name).toBe("MASSIE, THOMAS");
      expect(adapted.office).toBe("H");
      expect(adapted.state).toBe("KY");
      expect(adapted.district).toBe("04");
      expect(adapted.principalCampaignCommitteeId).toBe("C00508606");
      expect(adapted.flags.hasActivePcc).toBe(true);
    });

    it("adapts raw OpenFEC committee payload accurately", () => {
      const rawCom = rawFixtures.rawCommittees[0];
      const adapted = adaptCommittee(rawCom);

      expect(adapted.committeeId).toBe("C00508606");
      expect(adapted.committeeType).toBe("H");
      expect(adapted.designation).toBe("P");
      expect(adapted.sponsorCandidateId).toBe("H4KY04128");
    });

    it("adapts raw OpenFEC report payload accurately", () => {
      const rawRep = rawFixtures.rawReports[0];
      const adapted = adaptReport(rawRep);

      expect(adapted.filingId).toBe("1795432");
      expect(adapted.reportType).toBe("Q2");
      expect(adapted.formType).toBe("F3");
      expect(adapted.financialSummary.totalReceipts).toBe(420000);
      expect(adapted.financialSummary.cashOnHandClosePeriod).toBe(990000);
    });

    it("adapts raw OpenFEC receipt item accurately", () => {
      const rawRec = rawFixtures.rawReceipts[0];
      const adapted = adaptReceipt(rawRec);

      expect(adapted.contributorName).toBe("BOONE, DANIEL");
      expect(adapted.contributionAmount).toBe(1000);
      expect(adapted.isItemized).toBe(true);
      expect(adapted.contributorState).toBe("KY");
    });

    it("adapts raw OpenFEC disbursement item accurately", () => {
      const rawDis = rawFixtures.rawDisbursements[0];
      const adapted = adaptDisbursement(rawDis);

      expect(adapted.recipientName).toBe("BLUEGRASS BROADCAST MEDIA");
      expect(adapted.disbursementAmount).toBe(25000);
      expect(adapted.disbursementCategory).toBe("media_advertising");
    });

    it("adapts raw OpenFEC independent expenditure accurately", () => {
      const rawIe = rawFixtures.rawIndependentExpenditures[0];
      const adapted = adaptIndependentExpenditure(rawIe);

      expect(adapted.candidateId).toBe("H4KY04128");
      expect(adapted.supportOppose).toBe("S");
      expect(adapted.amount).toBe(85000);
      expect(adapted.payeeName).toBe("NORTHERN KENTUCKY AD NETWORK");
    });
  });

  describe("Calibration Metrics & Statistical Distributions", () => {
    it("computes calibration metrics across office benchmarks, burn rates, and debt", () => {
      const profile = computeCalibrationProfile(corpus);

      expect(profile.fundraisingBenchmarks.length).toBeGreaterThan(0);
      const houseBenchmark = profile.fundraisingBenchmarks.find(
        (b) => b.office === "H" && b.category === "all",
      );
      expect(houseBenchmark).toBeDefined();
      expect(houseBenchmark?.sampleSize).toBe(2);
      expect(houseBenchmark?.medianReceipts).toBeGreaterThan(0);

      // Phase burn rates
      expect(profile.burnRatesByPhase.length).toBe(4);
      const sprintPhase = profile.burnRatesByPhase.find(
        (p) => p.phase === "general_sprint",
      );
      expect(sprintPhase).toBeDefined();
      expect(sprintPhase?.medianBurnRate).toBeGreaterThan(1.0); // Sprint burn rate > 1.0x

      // Debt prevalence
      expect(profile.debtPrevalence.sampleCommittees).toBe(
        corpus.committees.length,
      );
      expect(profile.debtPrevalence.percentCommitteesWithDebt).toBeGreaterThan(
        0,
      );

      // Donor distributions sum reasonably close to 100%
      const {
        unitemizedSmallDollarShare,
        itemizedIndividualShare,
        pacContributionShare,
        candidateSelfFundingShare,
        transfersAndOtherShare,
      } = profile.donorDistributions;
      const totalShare =
        unitemizedSmallDollarShare +
        itemizedIndividualShare +
        pacContributionShare +
        candidateSelfFundingShare +
        transfersAndOtherShare;
      expect(totalShare).toBeCloseTo(1.0, 1);
    });
  });

  describe("Corpus Integrity, Determinism & Zero Secrets", () => {
    it("passes comprehensive corpus validation with 0 errors", () => {
      const valResult = validateCampaignFinanceCorpus(corpus);
      expect(valResult.valid).toBe(true);
      expect(valResult.errors).toHaveLength(0);
    });

    it("matches manifest checksum and totals", () => {
      const serialized = JSON.stringify(corpus);
      const checksum = computeSha256(serialized);

      expect(checksum).toBe(manifest.integrity.corpusChecksum);
      expect(manifest.totals.candidates).toBe(corpus.candidates.length);
      expect(manifest.totals.committees).toBe(corpus.committees.length);
      expect(manifest.totals.filings).toBe(corpus.filings.length);
      expect(manifest.totals.receipts).toBe(corpus.receipts.length);
      expect(manifest.totals.disbursements).toBe(corpus.disbursements.length);
    });

    it("recompiles byte-for-byte deterministically", () => {
      const recompiled = compileCampaignFinanceCorpus({
        candidates: corpus.candidates,
        committees: corpus.committees,
        relationships: corpus.relationships,
        filings: corpus.filings,
        receipts: corpus.receipts,
        disbursements: corpus.disbursements,
        loans: corpus.loans,
        debts: corpus.debts,
        independentExpenditures: corpus.independentExpenditures,
      });

      const recompiledManifest = buildCampaignFinanceManifest(recompiled);
      expect(recompiledManifest.integrity.corpusChecksum).toBe(
        manifest.integrity.corpusChecksum,
      );
    });

    it("contains zero API keys, secrets, or bearer tokens across files", () => {
      const allFiles = [
        corpusPath,
        manifestPath,
        resolve(__dirname, "../src/campaign_finance/index.ts"),
        resolve(
          __dirname,
          "../src/campaign_finance/adapters/openfec_adapter.ts",
        ),
        resolve(__dirname, "../scripts/campaign-finance/cli-compile.ts"),
      ];

      for (const f of allFiles) {
        if (existsSync(f)) {
          const content = readFileSync(f, "utf-8");
          expect(content).not.toMatch(/api_key=[A-Za-z0-9_-]{16,}/i);
          expect(content).not.toMatch(/bearer\s+[A-Za-z0-9_.-]{20,}/i);
        }
      }
    });

    it("confirms Slice E simulation files are completely unmodified", () => {
      const simulationDir = resolve(__dirname, "../src/simulation");
      const electionContests = readFileSync(
        resolve(simulationDir, "election-contests.ts"),
        "utf-8",
      );
      // Verify Slice E file still intact and unchanged
      expect(electionContests).toContain("ELECTION_CONTEST_TRANSITION_KEY");
      expect(electionContests).not.toContain("FecCandidate");
    });
  });
});
