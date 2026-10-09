// Hand-maintained shape of membership-candidates.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  format: string;
  countyCongressional: {
    source: {
      artifactId: string;
      sha256: string;
    };
    vintage: string;
    byState: Record<string, Record<string, string | string[]>>;
    dated: Array<{
      vintage: string;
      effectiveFrom: string;
      asOf: string;
      stateFips: string[];
      byState: {
        "48"?: Record<string, string | string[]>;
        "37"?: Record<string, string | string[]>;
        "39"?: Record<string, string | string[]>;
        "06"?: Record<string, string | string[]>;
        "49"?: {
          "001": string;
          "003": string;
          "005": string;
          "007": string;
          "009": string;
          "011": string;
          "013": string;
          "015": string;
          "017": string;
          "019": string;
          "021": string;
          "023": string;
          "025": string;
          "027": string;
          "029": string;
          "031": string;
          "033": string;
          "035": string[];
          "037": string;
          "039": string;
          "041": string;
          "043": string;
          "045": string;
          "047": string;
          "049": string[];
          "051": string;
          "053": string;
          "055": string;
          "057": string[];
        };
        "12"?: Record<string, string | string[]>;
        "47"?: Record<string, string | string[]>;
        "22"?: Record<string, string | string[]>;
        "01"?: Record<string, string | string[]>;
      };
    }>;
  };
  placeCongressional: {
    source: {
      artifactId: string;
      sha256: string;
    };
    vintage: string;
    byState: Record<string, Record<string, string | string[]>>;
  };
  splitPlaceStateLegislative: {
    source: string;
    vintage: string;
    byState: Record<
      string,
      Record<
        string,
        {
          u?: string[];
          l?: string[];
        }
      >
    >;
  };
};
export default data;
