/**
 * The BLS LAUS flat files.
 *
 * Seven of the eight are retrieved whole, because they are small enough to
 * commit and a complete file needs no explanation. The eighth is the current
 * seasonally adjusted data file: 13.6 MB and 248,282 observations, which is
 * past the point where committing raw bytes is reasonable.
 *
 * So it is cached rather than committed, and a QA slice is cut from it by a
 * stated predicate. That is the mechanism the architecture describes for large
 * artifacts, and this is what it is for: the identity of the full artifact is
 * pinned in the lock even though its bytes are not in the repository, the slice
 * carries the parent's digest, and anyone who retrieves the parent can re-cut
 * the slice and compare.
 *
 * What is not done is what the audit found: 1,500-line truncations committed
 * under the publisher's own filenames, with the full URL quoted beside them.
 */

import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

const LAUS_BASE = "https://download.bls.gov/pub/time.series/la";

export const AREA_TYPE_ARTIFACT = "bls-laus-area-type";
export const MEASURE_ARTIFACT = "bls-laus-measure";
export const FOOTNOTE_ARTIFACT = "bls-laus-footnote";
export const PERIOD_ARTIFACT = "bls-laus-period";
export const STATE_REGION_ARTIFACT = "bls-laus-state-region-division";
export const AREA_ARTIFACT = "bls-laus-area";
export const SERIES_ARTIFACT = "bls-laus-series";
export const DATA_PARENT_ARTIFACT = "bls-laus-data-1-current-seasonally-adjusted";
export const DATA_SLICE_ARTIFACT = "bls-laus-data-1-current-seasonally-adjusted-qa-slice";

/** The first year the QA slice keeps. */
export const QA_SLICE_FIRST_YEAR = 2024;

export const DATA_SLICE_PREDICATE =
  `The header row of la.data.1.CurrentS followed by every data row whose year field is ${QA_SLICE_FIRST_YEAR} or later, in published file order, each row byte-for-byte including its trailing carriage return, with a trailing newline.`;

function lausFile(artifactId: string, file: string, description: string): AcquisitionRequest {
  return {
    artifactId,
    provider: "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics",
    url: `${LAUS_BASE}/${file}`,
    method: "GET",
    mediaType: "text/plain",
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: description,
      documentationUrl: "https://www.bls.gov/lau/",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/bls-laus/raw/${file}`,
  };
}

export const blsLausAcquisition: AcquisitionPlan = {
  domain: "bls-laus",
  requests: [
    lausFile(AREA_TYPE_ARTIFACT, "la.area_type", "LAUS area type codes"),
    lausFile(MEASURE_ARTIFACT, "la.measure", "LAUS measure codes"),
    lausFile(FOOTNOTE_ARTIFACT, "la.footnote", "LAUS footnote codes"),
    lausFile(PERIOD_ARTIFACT, "la.period", "LAUS period codes"),
    lausFile(
      STATE_REGION_ARTIFACT,
      "la.state_region_division",
      "LAUS state, region and division codes",
    ),
    lausFile(AREA_ARTIFACT, "la.area", "LAUS area codes and names"),
    lausFile(SERIES_ARTIFACT, "la.series", "LAUS series definitions"),
    {
      artifactId: DATA_PARENT_ARTIFACT,
      provider: "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics",
      url: `${LAUS_BASE}/la.data.1.CurrentS`,
      method: "GET",
      mediaType: "text/plain",
      publisher: {
        statedVintage: null,
        releaseDate: null,
        schemaVersion: "LAUS current seasonally adjusted observations",
        documentationUrl: "https://www.bls.gov/lau/",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "cached-not-committed",
      localPath: null,
      cachePath: ".source-cache/bls-laus/la.data.1.CurrentS",
    },
    {
      artifactId: DATA_SLICE_ARTIFACT,
      provider: "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics",
      url: `${LAUS_BASE}/la.data.1.CurrentS`,
      method: "GET",
      mediaType: "text/plain",
      publisher: {
        statedVintage: null,
        releaseDate: null,
        schemaVersion: "LAUS current seasonally adjusted observations",
        documentationUrl: "https://www.bls.gov/lau/",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "derived-qa-slice",
      localPath: "data/source/bls-laus/raw/la.data.1.CurrentS.qa-slice",
      sliceOf: {
        parentArtifactId: DATA_PARENT_ARTIFACT,
        selectionPredicate: DATA_SLICE_PREDICATE,
        cut: (parentBytes) => cutRecentYears(parentBytes),
      },
    },
  ],
};

/** Keep the header and every observation from the slice's first year onward. */
export function cutRecentYears(parentBytes: Buffer): Buffer {
  const lines = parentBytes.toString("utf-8").split("\n");
  const header = lines[0] ?? "";
  const yearColumn = header.split("\t").findIndex((name) => name.trim() === "year");
  const kept = [header];
  for (const line of lines.slice(1)) {
    if (line.trim() === "") continue;
    const year = Number((line.split("\t")[yearColumn] ?? "").trim());
    if (Number.isFinite(year) && year >= QA_SLICE_FIRST_YEAR) kept.push(line);
  }
  return Buffer.from(`${kept.join("\n")}\n`, "utf-8");
}
