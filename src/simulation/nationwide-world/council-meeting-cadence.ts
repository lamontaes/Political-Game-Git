import {
  municipalGovernments,
  municipalMeetingReading,
  type MunicipalCadence,
} from "../municipal-government";
import { placeReferencePopulation } from "./place-population";
import type {
  GovernmentUnitIdentity,
  GovernmentUnitType,
} from "../government-units";

export type CouncilMeetingPopulationBand =
  "under-50000" | "50000-to-249999" | "250000-plus";

export interface CouncilMeetingCadenceRow {
  readonly placeGeoid: string;
  readonly governmentUnitId: string;
  readonly governmentType: GovernmentUnitType;
  readonly populationBand: CouncilMeetingPopulationBand;
  readonly councilMeetingIntervalDays: number;
  readonly estimated: boolean;
  readonly sourceGovernmentKey: string | null;
  readonly sampleGovernmentKeys: readonly string[];
  readonly scheduleNotes: readonly {
    readonly governmentKey: string;
    readonly cadenceKind: string;
    readonly note: string;
  }[];
  readonly note: string;
}

interface CadenceSample {
  readonly governmentKey: string;
  readonly governmentType: GovernmentUnitType;
  readonly populationBand: CouncilMeetingPopulationBand;
  readonly intervalDays: number;
  readonly cadence: MunicipalCadence;
}

const DAYS_PER_YEAR = 365.2425;

export function councilMeetingPopulationBand(
  population: number,
): CouncilMeetingPopulationBand {
  if (population < 50_000) return "under-50000";
  if (population < 250_000) return "50000-to-249999";
  return "250000-plus";
}

/** A descriptive or unquantified schedule never becomes a numeric interval. */
export function intervalFromRecordedCadence(
  cadence: MunicipalCadence | null,
): number | null {
  if (!cadence) return null;
  if (cadence.kind === "WEEKLY") return 7;
  if (cadence.kind === "MONTHLY_ORDINAL_WEEKDAY" && cadence.ordinals.length > 0)
    return DAYS_PER_YEAR / (cadence.ordinals.length * 12);
  return null;
}

function sourceGovernmentType(
  government: ReturnType<typeof municipalGovernments>[number],
): GovernmentUnitType | null {
  const unitType = government.identity?.governmentUnit.unitType.toLowerCase();
  if (!unitType) return null;
  if (unitType.includes("county")) return "county";
  if (unitType.includes("township")) return "township";
  if (unitType.includes("municipal")) return "municipality";
  return null;
}

function cadenceSamples(): readonly CadenceSample[] {
  const samples: CadenceSample[] = [];
  for (const government of municipalGovernments()) {
    const placeGeoid = government.placeGeoid;
    const governmentType = sourceGovernmentType(government);
    if (!placeGeoid || !governmentType) continue;
    const population = placeReferencePopulation(placeGeoid)?.value;
    if (population === undefined) continue;
    const reading = municipalMeetingReading(government, "regular");
    const series = reading.meetingSeries.find(
      (entry) => entry.seriesKey === "regular",
    );
    const cadence = series?.cadence ?? null;
    const intervalDays = intervalFromRecordedCadence(cadence);
    if (intervalDays === null || cadence === null) continue;
    samples.push({
      governmentKey: government.key,
      governmentType,
      populationBand: councilMeetingPopulationBand(population),
      intervalDays,
      cadence,
    });
  }
  return samples;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[center]!
    : (sorted[center - 1]! + sorted[center]!) / 2;
}

function recordedCadenceForPlace(
  placeGeoid: string,
  governmentType: GovernmentUnitType,
): {
  readonly governmentKey: string;
  readonly intervalDays: number;
  readonly cadence: MunicipalCadence;
} | null {
  const government = municipalGovernments().find(
    (candidate) =>
      candidate.placeGeoid === placeGeoid &&
      sourceGovernmentType(candidate) === governmentType,
  );
  if (!government) return null;
  const reading = municipalMeetingReading(government, "regular");
  const series = reading.meetingSeries.find(
    (entry) => entry.seriesKey === "regular",
  );
  const cadence = series?.cadence ?? null;
  const intervalDays = intervalFromRecordedCadence(cadence);
  return intervalDays === null || cadence === null
    ? null
    : {
        governmentKey: government.key,
        intervalDays,
        cadence,
      };
}

/**
 * Builds one per-place row from that place's recorded regular schedule or
 * from the same-government-type, same-population-band median. A group without
 * readable schedules stays unavailable; no fixed interval is substituted.
 */
export function councilMeetingCadenceFor(
  unit: Pick<GovernmentUnitIdentity, "id" | "unitType" | "placeGeoid">,
  placeGeoidOverride?: string | null,
): CouncilMeetingCadenceRow | null {
  const placeGeoid = placeGeoidOverride ?? unit.placeGeoid;
  if (!placeGeoid) return null;
  const population = placeReferencePopulation(placeGeoid)?.value;
  if (population === undefined || population <= 0) return null;
  const populationBand = councilMeetingPopulationBand(population);
  const recorded = recordedCadenceForPlace(placeGeoid, unit.unitType);
  if (recorded)
    return {
      placeGeoid,
      governmentUnitId: unit.id,
      governmentType: unit.unitType,
      populationBand,
      councilMeetingIntervalDays: recorded.intervalDays,
      estimated: false,
      sourceGovernmentKey: recorded.governmentKey,
      sampleGovernmentKeys: [recorded.governmentKey],
      scheduleNotes: [
        {
          governmentKey: recorded.governmentKey,
          cadenceKind: recorded.cadence.kind,
          note: recorded.cadence.note,
        },
      ],
      note: "Interval read from this place's recorded regular meeting schedule.",
    };

  const peers = cadenceSamples().filter(
    (sample) =>
      sample.governmentType === unit.unitType &&
      sample.populationBand === populationBand,
  );
  const councilMeetingIntervalDays = median(
    peers.map((sample) => sample.intervalDays),
  );
  if (councilMeetingIntervalDays === null) return null;
  return {
    placeGeoid,
    governmentUnitId: unit.id,
    governmentType: unit.unitType,
    populationBand,
    councilMeetingIntervalDays,
    estimated: true,
    sourceGovernmentKey: null,
    sampleGovernmentKeys: peers.map((sample) => sample.governmentKey).sort(),
    scheduleNotes: peers
      .map((sample) => ({
        governmentKey: sample.governmentKey,
        cadenceKind: sample.cadence.kind,
        note: sample.cadence.note,
      }))
      .sort((left, right) =>
        left.governmentKey.localeCompare(right.governmentKey),
      ),
    note: "Estimated as the median recorded interval for this government type and population band.",
  };
}
