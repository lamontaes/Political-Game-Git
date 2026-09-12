import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArtifactLock } from "../../src/source/core/index";
import {
  decodeRetrievedBytes,
  isClean,
  normalizeRetrievedText,
  sha256Hex,
} from "../../src/source/core/index";
import {
  AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE,
  FISCAL_AUTHORITY_DECLARATIONS,
  ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
  ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  ALASKA_SESSION_LAW_SELECTION_PREDICATE,
  assertAlaskaSessionLawEvidence,
  compileFiscalAuthorityDeclarations,
  openFiscalAuthorityArtifacts,
  sourceDomain,
} from "../../src/source/domains/state-local-fiscal-authority/index";
import {
  buildFiscalAuthorityDisposition,
  checkFiscalAuthorityDisposition,
  FISCAL_DISPOSITION_MASTER,
  FISCAL_DISPOSITION_MIRROR,
} from "../../scripts/source/fiscal-authority-inventory";

const ROOT = resolve(import.meta.dirname, "../..");
const LOCK_PATH = resolve(
  ROOT,
  "data/source/state-local-fiscal-authority/artifact-lock.json",
);

function lock(): ArtifactLock {
  return JSON.parse(readFileSync(LOCK_PATH, "utf-8")) as ArtifactLock;
}

describe("fiscal production evidence", () => {
  it("preserves and dispositions the complete recovered research input", () => {
    const inputDirectory = resolve(
      ROOT,
      "data/source/state-local-fiscal-authority/research-input",
    );
    const master = readFileSync(
      resolve(inputDirectory, "92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json"),
    );
    const mirror = readFileSync(
      resolve(
        inputDirectory,
        "92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.mirror.json",
      ),
    );
    expect(master.length).toBe(514_782);
    expect(sha256Hex(master)).toBe(
      "126ee64509d187f648ca6d67b9db815109868133cda7f02b6fa63621787525a8",
    );
    expect(mirror.equals(master)).toBe(true);

    const disposition = JSON.parse(
      readFileSync(
        resolve(
          ROOT,
          "data/source/state-local-fiscal-authority/research-disposition.json",
        ),
        "utf-8",
      ),
    ) as {
      inventory: {
        stateCount: number;
        groupCount: number;
        claimCount: number;
        byStatus: Record<string, number>;
      };
    };
    expect(disposition.inventory).toEqual({
      stateCount: 50,
      groupCount: 750,
      claimCount: 2_650,
      byStatus: {
        BLANK_OR_UNKNOWN: 235,
        BLOCKED_CONFLICTING: 0,
        BLOCKED_MALFORMED_LOCATOR: 300,
        PRIMARY_ARTIFACT_VERIFIED: 4,
        PRIMARY_ARTIFACT_VERIFIED_CORRECTED_LOCATOR: 1,
        UNSUPPORTED_MATRIX_ONLY: 2_110,
      },
    });
  });

  it("decodes and pins actual first-party session-law bytes and page excerpts", () => {
    const valid = lock();
    const parent = valid.artifacts.find(
      (artifact) => artifact.artifactId === ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
    );
    const extract = valid.artifacts.find(
      (artifact) =>
        artifact.artifactId === ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
    );
    expect(parent).toMatchObject({
      artifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
      storage: "cached-not-committed",
      localPath: null,
      bytes: {
        length: 36_898_000,
        sha256:
          "30dfaeab42ba7a22200897671249b7bfe10a57a41ce1edcb16b91ef1dd02225f",
      },
    });
    expect(extract).toMatchObject({
      artifactId: ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
      storage: "derived-qa-slice",
      derivation: {
        parentArtifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
        parentSha256: parent?.bytes.sha256,
        selectionPredicate: ALASKA_SESSION_LAW_SELECTION_PREDICATE,
      },
    });
    if (!extract?.localPath)
      throw new Error("Expected committed page extract.");
    const extractedBytes = readFileSync(resolve(ROOT, extract.localPath));
    expect(sha256Hex(extractedBytes)).toBe(extract.bytes.sha256);
    expect(() => assertAlaskaSessionLawEvidence(extractedBytes)).not.toThrow();

    expect(AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE).toEqual({
      artifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
      extractArtifactId: ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
      authorityUrl:
        "https://www.akleg.gov/pdf/billfiles/SLAs/SLA%201985/CH%2074%20SLA%201985.pdf",
      legalLocator: "ch. 74 SLA 1985, § 90",
      provisionPdfPages: {
        propertyTax: [101, 102],
        taxLimitation: [116],
        salesAndUseTax: [136, 137, 138],
        generalObligationBondVote: [150],
        effectiveDate: [211],
      },
      effectiveDate: "1986-01-01",
    });
  });

  it("refuses a missing, relinked, or text-altered session-law artifact", () => {
    const valid = lock();
    expect(() =>
      sourceDomain.compileProduction({
        ...valid,
        artifacts: valid.artifacts.filter(
          (artifact) =>
            artifact.artifactId !== ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
        ),
      }),
    ).toThrow(/derives from.*which is not in/);

    const relinked: ArtifactLock = {
      ...valid,
      artifacts: valid.artifacts.map((artifact) =>
        artifact.artifactId === ALASKA_SESSION_LAW_PDF_ARTIFACT_ID
          ? {
              ...artifact,
              bytes: { ...artifact.bytes, sha256: "0".repeat(64) },
            }
          : artifact,
      ),
    };
    expect(() => sourceDomain.compileProduction(relinked)).toThrow(
      /does not resolve to the locked publisher PDF digest/,
    );

    const opened = openFiscalAuthorityArtifacts(valid);
    const sessionLaw = opened.artifacts[ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID];
    const altered = Buffer.from(
      sessionLaw.bytes
        .toString("utf-8")
        .replace("January 1, 1986", "January 2, 1986"),
      "utf-8",
    );
    expect(() =>
      compileFiscalAuthorityDeclarations({
        ...opened.artifacts,
        [ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID]: {
          ...sessionLaw,
          bytes: altered,
        },
      }),
    ).toThrow(/effective date excerpt/);
  });

  it("replays the complete research disposition and detects corruption", () => {
    const tracked = readFileSync(
      resolve(
        ROOT,
        "data/source/state-local-fiscal-authority/research-disposition.json",
      ),
      "utf-8",
    );
    const generated = buildFiscalAuthorityDisposition(
      readFileSync(FISCAL_DISPOSITION_MASTER),
      readFileSync(FISCAL_DISPOSITION_MIRROR),
    );
    expect(generated).toBe(tracked);
    expect(() =>
      checkFiscalAuthorityDisposition(
        tracked.replace('"claimCount": 2650', '"claimCount": 2649'),
        generated,
      ),
    ).toThrow(/stale or corrupted/);
  });

  it("decodes the declared Windows-1252 statute bytes without replacement text", () => {
    const declaration = FISCAL_AUTHORITY_DECLARATIONS.find(
      (candidate) =>
        candidate.kind === "TAX_INSTRUMENT" &&
        candidate.level === "MUNICIPALITY" &&
        candidate.instrument === "PROPERTY_TAX",
    );
    expect(declaration?.excerpt).toContain("AS 29.45.550 — 29.45.560");
    expect(declaration?.excerpt).not.toContain("�");
    const property = lock().artifacts.find(
      (artifact) =>
        artifact.artifactId === "ak-municipal-property-tax-statutes",
    );
    if (!property?.localPath) throw new Error("Expected property-tax bytes.");
    const bytes = readFileSync(resolve(ROOT, property.localPath));
    expect(new TextDecoder("utf-8").decode(bytes)).toContain("�");
    // The repository's own decoder, not the host's: `new TextDecoder(
    // "windows-1252")` is only as good as the ICU data Node was built with, so
    // asserting through it tests the runner rather than this substrate.
    expect(decodeRetrievedBytes(bytes, "windows-1252")).toContain(
      "AS 29.45.550</a>  — 29.45.560",
    );
    const normalized = normalizeRetrievedText(bytes, property.mediaType);
    expect(normalized).toContain("AS 29.45.550 — 29.45.560");
    expect(normalized).not.toContain("�");
    expect(() => sourceDomain.compileProduction(lock())).not.toThrow();
  });

  it("maps the Windows-1252 upper range without consulting the host", () => {
    // 0x80-0x9F is the whole disagreement between Windows-1252 and ISO-8859-1,
    // and it is where a host lacking legacy-encoding data silently substitutes
    // C1 control characters for punctuation.
    const upper = Buffer.from(
      Array.from({ length: 32 }, (_unused, offset) => 0x80 + offset),
    );
    expect(decodeRetrievedBytes(upper, "windows-1252")).toBe(
      "€\u0081‚ƒ„…†‡" +
        "ˆ‰Š‹Œ\u008dŽ\u008f" +
        "\u0090‘’“”•–—" +
        "˜™š›œ\u009džŸ",
    );
    expect(decodeRetrievedBytes(upper, "windows-1252")).not.toContain("�");
    // Every byte outside that range is its own code point, so nothing the
    // publisher sent is dropped, replaced or reordered.
    const rest = Buffer.from(
      Array.from({ length: 224 }, (_unused, offset) =>
        offset < 128 ? offset : offset + 32,
      ),
    );
    expect(decodeRetrievedBytes(rest, "windows-1252")).toBe(
      Array.from(rest, (byte) => String.fromCharCode(byte)).join(""),
    );
  });

  it("extracts the pinned enacted text on a host with no legacy-encoding data", () => {
    // Hosted run 34382678260 (Node 22.13.0) failed ten rights-scope checks and
    // the em-dash assertion because `TextDecoder("windows-1252")` there behaved
    // as ISO-8859-1. This reproduces that host rather than describing it.
    const realDecoder = globalThis.TextDecoder;
    class IcuLessTextDecoder {
      readonly encoding: string;
      constructor(label = "utf-8") {
        this.encoding = String(label).toLowerCase();
      }
      decode(input?: ArrayBufferView): string {
        const bytes =
          input === undefined
            ? Buffer.alloc(0)
            : Buffer.from(
                new Uint8Array(
                  input.buffer,
                  input.byteOffset,
                  input.byteLength,
                ),
              );
        return this.encoding === "utf-8" || this.encoding === "utf8"
          ? bytes.toString("utf-8")
          : bytes.toString("latin1");
      }
    }

    const salesTax = lock().artifacts.find(
      (artifact) =>
        artifact.artifactId === "ak-municipal-sales-use-tax-statutes",
    );
    if (!salesTax?.localPath) throw new Error("Expected sales-tax bytes.");
    const bytes = readFileSync(resolve(ROOT, salesTax.localPath));

    try {
      (globalThis as unknown as { TextDecoder: unknown }).TextDecoder =
        IcuLessTextDecoder;

      // The simulation is faithful: under it the host decoder really does lose
      // the em dash to a C1 control character, which is the reported symptom.
      const viaHost = new TextDecoder("windows-1252").decode(bytes);
      expect(viaHost).not.toContain("—");
      expect(viaHost).toContain("\u0097");

      // The substrate is unaffected, so the rights-scope digests still hold and
      // production still opens on that same host.
      expect(decodeRetrievedBytes(bytes, "windows-1252")).toContain("—");
      expect(normalizeRetrievedText(bytes, salesTax.mediaType)).not.toContain(
        "\u0097",
      );
      expect(() => sourceDomain.compileProduction(lock())).not.toThrow();
    } finally {
      globalThis.TextDecoder = realDecoder;
    }
  });

  it("refuses the enacted-text digest a mis-decoding host produced", () => {
    // 548462…53ab is the digest hosted run 34382678260 reported for the
    // sales-tax artifact: what these bytes hash to once 0x97 is read as a
    // control character. It must stay a refusal and never become the pin.
    const valid = lock();
    const substituted: ArtifactLock = {
      ...valid,
      artifacts: valid.artifacts.map((artifact) =>
        artifact.artifactId === "ak-municipal-sales-use-tax-statutes" &&
        artifact.rights.status === "public-domain-government-edict"
          ? {
              ...artifact,
              rights: {
                ...artifact.rights,
                edict: {
                  ...artifact.rights.edict,
                  scope: {
                    ...artifact.rights.edict.scope,
                    extracted: {
                      length: 10_706,
                      sha256:
                        "548462116eb287ad9520491be3d9ad837fa79b3983019cd68aaa0cc8e5bd53ab",
                    },
                  },
                },
              },
            }
          : artifact,
      ),
    };
    expect(() => sourceDomain.compileProduction(substituted)).toThrow(
      /scope of the edict determination has moved/,
    );
  });

  it("compiles only excerpt-verified first-party declarations", () => {
    const compiled = sourceDomain.compileProduction(lock());
    expect(compiled.corpus).toMatchObject({
      inputClass: "production",
      recordCount: 12,
      coverage: { isCompleteUniverse: false },
    });
    expect(isClean(sourceDomain.validateCorpus(compiled))).toBe(true);
    expect(
      compiled.records.every(
        (record) =>
          record.stateUsps === "AK" &&
          record.citedAuthority.lineage === "FIRST_PARTY_LEGAL_ARTIFACT" &&
          record.citedAuthority.derivation === "DERIVED" &&
          JSON.stringify(record.citedAuthority.derivationArtifactIds) ===
            JSON.stringify([
              ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
              ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
            ]) &&
          record.citedAuthority.enactedDate === null &&
          record.citedAuthority.lastAmendedDate === null &&
          record.citedAuthority.observedDate === "2026-09-09" &&
          record.citedAuthority.versionApplicability ===
            "FOUNDATIONAL_AND_OBSERVED_POINTS" &&
          record.citedAuthority.derivationChain?.includes("ch. 74 SLA 1985"),
      ),
    ).toBe(true);
    expect(compiled.records.map((record) => record.recordId).sort()).toEqual(
      [
        "AK:COUNTY:instrument:GENERAL_SALES_TAX",
        "AK:COUNTY:instrument:PROPERTY_TAX",
        "AK:COUNTY:rule:LOCAL_GO_BOND_VOTER_HURDLE",
        "AK:COUNTY:rule:LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED",
        "AK:COUNTY:rule:NOMINAL_MILLAGE_CAP_MILLS",
        "AK:COUNTY:rule:TAX_INCREASE_VOTE_REQUIREMENT",
        "AK:MUNICIPALITY:instrument:GENERAL_SALES_TAX",
        "AK:MUNICIPALITY:instrument:PROPERTY_TAX",
        "AK:MUNICIPALITY:rule:LOCAL_GO_BOND_VOTER_HURDLE",
        "AK:MUNICIPALITY:rule:LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED",
        "AK:MUNICIPALITY:rule:NOMINAL_MILLAGE_CAP_MILLS",
        "AK:MUNICIPALITY:rule:TAX_INCREASE_VOTE_REQUIREMENT",
      ].sort(),
    );
    expect(
      compiled.records.some((record) =>
        record.recordId.includes("92N_NATIONAL"),
      ),
    ).toBe(false);
  });

  it("refuses a tampered artifact hash", () => {
    const valid = lock();
    const artifact = valid.artifacts.find(
      (candidate) =>
        candidate.artifactId === "ak-municipal-sales-use-tax-statutes",
    );
    if (!artifact) throw new Error("Expected sales-tax statute artifact.");
    const tampered: ArtifactLock = {
      ...valid,
      artifacts: valid.artifacts.map((candidate) =>
        candidate.artifactId === artifact.artifactId
          ? {
              ...artifact,
              bytes: { ...artifact.bytes, sha256: "0".repeat(64) },
            }
          : candidate,
      ),
    };
    expect(() => sourceDomain.compileProduction(tampered)).toThrow(/hashes to/);
  });

  it("refuses a moved enacted-text boundary", () => {
    const valid = lock();
    const artifact = valid.artifacts.find(
      (candidate) =>
        candidate.artifactId === "ak-municipal-sales-use-tax-statutes",
    );
    if (
      !artifact ||
      artifact.rights.status !== "public-domain-government-edict"
    ) {
      throw new Error("Expected an edict artifact.");
    }
    const movedBoundary = {
      ...artifact,
      rights: {
        ...artifact.rights,
        edict: {
          ...artifact.rights.edict,
          scope: {
            ...artifact.rights.edict.scope,
            regions: [
              {
                ...artifact.rights.edict.scope.regions[0]!,
                beginsWith: "Sec. 29.45.999. Text that is not present.",
              },
            ],
          },
        },
      },
    };
    const tampered: ArtifactLock = {
      ...valid,
      artifacts: valid.artifacts.map((candidate) =>
        candidate.artifactId === artifact.artifactId
          ? movedBoundary
          : candidate,
      ),
    };
    expect(() => sourceDomain.compileProduction(tampered)).toThrow(
      /not in the retrieved text/,
    );
  });

  it("refuses a declaration whose exact excerpt is absent", () => {
    const opened = openFiscalAuthorityArtifacts(lock());
    const declaration = FISCAL_AUTHORITY_DECLARATIONS[0]!;
    expect(() =>
      compileFiscalAuthorityDeclarations(opened.artifacts, [
        { ...declaration, excerpt: "Text not enacted by the artifact." },
      ]),
    ).toThrow(/no longer contains its declared excerpt/);
  });
});
