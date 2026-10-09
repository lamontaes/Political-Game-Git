// Hand-maintained shape of place-membership.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  asOf: string;
  compilerVersion: string;
  congressional: {
    asOf: string;
    compilerVersion: string;
    dated: {
      asOf: string;
      effectiveFrom: string;
      splitPlaceCandidates: Record<string, string[]>;
      stateFips: string[];
      vintage: string;
      wholePlace: Record<string, string>;
    }[];
    relationVintage: string;
    splitPlaceCandidates: Record<string, string[]>;
    splitPlaceCount: number;
    wholePlace: Record<string, string>;
    wholePlaceCount: number;
  };
  identityVintage: string;
  relationVintage: string;
  splitDistrictsByKey: Record<string, string[]>;
  splitPlaceChambers: Record<string, string[]>;
  splitPlaceCount: number;
  wholePlaceByKey: Record<string, string>;
  wholePlaceCount: number;
};
export default data;
