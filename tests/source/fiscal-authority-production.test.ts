import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArtifactLock } from "../../src/source/core/index";
import { isClean, sha256Hex } from "../../src/source/core/index";
import {
  AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE,
  FISCAL_AUTHORITY_DECLARATIONS,
  compileFiscalAuthorityDeclarations,
  openFiscalAuthorityArtifacts,
  sourceDomain,
} from "../../src/source/domains/state-local-fiscal-authority/index";

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

  it("pins the first-party session law evidence for the shared effective date", () => {
    expect(AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE).toEqual({
      artifactId: "ak-ch-74-sla-1985-enrolled-session-law",
      authorityUrl:
        "https://www.akleg.gov/pdf/billfiles/SLAs/SLA%201985/CH%2074%20SLA%201985.pdf",
      bytes: 36_898_000,
      sha256:
        "30dfaeab42ba7a22200897671249b7bfe10a57a41ce1edcb16b91ef1dd02225f",
      legalLocator: "ch. 74 SLA 1985, § 90",
      provisionPdfPages: {
        propertyTax: 101,
        taxLimitation: 116,
        generalObligationBondVote: 150,
        effectiveDate: 211,
      },
      effectiveDate: "1986-01-01",
    });
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
    const artifact = valid.artifacts[0]!;
    const tampered: ArtifactLock = {
      ...valid,
      artifacts: [
        {
          ...artifact,
          bytes: { ...artifact.bytes, sha256: "0".repeat(64) },
        },
      ],
    };
    expect(() => sourceDomain.compileProduction(tampered)).toThrow(/hashes to/);
  });

  it("refuses a moved enacted-text boundary", () => {
    const valid = lock();
    const artifact = valid.artifacts[0]!;
    if (artifact.rights.status !== "public-domain-government-edict") {
      throw new Error("Expected an edict artifact.");
    }
    const tampered: ArtifactLock = {
      ...valid,
      artifacts: [
        {
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
        },
      ],
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
