import type { MunicipalCompositionValue } from "../municipal-government";

export type LocalGoverningBodySeatWord = "district" | "ward" | "at-large";

export function localGoverningBodySeatLabel(
  officeTitle: string,
  seat: number,
  word: LocalGoverningBodySeatWord,
): string {
  const detail =
    word === "ward"
      ? `Ward ${seat}, `
      : word === "at-large"
        ? "At-large "
        : "District ";
  return `${officeTitle}, ${detail}seat ${seat}`;
}

/** Resolve one seat from the counts in the compiled government's reading. */
export function localGoverningBodySeatWordFromComposition(
  composition: MunicipalCompositionValue | null,
  seat: number,
  totalSeats: number | null = null,
): LocalGoverningBodySeatWord {
  if (!composition) return "district";
  if (composition.pattern === "AT_LARGE") return "at-large";

  const wardSeats = Math.max(0, composition.wardSeats ?? 0);
  const districtSeats = Math.max(0, composition.districtSeats ?? 0);
  const atLargeSeats = Math.max(0, composition.atLargeSeats ?? 0);
  if (composition.pattern === "WARD" && wardSeats === 0) return "ward";
  if (seat > 0 && seat <= wardSeats) return "ward";
  if (seat > wardSeats && seat <= wardSeats + districtSeats) return "district";
  const representedSeats = wardSeats + districtSeats;
  const firstAtLargeSeat =
    representedSeats > 0
      ? representedSeats + 1
      : totalSeats === null
        ? 1
        : Math.max(1, totalSeats - atLargeSeats + 1);
  if (
    atLargeSeats > 0 &&
    seat >= firstAtLargeSeat &&
    seat < firstAtLargeSeat + atLargeSeats
  )
    return "at-large";
  return "district";
}
