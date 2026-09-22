import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";
const base = "https://www2.census.gov/programs-surveys/cps/tables/p20/587";
const request = (
  id: string,
  file: string,
  url: string,
  mediaType: string,
): AcquisitionRequest => ({
  artifactId: id,
  provider: "U.S. Census Bureau, Current Population Survey",
  url,
  method: "bulk-download",
  mediaType,
  publisher: {
    statedVintage: "November 2024",
    releaseDate: id === "cps-2024-methodology" ? null : "2025-04-30",
    schemaVersion: "2024 CPS Voting and Registration Supplement",
    documentationUrl:
      "https://www.census.gov/data/tables/time-series/demo/voting-and-registration/p20-590.html",
  },
  rights: {
    status: "public-domain-us-government",
    declaredLicense: null,
    attributionRequired: false,
  },
  storage: "committed",
  localPath: `data/source/census-voting-registration/raw/${file}`,
});
/** Bounded three state tables plus methodology; expected combined <6 MiB. */
export const censusVotingAcquisition: AcquisitionPlan = {
  domain: "census-voting-registration",
  requests: [
    request(
      "cps-2024-release",
      "release-2025-04-30.html",
      "https://www.census.gov/newsroom/press-releases/2025/2024-presidential-election-voting-registration-tables.html",
      "text/html",
    ),
    ...["a", "b", "c"].map((letter) =>
      request(
        `cps-2024-vote04${letter}`,
        `vote04${letter}_2024.xlsx`,
        `${base}/vote04${letter}_2024.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ),
    request(
      "cps-2024-methodology",
      "cpsnov24.pdf",
      "https://www2.census.gov/programs-surveys/cps/techdocs/cpsnov24.pdf",
      "application/pdf",
    ),
  ],
};
