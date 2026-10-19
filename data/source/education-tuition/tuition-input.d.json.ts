// Hand-maintained shape of tuition-input.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  artifacts: {
    IC2023_AY: {
      sha256: string;
    };
    IC2023_AY_Dict: {
      sha256: string;
    };
    IC2023_PY: {
      sha256: string;
    };
    IC2023_PY_Dict: {
      sha256: string;
    };
  };
  definitions: Record<string, {
    label: string;
    description: string;
    chargeUnit: null | string;
    academicYear: null | string;
    imputationField: string;
    dictionaryEvidence: {
      artifactId: string;
      sha256: string;
      member: string;
      sheet: string;
      row: number;
      field: string;
    };
  }>;
  components: {
    IC2023_AY: {
      member: string;
      columns: string[];
      rows: Array<Array<number | string | string[]>>;
    };
    IC2023_PY: {
      member: string;
      columns: string[];
      rows: Array<Array<number | string | string[]>>;
    };
  };
};
export default data;
