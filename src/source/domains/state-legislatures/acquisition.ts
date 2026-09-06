/**
 * What this domain retrieves, from whom, and which part of it is law.
 *
 * One request per authority actually read, named for the provision it carries
 * rather than for the state, because several states needed a second instrument:
 * a constitution that fixes a chamber's size is one artifact, and a
 * constitution that delegates the size to the legislature plus the statute that
 * then fixes it is two. Minnesota is the clear case — its constitution says the
 * number "shall be prescribed by law", so the number is in Minn. Stat. 2.021
 * and nowhere else, and a record that cited only the constitution for it would
 * be citing a provision that does not say it.
 *
 * Every request here retrieved successfully as static bytes at compile time.
 * The forty-odd states absent from this list are absent for a reason recorded
 * per state in `declarations.ts` — most often that the publisher serves its
 * constitution only as a client-rendered application, refuses a non-browser
 * client, or offers it only as a PDF this substrate has no parser for. None of
 * those is a fact about the state's legislature, and none of them is allowed to
 * become one.
 *
 * This list is also the domain's acquisition lineage in the strong sense: it is
 * the closed set of authorities the compiler and the validator accept evidence
 * from, and the structured identity — jurisdiction, instrument kind, instrument
 * title, publisher, retrieval URL — that a record's own claims are checked
 * against. Nothing here is inferred from an artifact id.
 */

import type {
  AcquisitionRequest,
  ArtifactRights,
  EnactedTextRegion,
  LegalEdictInstrumentKind,
} from "../../core/index";

/**
 * One authority, with everything a validator needs to refuse an impostor.
 *
 * `enacted` is the part that is not bookkeeping. A retrieved page is a state
 * constitution wrapped in a publisher's site: navigation, search widgets,
 * revisor's notes, annotation blocks, case citations, a copyright footer. The
 * edicts doctrine reaches the enacted provisions and none of the rest, so each
 * source declares the spans of its page that are enacted text, and the
 * capability layer hands a compiler those spans and nothing else. The digest
 * and length pin what those spans currently cut out, so a marker edit that
 * quietly widened the scope fails the next compile rather than enlarging what
 * production may read.
 */
interface StateSourceSpec {
  readonly artifactId: string;
  readonly url: string;
  readonly provider: string;
  /** `US-XX`. A record's jurisdiction is checked against this, never a prefix. */
  readonly jurisdictionKey: string;
  readonly enactingBody: string;
  readonly instrumentKind: LegalEdictInstrumentKind;
  /** Every transcription citing this artifact must name exactly this title. */
  readonly instrumentTitle: string;
  readonly localPath: string;
  readonly enacted: {
    readonly regions: readonly [EnactedTextRegion, ...EnactedTextRegion[]];
    readonly length: number;
    readonly sha256: string;
  };
}

