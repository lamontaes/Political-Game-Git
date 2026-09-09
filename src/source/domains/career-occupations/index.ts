import type { OccupationRecord } from "./compile";
import { compileCareerOccupations, validateCareerCorpus } from "./compile";
import type { SourceDomainModule, AcquisitionRequest } from "../../core/index";
const root = "data/source/career-occupations/raw/";
const onet = (id: string, url: string, file: string): AcquisitionRequest => ({
  artifactId: id,
  provider: "USDOL/ETA O*NET",
  url,
  method: "bulk-download",
  mediaType:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  publisher: {
    statedVintage: "O*NET 31.0 / O*NET-SOC 2019",
    releaseDate: null,
    schemaVersion: "31.0",
    documentationUrl: "https://www.onetcenter.org/database.html",
  },
  rights: {
    status: "declared-license",
    declaredLicense: "CC BY 4.0; https://www.onetcenter.org/license_db.html",
    attributionRequired: true,
  },
  storage: "committed",
  localPath: root + file,
});
export const sourceDomain: SourceDomainModule<OccupationRecord> = {
  domain: "career-occupations",
  compilerVersion: "1.0.0",
  lockPath: "data/source/career-occupations/artifact-lock.json",
  acquisitionPlan: {
    domain: "career-occupations",
    requests: [
      onet(
        "onet31-occupations",
        "https://www.onetcenter.org/dl_files/database/db_31_0_excel/Occupation%20Data.xlsx",
        "occupations.xlsx",
      ),
      onet(
        "onet31-tasks",
        "https://www.onetcenter.org/dl_files/database/db_31_0_excel/Task%20Statements.xlsx",
        "tasks.xlsx",
      ),
      onet(
        "onet2019-soc2018-crosswalk",
        "https://www.onetcenter.org/taxonomy/2019/soc/2019_to_SOC_Crosswalk.xlsx?fmt=xlsx",
        "crosswalk.xlsx",
      ),
      {
        artifactId: "bls-soc2018-structure",
        provider: "BLS",
        url: "https://www.bls.gov/soc/2018/soc_structure_2018.xlsx",
        method: "bulk-download",
        mediaType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        publisher: {
          statedVintage: "2018 SOC",
          releaseDate: null,
          schemaVersion: "2018",
          documentationUrl: "https://www.bls.gov/soc/2018/home.htm",
        },
        rights: {
          status: "public-domain-us-government",
          declaredLicense: null,
          attributionRequired: false,
        },
        storage: "committed",
        localPath: root + "soc.xlsx",
      },
      {
        artifactId: "bls-oews2025-national",
        containerMemberPath: "oesm25nat/national_M2025_dl.xlsx",
        provider: "BLS",
        url: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
        method: "bulk-download",
        mediaType: "application/zip",
        publisher: {
          statedVintage: "May 2025",
          releaseDate: null,
          schemaVersion: "May 2025 OEWS national",
          documentationUrl: "https://www.bls.gov/oes/tables.htm",
        },
        rights: {
          status: "public-domain-us-government",
          declaredLicense: null,
          attributionRequired: false,
        },
        storage: "committed",
        localPath: root + "oews.zip",
      },
    ],
  },
  compileProduction: compileCareerOccupations,
  validateCorpus: validateCareerCorpus,
};
