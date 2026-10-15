// Hand-maintained shape of 92O-national-state-baseline.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  meta: {
    packetId: string;
    packetDate: string;
    driveFileId: string;
    researchLane: string;
    asOf: string;
    readOn: string;
    sourceTier: string;
    scope: string;
    jurisdictionCount: number;
    sourceSnapshot: {
      path: string;
      bytes: number;
      sha256: string;
      storageEncoding: string;
      extraction: string;
      replayCommand: string;
    };
  };
  sourceFrontiers: {
    id: string;
    verbatim: string;
  }[];
  compilerConflicts: {
    id: string;
    affects: string[];
    summary: string;
    resolution: string;
  }[];
  jurisdictions: Array<{
    usps: string;
    stateName: string;
    optionFamily: string;
    homeRuleFoundation: string;
    homeRuleAuthority: string;
    ballotStructure: string;
    ballotCitation: string;
    electionTimingOptions: string[];
    electionTimingCitation: string;
    runoffRule: string;
    runoffTriggerPercent: null | number;
    runoffCitation: string;
    seatStructureOptions: string[];
    seatStructureDefault: string;
    seatStructureCitation: string;
    mayorSelectionOptions: string[];
    mayorSelectionNote: string;
    electionAdministration: string;
    electionAdministrationCitation: string;
    electionCostRule: string;
    vacancyRule: string;
    vacancySpecialElectionCutoffMonths: null | number;
    vacancyPartyCaucusSuccession: boolean;
    vacancyCitizenOverride: boolean;
    vacancyCitation: string;
    recallAuthorized: boolean;
    recallDoctrine: string;
    recallGroundsRequired: boolean;
    recallPetitionPercent: null | number;
    recallPetitionBase: string;
    recallCirculationWindowDays: null | number;
    recallCitation: string;
    recallMechanics: string;
    initiativeAuthorized: boolean;
    initiativeForm: string;
    initiativePetitionPercent: null | number;
    initiativeExemptSubjects: string[];
    initiativeCitation: string;
    initiativeNotes: string;
    referendumAuthorized: boolean;
    protestReferendumAvailable: boolean;
    protestReferendumWindowDays: null | number;
    protestReferendumSuspendsOrdinance: boolean;
    protestReferendumPercent: null | number;
    referendumCitation: string;
    referendumNotes: string;
  }>;
};
export default data;
