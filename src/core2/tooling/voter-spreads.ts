import records from "../../../data/source/census-voting-registration/corpus.json" with { type: "json" };
import { moduleKey } from "../module-data";
import type { VoterSpread } from "../voter-groups";
interface CensusRow {
  dimension: string;
  geographyName: string;
  group: string;
  recordId: string;
  releaseDate: string;
  metrics: Record<
    string,
    { denominator: string; value: { state: string; value?: number } }
  >;
}
/** Developer checks only. CPS survey margins describe observations, never cohort initialization. */
export function censusVoterSpreads(
  placeId: string,
  geographyName: string,
): readonly VoterSpread[] {
  moduleKey(placeId);
  moduleKey(geographyName);
  return Object.freeze(
    (records as unknown as readonly CensusRow[])
      .filter(
        (row) => row.dimension === "age" && row.geographyName === geographyName,
      )
      .map((row) => {
        const rate = row.metrics.votedCitizenPercent!,
          margin = row.metrics.votedCitizenMoe!;
        if (
          rate.denominator !== "citizen-adults" ||
          margin.denominator !== "citizen-adults" ||
          rate.value.state !== "HISTORICAL" ||
          margin.value.state !== "HISTORICAL" ||
          rate.value.value === undefined ||
          margin.value.value === undefined
        )
          throw new Error(
            "CPS voter spread is not an available citizen-adult observation.",
          );
        return Object.freeze({
          id: row.recordId,
          placeId,
          ageBand: row.group,
          asOf: "2024-11-30",
          turnout: Object.freeze([
            Math.max(0, (rate.value.value - margin.value.value) / 100),
            Math.min(1, (rate.value.value + margin.value.value) / 100),
          ]) as readonly [number, number],
          source: Object.freeze({
            tag: "SOURCED" as const,
            asOf: row.releaseDate,
            citation: `U.S. Census Bureau November 2024 CPS voting table 4c; ${row.recordId}; citizen adults; published 90% margin of error.`,
          }),
        });
      }),
  );
}
