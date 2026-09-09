/** Explicitly reviewed links between two separately sourced identities.
 * Gazetteer ANSI identity also links the place to its county-equivalent row.
 * Neither that statistical equivalence nor the charter grants a second county
 * government, a Census government-unit ID, or any office power.
 */
export const MUNICIPAL_IDENTITY_LINKS = [
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
] as const;
