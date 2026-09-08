/** Official publisher bytes; QA rows remain byte-for-byte fixed-width records. */
import { readZipMember } from "../../core/index";
import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

export const PUBLISHER_URL =
  "https://www2.census.gov/programs-surveys/apes/datasets/2025/2025_individual_unit_files.zip";
export const DATA_MEMBER = "25empst.txt";
export const IDENTITY_MEMBER = "25empid.txt";
export const CODEBOOK_MEMBER = "2025 ASPEP Individual Unit File Tech Doc.pdf";
export const DISCLAIMER_MEMBER =
  "2025 ASPEP Individual Unit File Disclaimer.pdf";
export const ARCHIVE_ID = "public-employment-2025-individual-units";

function selectedIds(archive: Buffer): Set<string> {
  const ids = readZipMember(archive, IDENTITY_MEMBER)
    .toString("latin1")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(0, 14))
    .filter((id) => !/^0+$/.test(id))
    .sort();
  return new Set(ids.slice(0, 25));
}

/** Latin-1 round-trips every byte; publisher parsers separately reject non-ASCII. */
export function cutPublisherRows(archive: Buffer, member: string): Buffer {
  const ids = selectedIds(archive);
  const rows =
    readZipMember(archive, member)
      .toString("latin1")
      .match(/[^\n]+(?:\n|$)/g) ?? [];
  return Buffer.from(
    rows.filter((line) => ids.has(line.slice(0, 14))).join(""),
    "latin1",
  );
}

const common = {
  provider: "U.S. Census Bureau",
  url: PUBLISHER_URL,
  method: "bulk-download" as const,
  publisher: {
    statedVintage: "2025",
    releaseDate: null,
    schemaVersion: "2025 individual unit files",
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
  localPath: `data/source/public-employment/raw/${role}.${rows ? "txt" : "pdf"}`,
  sliceOf: {
    parentArtifactId: ARCHIVE_ID,
    selectionPredicate: rows
      ? `Member ${member}: rows whose first 14 characters are among the first 25 lexicographically sorted nonzero identifiers in ${IDENTITY_MEMBER}. Preserve original bytes and line terminators.`
      : `Complete unchanged ZIP member ${member}`,
    cut: (bytes) =>
      rows ? cutPublisherRows(bytes, member) : readZipMember(bytes, member),
  },
});
export const acquisitionPlan: AcquisitionPlan = {
  domain: "public-employment",
  requests: [
    {
      ...common,
      artifactId: ARCHIVE_ID,
      mediaType: "application/zip",
      storage: "cached-not-committed",
      localPath: null,
      cachePath: ".source-cache/public-employment/2025-individual-units.zip",
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
