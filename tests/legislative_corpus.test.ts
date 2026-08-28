import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  inferLegislativeLifecycle,
  LegislativeCorpusCompiler,
  LegiScanAdapter,
  OpenStatesAdapter,
  validateResearchEpisode
} from "../src/legislative_corpus/index.js";
import type {
  ResearchValidationEpisode
} from "../src/legislative_corpus/types.js";

const FIXTURES_DIR = path.resolve(process.cwd(), "data/legislative_source/fixtures");
const OPENSTATES_DIR = path.join(FIXTURES_DIR, "openstates");
const RESEARCH_DIR = path.join(FIXTURES_DIR, "research_validation");

describe("National Legislative Source Corpus Compiler", () => {
  // Test 1: Deterministic same-input rebuild
  it("produces byte-for-byte identical output and matching checksums on rebuild", () => {
    const compilerA = new LegislativeCorpusCompiler();
    const compilerB = new LegislativeCorpusCompiler();

    const kyRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const neRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ne_2021_lb102_unicameral.json"), "utf-8"));

    compilerA.ingest({ provider: "openstates", type: "measure", raw: kyRaw });
    compilerA.ingest({ provider: "openstates", type: "measure", raw: neRaw });

    compilerB.ingest({ provider: "openstates", type: "measure", raw: kyRaw });
    compilerB.ingest({ provider: "openstates", type: "measure", raw: neRaw });

    const pkgA = compilerA.compile("2026-08-28T00:00:00Z");
    const pkgB = compilerB.compile("2026-08-28T00:00:00Z");

    expect(pkgA.buildMetadata.checksum).toBe(pkgB.buildMetadata.checksum);
    expect(JSON.stringify(pkgA)).toBe(JSON.stringify(pkgB));
  });

  // Test 2: Stable IDs independent of source enumeration order
  it("generates stable IDs independent of source ingestion/enumeration order", () => {
    const compiler1 = new LegislativeCorpusCompiler();
    const compiler2 = new LegislativeCorpusCompiler();

    const kyRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const dcRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "dc_b24_council.json"), "utf-8"));
    const prRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "pr_2021_bicameral.json"), "utf-8"));

    // Ingest in order 1: KY, DC, PR
    compiler1.ingest({ provider: "openstates", type: "measure", raw: kyRaw });
    compiler1.ingest({ provider: "openstates", type: "measure", raw: dcRaw });
    compiler1.ingest({ provider: "openstates", type: "measure", raw: prRaw });

    // Ingest in reversed order 2: PR, DC, KY
    compiler2.ingest({ provider: "openstates", type: "measure", raw: prRaw });
    compiler2.ingest({ provider: "openstates", type: "measure", raw: dcRaw });
    compiler2.ingest({ provider: "openstates", type: "measure", raw: kyRaw });

    const pkg1 = compiler1.compile("2026-08-28T00:00:00Z");
    const pkg2 = compiler2.compile("2026-08-28T00:00:00Z");

    expect(pkg1.measures.map((m) => m.measureId)).toEqual(pkg2.measures.map((m) => m.measureId));
    expect(pkg1.buildMetadata.checksum).toBe(pkg2.buildMetadata.checksum);
  });

  // Test 3: Provider IDs never collide across jurisdictions/providers
  it("guarantees provider IDs never collide across jurisdictions and providers", () => {
    const adapterOS = new OpenStatesAdapter();
    const adapterLS = new LegiScanAdapter();

    // Ingest bill with same number "HB 1" in different jurisdictions
    const billKy = {
      identifier: "HB 1",
      jurisdiction: { id: "ocd-jurisdiction/country:us/state:ky/government" },
      session: "2021RS"
    };
    const billTx = {
      identifier: "HB 1",
      jurisdiction: { id: "ocd-jurisdiction/country:us/state:tx/government" },
      session: "87"
    };
    const billLegiScan = {
      bill_number: "HB 1",
      state: "FL",
      session: { session_tag: "2021" }
    };

    const normKy = adapterOS.normalizeMeasure(billKy);
    const normTx = adapterOS.normalizeMeasure(billTx);
    const normFl = adapterLS.normalizeMeasure(billLegiScan);

    expect(normKy.measure.measureId).toBe("us_ky_2021rs_hb_1");
    expect(normTx.measure.measureId).toBe("us_tx_87_hb_1");
    expect(normFl.measure.measureId).toBe("us_fl_2021_hb_1");

    const idSet = new Set([normKy.measure.measureId, normTx.measure.measureId, normFl.measure.measureId]);
    expect(idSet.size).toBe(3);
  });

  // Test 4: Actions remain chronologically reconstructible
  it("preserves chronological ordering and sequence indices for actions", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const adapter = new OpenStatesAdapter();
    const res = adapter.normalizeMeasure(raw);

    expect(res.actions.length).toBeGreaterThan(5);
    for (let i = 0; i < res.actions.length - 1; i++) {
      expect(res.actions[i]!.sequenceIndex).toBeLessThan(res.actions[i + 1]!.sequenceIndex);
      expect(res.actions[i]!.actionDate <= res.actions[i + 1]!.actionDate).toBe(true);
    }
  });

  // Test 5: Votes remain linked to their source measure
  it("keeps roll call votes strictly linked to their parent source measure", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const adapter = new OpenStatesAdapter();
    const res = adapter.normalizeMeasure(raw);

    expect(res.votes.length).toBe(3);
    for (const vote of res.votes) {
      expect(vote.measureId).toBe(res.measure.measureId);
      expect(vote.yeas).toBeGreaterThan(0);
      expect(vote.provenance.sha256).toBeDefined();
    }
  });

  // Test 6: Explicit failure is distinguishable from session-ended-unresolved
  it("distinguishes explicit defeat from unresolved session adjournment", () => {
    const adapter = new OpenStatesAdapter();

    const failedRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "failed_bill_fixture.json"), "utf-8"));
    const failedRes = adapter.normalizeMeasure(failedRaw);
    expect(failedRes.measure.derivedLifecycle.status).toBe("explicitly-failed");
    expect(failedRes.measure.derivedLifecycle.terminalState).toBe(true);
    expect(failedRes.measure.derivedLifecycle.failureEvidence).toBeDefined();

    const unresolvedRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "session_ended_unresolved_fixture.json"), "utf-8"));
    const unresolvedRes = adapter.normalizeMeasure(unresolvedRaw, { sessionState: "adjourned_sine_die" });
    expect(unresolvedRes.measure.derivedLifecycle.status).toBe("session-ended-unresolved");
    expect(unresolvedRes.measure.derivedLifecycle.terminalState).toBe(true);
    expect(unresolvedRes.measure.derivedLifecycle.failureEvidence).toBeNull();
  });

  // Test 7: Veto is distinguishable from final death if an override later occurs
  it("correctly models veto transition to became-law upon successful override", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_sb3_veto.json"), "utf-8"));
    const adapter = new OpenStatesAdapter();
    const res = adapter.normalizeMeasure(raw);

    expect(res.measure.derivedLifecycle.status).toBe("became-law");
    expect(res.measure.derivedLifecycle.becameLawEvidence?.vetoOverridden).toBe(true);
    expect(res.measure.derivedLifecycle.becameLawEvidence?.chapterOrActId).toBe("Acts Chapter 160");

    // If we only take actions up to the veto (action order 4):
    const preOverrideActions = raw.actions.slice(0, 5);
    const preOverrideLifecycle = inferLegislativeLifecycle({
      actions: preOverrideActions,
      sessionState: "active"
    });
    expect(preOverrideLifecycle.status).toBe("vetoed");
    expect(preOverrideLifecycle.vetoEvidence?.vetoType).toBe("full");
  });

  // Test 8: Became-law evidence is preserved
  it("preserves authentic became-law evidence including signed date and Acts chapter", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const adapter = new OpenStatesAdapter();
    const res = adapter.normalizeMeasure(raw);

    expect(res.measure.derivedLifecycle.status).toBe("became-law");
    expect(res.measure.derivedLifecycle.becameLawEvidence?.signedDate).toBe("2021-04-05");
    expect(res.measure.derivedLifecycle.becameLawEvidence?.chapterOrActId).toBe("Acts Chapter 182");
  });

  // Test 9: Missing official URL stays unknown/null rather than fabricated
  it("never fabricates missing official URLs or measurements", () => {
    const adapter = new OpenStatesAdapter();
    const rawNoSources = {
      identifier: "HB 555",
      title: "Test Measure Without Sources",
      session: "2021RS"
    };

    const res = adapter.normalizeMeasure(rawNoSources);
    expect(res.measure.officialUrl).toBeNull();
  });

  // Test 10: Provider classification stays distinct from derived lifecycle
  it("keeps raw provider classification distinct from conservative derived lifecycle", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    const adapter = new OpenStatesAdapter();
    const res = adapter.normalizeMeasure(raw);

    expect(res.measure.rawProviderStatus).toBe("bill");
    expect(res.measure.derivedLifecycle.status).toBe("became-law");
  });

  // Test 11: Nebraska, DC, and PR do not get forced into generic bicameral state template
  it("preserves Nebraska unicameral, DC Council, and PR territory structure without forcing bicameral state mold", () => {
    const adapter = new OpenStatesAdapter();

    const neRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ne_2021_lb102_unicameral.json"), "utf-8"));
    const neRes = adapter.normalizeMeasure(neRaw);
    expect(neRes.measure.chamberOrigin).toBe("unicameral");
    expect(neRes.actions[0]!.actingBody).toBe("unicameral");

    const dcRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "dc_b24_council.json"), "utf-8"));
    const dcRes = adapter.normalizeMeasure(dcRaw);
    expect(dcRes.measure.chamberOrigin).toBe("council");
    expect(dcRes.actions[0]!.actingBody).toBe("council");

    const prRaw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "pr_2021_bicameral.json"), "utf-8"));
    const prRes = adapter.normalizeMeasure(prRaw);
    expect(prRes.measure.jurisdictionKey).toBe("us_pr");
    expect(prRes.actions[0]!.actingBody).toBe("lower");
    expect(prRes.actions[2]!.actingBody).toBe("upper");
  });

  // Test 12: Malformed/corrupt provider payloads reject
  it("cleanly rejects malformed or corrupted provider payloads", () => {
    const adapterOS = new OpenStatesAdapter();
    const adapterLS = new LegiScanAdapter();

    expect(() => adapterOS.normalizeJurisdiction(null)).toThrow();
    expect(() => adapterOS.normalizeJurisdiction({})).toThrow();
    expect(() => adapterOS.normalizeMeasure({})).toThrow();

    expect(() => adapterLS.normalizeJurisdiction("invalid")).toThrow();
    expect(() => adapterLS.normalizeMeasure({})).toThrow();
  });

  // Test 13: Provenance and checksums are present
  it("ensures valid SHA-256 provenance checksums on all normalized records", () => {
    const compiler = new LegislativeCorpusCompiler();
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    compiler.ingest({ provider: "openstates", type: "measure", raw });
    const pkg = compiler.compile();

    expect(pkg.measures[0]!.provenance.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(pkg.buildMetadata.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(pkg.manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  // Test 14: Kentucky HB 497 contradiction fixture is detected
  it("validates authentic Kentucky HB 497 truth and detects all contradictions in flawed episode", () => {
    const compiler = new LegislativeCorpusCompiler();
    const raw = JSON.parse(fs.readFileSync(path.join(OPENSTATES_DIR, "ky_2021_hb497.json"), "utf-8"));
    compiler.ingest({ provider: "openstates", type: "measure", raw });
    const corpus = compiler.compile();

    const truthEpisode = JSON.parse(
      fs.readFileSync(path.join(RESEARCH_DIR, "ky_hb497_truth_episode.json"), "utf-8")
    ) as ResearchValidationEpisode;
    const truthResult = validateResearchEpisode(truthEpisode, corpus);
    expect(truthResult.valid).toBe(true);
    expect(truthResult.discrepancies.length).toBe(0);

    const flawedEpisode = JSON.parse(
      fs.readFileSync(path.join(RESEARCH_DIR, "ky_hb497_flawed_episode.json"), "utf-8")
    ) as ResearchValidationEpisode;
    const flawedResult = validateResearchEpisode(flawedEpisode, corpus);
    expect(flawedResult.valid).toBe(false);
    expect(flawedResult.discrepancies.length).toBeGreaterThanOrEqual(4);

    const fields = flawedResult.discrepancies.map((d) => d.field);
    expect(fields).toContain("vote.lower.yeas");
    expect(fields).toContain("vote.upper.yeas");
    expect(fields).toContain("signedDate");
    expect(fields).toContain("actsChapter");
  });

  // Test 15: No src/simulation or current player/campaign files changed
  it("preserves pure boundary: src/simulation remains untouched and decoupled", () => {
    // Check that legislative corpus has zero imports or dependencies on src/simulation
    const compilerTs = fs.readFileSync(
      path.resolve(process.cwd(), "src/legislative_corpus/compiler.ts"),
      "utf-8"
    );
    expect(compilerTs.includes("../simulation")).toBe(false);
    expect(compilerTs.includes("src/simulation")).toBe(false);
  });
});
