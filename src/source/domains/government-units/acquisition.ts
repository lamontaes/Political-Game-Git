/**
 * What the government-units domain retrieves, and from where.
 *
 * The target is the Census Bureau's Government Units Survey public-use listing —
 * the official public-use listing of active state and local government units
 * (42A §1). The zip is the artifact; the delimited member inside it is a
 * distinct member with its own digest, because a container and its contents are
 * different bytes.
 *
 * The exact 2025 dataset URL and the member's column layout are confirmed
 * against the publisher at acquisition time. This coding environment's outbound
 * proxy denies census.gov (the retrieval fails at the CONNECT with an HTTP 403
 * policy denial), so the artifact is not committed and the domain is gated; see
 * the production gate in `index.ts`. The request is declared here so that a
 * future run in a network environment that reaches census.gov can pin the real
 * artifact through the ordinary `source:acquire` pipeline with no code change.
 */

import type { AcquisitionPlan } from "../../core/index";

/** The Government Units Survey public-use file landing page. */
export const GOVERNMENT_UNITS_PUBLIC_USE_PAGE =
  "https://www.census.gov/programs-surveys/gus/data/publicusefiles.html";

/**
 * The conventional 2025 Government Units listing archive.
 *
 * Pinned as the acquisition target; the precise path is confirmed against the
 * public-use page above at acquisition time.
 */
export const GOVERNMENT_UNITS_ZIP_URL =
  "https://www2.census.gov/programs-surveys/gus/datasets/2025/gov_units_2025.zip";

export const GOVERNMENT_UNITS_ZIP_ARTIFACT =
  "census-gov-units-2025-listing-zip";
export const GOVERNMENT_UNITS_LISTING_MEMBER = "gov_units_2025.txt";

export const governmentUnitsAcquisition: AcquisitionPlan = {
  domain: "government-units",
  requests: [
    {
      artifactId: GOVERNMENT_UNITS_ZIP_ARTIFACT,
      provider: "U.S. Census Bureau, Governments Division",
      url: GOVERNMENT_UNITS_ZIP_URL,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: GOVERNMENT_UNITS_LISTING_MEMBER,
      publisher: {
        statedVintage: "2025",
        releaseDate: null,
        schemaVersion: "2025 Government Units Survey public-use listing",
        documentationUrl: GOVERNMENT_UNITS_PUBLIC_USE_PAGE,
      },
      rights: {
        // A U.S. federal government work is public domain by 17 U.S.C. §105;
        // this is a legal fact about the publisher, not an inference from the
        // file having been reachable.
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/government-units/raw/gov_units_2025.zip",
    },
  ],
};
