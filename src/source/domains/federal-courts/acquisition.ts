/**
 * The two statutory artifacts this domain reads.
 *
 * Title 28 establishes the courts of appeals, the judicial districts and their
 * divisions, and designates the bankruptcy courts. Title 48 establishes the
 * three territorial district courts, which Title 28 does not create. Both come
 * from the Office of the Law Revision Counsel's release points, so the corpus
 * can name the exact public law it is current through.
 */

import type { AcquisitionPlan } from "../../core/index";

/**
 * The release point this corpus is compiled from: the U.S. Code current
 * through Public Law 119-102.
 */
export const USC_RELEASE_POINT = "119-102";

export const TITLE_28_ARTIFACT = "uscode-title28-119-102-zip";
export const TITLE_48_ARTIFACT = "uscode-title48-119-102-zip";
export const TITLE_28_MEMBER = "usc28.xml";
export const TITLE_48_MEMBER = "usc48.xml";

export const federalCourtsAcquisition: AcquisitionPlan = {
  domain: "federal-courts",
  requests: [
    {
      artifactId: TITLE_28_ARTIFACT,
      provider:
        "Office of the Law Revision Counsel, U.S. House of Representatives",
      url: `https://uscode.house.gov/download/releasepoints/us/pl/119/102/xml_usc28@${USC_RELEASE_POINT}.zip`,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: TITLE_28_MEMBER,
      publisher: {
        statedVintage: `U.S. Code release point ${USC_RELEASE_POINT}`,
        releaseDate: null,
        schemaVersion: "United States Legislative Markup (USLM)",
        documentationUrl: "https://uscode.house.gov/download/download.shtml",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/federal-courts/raw/xml_usc28.zip",
    },
    {
      artifactId: TITLE_48_ARTIFACT,
      provider:
        "Office of the Law Revision Counsel, U.S. House of Representatives",
      url: `https://uscode.house.gov/download/releasepoints/us/pl/119/102/xml_usc48@${USC_RELEASE_POINT}.zip`,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: TITLE_48_MEMBER,
      publisher: {
        statedVintage: `U.S. Code release point ${USC_RELEASE_POINT}`,
        releaseDate: null,
        schemaVersion: "United States Legislative Markup (USLM)",
        documentationUrl: "https://uscode.house.gov/download/download.shtml",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/federal-courts/raw/xml_usc48.zip",
    },
  ],
};
