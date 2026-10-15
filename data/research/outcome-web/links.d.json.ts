// Hand-maintained shape of links.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  about: string;
  version: string;
  targets: {
    "crime.burglary": {
      floor: number;
      ceiling: number;
    };
    "crime.vandalism": {
      floor: number;
      ceiling: number;
    };
    "crime.robbery": {
      floor: number;
      ceiling: number;
    };
    "crime.assault": {
      floor: number;
      ceiling: number;
    };
    "births.rate": {
      floor: number;
      ceiling: number;
    };
    "health.uninsured-pct": {
      floor: number;
      ceiling: number;
    };
    "household.poverty-pct": {
      floor: number;
      ceiling: number;
    };
    "crime.violent": {
      floor: number;
      ceiling: number;
    };
    "housing.homelessness": {
      floor: number;
      ceiling: number;
    };
    "env.particulates": {
      floor: number;
      ceiling: number;
    };
  };
  baselines: {
    "labor.unemployment-pct": {
      value: number;
      note: string;
    };
    "labor.minimum-wage-to-median": {
      value: number;
      note: string;
    };
  };
  links: Array<{
    key: string;
    status: string;
    unsupportedReason: null | string;
    to: string;
    strength: string;
    shape: {
      kind: string;
      halfLifeDays?: number;
      at?: number;
      steeperAt?: number;
      steeperExtraSize?: null;
    };
    size: null | number;
    per: string;
    lagMonths: number;
    group: string;
    owner: string;
    anchor: string;
    source: string;
    from: string;
    evidence: string;
    range?: number[];
    researchSizing?: {
      estimate?: number;
      standardError?: number;
      normal95Interval?: number[];
      unit: string;
      source?: string;
      location?: string;
      status: string;
      requiredConnection?: string;
      sourcePacketHead?: string;
      area?: string;
      linkId?: string;
      primarySource?: string;
      version?: string;
      access?: string;
      derivedNormal95CI?: number[];
      table?: string;
      outcomeDefinition?: string;
      population?: string;
      lag?: string;
      conditions?: string[];
      rangeMeaning?: string;
      missingConversion?: string;
      aboutZero?: boolean;
      runtimeActivation?: string;
      sourceVersion?: string;
      estimates?: {
        linkId: string;
        outcome: string;
        followUpAfterFiling: string;
        estimate: number;
        standardError: number;
        derivedNormal95CI: number[];
      }[];
      exposure?: string;
      runtimeGap?: string;
    };
    notes?: string;
    why?: string[];
    conditions?:
      | string
      | {
          strongerWeakerAbsent?: string;
          rangeMeaning?: string;
          transportMissing?: string;
          mediationLimit?: string;
          strongerWhen?: string[];
          weakerWhen?: string[];
          absentWhen?: string[];
        };
    reverseOnRepeal?:
      | string
      | {
          answer: string;
          reason: string;
        };
    who?:
      | string
      | {
          studyPopulation: string;
          exclusions: string;
          legalCoverage: string;
        };
    lagWhy?:
      | string
      | {
          measured?: string;
          lagInterpretation?: string;
          months?: number;
          evidenceLimit?: string;
        };
    aboutZero?: boolean;
    researchActivationLimit?: string;
    floor?: number;
    moderator?: {
      measure: string;
      effectAtFull: number;
      mode?: string;
    };
    sizeByPlace?: {
      "US-TN": {
        size: number;
        range: number[];
      };
      "US-FL": {
        size: number;
        range: number[];
      };
      "US-AL": {
        size: number;
        range: number[];
      };
      "US-AZ": {
        size: number;
        range: number[];
      };
      "US-MS": {
        size: number;
        range: number[];
      };
      "US-KY": {
        size: number;
        range: number[];
      };
      "US-VA": {
        size: number;
        range: number[];
      };
      "US-DE": {
        size: number;
        range: number[];
      };
      "US-WY": {
        size: number;
        range: number[];
      };
      "US-IA": {
        size: number;
        range: number[];
      };
    };
    ceiling?: number;
    consumed?: boolean;
  }>;
  calibratedAt: string;
};
export default data;
