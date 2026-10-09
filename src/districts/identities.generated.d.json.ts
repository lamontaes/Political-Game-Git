// Hand-maintained shape of identities.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  asOf: string;
  compilerVersion: string;
  recordCount: number;
  records: Array<{
    asOf: string;
    chamber: string;
    compilerVersion: string;
    districtCode: string;
    geoid: string;
    geoidFq: string;
    isUnassignedResidual: boolean;
    recordId: string;
    sourceName: null | string;
    stateFips: string;
    stateUsps: string;
    vintage: string;
  }>;
  vintage: string;
};
export default data;
