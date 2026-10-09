import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

/** CMS Hospital General Information: every Medicare-certified hospital, one row each. */
export const HOSPITAL_GENERAL_ARTIFACT = "cms-hospital-general-information";
/** CMS Provider of Services file, 2026 Q2 quarter: certified beds and county FIPS by CCN. */
export const HOSPITAL_POS_ARTIFACT = "cms-provider-of-services-2026-q2";
/** The Hospital General Information release the rows are dated by. */
export const HOSPITALS_AS_OF = "2026-07-22";

const RIGHTS = {
  status: "public-domain-us-government",
  declaredLicense:
    "Centers for Medicare & Medicaid Services open data; provider-level facility facts, no patient records.",
  attributionRequired: false,
} as const;

const generalInformation: AcquisitionRequest = {
  artifactId: HOSPITAL_GENERAL_ARTIFACT,
  provider: "Centers for Medicare & Medicaid Services, Provider Data Catalog",
  url: "https://data.cms.gov/provider-data/sites/default/files/resources/893c372430d9d71a1c52737d01239d47_1785189955/Hospital_General_Information.csv",
  method: "GET",
  mediaType: "text/csv",
  publisher: {
    statedVintage: "Hospital General Information, modified 2026-07-22",
    releaseDate: HOSPITALS_AS_OF,
    schemaVersion: null,
    documentationUrl: "https://data.cms.gov/provider-data/dataset/xubh-q36u",
  },
  rights: RIGHTS,
  storage: "committed",
  localPath: "data/source/hospitals/raw/Hospital_General_Information.csv",
};

/** 30 MB and 44,707 rows across every provider category: cached, not committed. */
const providerOfServices: AcquisitionRequest = {
  artifactId: HOSPITAL_POS_ARTIFACT,
  provider: "Centers for Medicare & Medicaid Services, Data.CMS.gov",
  url: "https://data.cms.gov/sites/default/files/2026-07/7780b4e3-4c4b-4811-8884-65ca23b7a4e8/Hospital_and_other.DATA.Q2_2026.csv",
  method: "GET",
  mediaType: "text/csv",
  publisher: {
    statedVintage:
      "Provider of Services File, Quality Improvement and Evaluation System, 2026-04-01 to 2026-06-30",
    releaseDate: null,
    schemaVersion: null,
    documentationUrl:
      "https://data.cms.gov/provider-characteristics/hospitals-and-other-facilities/provider-of-services-file-quality-improvement-and-evaluation-system",
  },
  rights: RIGHTS,
  storage: "cached-not-committed",
  localPath: null,
  cachePath: `.source-cache/hospitals/${HOSPITAL_POS_ARTIFACT}.csv`,
};

export const hospitalsAcquisition: AcquisitionPlan = {
  domain: "hospitals",
  requests: [generalInformation, providerOfServices],
};
