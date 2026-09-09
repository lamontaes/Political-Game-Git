import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sha256Hex, toCanonicalJson } from "../../src/source/core/index";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const INPUT_DIR = resolve(
  ROOT,
  "data/source/state-local-fiscal-authority/research-input",
);
const MASTER = resolve(
  INPUT_DIR,
  "92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json",
);
const MIRROR = resolve(
  INPUT_DIR,
  "92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.mirror.json",
);
const OUTPUT = resolve(
  ROOT,
  "data/source/state-local-fiscal-authority/research-disposition.json",
);
const EXPECTED_SHA256 =
  "126ee64509d187f648ca6d67b9db815109868133cda7f02b6fa63621787525a8";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

interface MatrixState {
  readonly metadata: { readonly code: string; readonly name: string };
  readonly state_fiscal_authority: Record<string, Record<string, Json>>;
  readonly local_fiscal_authority: Record<string, Record<string, Json>>;
}

interface Matrix {
  readonly as_of_date: string;
  readonly retrieval_date: string;
  readonly states: readonly MatrixState[];
}

const verifiedClaims: Readonly<
  Record<
    string,
    {
      readonly status:
        | "PRIMARY_ARTIFACT_VERIFIED"
        | "PRIMARY_ARTIFACT_VERIFIED_CORRECTED_LOCATOR";
      readonly reason: string;
      readonly productionRecordIds: readonly string[];
    }
  >
> = {
  "AK/local_fiscal_authority/local_sales_tax_authority/status": {
    status: "PRIMARY_ARTIFACT_VERIFIED",
    reason:
      "Acquired Alaska Statutes §§ 29.45.650, 29.45.670, and 29.45.700 contain the declared excerpts supporting the linked production records.",
    productionRecordIds: [
      "AK:COUNTY:instrument:GENERAL_SALES_TAX",
      "AK:MUNICIPALITY:instrument:GENERAL_SALES_TAX",
    ],
  },
  "AK/local_fiscal_authority/local_sales_tax_authority/voter_referendum_required":
    {
      status: "PRIMARY_ARTIFACT_VERIFIED",
      reason:
        "Acquired Alaska Statute § 29.45.670 contains the declared voter-ratification excerpt supporting the linked production records.",
      productionRecordIds: [
        "AK:COUNTY:rule:LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED",
        "AK:MUNICIPALITY:rule:LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED",
      ],
    },
  "AK/local_fiscal_authority/referendum_requirements/tax_increase_referendum_rules":
    {
      status: "PRIMARY_ARTIFACT_VERIFIED",
      reason:
        "Acquired Alaska Statute § 29.45.670 contains the declared voter-ratification excerpt supporting the linked production records.",
      productionRecordIds: [
        "AK:COUNTY:rule:TAX_INCREASE_VOTE_REQUIREMENT",
        "AK:MUNICIPALITY:rule:TAX_INCREASE_VOTE_REQUIREMENT",
      ],
    },
  "AK/local_fiscal_authority/property_tax_authority_and_limits/nominal_millage_cap":
    {
      status: "PRIMARY_ARTIFACT_VERIFIED_CORRECTED_LOCATOR",
      reason:
        "The acquired current statute verifies the matrix's 30-mill claim at Alaska Statute § 29.45.090(a), not § 29.45.080 as the matrix prose reports; § 29.45.100 supplies the bond-payment exception.",
      productionRecordIds: [
        "AK:COUNTY:rule:NOMINAL_MILLAGE_CAP_MILLS",
        "AK:MUNICIPALITY:rule:NOMINAL_MILLAGE_CAP_MILLS",
      ],
    },
  "AK/local_fiscal_authority/debt_bond_authority/general_obligation_voter_approval":
    {
      status: "PRIMARY_ARTIFACT_VERIFIED",
      reason:
        "Acquired Alaska Statute § 29.47.190(a) contains the declared majority-vote excerpt supporting the linked production records.",
      productionRecordIds: [
        "AK:COUNTY:rule:LOCAL_GO_BOND_VOTER_HURDLE",
        "AK:MUNICIPALITY:rule:LOCAL_GO_BOND_VOTER_HURDLE",
      ],
    },
};

function recordLeaves(
  value: Json,
  path: string,
): { path: string; value: Json }[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      recordLeaves(item, `${path}/${index}`),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      recordLeaves(item, `${path}/${key}`),
    );
  }
  return [{ path, value }];
}

function claimedState(group: Record<string, Json>): string | null {
  const value = group.status_field ?? group.status;
  return typeof value === "string" && value.toLowerCase() === value
    ? value
    : null;
}

function isMetadataLeaf(
  relativePath: string,
  value: Json,
  group: Record<string, Json>,
): boolean {
  if (relativePath === "legal_source" || relativePath === "status_field") {
    return true;
  }
  return (
    relativePath === "status" &&
    typeof value === "string" &&
    value.toLowerCase() === value &&
    claimedState(group) === value
  );
}

