/** Explicitly reviewed links between two separately sourced identities.
 * Where declared, shared Gazetteer ANSI links a place to its county equivalent.
 * County inventory areas are distinct from county-equivalent identities.
 * Neither a geographic link nor the charter identity grants office powers.
 */
export interface MunicipalIdentityLink {
  readonly governmentKey: string;
  readonly placeRepresentation?: "district-of-columbia";
  readonly publisherId: string;
  readonly publisherUnitName: string;
  readonly placeGeoid: string;
  readonly sourceName: string;
  readonly state: string;
  readonly ansiCode: string;
  readonly countyAreaGeoid?: string;
  readonly countyEquivalentGeoid: string | null;
  readonly charterArtifactId: string;
  readonly charterLocator: string;
  readonly charterIdentity: string;
}
export const MUNICIPAL_IDENTITY_LINKS: readonly MunicipalIdentityLink[] = [
  {
    governmentKey: "us-va-charlottesville",
    publisherId: "194177",
    publisherUnitName: "CITY OF CHARLOTTESVILLE",
    placeGeoid: "5114968",
    sourceName: "Charlottesville city",
    state: "VA",
    ansiCode: "01789068",
    countyEquivalentGeoid: "51540",
    charterArtifactId: "va-charlottesville-charter",
    charterLocator: "Charter § 1",
    charterIdentity:
      "The inhabitants of the territory comprised within the present limits of the City of Charlottesville as hereinafter described, or as the same may be hereafter altered and established as provided by law, shall continue to be one body politic and corporate in fact and its name shall be the City of Charlottesville.",
  },
  {
    governmentKey: "us-va-richmond",
    publisherId: "194178",
    publisherUnitName: "CITY OF RICHMOND",
    placeGeoid: "5167000",
    sourceName: "Richmond city",
    state: "VA",
    ansiCode: "01789073",
    countyEquivalentGeoid: "51760",
    charterArtifactId: "va-richmond-charter",
    charterLocator: "Charter § 1.01",
    charterIdentity:
      "The inhabitants of the territory comprised within the limits of the city of Richmond, as the same now are or may hereafter be established by law, shall continue to be a body politic and corporate under the name of the city of Richmond",
  },
  {
    governmentKey: "us-nv-carson-city",
    publisherId: "194943",
    publisherUnitName: "CITY OF CARSON CITY",
    placeGeoid: "3209700",
    sourceName: "Carson City",
    state: "NV",
    ansiCode: "00863219",
    countyEquivalentGeoid: "32510",
    charterArtifactId: "nv-carson-city-charter",
    charterLocator: "Charter § 1.010",
    charterIdentity:
      "to effect the consolidation of the governments and functions of Carson City and Ormsby County, the Legislature hereby establishes this Charter for the government of Carson City.",
  },
  {
    governmentKey: "us-or-portland",
    publisherId: "211254",
    publisherUnitName: "CITY OF PORTLAND",
    placeGeoid: "4159000",
    sourceName: "Portland city",
    state: "OR",
    ansiCode: "02411471",
    countyAreaGeoid: "41051",
    countyEquivalentGeoid: null,
    charterArtifactId: "or-portland-charter-1-101",
    charterLocator: "Charter § 1-101",
    charterIdentity:
      "The municipal corporation now existing and known as the City of Portland shall remain and continue a body politic and corporate by the name of the City of Portland,",
  },
  {
    governmentKey: "us-dc-washington",
    placeRepresentation: "district-of-columbia",
    publisherId: "124214",
    publisherUnitName: "CITY OF WASHINGTON DC",
    placeGeoid: "1150000",
    sourceName: "Washington city",
    state: "DC",
    ansiCode: "02390665",
    countyAreaGeoid: "11001",
    countyEquivalentGeoid: null,
    charterArtifactId: "dc-code-1-102",
    charterLocator: "D.C. Code § 1-102",
    charterIdentity:
      "The District is created a government by the name of the “District of Columbia,” by which name it is constituted a body corporate for municipal purposes,",
  },
];
