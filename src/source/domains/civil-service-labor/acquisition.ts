import type {
  AcquisitionPlan,
  AcquisitionRequest,
  EnactedTextRegion,
} from "../../core/index";

export const CIVIL_SERVICE_LABOR_AS_OF = "2026-09-06";
export const FEDERAL_SECTION_ARTIFACTS = {
  classification: "uscode-title5-section2102",
  exceptedService: "uscode-title5-section2103",
  appointment: "uscode-title5-section3304",
  removalAndAppeal: "uscode-title5-section7513",
  bargainingCoverage: "uscode-title5-section7102",
  managementRights: "uscode-title5-section7106",
  impasse: "uscode-title5-section7119",
  strikes: "uscode-title5-section7311",
} as const;

interface EdictSource {
  readonly artifactId: string;
  readonly jurisdictionKey: string;
  readonly provider: string;
  readonly url: string;
  readonly instrumentTitle: string;
  readonly enactingAuthority: string;
  readonly localPath: string;
  readonly regions: readonly [EnactedTextRegion, ...EnactedTextRegion[]];
  readonly length: number;
  readonly sha256: string;
}

export const EDICT_SOURCES: readonly EdictSource[] = [
  {
    artifactId: "ak-civil-service-statutes",
    jurisdictionKey: "US-AK",
    provider: "Alaska Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
    instrumentTitle: "Alaska Statutes, Title 39, Chapter 25",
    enactingAuthority: "Alaska State Legislature",
    localPath: "data/source/civil-service-labor/raw/ak-title39-ch25.html",
    regions: [
      {
        beginsWith: "Sec. 39.25.110. Exempt service.",
        endsWith:
          "Sec. 39.25.180. Status of present employees. [Repealed, � 78 ch 59 SLA 1982; � 20 ch 112 SLA 1982.]",
      },
    ],
    length: 39484,
    sha256: "a1accb6656d89a6070394d8010306f78745ce0ba8e58c85fe7e4076913ab2179",
  },
  {
    artifactId: "ak-public-employment-relations-statutes",
    jurisdictionKey: "US-AK",
    provider: "Alaska Legislature",
    url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=23.40.070&secEnd=23.40.260",
    instrumentTitle: "Alaska Statutes, Title 23, Chapter 40",
    enactingAuthority: "Alaska State Legislature",
    localPath: "data/source/civil-service-labor/raw/ak-title23-ch40.html",
    regions: [
      {
        beginsWith: "Sec. 23.40.070. Declaration of policy.",
        endsWith:
          "Sec. 23.40.260. Short title. AS 23.40.070 � 23.40.260 may be cited as the Public Employment Relations Act.",
      },
    ],
    length: 29949,
    sha256: "7453edd91b512154435c8f7494537b881c68aa4c32beb4f3110cbf113d714303",
  },
  {
    artifactId: "mn-civil-service-statutes",
    jurisdictionKey: "US-MN",
    provider: "Minnesota Office of the Revisor of Statutes",
    url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
    instrumentTitle: "Minnesota Statutes, Chapter 43A",
    enactingAuthority: "Minnesota Legislature",
    localPath: "data/source/civil-service-labor/raw/mn-chapter43a.html",
    regions: [
      {
        beginsWith:
          "43A.07 CLASSIFIED SERVICE. § Subdivision 1. Classification plan.",
        endsWith: "43A.34 RETIREMENT.",
      },
    ],
    length: 157086,
    sha256: "44dbae9a4121d7e489bae334f2ad80287a5d54d0352f0af8fc124576a9e1650f",
  },
  {
    artifactId: "mn-public-employment-labor-relations-statutes",
    jurisdictionKey: "US-MN",
    provider: "Minnesota Office of the Revisor of Statutes",
    url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
    instrumentTitle: "Minnesota Statutes, Chapter 179A",
    enactingAuthority: "Minnesota Legislature",
    localPath: "data/source/civil-service-labor/raw/mn-chapter179a.html",
    regions: [
      {
        beginsWith:
          "179A.06 EMPLOYEE RIGHTS AND OBLIGATIONS. § Subdivision 1. Expressing views.",
        endsWith: "179A.20 CONTRACTS.",
      },
    ],
    length: 94635,
    sha256: "867a0a678314e2b73e7cc439ef3a038b621b87e6e49879d18a5f1ffd8a9dc6c5",
  },
  {
    artifactId: "ne-classified-service-statutes",
    jurisdictionKey: "US-NE",
    provider: "Nebraska Legislature",
    url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=81-1316",
    instrumentTitle: "Nebraska Revised Statute 81-1316",
    enactingAuthority: "Nebraska Legislature",
    localPath: "data/source/civil-service-labor/raw/ne-81-1316.html",
    regions: [
      {
        beginsWith: "81-1316. State Personnel System; exemptions.",
        endsWith:
          "A state employee's career protections or coverage by personnel rules and regulations shall not be revoked by redesignation of the employee's position as a noncovered position without the prior written agreement of such employee.",
      },
    ],
    length: 4969,
    sha256: "7ab5412182a1456e9d727056a88915bb43f82c95a4ece9927b4d3d2c997ece6a",
  },
  {
    artifactId: "ne-bargaining-scope-statutes",
    jurisdictionKey: "US-NE",
    provider: "Nebraska Legislature",
    url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=48-816",
    instrumentTitle: "Nebraska Revised Statute 48-816",
    enactingAuthority: "Nebraska Legislature",
    localPath: "data/source/civil-service-labor/raw/ne-48-816.html",
    regions: [
      {
        beginsWith:
          "48-816. Preliminary proceedings; commission; powers; duties; collective bargaining; posttrial conference.",
        endsWith:
          "The purpose of such posttrial conference shall be to allow the commission to hear from the parties on those portions of the recommended decision and order which is not based upon or which mischaracterizes evidence in the record and to allow the commission to correct any such errors after having heard the matter in a conference setting in which all parties are represented.",
      },
    ],
    length: 10820,
    sha256: "70bb0ff29c6e90f56ea47ca51c7aa42da98c128b8a5c3ba4c199678c07c36711",
  },
  {
    artifactId: "ne-impasse-statutes",
    jurisdictionKey: "US-NE",
    provider: "Nebraska Legislature",
    url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=48-818",
    instrumentTitle: "Nebraska Revised Statute 48-818",
    enactingAuthority: "Nebraska Legislature",
    localPath: "data/source/civil-service-labor/raw/ne-48-818.html",
    regions: [
      {
        beginsWith:
          "48-818. Commission; findings; order; powers; duties; orders authorized; modification.",
        endsWith:
          "The commission shall provide an offset to the public employer when a lump-sum payment is due because benefits were paid in excess of the prevalent as determined under subdivision (2)(d) of this section or when benefits were paid below the prevalent as so determined but wages were above prevalent.",
      },
    ],
    length: 18093,
    sha256: "b642ae4b73f01ae126ba49b39c047fafded3ad786e9a8e38b06e755ca78a0b96",
  },
];

