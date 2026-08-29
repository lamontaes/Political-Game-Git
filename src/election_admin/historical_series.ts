import {
  makeHistoricalTurnoutSeriesRecordId,
  normalizeJurisdictionId,
} from "./ids";
import { createElectionAdminProvenance } from "./provenance";
import type {
  HistoricalTurnoutEntry,
  HistoricalTurnoutSeriesRecord,
} from "./types";

export interface RawHistoricalTurnoutSeriesInput {
  readonly stateAbbr: string;
  readonly fips: string;
  readonly jurisdictionName: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
  readonly seriesEntries: readonly {
    readonly year: number;
    readonly electionType: "presidential" | "midterm";
    readonly votingAgePopulation?: number | null;
    readonly citizenVotingAgePopulation?: number | null;
    readonly officialAdministrativeTurnout: {
      readonly highestOfficeVotesCast?: number | null;
      readonly totalBallotsCounted?: number | null;
      readonly vapTurnoutRatePercent?: number | null;
      readonly cvapTurnoutRatePercent?: number | null;
    };
    readonly cpsSurveyReportedTurnout: {
      readonly reportedVotedCount: number;
      readonly reportedVotedRatePercent: number;
      readonly marginOfError90Percent: number;
    };
    readonly notes?: string;
  }[];
  readonly notes?: string;
}

export function normalizeHistoricalTurnoutSeries(
  input: RawHistoricalTurnoutSeriesInput,
): HistoricalTurnoutSeriesRecord {
  const jurisdictionId = normalizeJurisdictionId(input.stateAbbr);
  const id = makeHistoricalTurnoutSeriesRecordId(
    jurisdictionId,
    input.startYear,
    input.endYear,
  );

  const seriesEntries: HistoricalTurnoutEntry[] = input.seriesEntries.map(
    (entry) => ({
      year: entry.year,
      electionType: entry.electionType,
      votingAgePopulation: entry.votingAgePopulation ?? null,
      citizenVotingAgePopulation: entry.citizenVotingAgePopulation ?? null,
      officialAdministrativeTurnout: {
        highestOfficeVotesCast:
          entry.officialAdministrativeTurnout.highestOfficeVotesCast ?? null,
        totalBallotsCounted:
          entry.officialAdministrativeTurnout.totalBallotsCounted ?? null,
        vapTurnoutRatePercent:
          entry.officialAdministrativeTurnout.vapTurnoutRatePercent ?? null,
        cvapTurnoutRatePercent:
          entry.officialAdministrativeTurnout.cvapTurnoutRatePercent ?? null,
        sourceType: "administrative_official",
      },
      cpsSurveyReportedTurnout: {
        reportedVotedCount: entry.cpsSurveyReportedTurnout.reportedVotedCount,
        reportedVotedRatePercent:
          entry.cpsSurveyReportedTurnout.reportedVotedRatePercent,
        marginOfError90Percent:
          entry.cpsSurveyReportedTurnout.marginOfError90Percent,
        sourceType: "survey_sample_estimate",
      },
      ...(entry.notes ? { notes: entry.notes } : {}),
    }),
  );

  const payloadToHash = {
    id,
    jurisdictionId,
    fips: input.fips,
    startYear: input.startYear,
    endYear: input.endYear,
    seriesEntries,
  };

  const provenance = createElectionAdminProvenance({
    source: "U.S. Census Bureau & EAC / Clerk of the House",
    publisher: "CPS Historical Table A-1 & Federal Election Results Canvass",
    dataset: `Historical Turnout Series ${input.startYear}-${input.endYear}`,
    vintageYear: input.endYear,
    retrievalDate: input.retrievalDate,
    sourceUrl: input.sourceUrl,
    payloadToHash,
    notes: input.notes,
  });

  return {
    id,
    jurisdictionId,
    jurisdictionName: input.jurisdictionName,
    fips: input.fips,
    startYear: input.startYear,
    endYear: input.endYear,
    seriesEntries,
    provenance,
  };
}
