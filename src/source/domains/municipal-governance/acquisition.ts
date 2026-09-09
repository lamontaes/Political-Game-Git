/** Exact official provisions already retrieved from the declared municipal corpus.
 * Each source is restricted to its reviewed enacted text. Wider research and
 * acquisition coverage is tracked separately; no publication-wide availability
 * claim or government-count ceiling is implied by these production declarations.
 */

import supplementalSources from "./supplemental-source-specs.json";

import type {
  AcquisitionPlan,
  AcquisitionRequest,
  ArtifactRights,
  EnactedTextRegion,
  LegalEdictInstrumentKind,
} from "../../core/index";

/**
 * One authority this domain reads, with everything a validator needs.
 *
 * `enacted` is the load-bearing part. A retrieved charter page is enacted text
 * inside a publisher's site — navigation, search widgets, amendment histories,
 * a copyright footer — and the doctrine reaches the provisions and none of the
 * rest. Each source declares the spans of its page that are enacted text; the
 * capability layer cuts those spans and hands a compiler nothing else. The
 * digest pins what the spans currently cut out, so a marker edit that widened
 * the scope fails the compile instead of enlarging what production may read.
 */
export interface MunicipalSourceSpec {
  readonly artifactId: string;
  readonly url: string;
  readonly provider: string;
  /** `US-XX`; a record's state is checked against this, never a prefix. */
  readonly jurisdictionKey: string;
  readonly enactingBody: string;
  readonly instrumentKind: LegalEdictInstrumentKind;
  /** The instrument's own title. Every citation must name exactly this. */
  readonly instrumentTitle: string;
  readonly localPath: string;
  readonly enacted: {
    readonly regions: readonly [EnactedTextRegion, ...EnactedTextRegion[]];
    readonly length: number;
    readonly sha256: string;
  };
}

