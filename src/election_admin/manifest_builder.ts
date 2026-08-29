import { ELECTION_ADMIN_SCHEMA_VERSION, sha256Hash } from "./provenance";
import type {
  CpsCalibrationRecord,
  EavsJurisdictionRecord,
  ElectionAdminManifest,
  HistoricalTurnoutSeriesRecord,
  PolicySurveyRecord,
  SourceCompletenessFlag,
} from "./types";

export function buildElectionAdminManifest(params: {
  readonly eavsRecords: readonly EavsJurisdictionRecord[];
  readonly policySurveys: readonly PolicySurveyRecord[];
  readonly cpsCalibrations: readonly CpsCalibrationRecord[];
  readonly historicalSeries: readonly HistoricalTurnoutSeriesRecord[];
  readonly generatedAt?: string;
}): ElectionAdminManifest {
  const generatedAt = params.generatedAt ?? new Date().toISOString();

  const totalEavsRecords = params.eavsRecords.length;
  const totalStateEavsRecords = params.eavsRecords.filter(
    (r) => r.level === "state" || r.level === "territory",
  ).length;
  const totalCountyEavsRecords = params.eavsRecords.filter(
    (r) => r.level === "county",
  ).length;
  const totalPolicySurveys = params.policySurveys.length;
  const totalCpsCalibrations = params.cpsCalibrations.length;
  const totalHistoricalSeries = params.historicalSeries.length;

  const jurisdictionMap = new Map<
    string,
    {
      jurisdictionId: string;
      jurisdictionName: string;
      fips: string;
      level: "national" | "state" | "county" | "territory";
      hasEavs: boolean;
      hasPolicySurvey: boolean;
      hasCpsCalibration: boolean;
      hasHistoricalSeries: boolean;
      completenessList: SourceCompletenessFlag[];
    }
  >();

  for (const eavs of params.eavsRecords) {
    let entry = jurisdictionMap.get(eavs.jurisdictionId);
    if (!entry) {
      entry = {
        jurisdictionId: eavs.jurisdictionId,
        jurisdictionName: eavs.jurisdictionName,
        fips: eavs.fips,
        level: eavs.level,
        hasEavs: true,
        hasPolicySurvey: false,
        hasCpsCalibration: false,
        hasHistoricalSeries: false,
        completenessList: [eavs.completeness.overall],
      };
      jurisdictionMap.set(eavs.jurisdictionId, entry);
    } else {
      entry.hasEavs = true;
      entry.completenessList.push(eavs.completeness.overall);
    }
  }

  for (const ps of params.policySurveys) {
    let entry = jurisdictionMap.get(ps.jurisdictionId);
    if (!entry) {
      entry = {
        jurisdictionId: ps.jurisdictionId,
        jurisdictionName: ps.jurisdictionName,
        fips: ps.fips,
        level: "state",
        hasEavs: false,
        hasPolicySurvey: true,
        hasCpsCalibration: false,
        hasHistoricalSeries: false,
        completenessList: [ps.completeness],
      };
      jurisdictionMap.set(ps.jurisdictionId, entry);
    } else {
      entry.hasPolicySurvey = true;
      entry.completenessList.push(ps.completeness);
    }
  }

  for (const cps of params.cpsCalibrations) {
    let entry = jurisdictionMap.get(cps.jurisdictionId);
    if (!entry) {
      entry = {
        jurisdictionId: cps.jurisdictionId,
        jurisdictionName: cps.jurisdictionName,
        fips: cps.fips,
        level:
          cps.jurisdictionId === "us_fed"
            ? "national"
            : cps.jurisdictionId.startsWith("us_pr")
              ? "territory"
              : "state",
        hasEavs: false,
        hasPolicySurvey: false,
        hasCpsCalibration: true,
        hasHistoricalSeries: false,
        completenessList: [cps.completeness],
      };
      jurisdictionMap.set(cps.jurisdictionId, entry);
    } else {
      entry.hasCpsCalibration = true;
      entry.completenessList.push(cps.completeness);
    }
  }

  for (const hist of params.historicalSeries) {
    let entry = jurisdictionMap.get(hist.jurisdictionId);
    if (!entry) {
      entry = {
        jurisdictionId: hist.jurisdictionId,
        jurisdictionName: hist.jurisdictionName,
        fips: hist.fips,
        level: hist.jurisdictionId === "us_fed" ? "national" : "state",
        hasEavs: false,
        hasPolicySurvey: false,
        hasCpsCalibration: false,
        hasHistoricalSeries: true,
        completenessList: ["complete"],
      };
      jurisdictionMap.set(hist.jurisdictionId, entry);
    } else {
      entry.hasHistoricalSeries = true;
      entry.completenessList.push("complete");
    }
  }

  const jurisdictionCoverage = Array.from(jurisdictionMap.values())
    .sort((a, b) => {
      if (a.level !== b.level) {
        const order = { national: 0, state: 1, territory: 2, county: 3 };
        return order[a.level] - order[b.level];
      }
      return a.jurisdictionId.localeCompare(b.jurisdictionId);
    })
    .map((j) => {
      let completenessSummary: SourceCompletenessFlag = "complete";
      if (j.completenessList.includes("unreported")) {
        completenessSummary = "partial";
      } else if (j.completenessList.includes("item_nonresponse")) {
        completenessSummary = "item_nonresponse";
      } else if (j.completenessList.includes("partial")) {
        completenessSummary = "partial";
      }
      return {
        jurisdictionId: j.jurisdictionId,
        jurisdictionName: j.jurisdictionName,
        fips: j.fips,
        level: j.level,
        hasEavs: j.hasEavs,
        hasPolicySurvey: j.hasPolicySurvey,
        hasCpsCalibration: j.hasCpsCalibration,
        hasHistoricalSeries: j.hasHistoricalSeries,
        completenessSummary,
      };
    });

  const eavsPartitionSha256 = sha256Hash(params.eavsRecords);
  const policySurveyPartitionSha256 = sha256Hash(params.policySurveys);
  const cpsPartitionSha256 = sha256Hash(params.cpsCalibrations);
  const historicalTurnoutPartitionSha256 = sha256Hash(params.historicalSeries);

  const normalizedCorpusSha256 = sha256Hash({
    eavs: params.eavsRecords,
    policySurveys: params.policySurveys,
    cpsCalibrations: params.cpsCalibrations,
    historicalSeries: params.historicalSeries,
  });

  return {
    schemaVersion: ELECTION_ADMIN_SCHEMA_VERSION,
    generatedAt,
    summary: {
      totalEavsRecords,
      totalStateEavsRecords,
      totalCountyEavsRecords,
      totalPolicySurveys,
      totalCpsCalibrations,
      totalHistoricalSeries,
      totalJurisdictionsCovered: jurisdictionMap.size,
    },
    jurisdictionCoverage,
    corpusFileHashes: {
      normalizedCorpusSha256,
      eavsPartitionSha256,
      policySurveyPartitionSha256,
      cpsPartitionSha256,
      historicalTurnoutPartitionSha256,
    },
  };
}