/** The authorities this domain read, in a stable order. */
export const STATE_LEGISLATURE_SOURCES: readonly StateSourceSpec[] = [
  {
    artifactId: "ak-constitution",
    url: "https://ltgov.alaska.gov/information/alaskas-constitution/",
    provider: "Office of the Lieutenant Governor, State of Alaska",
    jurisdictionKey: "US-AK",
    enactingBody: "the people of Alaska",
    instrumentKind: "constitution",
    instrumentTitle: "The Constitution of the State of Alaska",
    localPath: "data/source/state-legislatures/raw/ak-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "1. Legislative Power; Membership The legislative power of the State is vested in a legislature",
          endsWith:
            "One-half of the senators shall be elected every two years.",
        },
      ],
      length: 885,
      sha256:
        "0589da7af91cf79ba8771bbae975e5e795695444a4b7975ce84596ea1192d30c",
    },
  },
  {
    artifactId: "ca-constitution-article-4",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&division=&title=&part=&chapter=&article=IV",
    provider: "California Legislative Counsel of California",
    jurisdictionKey: "US-CA",
    enactingBody: "the people of California",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of California, Article IV",
    localPath:
      "data/source/state-legislatures/raw/ca-constitution-article-4.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "SEC. 1. The legislative power of this State is vested in the California Legislature",
          endsWith: "the powers of initiative and referendum.",
        },
        {
          beginsWith:
            "SEC. 2. (a) (1) The Senate has a membership of 40 Senators elected for 4-year terms",
          endsWith: "in any combination of terms.",
        },
      ],
      length: 667,
      sha256:
        "3532f1330dca87753ef89d94e557fd04fa49bc6a79c7005833ec36c515f59954",
    },
  },
  {
    artifactId: "de-constitution-article-2",
    url: "https://delcode.delaware.gov/constitution/constitution-03.shtml",
    provider: "Delaware Code, Office of the Delaware Code Revisors",
    jurisdictionKey: "US-DE",
    enactingBody: "the people of Delaware",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Delaware, Article II",
    localPath:
      "data/source/state-legislatures/raw/de-constitution-article-2.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "§ 1. General Assembly to hold legislative power; composition.",
          endsWith:
            "which shall consist of a Senate and House of Representatives.",
        },
        {
          beginsWith:
            "§ 2. Composition of House and Senate; terms of office; districts; election.",
          endsWith:
            "in Sussex County, 7 Senatorial Districts from 1 to 7 inclusive.",
        },
      ],
      length: 1194,
      sha256:
        "59789ed0914ef3dcdd80967be6c950de2ab36a3468edbf0d757446997c1c82df",
    },
  },
  {
    artifactId: "fl-constitution",
    url: "https://www.flsenate.gov/Laws/Constitution",
    provider: "The Florida Senate",
    jurisdictionKey: "US-FL",
    enactingBody: "the people of Florida",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Florida",
    localPath: "data/source/state-legislatures/raw/fl-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "SECTION 1. Composition. — The legislative power of the state shall be vested",
          endsWith:
            "composed of one member elected from each representative district.",
        },
        {
          beginsWith: "SECTION 15. Terms and qualifications of legislators.",
          endsWith:
            "shall have resided in the state for a period of two years prior to election.",
        },
      ],
      length: 1128,
      sha256:
        "80342972f9cb55f3ddf198a16500b0c09f7c05bf50926d349f9d71fff83f0dc6",
    },
  },
  {
    artifactId: "hi-constitution",
    url: "https://lrb.hawaii.gov/constitution/",
    provider: "Hawaii Legislative Reference Bureau",
    jurisdictionKey: "US-HI",
    enactingBody: "the people of Hawaii",
    instrumentKind: "constitution",
    instrumentTitle: "The Constitution of the State of Hawaii",
    localPath: "data/source/state-legislatures/raw/hi-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Article III The Legislature LEGISLATIVE POWER Section 1.",
          endsWith: "or the Constitution of the United States.",
        },
        {
          beginsWith:
            "COMPOSITION OF SENATE Section 2. The senate shall be composed of twenty-five members",
          endsWith: "shall be as set forth in the Schedule.",
        },
        {
          beginsWith: "COMPOSITION OF HOUSE OF REPRESENTATIVES Section 3.",
          endsWith: "shall be as set forth in the Schedule.",
        },
      ],
      length: 1031,
      sha256:
        "8d6020b766fc360ccefaa3ed69e095ad34a18b5ec8be1eddce13ad540b88b5c4",
    },
  },
  {
    artifactId: "id-constitution-article-3-section-2",
    url: "https://legislature.idaho.gov/statutesrules/idconst/artiii/sect2/",
    provider: "Idaho State Legislature",
    jurisdictionKey: "US-ID",
    enactingBody: "the people of Idaho",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Idaho, Article III",
    localPath:
      "data/source/state-legislatures/raw/id-constitution-article-3-section-2.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Section 2. Membership of house and senate. (1) Following the decennial census of 2020",
          endsWith: "be divided by law.",
        },
      ],
      length: 491,
      sha256:
        "f2f0c3f15e7d5a822d04cb6c762085d081369aba548fa8bd804ee65212415b0c",
    },
  },
  {
    artifactId: "il-constitution-article-4",
    url: "https://www.ilga.gov/commission/lrb/con4.htm",
    provider: "Illinois General Assembly, Legislative Reference Bureau",
    jurisdictionKey: "US-IL",
    enactingBody: "the people of Illinois",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Illinois, Article IV",
    localPath:
      "data/source/state-legislatures/raw/il-constitution-article-4.html",
    enacted: {
      regions: [
        {
          beginsWith: "SECTION 1. LEGISLATURE - POWER AND STRUCTURE",
          endsWith: "118 Representative Districts.",
        },
        {
          beginsWith:
            "SECTION 2. LEGISLATIVE COMPOSITION (a) One Senator shall be elected",
          endsWith: "for a term of two years.",
        },
      ],
      length: 1078,
      sha256:
        "5560dd038c84258a13f29c17d444a1764dcb287f79ce6e0f7558370bf8428fc0",
    },
  },
  {
    artifactId: "ma-constitution",
    url: "https://malegislature.gov/Laws/Constitution",
    provider: "The 194th General Court of the Commonwealth of Massachusetts",
    jurisdictionKey: "US-MA",
    enactingBody: "the people of Massachusetts",
    instrumentKind: "constitution",
    instrumentTitle:
      "Constitution of the Commonwealth of Massachusetts, with Articles of Amendment",
    localPath: "data/source/state-legislatures/raw/ma-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "The enumeration aforesaid shall determine the apportionment of representatives for the periods between the taking of the census.",
          endsWith: "be considered as part of the county of Plymouth",
        },
        {
          beginsWith:
            "The enumeration aforesaid shall determine the apportionment of senators for the periods between the taking of the census.",
          endsWith: "no town or ward of a city shall be divided therefor",
        },
      ],
      length: 1223,
      sha256:
        "00408f75caef0121da4d60bb291b81bf6e3811b0fcb16ff546174b9e2cc26638",
    },
  },
  {
    artifactId: "mn-constitution",
    url: "https://www.revisor.mn.gov/constitution/",
    provider: "Minnesota Office of the Revisor of Statutes",
    jurisdictionKey: "US-MN",
    enactingBody: "the people of Minnesota",
    instrumentKind: "constitution",
    instrumentTitle: "The Minnesota Constitution",
    localPath: "data/source/state-legislatures/raw/mn-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "ARTICLE IV LEGISLATIVE DEPARTMENT Section 1. Composition of legislature.",
          endsWith: "in proportion to the population thereof.",
        },
      ],
      length: 428,
      sha256:
        "8c73816e7175eb5540800e96dbe3233455a500e1612b6bdf5af426753f2397e5",
    },
  },
  {
    artifactId: "mn-statutes-2-021",
    url: "https://www.revisor.mn.gov/statutes/cite/2.021",
    provider: "Minnesota Office of the Revisor of Statutes",
    jurisdictionKey: "US-MN",
    enactingBody: "the Minnesota Legislature",
    instrumentKind: "statute",
    instrumentTitle:
      "Minnesota Statutes, section 2.021 — Number of senators and representatives",
    localPath: "data/source/state-legislatures/raw/mn-statutes-2-021.html",
    enacted: {
      regions: [
        {
          beginsWith: "2.021 NUMBER OF MEMBERS. For each legislature",
          endsWith: "the house of representatives is composed of 134 members.",
        },
      ],
      length: 192,
      sha256:
        "08e4872393e65f56ec6ddeb321733f1fba78c031a5ae05adc46d0545a7d0f5dc",
    },
  },
  {
    artifactId: "nc-constitution-article-2",
    url: "https://www.ncleg.gov/Laws/Constitution/Article2",
    provider: "North Carolina General Assembly",
    jurisdictionKey: "US-NC",
    enactingBody: "the people of North Carolina",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of North Carolina, Article II",
    localPath:
      "data/source/state-legislatures/raw/nc-constitution-article-2.html",
    enacted: {
      regions: [
        {
          beginsWith: "ARTICLE II LEGISLATIVE Section 1. Legislative power.",
          endsWith: "The Representatives shall be elected from districts.",
        },
      ],
      length: 1553,
      sha256:
        "daffe59aa883f6c9d6f6fb64fb9f9abbc06dae0921b760353f8876a3cbbafe85",
    },
  },
  {
    artifactId: "ne-constitution-article-3-section-1",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-1",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska, Article III",
    localPath:
      "data/source/state-legislatures/raw/ne-constitution-article-3-section-1.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "III-1. Legislative authority; how vested; power of initiative; power of referendum.",
          endsWith: "which power shall be called the power of initiative.",
        },
      ],
      length: 408,
      sha256:
        "d959a375583bde1ebd8e9389b43d3315c96e51eac154c78c0810feacf2bcffc7",
    },
  },
  {
    artifactId: "ne-constitution-article-3-section-6",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-6",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska, Article III",
    localPath:
      "data/source/state-legislatures/raw/ne-constitution-article-3-section-6.html",
    enacted: {
      regions: [
        {
          beginsWith: "III-6. Legislature; number of members; annual sessions.",
          endsWith: "as may be otherwise provided by law.",
        },
      ],
      length: 288,
      sha256:
        "26aac7f7c92ddd405baadadb97e61fa8a52a6f59fc7bd6065a40cdceb9105be2",
    },
  },
  {
    artifactId: "nv-constitution",
    url: "https://www.leg.state.nv.us/const/nvconst.html",
    provider: "Nevada Legislature, Legislative Counsel Bureau",
    jurisdictionKey: "US-NV",
    enactingBody: "the people of Nevada",
    instrumentKind: "constitution",
    instrumentTitle: "The Constitution of the State of Nevada",
    localPath: "data/source/state-legislatures/raw/nv-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Section. 1. Legislative power vested in senate and assembly.",
          endsWith: "shall be held at the seat of government of the State.",
        },
      ],
      length: 303,
      sha256:
        "b237301bf9a10bf623fe7b69a2958da4d35cf99c9c661655cefd5396a015928e",
    },
  },
  {
    artifactId: "oh-constitution-article-2",
    url: "https://codes.ohio.gov/ohio-constitution/article-2",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "Ohio Constitution, Article II",
    localPath:
      "data/source/state-legislatures/raw/oh-constitution-article-2.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "The legislative power of the state shall be vested in a general assembly consisting of a senate and house of representatives",
          endsWith:
            "shall be deemed limitations on the power of the people to enact laws.",
        },
        {
          beginsWith:
            "Representatives shall be elected biennially by the electors of the respective house of representatives districts",
          endsWith:
            "senators shall be elected to and hold office for terms of four years.",
        },
      ],
      length: 1520,
      sha256:
        "d5eafabb86a25bbf5b8a6eccfeb0e9030c2dcb61211283e555013982d5cab721",
    },
  },
  {
    artifactId: "or-constitution",
    url: "https://www.oregonlegislature.gov/bills_laws/Pages/OrConst.aspx",
    provider: "Oregon State Legislature",
    jurisdictionKey: "US-OR",
    enactingBody: "the people of Oregon",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of Oregon, Article IV",
    localPath: "data/source/state-legislatures/raw/or-constitution.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Section 1. Legislative power; initiative and referendum. (1) The legislative power of the state",
          endsWith: "consisting of a Senate and a House of Representatives.",
        },
        {
          beginsWith:
            "Section 4. Term of office of legislators; classification of Senators.",
          endsWith:
            "unless a different commencing day for such terms shall have been appointed by law.",
        },
        {
          beginsWith:
            "Section 6. Apportionment of Senators and Representatives; operative date.",
          endsWith:
            "A senatorial district shall consist of two representative districts.",
        },
      ],
      length: 1156,
      sha256:
        "488ca23d47275ae98f018379cc10c6c1c1b2a4e7af351280875dcbf74315227b",
    },
  },
  {
    artifactId: "va-constitution-article-4-section-3",
    url: "https://law.lis.virginia.gov/constitution/article4/section3/",
    provider: "Virginia Law Portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the people of Virginia",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of Virginia, Article IV",
    localPath:
      "data/source/state-legislatures/raw/va-constitution-article-4-section-3.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Article IV. Legislature Section 3. House of Delegates The House of Delegates shall consist",
          endsWith: "on the Tuesday succeeding the first Monday in November.",
        },
      ],
      length: 286,
      sha256:
        "079556bf4dfcaabc795295830858839deb9023d5e463d20ec4d960e0c700d2ee",
    },
  },
  {
    artifactId: "va-constitution-article-4-section-2",
    url: "https://law.lis.virginia.gov/constitution/article4/section2/",
    provider: "Virginia Law Portal, Virginia General Assembly",
    jurisdictionKey: "US-VA",
    enactingBody: "the people of Virginia",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of Virginia, Article IV",
    localPath:
      "data/source/state-legislatures/raw/va-constitution-article-4-section-2.html",
    enacted: {
      regions: [
        {
          beginsWith:
            "Article IV. Legislature Section 2. Senate The Senate shall consist",
          endsWith: "on the Tuesday succeeding the first Monday in November.",
        },
      ],
      length: 270,
      sha256:
        "19d2328e5b7b5ec63ef0c15d92e31de27098e1e6138f813f37a23484422e9b9c",
    },
  },
];

