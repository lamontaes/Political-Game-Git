// Hand-maintained shape of sentencing-ranges-2026.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  id: string;
  version: string;
  asOf: string;
  about: string;
  offenseDefinitions: {
    "crime:robbery": string;
    "crime:burglary": string;
    "crime:assault": string;
    "crime:vandalism": string;
    "campaign-funds-personal-use": string;
  };
  conventions: {
    units: string;
    firstOffense: string;
    minMonths: string;
    maxLife: string;
    presumptiveMonths: string;
    grid: string;
    quoteCheck: string;
    estimated: string;
  };
  coverage: {
    places: number;
    sourced: number;
    estimatedFromAverage: number;
    remaining: number;
  };
  places: Record<
    string,
    {
      name: string;
      system: string;
      basis: string;
      unreadReason?: string;
      classes: Record<
        string,
        {
          class: string;
          minMonths: number;
          maxMonths: number;
          citation: string;
          source: string;
          quote: string;
          quoteCheck: string;
          note?: string;
          presumptiveMonths?: number;
        }
      >;
      offenses: {
        "crime:robbery": {
          offense: string;
          basis?: string;
          minMonths?: number;
          maxMonths?: null | number;
          method?: string;
          fedByMin?: string[];
          fedByMax?: string[];
          citation?: string;
          source?: string;
          quote?: string;
          quoteCheck?: string;
          class?: string;
          note?: string;
          maxLife?: boolean;
          presumptiveMonths?: number;
        };
        "crime:burglary": {
          offense: string;
          basis?: string;
          minMonths?: number;
          maxMonths?: null | number;
          method?: string;
          fedByMin?: string[];
          fedByMax?: string[];
          citation?: string;
          source?: string;
          quote?: string;
          quoteCheck?: string;
          class?: string;
          note?: string;
          presumptiveMonths?: number;
          maxLife?: boolean;
        };
        "crime:assault": {
          offense: string;
          basis?: string;
          minMonths?: number;
          maxMonths?: number;
          method?: string;
          fedByMin?: string[];
          fedByMax?: string[];
          citation?: string;
          source?: string;
          quote?: string;
          quoteCheck?: string;
          class?: string;
          note?: string;
          presumptiveMonths?: number;
        };
        "crime:vandalism": {
          offense: string;
          basis?: string;
          minMonths?: number;
          maxMonths?: number;
          method?: string;
          fedByMin?: string[];
          fedByMax?: string[];
          citation?: string;
          source?: string;
          quote?: string;
          quoteCheck?: string;
          class?: string;
          note?: string;
        };
      };
      gridNote?: string;
      notes?: string;
    }
  >;
  remaining: unknown[];
  estimateAverages: {
    "crime:robbery": {
      minMonths: number;
      maxMonths: number;
      fedByMin: string[];
      fedByMax: string[];
    };
    "crime:burglary": {
      minMonths: number;
      maxMonths: number;
      fedByMin: string[];
      fedByMax: string[];
    };
    "crime:assault": {
      minMonths: number;
      maxMonths: number;
      fedByMin: string[];
      fedByMax: string[];
    };
    "crime:vandalism": {
      minMonths: number;
      maxMonths: number;
      fedByMin: string[];
      fedByMax: string[];
    };
  };
};
export default data;
