// Hand-maintained shape of municipal-capacity.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  sources: {
    "government-finances-2024-individual-units": string;
    "government-finances-2024-individual-units-data": string;
    "government-finances-2024-individual-units-identity": string;
    "government-finances-2024-individual-units-codebook": string;
    "government-finances-2024-individual-units-disclaimer": string;
    "census-pid-gid-crosswalk": string;
    "census-finance-local-methodology-2024": string;
    "census-finance-state-technical-2024": string;
    "public-employment-2025-individual-units": string;
    "public-employment-2025-individual-units-data": string;
    "public-employment-2025-individual-units-identity": string;
    "public-employment-2025-individual-units-codebook": string;
    "public-employment-2025-individual-units-disclaimer": string;
  };
  provenance: {
    financeSha256: string;
    employmentSha256: string;
    meaning: string;
  };
  finance: {
    amount: {
      asOf: string;
      evidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      release: string;
      state: string;
      value: number;
    };
    category: string;
    censusGovId: string;
    estimateBasis: string;
    evidence: {
      artifactId: string;
      locator: {
        artifactId: string;
        kind: string;
        line: number;
        span: number[];
      };
      providerNativeId: string;
    };
    fiscalYearEnding: string;
    fiscalYearLabel: {
      investigated: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      reason: string;
      state: string;
    };
    govName: string;
    govTypeCode: string;
    itemCode: string;
    itemDescription: string;
    publisher: {
      dataFlag: string;
      endingMonthDay: string;
      identityEvidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      };
      periodBasis: string;
      pid6: string;
      publisherId: string;
      rawAmount: string;
    };
    recordId: string;
    stateFips: string;
    stateUsps: string;
    surveyYear: number;
    units: string;
  }[];
  employment: {
    censusGovId: string;
    employmentUnits: string;
    estimateBasis: string;
    evidence: {
      artifactId: string;
      locator: {
        artifactId: string;
        kind: string;
        line: number;
      };
      providerNativeId: string;
    };
    fullTimeEmployees: {
      asOf: string;
      evidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      release: string;
      state: string;
      value: number;
    };
    fullTimeEquivalent: {
      investigated: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          lineCode: string;
          period: string;
          table: string;
        };
      }[];
      reason: string;
      state: string;
    };
    fullTimePayroll: {
      asOf: string;
      evidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      release: string;
      state: string;
      value: number;
    };
    functionCode: string;
    functionLabel: string;
    govName: string;
    govTypeCode: string;
    partTimeEmployees: {
      asOf: string;
      evidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      release: string;
      state: string;
      value: number;
    };
    partTimePayroll: {
      asOf: string;
      evidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
          span: number[];
        };
        providerNativeId: string;
      }[];
      release: string;
      state: string;
      value: number;
    };
    payrollUnits: string;
    publisher: {
      dataFlags: string[];
      identityEvidence: {
        artifactId: string;
        locator: {
          artifactId: string;
          kind: string;
          line: number;
        };
        providerNativeId: string;
      };
      payrollPeriod: {
        end: string;
        start: string;
      };
      pid6: string;
    };
    recordId: string;
    referenceDate: string;
    referenceYear: number;
    stateFips: string;
    stateUsps: string;
  }[];
};
export default data;
