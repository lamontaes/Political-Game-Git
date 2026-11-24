// Hand-maintained shape of justice-public-safety.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  questions: {
    "us-policy-positions:justice-public-safety.permit-to-carry-concealed": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          cite?: string;
          source?: string;
          note?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.end-cash-bail": {
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
          estimated?: string;
          operativeAt?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.restore-voting-after-sentence": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts?: boolean;
          source?: string;
          note: string;
          estimated?: string;
          cite?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.raise-juvenile-court-age": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts?: boolean;
          source: string;
          note: string;
          lawTerms: {
            questionKey: string;
            key: string;
            value: number;
            unit: string;
          }[];
          cite?: string;
          operativeAt?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.civilian-oversight-of-police": {
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
          estimated?: string;
          operativeAt?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.stand-your-ground": {
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
          estimated?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.child-access-prevention": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          source?: string;
          note: string;
          cite?: string;
          operativeAt?: string;
          before?: {
            answer: string;
            preempts: boolean;
          };
          estimated?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.raise-handgun-purchase-age": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          source?: string;
          note: string;
          cite?: string;
          estimated?: string;
        }
      >;
    };
    "us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement": {
      source: string;
      note: string;
      answers: Record<
        string,
        {
          answer: string;
          preempts: boolean;
          source: string;
          note: string;
          cite?: string;
          operativeAt?: string;
          before?: {
            answer: string;
            preempts: boolean;
          };
          estimated?: string;
        }
      >;
    };
  };
};
export default data;
