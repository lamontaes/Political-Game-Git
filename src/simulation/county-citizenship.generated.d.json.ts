// Hand-maintained shape of county-citizenship.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  format: string;
  vintage: string;
  observedAt: string;
  interpretation: string;
  uncoveredJurisdictions: string;
  artifacts: {
    url: string;
    localPath: string;
    rawBytes: number;
    rawSha256: string;
    storedBytes: number;
    storedSha256: string;
  }[];
  counties: Record<
    string,
    {
      total: number;
      citizenByBirth: number;
      naturalizedCitizen: number;
      noncitizen: number;
      sourceTable: string;
      sourceLine: number;
      estimates: number[];
      marginsOfError: number[];
    }
  >;
};
export default data;