export const MUNICIPAL_SOURCES: readonly MunicipalSourceSpec[] = [
  ...(supplementalSources as unknown as readonly MunicipalSourceSpec[]),
  {
    artifactId: "va-charlottesville-charter",
    url: "https://law.lis.virginia.gov/charters/charlottesville/",
    provider: "Virginia Law portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the General Assembly of Virginia",
    instrumentKind: "statute",
    instrumentTitle: "Charter of the City of Charlottesville, Virginia",
    localPath:
      "data/source/municipal-governance/raw/va-charlottesville-charter.html",
    enacted: {
      regions: [
        {
          beginsWith: "§ 1. Body politic and corporate name.",
          endsWith:
            "shall continue to be one body politic and corporate in fact and its name shall be the City of Charlottesville.",
        },
        {
          beginsWith:
            "§ 5. Elective officers; qualifications and terms of certain officers; form of government; corporate powers vested in city council.",
          endsWith:
            "their duties and liabilities shall be regulated by the general laws of the Commonwealth, not in conflict therewith.",
        },
        {
          beginsWith:
            "§ 5.01. City manager. Subject to general control by the council",
          endsWith:
            "the city manager shall have the powers vested in city managers in accordance with the general laws of the Commonwealth.",
        },
        {
          beginsWith:
            "§ 8. Vacancy in office of mayor or councilor; vacation of office.",
          endsWith:
            "such removal shall operate to vacate such mayor's or councilor's office.",
        },
        {
          beginsWith: "§ 9. Council--Mayor and vice-mayor.",
          endsWith:
            "but in no case shall they be entitled to a second vote on any question.",
        },
        {
          beginsWith: "§ 12. Same--Council meetings and rules.",
          endsWith:
            "except when it votes to hold an executive or closed session pursuant to the general laws of the Commonwealth.",
        },
        {
          beginsWith: "§ 19. Fiscal year; budget; levy of taxes.",
          endsWith:
            "The total amount of appropriations shall not exceed the estimated revenues of the city.",
        },
      ],
      length: 8069,
      sha256:
        "987953d252d08576409ce5abb45346ba252abadb992921011cbe8a47c52fc7ff",
    },
  },
  {
    artifactId: "va-richmond-charter",
    url: "https://law.lis.virginia.gov/charters/richmond/",
    provider: "Virginia Law portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the General Assembly of Virginia",
    instrumentKind: "statute",
    instrumentTitle: "Charter of the City of Richmond, Virginia",
    localPath: "data/source/municipal-governance/raw/va-richmond-charter.html",
    enacted: {
      regions: [
        {
          beginsWith: "§ 1.01. Incorporation.",
          endsWith:
            "may have a corporate seal which it may alter, renew or amend at its pleasure.",
        },
        {
          beginsWith:
            "§ 3.01. Election of councilmen; nomination of candidates.",
          endsWith:
            "Each council member elected in accordance with this section shall reside in the election district from which such member was elected throughout the member's term on the council.",
        },
        {
          beginsWith:
            "§ 4.01. Composition; compensation; appointment of members to office of profit. The council shall consist of nine members",
          endsWith:
            "be appointed to any office of profit under the government of the city.",
        },
        {
          beginsWith: "§ 4.07. Voting.",
          endsWith: "the ayes and noes shall be recorded in the journal.",
        },
        {
          beginsWith: "§ 4.09. Ordinances; form.",
          endsWith:
            "an ordinance shall take effect on the tenth day following its passage.",
        },
        {
          beginsWith: "§ 4.10. Procedure for passing ordinances.",
          endsWith:
            "all proceedings had as in the case of a newly introduced ordinance.",
        },
        {
          beginsWith: "§ 4.11. Emergency ordinances.",
          endsWith:
            "six affirmative votes shall be necessary for its adoption.",
        },
        {
          beginsWith:
            "§ 5.01. Mayor. The mayor shall be the chief executive officer of the city",
          endsWith:
            "The office of mayor shall be a full-time position with salary and expenses set by the council.",
        },
        {
          beginsWith:
            "§5.01.1. Chief administrative officer. The mayor shall appoint a chief administrative officer",
          endsWith:
            "The mayor shall set the salary of the chief administrative officer subject to the approval of a majority of the members of city council.",
        },
        {
          beginsWith: "§ 5.05. General duties; mayor.",
          endsWith:
            "however, the appointment of members of a redevelopment and housing authority in the city shall be made by the council; and",
        },
        {
          beginsWith: "§ 6.01. Fiscal and tax years.",
          endsWith:
            "The rates of all other taxes and levies, except on new sources of tax revenues, shall be fixed before the beginning of the tax year.",
        },
        {
          beginsWith: "§ 6.02. Submission.",
          endsWith: "(b) a budget message; and (c) a capital budget.",
        },
      ],
      length: 10181,
      sha256:
        "e487b419418df5411c10379205438674728635eb376520c502ead1aa91f26e67",
    },
  },
  {
    artifactId: "va-code-15-2-1427",
    url: "https://law.lis.virginia.gov/vacode/title15.2/chapter14/section15.2-1427/",
    provider: "Virginia Law portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the General Assembly of Virginia",
    instrumentKind: "statute",
    instrumentTitle:
      "Code of Virginia § 15.2-1427, Adoption of ordinances and resolutions generally; amending or repealing ordinances",
    localPath: "data/source/municipal-governance/raw/va-code-15-2-1427.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "§ 15.2-1427 . Adoption of ordinances and resolutions generally; amending or repealing ordinances.",
          endsWith:
            "but, if no effective date is specified, then such ordinance shall become effective upon adoption.",
        },
      ],
      length: 1529,
      sha256:
        "98d137276e4dd61e225ae9f3bdd12687252a5950795428f850aad010772fa5e8",
    },
  },
  {
    artifactId: "va-code-15-2-1415",
    url: "https://law.lis.virginia.gov/vacode/title15.2/chapter14/section15.2-1415/",
    provider: "Virginia Law portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the General Assembly of Virginia",
    instrumentKind: "statute",
    instrumentTitle:
      "Code of Virginia § 15.2-1415, At what meetings governing body may act",
    localPath: "data/source/municipal-governance/raw/va-code-15-2-1415.html",
    enacted: {
      regions: [
        {
          beginsWith: "§ 15.2-1415 . At what meetings governing body may act.",
          endsWith:
            "Meetings of governing bodies shall be subject to the applicable provisions of the Virginia Freedom of Information Act",
        },
      ],
      length: 552,
      sha256:
        "b367549341a8bb11891bef2c9827dc62a3f571b7184b9483de0d7b529d0dc7bf",
    },
  },
  {
    artifactId: "nv-carson-city-charter",
    url: "https://www.leg.state.nv.us/Division/Legal/LawLibrary/CityCharters/CtyCCCC.html",
    provider: "Legislative Counsel Bureau, Nevada Legislature",
    jurisdictionKey: "US-NV",
    enactingBody: "the Legislature of the State of Nevada",
    instrumentKind: "statute",
    instrumentTitle: "Charter of Carson City, Nevada",
    localPath:
      "data/source/municipal-governance/raw/nv-carson-city-charter.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "AN ACT relating to Carson City; consolidating Ormsby County and Carson City into one municipal government to be known as Carson City",
          endsWith:
            "shall be and constitute a body politic and corporate by the name and style of",
        },
        {
          beginsWith:
            "Sec. 2.010 Board of Supervisors: Qualifications; election; term of office.",
          endsWith:
            "Ends at 11:59 p.m. on the day immediately preceding the first Monday in January following the general election.",
        },
        {
          beginsWith: "Sec. 2.050 Meetings: Quorum.",
          endsWith:
            "the sessions and all proceedings of the Board must be public.",
        },
        {
          beginsWith:
            "Sec. 2.110 Ordinances: Enactment procedure; emergency ordinances.",
          endsWith:
            "The Clerk shall record all ordinances in a book kept for that purpose together with the affidavits of publication by the publisher.",
        },
        {
          beginsWith: "Sec. 3.010 Mayor: Duties; salary.",
          endsWith:
            "The Manager may appoint such clerical personnel and create such administrative positions as he or she considers necessary, subject to the review and approval of the Board.",
        },
      ],
      length: 8943,
      sha256:
        "831b2301275e31a80cdf691c60745c600d492176f0a9491ca0582b54f47f6f38",
    },
  },
];

