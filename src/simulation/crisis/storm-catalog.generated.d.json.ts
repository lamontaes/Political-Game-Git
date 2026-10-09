// Hand-maintained shape of storm-catalog.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  counts: {
    countyRowsKept: number;
    detailRowsRead: number;
    episodesCompiled: number;
    zoneRowsSeparate: number;
  };
  dataProduct: string;
  episodeDetailPolicy: {
    aggregatesCoverFullWindow: boolean;
    appliedStep: string;
    byteBudget: number;
    czNameIncluded: boolean;
    episodeRowYears: {
      firstYear: number;
      lastYear: number;
    };
    episodeRowsCoverFullWindow: boolean;
    episodeRowsEmitted: number;
    episodesCompiledInWindow: number;
    fullWindowEpisodeArrayCompactBytes: {
      withCzName: number;
      withoutCzName: number;
    };
    rule: string;
    warning: string;
  };
  episodes: {
    affectedAreas: {
      countyFips: string;
      czType: string;
      stateFips: string;
    }[];
    endDate: string;
    episodeId: string;
    eventCount: number;
    eventIds: number[];
    family: string;
    month: number;
    sourceFile: string;
    startDate: string;
    year: number;
  }[];
  eventFamilies: string[];
  fieldNotes: {
    episodesPerExposureYear: string;
    monthAssignment: string;
    stateAttribution: string;
    stateMonthlyCatalogGrid: string;
  };
  monthlyCatalog: {
    episodeCount: number;
    episodesPerExposureYear: number;
    eventRowCount: number;
    family: string;
    missingYearNote: null;
    month: number;
  }[];
  reconciliation: string[];
  schema: string;
  sources: {
    byteLength: number;
    fileName: string;
    id: string;
    retrievedAt: string;
    sha256: string;
    url: string;
  }[];
  stateFootprintProfile: {
    episodeCount: number;
    family: string;
    medianCountiesPerEpisode: number;
    p90CountiesPerEpisode: number;
    stateFips: string;
    stateUsps: string;
  }[];
  stateMonthlyCatalog: {
    episodeCount: number;
    episodesPerExposureYear: number;
    family: string;
    missingYearNote: null;
    month: number;
    stateFips: string;
    stateUsps: string;
  }[];
  window: {
    exposureYears: number;
    firstYear: number;
    lastYear: number;
    missingYears: unknown[];
    note: string;
  };
};
export default data;
