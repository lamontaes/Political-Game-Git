// Hand-maintained shape of jurisdiction-rule-tables.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  legislativePacks: {
    ALASKA_RULE_PACK: unknown;
    ILLINOIS_RULE_PACK: unknown;
    KENTUCKY_RULE_PACK: unknown;
    MARYLAND_RULE_PACK: unknown;
    MINNESOTA_RULE_PACK: unknown;
    MISSOURI_RULE_PACK: unknown;
    NEBRASKA_RULE_PACK: unknown;
    NEVADA_RULE_PACK: unknown;
    OHIO_RULE_PACK: unknown;
  };
  executivePacks: {
    ALASKA_EXECUTIVE_PACK: unknown;
    ILLINOIS_EXECUTIVE_PACK: unknown;
    KENTUCKY_EXECUTIVE_PACK: unknown;
    MINNESOTA_EXECUTIVE_PACK: unknown;
    NEBRASKA_EXECUTIVE_PACK: unknown;
    US_FEDERAL_EXECUTIVE_PACK: unknown;
  };
  senateVacancyRows: Array<{
    stateUsps: string;
    appointment: string;
    appointmentDeadlineDays: null | number;
    specialElection: {
      kind: string;
      promptDays?: null | number;
    };
    citation: null | string;
    source: string;
  }>;
  settledQualifications: Array<{
    stateJurisdictionKey: string;
    officeFamily: string;
    field: string;
    value: number;
    validFrom?: string;
    source: {
      authority: string;
      citation: string;
      sourceTitle: string;
      sourceUrl: null | string;
      retrievedAt: null | string;
      verification: string;
      note: string;
    };
  }>;
  legislativeEthicsBodies: {
    stateJurisdictionKey: string;
    procedureKey: string;
    intakeBody: string;
    additionalBodies: string[];
    proceedingTerm: string;
    chamberArrangement: string;
    authority: string[];
    sourceRefs: string[];
    candidacyPackPrefixes: string[];
    routingLimits: string[];
  }[];
  openingRegionAssociations: {
    sourceGeoid: string;
    stateJurisdictionKey: string;
    displayName: string;
    regionType: string;
  }[];
  openingRegionProfiles: {
    id: string;
    stateKey: string;
    counties: string[];
    regionType: string;
    places?: string[];
  }[];
  stateNames: {
    AL: string;
    AK: string;
    AZ: string;
    AR: string;
    CA: string;
    CO: string;
    CT: string;
    DE: string;
    FL: string;
    GA: string;
    HI: string;
    ID: string;
    IL: string;
    IN: string;
    IA: string;
    KS: string;
    KY: string;
    LA: string;
    ME: string;
    MD: string;
    MA: string;
    MI: string;
    MN: string;
    MS: string;
    MO: string;
    MT: string;
    NE: string;
    NV: string;
    NH: string;
    NJ: string;
    NM: string;
    NY: string;
    NC: string;
    ND: string;
    OH: string;
    OK: string;
    OR: string;
    PA: string;
    RI: string;
    SC: string;
    SD: string;
    TN: string;
    TX: string;
    UT: string;
    VT: string;
    VA: string;
    WA: string;
    WV: string;
    WI: string;
    WY: string;
  };
  territoryNames: {
    PR: string;
    GU: string;
    VI: string;
    AS: string;
    MP: string;
  };
  territoryCourts: Array<Array<null | string>>;
  extraCourtJurisdictionNames: {
    "District of Columbia": string;
    Guam: string;
    "Northern Mariana Islands": string;
    "Puerto Rico": string;
    "Virgin Islands": string;
  };
};
export default data;
