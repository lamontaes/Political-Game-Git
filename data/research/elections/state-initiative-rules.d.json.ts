// Hand-maintained shape of state-initiative-rules.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  id: string;
  asOf: string;
  estimateNote: string;
  sampleNotes: string[];
  localEstimates: {
    initiativePercent: number;
    referendumPercent: number;
    circulationDays: number;
    referendumWindowDays: number;
  };
  places: Record<
    string,
    {
      name: string;
      kinds: {
        "state-initiative": {
          available: boolean;
          reason: string;
          basis: string;
          distribution: {
            requiredFraction: number;
            unit: string;
            localThresholdFraction: number;
            basis: string;
            note: string;
          };
          review: {
            authority: string;
            text: string;
            basis: string;
          };
          window: {
            kind: string;
            days: null | number;
            anchor: string;
            basis: string;
            note: string;
            months?: number;
          };
          threshold: {
            percent: number;
            base: string;
            basis: string;
            supplementaryPercent?: number;
          };
          source?: string;
        };
        "state-referendum": {
          available: boolean;
          reason: string;
          basis: string;
          distribution: {
            requiredFraction: number;
            unit: string;
            localThresholdFraction: number;
            basis: string;
            note: string;
          };
          review: {
            authority: string;
            text: string;
            basis: string;
          };
          window: {
            kind: string;
            days: number;
            anchor: string;
            basis: string;
            note: string;
          };
          threshold: {
            percent: number;
            base: string;
            basis: string;
          };
          source?: string;
        };
        "constitutional-initiative": {
          available: boolean;
          reason: string;
          basis: string;
          distribution: {
            requiredFraction?: number;
            unit?: string;
            localThresholdFraction?: number;
            basis?: string;
            note?: string;
            kind?: string;
            reason?: string;
          };
          review: {
            authority: string;
            text: string;
            basis: string;
          };
          window: {
            kind: string;
            days?: number;
            anchor?: string;
            basis?: string;
            note?: string;
            months?: null;
            reason?: string;
          };
          threshold: {
            percent?: number;
            base?: string;
            basis?: string;
            kind?: string;
            reason?: string;
          };
          source?: string;
        };
      };
    }
  >;
};
export default data;
