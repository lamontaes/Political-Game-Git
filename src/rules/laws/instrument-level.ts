import type { LawLevel } from "./law-in-force";
export type GovernmentLawInstrument =
  "statute" | "regulation" | "executive-order";

export function lawLevelForInstrument(
  base: LawLevel,
  instrument: GovernmentLawInstrument = "statute",
): LawLevel {
  if (instrument === "statute") return base;
  if (base === "federal-statute")
    return instrument === "regulation"
      ? "federal-regulation"
      : "federal-executive-order";
  if (base === "state-statute")
    return instrument === "regulation"
      ? "state-regulation"
      : "state-executive-order";
  if (base === "local-ordinance")
    return instrument === "regulation"
      ? "local-regulation"
      : "local-executive-order";
  throw new Error(
    `Government instruments cannot be issued at law level '${base}'.`,
  );
}
