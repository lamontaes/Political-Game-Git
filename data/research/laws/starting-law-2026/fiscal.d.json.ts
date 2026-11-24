// Hand-maintained shape of fiscal.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  questions: {
    "us-policy-positions:fiscal.adopt-income-tax": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          lawSchedules?: {
            questionKey: string;
            key: string;
            kind: string;
            schedule: {
              standardDeductionMinor: number;
              sourceUrl: string;
              brackets: {
                overMinor: number;
                rateBasisPoints: number;
              }[];
            };
          }[];
          lawTerms?: {
            questionKey: string;
            key: string;
            value: number;
            unit: string;
          }[];
          note?: string;
          cite?: string;
          source?: string;
        }
      >;
    };
    "us-policy-positions:fiscal.graduated-income-tax": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          source: string;
          note?: string;
          lawSchedules?: {
            questionKey: string;
            key: string;
            kind: string;
            schedule: {
              standardDeductionMinor: number;
              sourceUrl: string;
              brackets: {
                overMinor: number;
                rateBasisPoints: number;
              }[];
            };
          }[];
          operativeAt?: string;
          cite?: string;
          constitution?: {
            cite: string;
            source: string;
            note: string;
          };
        }
      >;
    };
    "us-policy-positions:fiscal.balanced-operating-budget": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts?: boolean;
          cite?: string;
          source?: string;
          note: string;
          estimated?: string;
          operativeAt?: string;
        }
      >;
    };
    "us-policy-positions:fiscal.exempt-groceries-from-sales-tax": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          source?: string;
          note?: string;
          operativeAt?: string;
          cite?: string;
          estimated?: string;
        }
      >;
    };
    "us-policy-positions:fiscal.fund-pensions-to-schedule": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          cite?: string;
          source?: string;
          note: string;
          lawTerms?: {
            questionKey: string;
            key: string;
            unit: string;
            value: number;
          }[];
          operativeAt?: string;
          estimated?: string;
        }
      >;
    };
    "us-policy-positions:fiscal.cap-property-tax-growth": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts?: boolean;
          source?: string;
          note: string;
          cite?: string;
          estimated?: string;
          operativeAt?: string;
        }
      >;
    };
    "us-policy-positions:fiscal.minimum-reserve-balance": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts?: boolean;
          cite?: string;
          source?: string;
          note: string;
          estimated?: string;
          operativeAt?: string;
        }
      >;
    };
  };
};
export default data;
