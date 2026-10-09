// Hand-maintained shape of federal-amendment-ratification-rules-2026.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  version: string;
  asOf: string;
  about: string;
  schema: {
    threshold: {
      basis: string;
      fraction: string;
      strictlyGreater: string;
      presentMeans: string;
      alsoRequires: string;
      minimumVotes: string;
    };
    quorum: string;
    rounding: string;
    ruleKind: {
      "ratification-specific": string;
      "ratification-specific-unenforced": string;
      "resolution-rule": string;
      "bill-rule-by-reference": string;
      "bill-rule-assumed": string;
      default: string;
      "default-unsourced": string;
    };
    onTheBooks: string;
    conditions: string;
    sameResolutionBothChambers: string;
    citations: string;
    ratificationBridge: string;
  };
  article: {
    text: string;
    url: string;
    accessed: string;
  };
  surveyNote: {
    text: string;
    citations: {
      text: string;
      url: string;
      accessed: string;
    }[];
  };
  rows: {
    stateKey: string;
    state: string;
    chambers: {
      chamber: string;
      name: string;
      threshold: {
        basis: string;
        fraction: string;
        strictlyGreater: boolean;
        presentMeans?: string;
        alsoRequires?: {
          minYesFractionOfElected: string;
        };
        minimumVotes?: number;
      };
      quorum: {
        basis: string;
        fraction: string;
        strictlyGreater: boolean;
        text: string;
        citationIndex?: number;
      };
      rounding: string;
      ruleKind: string;
      citations: {
        text: string;
        url: string;
        accessed: string;
      }[];
      notes?: string;
      ratificationBridge?: {
        kind: string;
        procedureCitationIndex: number;
        thresholdCitationIndex: number;
        quorumCitationIndex: number;
        formCitationIndex: number;
      };
      onTheBooks?: {
        basis: string;
        fraction: string;
        strictlyGreater: boolean;
        source: string;
      };
    }[];
    sameResolutionBothChambers: boolean;
    governorRole?: string;
    notes?: string;
    conditions?: {
      kind: string;
      status: string;
      text: string;
      citations: {
        text: string;
        url: string;
        accessed: string;
      }[];
    }[];
  }[];
  nonRatifying: {
    stateKey: string;
    name: string;
    ratifies: boolean;
    reason: string;
    citations: {
      text: string;
      url: string;
      accessed: string;
    }[];
  }[];
  sourceRoleReview: {
    reviewedAt: string;
    addedPairedStates: string[];
    note: string;
  };
};
export default data;
