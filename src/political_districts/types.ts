/**
 * Official U.S. Census Bureau Political Districts Geography Corpus
 * Types & Contracts
 */

export type GeographyType = "cd" | "sldl" | "sldu";

export interface DistrictVintage {
  censusYear: number;
  congress: string | null;
  gazetteerFile: string;
}

export interface PoliticalDistrictRecord {
  /** Geographic entity type: Congressional District (cd), State Legislative Lower Chamber (sldl), State Legislative Upper Chamber (sldu) */
  geographyType: GeographyType;
  /** 2-letter USPS state/territory postal code (e.g. 'AL', 'CA', 'NE', 'DC', 'PR') */
  usps: string;
  /** 2-digit state/territory FIPS code (e.g. '01', '06', '31', '11', '72') */
  stateFips: string;
  /** Official district code within state and geography type (e.g. '01', '00' for CD at-large, '001', '00A', 'ZZZ') */
  districtCode: string;
  /** Official Census GEOID identifier (4 chars for CD: SSDD; 5 chars for SLD: SSDDD or SS00A or SSZZZ) */
  geoid: string;
  /** Fully qualified Census GEOID (e.g. '5001900US0101', '620L900US01001', '610U900US01001') */
  geoidfq: string;
  /** Official source display name or standardized district name (e.g. 'State House District 1', 'Congressional District 1', 'Ward 1') */
  name: string;
  /** Land area in square meters */
  aland: number;
  /** Water area in square meters */
  awater: number;
  /** Land area in square miles */
  alandSqmi: number;
  /** Water area in square miles */
  awaterSqmi: number;
  /** Internal point latitude (decimal degrees) */
  intptlat: number;
  /** Internal point longitude (decimal degrees) */
  intptlong: number;
  /** Vintage and provenance metadata for this record */
  vintage: DistrictVintage;
}

export interface SourceProvenanceEntry {
  sourceId: string;
  title: string;
  geographyType: GeographyType;
  vintageYear: number;
  congress: string | null;
  publisher: string;
  sourceUrl: string;
  retrievedAt: string;
  zipFileName: string;
  zipSha256: string;
  txtFileName: string;
  txtSha256: string;
  txtSizeBytes: number;
  recordCount: number;
}

export interface DistrictCorpusManifest {
  datasetName: string;
  vintage: string;
  generatedAt: string;
  compiledSha256: string;
  totalRecordCount: number;
  recordCountsByType: Record<GeographyType, number>;
  sources: SourceProvenanceEntry[];
}

export interface PoliticalDistrictCorpusData {
  manifest: DistrictCorpusManifest;
  records: PoliticalDistrictRecord[];
}
