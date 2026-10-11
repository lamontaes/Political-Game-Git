// Lifted unchanged from src/simulation/municipal-public-work.ts; RULES-3, 2026-10-11.
import type { MunicipalReading } from "../../simulation/municipal-government";
import type { IsoDate, LifeRecordProvenance } from "../../simulation/types";

export function corpusProvenance(
  reference: string,
  reading: MunicipalReading,
  recordDate: IsoDate,
): LifeRecordProvenance {
  if (reading.evidence === "game-profile") {
    return {
      kind: "authored",
      note: `${reading.basisType ?? "Local government game profile"} Identity ${reference} comes from the Census government-unit catalog; procedure is authored for this saved world.`,
    };
  }
  const asOf = reading.asOf as IsoDate;
  if (asOf <= recordDate) {
    return {
      kind: "source-record",
      reference: `municipal-governance/${reference} (${reading.evidence})`,
      asOf,
    };
  }
  return {
    kind: "authored",
    note: `Installed from municipal-governance/${reference} (${reading.evidence}), which speaks as of ${asOf} — after this world's ${recordDate}. The reading is not backdated; this record is an authored placement of a later reading.`,
  };
}
