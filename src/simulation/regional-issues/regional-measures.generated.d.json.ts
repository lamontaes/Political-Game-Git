// Hand-maintained shape of regional-measures.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  provenance: {
    beaRegionalSha256: string;
    hudHousingSha256: string;
    blsLausSha256: string;
    hudVintages: string[];
    meaning: string;
  };
  jurisdictions: {
    jurisdictionKey: string;
    name: string;
    housingPriceIndex: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: number;
    }[];
    allItemsPriceIndex: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: number;
    }[];
    perCapitaIncome: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: number;
    }[];
    twoBedroomFairMarketRent: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: number;
    }[];
    medianFamilyIncome: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: number;
    }[];
    unemploymentRate: {
      period: string;
      periodEnd: string;
      knownAvailableOn: string;
      knownAvailableOnBasis: string;
      value: number;
      national: null;
    }[];
  }[];
};
export default data;
