import type { AcquisitionPlan } from "../../core/index";
import {
  ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
  ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  ALASKA_SESSION_LAW_SELECTION_PREDICATE,
  cutAlaskaSessionLawEvidence,
} from "./session-law";

export const FISCAL_AUTHORITY_AS_OF = "2026-09-09";

const ALASKA_SESSION_LAW_URL =
  "https://www.akleg.gov/pdf/billfiles/SLAs/SLA%201985/CH%2074%20SLA%201985.pdf";

const ALASKA_SESSION_LAW_PARENT = {
  artifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  provider: "Alaska State Legislature",
  url: ALASKA_SESSION_LAW_URL,
  method: "GET" as const,
  mediaType: "application/pdf",
  publisher: {
    statedVintage: "ch. 74 SLA 1985",
    releaseDate: null,
    schemaVersion: null,
    documentationUrl: "https://www.akleg.gov/pdf/billfiles/SLAs/SLA%201985/",
  },
  rights: {
    status: "UNKNOWN" as const,
    declaredLicense: null,
    attributionRequired: "UNKNOWN" as const,
  },
  storage: "cached-not-committed" as const,
  localPath: null,
  cachePath: ".source-cache/state-local-fiscal-authority/ak-ch-74-sla-1985.pdf",
};

export const ALASKA_SESSION_LAW_EXTRACT = {
  artifactId: ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
  provider: "Alaska State Legislature",
  url: ALASKA_SESSION_LAW_URL,
  method: "GET" as const,
  mediaType: "text/plain; charset=utf-8",
  publisher: ALASKA_SESSION_LAW_PARENT.publisher,
  rights: {
    status: "public-domain-government-edict" as const,
    declaredLicense: null,
    attributionRequired: false,
    edict: {
      jurisdictionKey: "US-AK",
      enactingAuthority: "Alaska State Legislature",
      instrumentKind: "statute" as const,
      instrumentTitle: "Chapter 74, Session Laws of Alaska 1985",
      doctrine: "us-government-edicts" as const,
      contentScope: "enacted-legal-text-only" as const,
      scope: {
        boundaryKind: "normalized-text-regions" as const,
        regions: [
          {
            beginsWith: "Sec. 29.45.010. PROPERTY TAX.",
            endsWith:
              "(c) If a tax is levied on real property or on personal property, the tax must be assessed, levied, and collected as provided in this chapter.",
          },
          {
            beginsWith: "Sec. 29 .45.090. TAX LIMITATION .",
            endsWith:
              "All property on which a tax is levied shall be taxed a t the same rate during the year .",
          },
          {
            beginsWith: "Sec. 29.45.650. SALES AND USE TAX.",
            endsWith:
              "This subsection applies to home rule and general law municipal- ities.",
          },
          {
            beginsWith:
              "Sec. 29.45.670. REFERENDUM, ADOPTION, AND MODIFICATION.",
            endsWith:
              "approved by ordinance does not take effect until ratifie d by a major - ity of the voters at an election.",
          },
          {
            beginsWith: "Sec. 29.45 . 700. POWER OF LEVY .",
            endsWith:
              "(c) A city outside a borough may levy and collect sales and use taxes in the manner provided for boroughs.",
          },
          {
            beginsWith: "Sec. 29 . 4 7. 180 . GENERAL OBLIGATION BONDS.",
            endsWith:
              "Any municipal voter may vote in the bond elec - tion, except as otherwise provided by law.",
          },
          {
            beginsWith: "* Sec. 90. This Act takes effect January 1, 1986.",
            endsWith: "* Sec. 90. This Act takes effect January 1, 1986.",
          },
        ],
        extracted: {
          length: 3_697,
          sha256:
            "c811d6280309a8aa4c69c4c4cbab91b0b7f29d1990ef354b91c86dd376ee30e6",
        },
      },
    },
  },
  storage: "derived-qa-slice" as const,
  localPath:
    "data/source/state-local-fiscal-authority/raw/ak-ch-74-sla-1985.selected-pages.txt",
  sliceOf: {
    parentArtifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
    selectionPredicate: ALASKA_SESSION_LAW_SELECTION_PREDICATE,
    cut: cutAlaskaSessionLawEvidence,
  },
};

