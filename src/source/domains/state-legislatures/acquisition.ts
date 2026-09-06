/**
 * What this domain retrieves, and from whom.
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
 */

import type { AcquisitionRequest, ArtifactRights } from "../../core/index";

/**
 * The rights determination these artifacts share.
 *
 * Each names its own enacting body, because "a state enacted it" is the whole
 * content of the claim and a shared constant that said "a state" would be
 * saying nothing.
 */
function edictRights(enactingBody: string): ArtifactRights {
  return {
    status: "public-domain-government-edict",
    declaredLicense: null,
    attributionRequired: "UNKNOWN",
    edictBasis: `Enacted by ${enactingBody}. Under the government-edicts doctrine (Georgia v. Public.Resource.Org, Inc., 590 U.S. 255 (2020)) the text of an enacted law carries no copyright. This determination covers the enacted text quoted by this domain and not the publisher's navigation, annotations or headnotes, whose rights status stays UNKNOWN.`,
  };
}

interface StateSourceSpec {
  readonly artifactId: string;
  readonly url: string;
  readonly provider: string;
  readonly enactingBody: string;
  readonly localPath: string;
}

/** The authorities this domain read, in a stable order. */
export const STATE_LEGISLATURE_SOURCES: readonly StateSourceSpec[] = [
  {
    artifactId: "ak-constitution",
    url: "https://ltgov.alaska.gov/information/alaskas-constitution/",
    provider: "Office of the Lieutenant Governor, State of Alaska",
    enactingBody: "the people of Alaska",
    localPath: "data/source/state-legislatures/raw/ak-constitution.html",
  },
  {
    artifactId: "ca-constitution-article-4",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&division=&title=&part=&chapter=&article=IV",
    provider: "California Legislative Counsel of California",
    enactingBody: "the people of California",
    localPath:
      "data/source/state-legislatures/raw/ca-constitution-article-4.html",
  },
  {
    artifactId: "de-constitution-article-2",
    url: "https://delcode.delaware.gov/constitution/constitution-03.shtml",
    provider: "Delaware Code, Office of the Delaware Code Revisors",
    enactingBody: "the people of Delaware",
    localPath:
      "data/source/state-legislatures/raw/de-constitution-article-2.html",
  },
  {
    artifactId: "fl-constitution",
    url: "https://www.flsenate.gov/Laws/Constitution",
    provider: "The Florida Senate",
    enactingBody: "the people of Florida",
    localPath: "data/source/state-legislatures/raw/fl-constitution.html",
  },
  {
    artifactId: "hi-constitution",
    url: "https://lrb.hawaii.gov/constitution/",
    provider: "Hawaii Legislative Reference Bureau",
    enactingBody: "the people of Hawaii",
    localPath: "data/source/state-legislatures/raw/hi-constitution.html",
  },
  {
    artifactId: "id-constitution-article-3-section-2",
    url: "https://legislature.idaho.gov/statutesrules/idconst/artiii/sect2/",
    provider: "Idaho State Legislature",
    enactingBody: "the people of Idaho",
    localPath:
      "data/source/state-legislatures/raw/id-constitution-article-3-section-2.html",
  },
  {
    artifactId: "il-constitution-article-4",
    url: "https://www.ilga.gov/commission/lrb/con4.htm",
    provider: "Illinois General Assembly, Legislative Reference Bureau",
    enactingBody: "the people of Illinois",
    localPath:
      "data/source/state-legislatures/raw/il-constitution-article-4.html",
  },
  {
    artifactId: "ma-constitution",
    url: "https://malegislature.gov/Laws/Constitution",
    provider: "The 194th General Court of the Commonwealth of Massachusetts",
    enactingBody: "the people of Massachusetts",
    localPath: "data/source/state-legislatures/raw/ma-constitution.html",
  },
  {
    artifactId: "mn-constitution",
    url: "https://www.revisor.mn.gov/constitution/",
    provider: "Minnesota Office of the Revisor of Statutes",
    enactingBody: "the people of Minnesota",
    localPath: "data/source/state-legislatures/raw/mn-constitution.html",
  },
  {
    artifactId: "mn-statutes-2-021",
    url: "https://www.revisor.mn.gov/statutes/cite/2.021",
    provider: "Minnesota Office of the Revisor of Statutes",
    enactingBody: "the Minnesota Legislature",
    localPath: "data/source/state-legislatures/raw/mn-statutes-2-021.html",
  },
  {
    artifactId: "nc-constitution-article-2",
    url: "https://www.ncleg.gov/Laws/Constitution/Article2",
    provider: "North Carolina General Assembly",
    enactingBody: "the people of North Carolina",
    localPath:
      "data/source/state-legislatures/raw/nc-constitution-article-2.html",
  },
  {
    artifactId: "ne-constitution-article-3-section-1",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-1",
    provider: "Nebraska Legislature",
    enactingBody: "the people of Nebraska",
    localPath:
      "data/source/state-legislatures/raw/ne-constitution-article-3-section-1.html",
  },
  {
    artifactId: "ne-constitution-article-3-section-6",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-6",
    provider: "Nebraska Legislature",
    enactingBody: "the people of Nebraska",
    localPath:
      "data/source/state-legislatures/raw/ne-constitution-article-3-section-6.html",
  },
  {
    artifactId: "nv-constitution",
    url: "https://www.leg.state.nv.us/const/nvconst.html",
    provider: "Nevada Legislature, Legislative Counsel Bureau",
    enactingBody: "the people of Nevada",
    localPath: "data/source/state-legislatures/raw/nv-constitution.html",
  },
  {
    artifactId: "oh-constitution-article-2",
    url: "https://codes.ohio.gov/ohio-constitution/article-2",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    enactingBody: "the people of Ohio",
    localPath:
      "data/source/state-legislatures/raw/oh-constitution-article-2.html",
  },
  {
    artifactId: "or-constitution",
    url: "https://www.oregonlegislature.gov/bills_laws/Pages/OrConst.aspx",
    provider: "Oregon State Legislature",
    enactingBody: "the people of Oregon",
    localPath: "data/source/state-legislatures/raw/or-constitution.html",
  },
  {
    artifactId: "va-constitution-article-4-section-3",
    url: "https://law.lis.virginia.gov/constitution/article4/section3/",
    provider: "Virginia Law Portal, Virginia General Assembly",
    enactingBody: "the people of Virginia",
    localPath:
      "data/source/state-legislatures/raw/va-constitution-article-4-section-3.html",
  },
  {
    artifactId: "va-constitution-article-4-section-2",
    url: "https://law.lis.virginia.gov/constitution/article4/section2/",
    provider: "Virginia Law Portal, Virginia General Assembly",
    enactingBody: "the people of Virginia",
    localPath:
      "data/source/state-legislatures/raw/va-constitution-article-4-section-2.html",
  },
];

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
    rights: edictRights(spec.enactingBody),
    storage: "committed",
    localPath: spec.localPath,
  })),
};
