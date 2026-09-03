/**
 * The FEC bulk artifacts, and the header files that describe them.
 *
 * The bulk files carry no header row, so the column names come from the
 * Commission's own published header files rather than from a list typed into
 * this repository. That makes the schema itself first-party evidence: if the
 * FEC adds a column, the header artifact's digest changes and the lock notices.
 */

import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

const BULK = "https://www.fec.gov/files/bulk-downloads/2024";
const DICTIONARY = "https://www.fec.gov/files/bulk-downloads/data_dictionaries";

export const CANDIDATE_ARTIFACT = "fec-2024-candidate-master-zip";
export const COMMITTEE_ARTIFACT = "fec-2024-committee-master-zip";
export const LINKAGE_ARTIFACT = "fec-2024-candidate-committee-linkage-zip";
export const CANDIDATE_HEADER_ARTIFACT = "fec-candidate-master-header-csv";
export const COMMITTEE_HEADER_ARTIFACT = "fec-committee-master-header-csv";
export const LINKAGE_HEADER_ARTIFACT = "fec-linkage-header-csv";

export const CANDIDATE_MEMBER = "cn.txt";
export const COMMITTEE_MEMBER = "cm.txt";
export const LINKAGE_MEMBER = "ccl.txt";

function bulkRequest(
  artifactId: string,
  file: string,
  member: string,
  description: string,
): AcquisitionRequest {
  return {
    artifactId,
    provider: "Federal Election Commission",
    url: `${BULK}/${file}`,
    method: "bulk-download",
    mediaType: "application/zip",
    containerMemberPath: member,
    publisher: {
      statedVintage: "2023-2024 election cycle",
      releaseDate: null,
      schemaVersion: description,
      documentationUrl: "https://www.fec.gov/data/browse-data/?tab=bulk-data",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/fec/raw/${file}`,
  };
}

function headerRequest(
  artifactId: string,
  file: string,
  description: string,
): AcquisitionRequest {
  return {
    artifactId,
    provider: "Federal Election Commission",
    url: `${DICTIONARY}/${file}`,
    method: "GET",
    mediaType: "text/csv",
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: description,
      documentationUrl: "https://www.fec.gov/campaign-finance-data/",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/fec/raw/${file}`,
  };
}

export const fecAcquisition: AcquisitionPlan = {
  domain: "fec",
  requests: [
    bulkRequest(
      CANDIDATE_ARTIFACT,
      "cn24.zip",
      CANDIDATE_MEMBER,
      "Candidate master file",
    ),
    bulkRequest(
      COMMITTEE_ARTIFACT,
      "cm24.zip",
      COMMITTEE_MEMBER,
      "Committee master file",
    ),
    bulkRequest(
      LINKAGE_ARTIFACT,
      "ccl24.zip",
      LINKAGE_MEMBER,
      "Candidate-committee linkage file",
    ),
    headerRequest(
      CANDIDATE_HEADER_ARTIFACT,
      "cn_header_file.csv",
      "Candidate master column names",
    ),
    headerRequest(
      COMMITTEE_HEADER_ARTIFACT,
      "cm_header_file.csv",
      "Committee master column names",
    ),
    headerRequest(
      LINKAGE_HEADER_ARTIFACT,
      "ccl_header_file.csv",
      "Linkage column names",
    ),
  ],
};
