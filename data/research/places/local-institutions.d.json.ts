// Hand-maintained shape of local-institutions.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  asOf: string;
  places: Record<
    string,
    {
      highSchools: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
        historicalNameEstimated: boolean;
      }[];
      districts: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
        historicalNameEstimated: boolean;
      }[];
      hospitals: unknown[];
      banks: unknown[];
      colleges: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
      }[];
      largeEmployers: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
        historicalNameEstimated?: boolean;
      }[];
    }
  >;
  counties: Record<
    string,
    {
      colleges: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
      }[];
      largeEmployers: {
        name: string;
        kind: string;
        sourceKey: string;
        sourceId: string;
        asOf: string;
      }[];
    }
  >;
};
export default data;
