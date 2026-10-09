// Hand-maintained shape of catalog.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  about: string;
  measuredAt: {
    main: string;
  };
  levels: string[];
  whoActsByDefault: {
    federal: string;
    state: string;
    dc: string;
    territory: string;
    county: string;
    city: string;
    "school-district": string;
    "special-district": string;
  };
  areas: {
    "10": string;
    "11": string;
    "12": string;
    "13": string;
    "14": string;
    "15": string;
    "16": string;
    "17": string;
    "18": string;
    "01": string;
    "02": string;
    "03": string;
    "04": string;
    "05": string;
    "06": string;
    "07": string;
    "08": string;
    "09": string;
  };
  routes: Array<{
    id: string;
    what: string;
    levers: string;
    undoneBy: null | string;
  }>;
  newResearchQuestions: {
    "subject-preemption-inventory-56-places": string;
    "school-district-and-special-district-powers": string;
    "state-labor-rules-overtime-leave-bargaining": string;
    "rights-and-social-issues-by-state": string;
    "immigration-state-policies": string;
  };
  dials: {
    id: string;
    area: string;
    name: string;
    lever: string;
    carries: string;
    spec: string;
    levels: {
      federal: {
        may: string;
        status: string;
        limits?: string;
        source: string;
      };
      state: {
        may: string;
        status: string;
        limits?: string;
        source?: string;
        note?: string;
        question?: string;
        currentRule?: string;
      };
      dc: {
        may: string;
        status: string;
        limits?: string;
        source: string;
      };
      territory: {
        may: string;
        status: string;
        limits?: string;
        source?: string;
        question?: string;
        note?: string;
      };
      county: {
        may: string;
        status: string;
        limits?: string;
        source?: string;
        note?: string;
        question?: string;
      };
      city: {
        may: string;
        status: string;
        limits?: string;
        source?: string;
        note?: string;
        question?: string;
        currentRule?: string;
      };
      "school-district": {
        may: string;
        status: string;
        limits?: string;
        source?: string;
        question?: string;
        note?: string;
      };
      "special-district": {
        may: string;
        status: string;
        question: string;
        note?: string;
      };
    };
  }[];
};
export default data;
