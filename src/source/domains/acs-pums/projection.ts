/**
 * Which PUMS variables this corpus projects, and why not all of them.
 *
 * Each projected variable carries its own provenance, which is what makes a
 * fact traceable and also what makes it cost roughly 250 bytes. The Wyoming
 * person file has 287 columns, 160 of which are replicate weights for variance
 * estimation. Projecting all of them for even a small slice would produce tens
 * of megabytes of corpus, most of it weights nothing in this repository yet
 * uses.
 *
 * So the corpus projects a declared list and says so in its coverage
 * description. The complete files — every column, every row — are committed and
 * hashed as the parent artifacts, so nothing is lost and nothing is hidden: a
 * later domain that needs replicate weights widens this list and recompiles,
 * without another retrieval.
 */

/** Housing-record variables the corpus projects. */
export const HOUSING_PROJECTION: readonly string[] = [
  "RT",
  "SERIALNO",
  "DIVISION",
  "PUMA",
  "REGION",
  "STATE",
  "ADJHSG",
  "ADJINC",
  "WGTP",
  "NP",
  "TYPEHUGQ",
  "BDSP",
  "BLD",
  "RMSP",
  "TEN",
  "VALP",
  "RNTP",
  "GRNTP",
  "HINCP",
  "FINCP",
  "FES",
  "HHT",
  "HUPAC",
  "YRBLT",
];

/** Person-record variables the corpus projects. */
export const PERSON_PROJECTION: readonly string[] = [
  "RT",
  "SERIALNO",
  "SPORDER",
  "PUMA",
  "STATE",
  "ADJINC",
  "PWGTP",
  "AGEP",
  "SEX",
  "RAC1P",
  "HISP",
  "CIT",
  "NATIVITY",
  "SCHL",
  "MAR",
  "DIS",
  "ESR",
  "COW",
  "WKHP",
  "OCCP",
  "INDP",
  "WAGP",
  "SEMP",
  "INTP",
  "PERNP",
  "PINCP",
  "POVPIP",
  "JWMNP",
];

/** The 160 columns the projection deliberately leaves in the parent files. */
export const UNPROJECTED_VARIABLE_NOTE =
  "The 80 housing replicate weights (WGTP1-WGTP80) and 80 person replicate weights (PWGTP1-PWGTP80) are present in the committed parent artifacts but are not projected into this corpus. They exist for successive-difference variance estimation, which nothing in this repository performs; projecting them would multiply the corpus several times over for values no consumer reads.";
