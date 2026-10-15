// Hand-maintained shape of college-kinds.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  schemaVersion: number;
  source: {
    name: string;
    path: string;
    method: string;
  };
  politicalHotbedClassification: {
    status: string;
    reviewedAt: string;
    sources: {
      id: string;
      published: string;
      url: string;
    }[];
  };
  institutions: {
    id: string;
    state: string;
    kind: string;
    sourceYear: string;
  }[];
};
export default data;
