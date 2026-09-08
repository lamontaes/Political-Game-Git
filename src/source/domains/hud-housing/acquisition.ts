/**
 * The two HUD workbooks.
 *
 * #71 committed a hand-authored seven-record JSON file and called it raw source
 * from huduser.gov. These are the actual published workbooks. HUD ships them as
 * Excel and offers nothing else machine-readable without an API token, which is
 * why the core has a workbook reader at all.
 */

import type { AcquisitionPlan } from "../../core/index";

export const FMR_ARTIFACT = "hud-fy2025-fair-market-rents-xlsx";
export const INCOME_LIMIT_ARTIFACT = "hud-fy2025-section8-income-limits-xlsx";

export const FMR_SHEET = "FY25_FMRs";
export const INCOME_LIMIT_SHEET = "Section8-FY25";

export const hudHousingAcquisition: AcquisitionPlan = {
  domain: "hud-housing",
  requests: [
    {
      artifactId: FMR_ARTIFACT,
      provider: "U.S. Department of Housing and Urban Development, HUD User",
      url: "https://www.huduser.gov/portal/datasets/fmr/fmr2025/FY25_FMRs.xlsx",
      method: "GET",
      mediaType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      publisher: {
        statedVintage: "FY2025",
        releaseDate: null,
        schemaVersion: "FY2025 Fair Market Rents, county level",
        documentationUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/hud-housing/raw/FY25_FMRs.xlsx",
    },
    {
      artifactId: INCOME_LIMIT_ARTIFACT,
      provider: "U.S. Department of Housing and Urban Development, HUD User",
      url: "https://www.huduser.gov/portal/datasets/il/il25/Section8-FY25.xlsx",
      method: "GET",
      mediaType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      publisher: {
        statedVintage: "FY2025",
        releaseDate: null,
        schemaVersion: "FY2025 Section 8 Income Limits, county level",
        documentationUrl: "https://www.huduser.gov/portal/datasets/il.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/hud-housing/raw/Section8-FY25.xlsx",
    },
  ],
};