export const FISCAL_AUTHORITY_STATUTE_SOURCES = [
  {
    artifactId: "ak-municipal-sales-use-tax-statutes",
    provider: "Alaska State Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.45.650&secEnd=29.45.710",
    method: "GET" as const,
    mediaType: "text/html; charset=windows-1252",
    publisher: {
      statedVintage: `Alaska Statutes retrieved for corpus as of ${FISCAL_AUTHORITY_AS_OF}`,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: "https://www.akleg.gov/basis/statutes.asp",
    },
    rights: {
      status: "public-domain-government-edict" as const,
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-AK",
        enactingAuthority: "Alaska State Legislature",
        instrumentKind: "statute" as const,
        instrumentTitle:
          "Alaska Statutes §§ 29.45.650-.710, Municipal Sales and Use Taxes",
        doctrine: "us-government-edicts" as const,
        contentScope: "enacted-legal-text-only" as const,
        scope: {
          boundaryKind: "normalized-text-regions" as const,
          regions: [
            {
              beginsWith: "Sec. 29.45.650. Sales and use tax.",
              endsWith: "Article 6. Mobile Telecommunications Sourcing Act.",
            },
          ],
          extracted: {
            length: 10_715,
            sha256:
              "a683b51c3f2d6bb5d2851c607d94dbadbc19a45caab23b62fcec3883fd9b166e",
          },
        },
      },
    },
    storage: "committed" as const,
    localPath:
      "data/source/state-local-fiscal-authority/raw/ak-29.45.650-710.html",
  },
  {
    artifactId: "ak-municipal-property-tax-statutes",
    provider: "Alaska State Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.45.010&secEnd=29.45.100",
    method: "GET" as const,
    mediaType: "text/html; charset=windows-1252",
    publisher: {
      statedVintage: `Alaska Statutes retrieved for corpus as of ${FISCAL_AUTHORITY_AS_OF}`,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: "https://www.akleg.gov/basis/statutes.asp",
    },
    rights: {
      status: "public-domain-government-edict" as const,
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-AK",
        enactingAuthority: "Alaska State Legislature",
        instrumentKind: "statute" as const,
        instrumentTitle:
          "Alaska Statutes §§ 29.45.010-.100, Municipal Property Taxes",
        doctrine: "us-government-edicts" as const,
        contentScope: "enacted-legal-text-only" as const,
        scope: {
          boundaryKind: "normalized-text-regions" as const,
          regions: [
            {
              beginsWith: "Sec. 29.45.010. Property tax.",
              endsWith:
                "Taxes to pay or secure the payment of principal and interest on bonds may be levied without limitation as to rate or amount, regardless of whether the bonds are in default or in danger of default.",
            },
          ],
          extracted: {
            length: 59_974,
            sha256:
              "216ee9f581002e532e1651055117bd5e3d67498e6dd5b43876e0d49c124f4e27",
          },
        },
      },
    },
    storage: "committed" as const,
    localPath:
      "data/source/state-local-fiscal-authority/raw/ak-29.45.010-100.html",
  },
  {
    artifactId: "ak-municipal-general-obligation-bond-statutes",
    provider: "Alaska State Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.47.180&secEnd=29.47.200",
    method: "GET" as const,
    mediaType: "text/html; charset=windows-1252",
    publisher: {
      statedVintage: `Alaska Statutes retrieved for corpus as of ${FISCAL_AUTHORITY_AS_OF}`,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: "https://www.akleg.gov/basis/statutes.asp",
    },
    rights: {
      status: "public-domain-government-edict" as const,
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-AK",
        enactingAuthority: "Alaska State Legislature",
        instrumentKind: "statute" as const,
        instrumentTitle:
          "Alaska Statutes §§ 29.47.180-.200, Municipal General Obligation Bonds",
        doctrine: "us-government-edicts" as const,
        contentScope: "enacted-legal-text-only" as const,
        scope: {
          boundaryKind: "normalized-text-regions" as const,
          regions: [
            {
              beginsWith: "Sec. 29.47.180. General obligation bonds.",
              endsWith:
                "This subsection applies to home rule and general law municipalities.",
            },
          ],
          extracted: {
            length: 1_830,
            sha256:
              "e111bdabae50de1a4e118e1b6cfc2ec1de6186ed7cd66795006920f3af5416ef",
          },
        },
      },
    },
    storage: "committed" as const,
    localPath:
      "data/source/state-local-fiscal-authority/raw/ak-29.47.180-200.html",
  },
] as const;

export const FISCAL_AUTHORITY_SOURCES = [
  ...FISCAL_AUTHORITY_STATUTE_SOURCES,
  ALASKA_SESSION_LAW_EXTRACT,
] as const;

export const FISCAL_AUTHORITY_ACQUISITION: AcquisitionPlan = {
  domain: "state-local-fiscal-authority",
  requests: [
    ALASKA_SESSION_LAW_PARENT,
    ALASKA_SESSION_LAW_EXTRACT,
    ...FISCAL_AUTHORITY_STATUTE_SOURCES,
  ],
};