export type { StateSourceSpec };

/** Find one declared source, or nothing. Never guesses from an id prefix. */
export function stateLegislatureSource(
  artifactId: string,
): StateSourceSpec | undefined {
  return STATE_LEGISLATURE_SOURCES.find(
    (spec) => spec.artifactId === artifactId,
  );
}

/**
 * The rights determination for one state instrument.
 *
 * Each names its own enacting body and its own enacted-text boundary, because
 * "a state enacted it" is the whole content of the claim and a shared constant
 * saying "a state" would be saying nothing.
 */
function edictRights(spec: StateSourceSpec): ArtifactRights {
  return {
    status: "public-domain-government-edict",
    declaredLicense: null,
    attributionRequired: "UNKNOWN",
    edict: {
      jurisdictionKey: spec.jurisdictionKey,
      enactingAuthority: `Enacted by ${spec.enactingBody}`,
      instrumentKind: spec.instrumentKind,
      instrumentTitle: spec.instrumentTitle,
      doctrine: "us-government-edicts",
      contentScope: "enacted-legal-text-only",
      scope: {
        boundaryKind: "normalized-text-regions",
        regions: spec.enacted.regions,
        extracted: {
          length: spec.enacted.length,
          sha256: spec.enacted.sha256,
        },
      },
    },
  };
}

export const STATE_LEGISLATURE_ACQUISITION: {
  readonly domain: string;
  readonly requests: readonly AcquisitionRequest[];
} = {
  domain: "state-legislatures",
  requests: STATE_LEGISLATURE_SOURCES.map((spec): AcquisitionRequest => ({
    artifactId: spec.artifactId,
    provider: spec.provider,
    url: spec.url,
    method: "GET",
    mediaType: "text/html",
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: spec.url,
    },
    rights: edictRights(spec),
    storage: "committed",
    localPath: spec.localPath,
  })),
};