function federalSection(
  artifactId: string,
  section: string,
): AcquisitionRequest {
  const url = `https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section${section}&num=0&edition=prelim`;
  return {
    artifactId,
    provider:
      "Office of the Law Revision Counsel, U.S. House of Representatives",
    url,
    method: "GET",
    mediaType: "text/html",
    publisher: {
      statedVintage: `U.S. Code preliminary edition retrieved for corpus as of ${CIVIL_SERVICE_LABOR_AS_OF}`,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: "https://uscode.house.gov/",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/civil-service-labor/raw/uscode-5-${section}.html`,
  };
}

const federal = [
  federalSection(FEDERAL_SECTION_ARTIFACTS.classification, "2102"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.exceptedService, "2103"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.appointment, "3304"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.removalAndAppeal, "7513"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.bargainingCoverage, "7102"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.managementRights, "7106"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.impasse, "7119"),
  federalSection(FEDERAL_SECTION_ARTIFACTS.strikes, "7311"),
] as const;

function edictRequest(source: EdictSource): AcquisitionRequest {
  return {
    artifactId: source.artifactId,
    provider: source.provider,
    url: source.url,
    method: "GET",
    mediaType: "text/html",
    publisher: {
      statedVintage: `retrieved for corpus as of ${CIVIL_SERVICE_LABOR_AS_OF}`,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: source.url,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: source.jurisdictionKey,
        enactingAuthority: source.enactingAuthority,
        instrumentKind: "statute",
        instrumentTitle: source.instrumentTitle,
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: source.regions,
          extracted: { length: source.length, sha256: source.sha256 },
        },
      },
    },
    storage: "committed",
    localPath: source.localPath,
  };
}

/**
 * Kentucky's publisher responded with PDF bytes while advertising the statute
 * page URL, and Nebraska rate-limited the strike provision. Those captures are
 * not production-readable through the enacted-text boundary and are therefore
 * outside this wave's closed source set rather than being treated as evidence.
 */
export const ACTIVE_EDICT_SOURCES = EDICT_SOURCES;

export const CIVIL_SERVICE_LABOR_SOURCES = [
  ...federal,
  ...ACTIVE_EDICT_SOURCES.map(edictRequest),
] as const;

export function civilServiceLaborSource(artifactId: string) {
  return CIVIL_SERVICE_LABOR_SOURCES.find(
    (source) => source.artifactId === artifactId,
  );
}

export const CIVIL_SERVICE_LABOR_ACQUISITION: AcquisitionPlan = {
  domain: "civil-service-labor",
  requests: CIVIL_SERVICE_LABOR_SOURCES,
};