function rightsFor(source: MunicipalSourceSpec): ArtifactRights {
  return {
    status: "public-domain-government-edict",
    declaredLicense: null,
    attributionRequired: "UNKNOWN",
    edict: {
      jurisdictionKey: source.jurisdictionKey,
      enactingAuthority: source.enactingBody,
      instrumentKind: source.instrumentKind,
      instrumentTitle: source.instrumentTitle,
      doctrine: "us-government-edicts",
      contentScope: "enacted-legal-text-only",
      scope: {
        boundaryKind: "normalized-text-regions",
        regions: source.enacted.regions,
        extracted: {
          length: source.enacted.length,
          sha256: source.enacted.sha256,
        },
      },
    },
  };
}

function requestFor(source: MunicipalSourceSpec): AcquisitionRequest {
  return {
    artifactId: source.artifactId,
    provider: source.provider,
    url: source.url,
    method: "GET",
    mediaType: "text/html",
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: source.url,
    },
    rights: rightsFor(source),
    storage: "committed",
    localPath: source.localPath,
  };
}

export const MUNICIPAL_ACQUISITION_PLAN: AcquisitionPlan = {
  domain: "municipal-governance",
  requests: MUNICIPAL_SOURCES.map(requestFor),
};

/** One source by id, or a throw naming what was asked for. */
export function municipalSourceById(artifactId: string): MunicipalSourceSpec {
  const source = MUNICIPAL_SOURCES.find(
    (candidate) => candidate.artifactId === artifactId,
  );
  if (!source) {
    throw new Error(
      `No municipal-governance source is declared as "${artifactId}".`,
    );
  }
  return source;
}
