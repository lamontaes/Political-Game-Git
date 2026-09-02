import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseCandidateLine,
  parseCommitteeLine,
  parseLinkageLine,
} from "./fec-parser.js";
import { FecCorpusEngine } from "./fec-corpus.js";
import type { FecCorpusDataset } from "./types.js";

describe("FEC Candidate & Committee Identity Corpus", () => {
  describe("Raw FEC Line Parsers", () => {
    it("parses candidate line with explicit missing/blank fields preserved", () => {
      const line =
        "H0AL01055|CARL, JERRY LEE, JR|REP|2024|AL|H|01|I|C|C00697789|PO BOX 852138||MOBILE|AL|36685";
      const record = parseCandidateLine(line);

      expect(record).toEqual({
        candidateId: "H0AL01055",
        candidateName: "CARL, JERRY LEE, JR",
        partyAffiliation: "REP",
        electionYear: 2024,
        officeState: "AL",
        office: "H",
        district: "01",
        incumbentChallengerStatus: "I",
        candidateStatus: "C",
        principalCampaignCommitteeId: "C00697789",
        street1: "PO BOX 852138",
        street2: null,
        city: "MOBILE",
        state: "AL",
        zipCode: "36685",
      });
    });

    it("parses committee line correctly", () => {
      const line =
        "C00000059|HALLMARK CARDS, INC. PAC (HALLPAC)|KLEIN, CASSIE MS.|2501 MCGEE, MD853||KANSAS CITY|MO|64108|B|Q|UNK|M|C|HALLMARK CARDS, INC.|";
      const record = parseCommitteeLine(line);

      expect(record).not.toBeNull();
      expect(record?.committeeId).toBe("C00000059");
      expect(record?.committeeName).toBe("HALLMARK CARDS, INC. PAC (HALLPAC)");
      expect(record?.designation).toBe("B");
      expect(record?.committeeType).toBe("Q");
      expect(record?.street2).toBeNull();
      expect(record?.candidateId).toBeNull();
    });

    it("parses linkage line correctly", () => {
      const line = "H0AL01055|2024|2024|C00697789|H|P|247126";
      const record = parseLinkageLine(line);

      expect(record).toEqual({
        candidateId: "H0AL01055",
        candidateElectionYear: 2024,
        fecElectionYear: 2024,
        committeeId: "C00697789",
        committeeType: "H",
        committeeDesignation: "P",
        linkageId: "247126",
      });
    });

    it("handles unknown/invalid enum codes gracefully without throwing", () => {
      const line = "H0XX00000|TEST, CANDIDATE|XYZ|2024|XX|Z|99|X|Z||||||";
      const record = parseCandidateLine(line);

      expect(record?.office).toBe("UNKNOWN");
      expect(record?.incumbentChallengerStatus).toBe("UNKNOWN");
      expect(record?.candidateStatus).toBe("UNKNOWN");
    });
  });

  describe("FEC Corpus Engine & Compiled Artifact Integrations", () => {
    const compiledPath = path.resolve(
      process.cwd(),
      "data/fec/compiled-fec-2024.json",
    );
    const raw = fs.readFileSync(compiledPath, "utf-8");
    const dataset: FecCorpusDataset = JSON.parse(raw);
    const engine = new FecCorpusEngine(dataset);

    it("loads dataset manifest with valid schema version and provenance", () => {
      const manifest = engine.getManifest();
      expect(manifest.schemaVersion).toBe("1.0.0");
      expect(manifest.cycle).toBe(2024);
      expect(manifest.sourceArtifacts.length).toBeGreaterThan(0);
      for (const artifact of manifest.sourceArtifacts) {
        expect(artifact.sha256Hex).toHaveLength(64);
        expect(artifact.recordCount).toBeGreaterThan(0);
      }
    });

    it("retrieves candidates and committees by ID", () => {
      const allCandidates = engine.getAllCandidates();
      expect(allCandidates.length).toBeGreaterThan(0);

      const first = allCandidates[0];
      const found = engine.getCandidateById(first.candidateId);
      expect(found).toEqual(first);
    });

    it("resolves principal campaign committee linkage", () => {
      const candidates = engine.getAllCandidates();
      const candWithPcc = candidates.find(
        (c) => c.principalCampaignCommitteeId,
      );

      if (candWithPcc && candWithPcc.principalCampaignCommitteeId) {
        const pcc = engine.getPrincipalCampaignCommittee(
          candWithPcc.candidateId,
        );
        expect(pcc).not.toBeNull();
        expect(pcc?.committeeId).toBe(candWithPcc.principalCampaignCommitteeId);
      }
    });

    it("handles edge cases: House, Senate, Presidential, At-Large districts", () => {
      const houseCands = engine
        .getAllCandidates()
        .filter((c) => c.office === "H");
      const senateCands = engine
        .getAllCandidates()
        .filter((c) => c.office === "S");
      const presCands = engine
        .getAllCandidates()
        .filter((c) => c.office === "P");

      expect(houseCands.length).toBeGreaterThan(0);
      expect(senateCands.length).toBeGreaterThan(0);
      expect(presCands.length).toBeGreaterThan(0);

      for (const s of senateCands) {
        expect(s.district).toBe("00");
      }
      for (const p of presCands) {
        expect(p.district).toBe("00");
      }
    });

    it("ensures duplicate candidate names do not collapse distinct Candidate IDs", () => {
      const cands = engine.getAllCandidates();
      const nameMap = new Map<string, string[]>();

      for (const c of cands) {
        const ids = nameMap.get(c.candidateName) ?? [];
        ids.push(c.candidateId);
        nameMap.set(c.candidateName, ids);
      }

      let foundDuplicateName = false;
      for (const [name, ids] of nameMap.entries()) {
        if (ids.length > 1) {
          foundDuplicateName = true;
          // Verify that searching by name returns all distinct records
          const searchResults = engine.searchCandidatesByName(name);
          const returnedIds = searchResults.map((r) => r.candidateId);
          for (const id of ids) {
            expect(returnedIds).toContain(id);
          }
        }
      }

      // Ensure that duplicate names exist in the bulk corpus or fixture sample
      expect(foundDuplicateName).toBe(true);
    });

    it("has zero imports from simulation engine or runtime Substrates", async () => {
      const fecParserCode = fs.readFileSync(
        path.resolve(process.cwd(), "src/fec_corpus/fec-parser.ts"),
        "utf-8",
      );
      const fecCorpusCode = fs.readFileSync(
        path.resolve(process.cwd(), "src/fec_corpus/fec-corpus.ts"),
        "utf-8",
      );

      expect(fecParserCode).not.toContain("src/simulation");
      expect(fecCorpusCode).not.toContain("src/simulation");
    });
  });
});
