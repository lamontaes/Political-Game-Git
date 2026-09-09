import type { AcquisitionPlan } from "../../core/index";

export const FISCAL_AUTHORITY_AS_OF = "2026-09-09";

export const FISCAL_AUTHORITY_SOURCES = [
  {
    artifactId: "ak-municipal-sales-use-tax-statutes",
    provider: "Alaska State Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.45.650&secEnd=29.45.710",
    method: "GET" as const,
    mediaType: "text/html",
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
            length: 10_716,
            sha256:
              "55bd200a9cb3a62ca9c555f2ab862b2ba2483bde005c4c9063d86ea82f38997a",
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
    mediaType: "text/html",
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
            length: 59_978,
            sha256:
              "a842337b0e086cd195b9c795f070dedca36d7a8c29263034492e634aceb10f49",
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
    mediaType: "text/html",
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

export const FISCAL_AUTHORITY_ACQUISITION: AcquisitionPlan = {
  domain: "state-local-fiscal-authority",
  requests: FISCAL_AUTHORITY_SOURCES,
};