function disposition(
  sourcePath: string,
  value: Json,
  legalSource: Json,
): { status: string; reason: string; productionRecordIds: readonly string[] } {
  if (
    typeof legalSource !== "string" ||
    legalSource.trim().length < 12 ||
    !/[A-Za-z]/.test(legalSource)
  ) {
    return {
      status: "BLOCKED_MALFORMED_LOCATOR",
      reason:
        "The matrix group carries no usable legal-source locator. It cannot identify an instrument to acquire.",
      productionRecordIds: [],
    };
  }
  if (value === null || value === "" || value === "UNKNOWN") {
    return {
      status: "BLANK_OR_UNKNOWN",
      reason: "The matrix supplies no claim value to verify.",
      productionRecordIds: [],
    };
  }
  if (String(value).toUpperCase().includes("CONFLICT")) {
    return {
      status: "BLOCKED_CONFLICTING",
      reason:
        "The matrix marks the candidate conflicting; one synthesis cannot establish two independently sourced claims.",
      productionRecordIds: [],
    };
  }
  const verified = verifiedClaims[sourcePath];
  if (verified) return verified;
  return {
    status: "UNSUPPORTED_MATRIX_ONLY",
    reason:
      "No acquired first-party legal artifact and excerpt declaration supports this candidate in the production tranche.",
    productionRecordIds: [],
  };
}

const masterBytes = readFileSync(MASTER);
const mirrorBytes = readFileSync(MIRROR);
if (sha256Hex(masterBytes) !== EXPECTED_SHA256) {
  throw new Error(
    "The recovered 92N master does not match the contract digest.",
  );
}
if (!masterBytes.equals(mirrorBytes)) {
  throw new Error(
    "The recovered 92N mirror is not byte-identical to the master.",
  );
}

const matrix = JSON.parse(masterBytes.toString("utf-8")) as Matrix;
if (matrix.states.length !== 50) {
  throw new Error(`Expected 50 states in 92N, found ${matrix.states.length}.`);
}

const groups: {
  stateUsps: string;
  section: string;
  group: string;
  legalSource: Json;
  matrixClaimedStatus: string | null;
  claims: {
    sourcePath: string;
    value: Json;
    status: string;
    reason: string;
    productionRecordIds: readonly string[];
  }[];
}[] = [];

for (const state of matrix.states) {
  for (const section of [
    "state_fiscal_authority",
    "local_fiscal_authority",
  ] as const) {
    for (const [groupName, group] of Object.entries(state[section])) {
      const prefix = `${state.metadata.code}/${section}/${groupName}`;
      const claims = recordLeaves(group, "")
        .map((leaf) => ({ ...leaf, relativePath: leaf.path.slice(1) }))
        .filter((leaf) => !isMetadataLeaf(leaf.relativePath, leaf.value, group))
        .map((leaf) => {
          const sourcePath = `${prefix}/${leaf.relativePath}`;
          return {
            sourcePath,
            value: leaf.value,
            ...disposition(sourcePath, leaf.value, group.legal_source),
          };
        });
      groups.push({
        stateUsps: state.metadata.code,
        section,
        group: groupName,
        legalSource: group.legal_source,
        matrixClaimedStatus: claimedState(group),
        claims,
      });
    }
  }
}

if (groups.length !== 750) {
  throw new Error(`Expected 750 state/section groups, found ${groups.length}.`);
}

const claims = groups.flatMap((group) => group.claims);
const dispositionStatuses = [
  "BLANK_OR_UNKNOWN",
  "BLOCKED_CONFLICTING",
  "BLOCKED_MALFORMED_LOCATOR",
  "PRIMARY_ARTIFACT_VERIFIED",
  "PRIMARY_ARTIFACT_VERIFIED_CORRECTED_LOCATOR",
  "UNSUPPORTED_MATRIX_ONLY",
] as const;
const byStatus = Object.fromEntries(
  dispositionStatuses.map((status) => [
    status,
    claims.filter((claim) => claim.status === status).length,
  ]),
);

writeFileSync(
  OUTPUT,
  toCanonicalJson({
    schemaVersion: "1.0.0",
    researchInput: {
      driveFileId: "1se9eXvTzsHOESjdbbZPSmxs1rD5R3K13",
      mirrorDriveFileId: "19T_YU2xvrQDFd4D_xGviVG45z_X9G_O3",
      bytes: masterBytes.length,
      sha256: EXPECTED_SHA256,
      mirrorByteIdentical: true,
      matrixAsOfDate: matrix.as_of_date,
      matrixRetrievalDate: matrix.retrieval_date,
      warning:
        "Matrix dates and citation prose do not establish a legal provision's effective date or first-party evidence.",
    },
    inventory: {
      stateCount: matrix.states.length,
      groupCount: groups.length,
      claimCount: claims.length,
      byStatus,
    },
    groups,
  }),
  "utf-8",
);

console.log(
  `Fiscal research disposition: ${matrix.states.length} states, ${groups.length} groups, ${claims.length} claims.`,
);
console.log(JSON.stringify(byStatus));
