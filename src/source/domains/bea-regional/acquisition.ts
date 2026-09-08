/**
 * The BEA products this domain retrieves.
 *
 * #69 committed no raw bytes at all: six rows were written into TypeScript and
 * the "artifact hashes" in its manifest were digests of those objects
 * serialized in memory. These are the Bureau's own published zips, retrieved
 * and hashed here, each carrying both the data and the Bureau's own table
 * definition XML — so the meaning of a line code is first-party evidence too.
 *
 * The three tables are chosen to span the geography levels whose classification
 * the audit found broken: county and state personal income, state price
 * parities, and metropolitan price parities.
 */

import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

const BEA_ZIP = "https://apps.bea.gov/regional/zip";

export const COUNTY_INCOME_ARTIFACT = "bea-regional-cainc1-zip";
export const STATE_RPP_ARTIFACT = "bea-regional-sarpp-zip";
export const MSA_RPP_ARTIFACT = "bea-regional-marpp-zip";

export const COUNTY_INCOME_MEMBER = "CAINC1__ALL_AREAS_1969_2024.csv";
export const COUNTY_INCOME_DEFINITION = "CAINC1__definition.xml";
export const STATE_RPP_MEMBER = "SARPP_STATE_2008_2024.csv";
export const STATE_RPP_DEFINITION = "SARPP__definition.xml";
export const MSA_RPP_MEMBER = "MARPP_MSA_2008_2024.csv";
export const MSA_RPP_DEFINITION = "MARPP__definition.xml";

function beaRequest(
  artifactId: string,
  table: string,
  member: string,
): AcquisitionRequest {
  return {
    artifactId,
    provider: "U.S. Bureau of Economic Analysis, Regional Economic Accounts",
    url: `${BEA_ZIP}/${table}.zip`,
    method: "bulk-download",
    mediaType: "application/zip",
    containerMemberPath: member,
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: `BEA regional table ${table}`,
      documentationUrl: "https://apps.bea.gov/regional/downloadzip.htm",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/bea-regional/raw/${table}.zip`,
  };
}

export const beaRegionalAcquisition: AcquisitionPlan = {
  domain: "bea-regional",
  requests: [
    beaRequest(COUNTY_INCOME_ARTIFACT, "CAINC1", COUNTY_INCOME_MEMBER),
    beaRequest(STATE_RPP_ARTIFACT, "SARPP", STATE_RPP_MEMBER),
    beaRequest(MSA_RPP_ARTIFACT, "MARPP", MSA_RPP_MEMBER),
  ],
};
