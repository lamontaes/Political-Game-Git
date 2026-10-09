// Hand-maintained shape of school-name-patterns.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  source: string;
  note: string;
  regions: Record<string, string>;
  patterns: {
    "elementary:1": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "elementary:2-3": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "elementary:4+": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "high:1": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "high:2-3": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "high:4+": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "middle:1": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "middle:2-3": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
    "middle:4+": {
      place: number;
      direction: number;
      figure: number;
      person: number;
      family: number;
      other: number;
    };
  };
  figureRegions: Record<
    string,
    {
      Northeast?: number;
      West?: number;
      South?: number;
      Midwest?: number;
    }
  >;
  towns: Record<string, number[]>;
};
export default data;
