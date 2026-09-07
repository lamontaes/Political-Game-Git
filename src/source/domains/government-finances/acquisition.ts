/** Official publisher bytes; QA rows remain byte-for-byte fixed-width records. */
import { readZipMember } from "../../core/index";
import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

export const PUBLISHER_URL =
  "https://www2.census.gov/programs-surveys/gov-finances/tables/2024/2024_Individual_Unit_Files.zip";
export const DATA_MEMBER =
  "2024_Individual_Unit_Files/2024FinEstDAT_07152026modp.txt";
export const IDENTITY_MEMBER = "2024_Individual_Unit_Files/Fin_PID_2024.txt";
export const CODEBOOK_MEMBER =
  "2024_Individual_Unit_Files/2024 S&L Public Use Files Technical Documentation.pdf";
export const DISCLAIMER_MEMBER =
  "2024_Individual_Unit_Files/2024 SandL Public Use Files Disclaimer.pdf";
export const ARCHIVE_ID = "government-finances-2024-individual-units";

function selectedIds(archive: Buffer): Set<string> {
  const ids = readZipMember(archive, IDENTITY_MEMBER)
    .toString("ascii")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(0, 12))
    .filter((id) => !/^0+$/.test(id))
    .sort();
  return new Set(ids.slice(0, 25));
}

/** Retain original line bytes, including their original line terminators. */
export function cutPublisherRows(archive: Buffer, member: string): Buffer {
  const ids = selectedIds(archive);
  const rows =
    readZipMember(archive, member)
      .toString("ascii")
      .match(/[^\n]+(?:\n|$)/g) ?? [];
  return Buffer.from(
    rows.filter((line) => ids.has(line.slice(0, 12))).join(""),
    "ascii",
  );
}

const common = {
  provider: "U.S. Census Bureau",
  url: PUBLISHER_URL,
  method: "bulk-download" as const,
  publisher: {
    statedVintage: "2024",
    releaseDate: null,
    schemaVersion: "2024 individual unit files",
    documentationUrl: PUBLISHER_URL,
  },
  rights: {
    status: "public-domain-us-government" as const,
    declaredLicense:
      "U.S. Census Bureau federal statistical product (17 USC 105)",
    attributionRequired: true as const,
  },
};
const memberRequest = (
  role: string,
  member: string,
  rows: boolean,
): AcquisitionRequest => ({
  ...common,
  artifactId: `${ARCHIVE_ID}-${role}`,
  mediaType: rows ? "text/plain" : "application/pdf",
  storage: "derived-qa-slice",
  localPath: `data/source/government-finances/raw/${role}.${rows ? "txt" : "pdf"}`,
  sliceOf: {
    parentArtifactId: ARCHIVE_ID,
    selectionPredicate: rows
      ? `Member ${member}: rows whose first 12 characters are among the first 25 lexicographically sorted nonzero identifiers in ${IDENTITY_MEMBER}. Preserve original bytes and line terminators.`
      : `Complete unchanged ZIP member ${member}`,
    cut: (bytes) =>
      rows ? cutPublisherRows(bytes, member) : readZipMember(bytes, member),
  },
});
export const acquisitionPlan: AcquisitionPlan = {
  domain: "government-finances",
  requests: [
    {
      ...common,
      artifactId: ARCHIVE_ID,
      mediaType: "application/zip",
      storage: "cached-not-committed",
      localPath: null,
      cachePath: ".source-cache/government-finances/2024-individual-units.zip",
      containerMemberPath: DATA_MEMBER,
    },
    memberRequest("data", DATA_MEMBER, true),
    memberRequest("identity", IDENTITY_MEMBER, true),
    memberRequest("codebook", CODEBOOK_MEMBER, false),
    memberRequest("disclaimer", DISCLAIMER_MEMBER, false),
  ],
};
export const productionRoles = {
  data: `${ARCHIVE_ID}-data`,
  identity: `${ARCHIVE_ID}-identity`,
  codebook: `${ARCHIVE_ID}-codebook`,
  disclaimer: `${ARCHIVE_ID}-disclaimer`,
} as const;

/** Official historical crosswalk; README defines the random six-digit PID. */
export const CROSSWALK_URL =
  "https://www2.census.gov/programs-surveys/gov-finances/data/PID_to_GID_Crosswalk.zip";
export const crosswalkRequest: AcquisitionRequest = {
  ...common,
  artifactId: "census-pid-gid-crosswalk",
  url: CROSSWALK_URL,
  mediaType: "application/zip",
  storage: "committed",
  localPath: "data/source/government-finances/raw/pid-gid-crosswalk.zip",
  publisher: {
    statedVintage: null,
    releaseDate: null,
    schemaVersion: null,
    documentationUrl: CROSSWALK_URL,
  },
  containerMemberPath: "PID_GID_Crosswalk.txt",
};
export const periodRequests: readonly AcquisitionRequest[] = [
  {
    ...common,
    artifactId: "census-finance-local-methodology-2024",
    url: "https://www2.census.gov/programs-surveys/gov-finances/technical-documentation/methodology/2024/2024_methodology.pdf",
    mediaType: "application/pdf",
    storage: "committed",
    localPath: "data/source/government-finances/raw/local-methodology.pdf",
  },
  {
    ...common,
    artifactId: "census-finance-state-technical-2024",
    url: "https://www2.census.gov/programs-surveys/state/technical-documentation/complete-technical-documentation/statetechdoc2024.pdf",
    mediaType: "application/pdf",
    storage: "committed",
    localPath: "data/source/government-finances/raw/state-technical.pdf",
  },
];
