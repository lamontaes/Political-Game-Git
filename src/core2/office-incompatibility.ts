import laws from "./data/offices/incompatibility.json" with { type: "json" };
import type { OfficeInput } from "./offices-local";

/** The law preventing simultaneous service; null means these data permit it. */
export function incompatibleOffices(
  a: OfficeInput,
  b: OfficeInput,
  stateKey: string,
): { citation: string; tag: "SOURCED" | "ESTIMATED" } | null {
  if (a.id === b.id) return null;
  const f = laws.federal;
  const legislative = (o: OfficeInput) =>
    f.legislativeKinds.some((kind) => o.kind.startsWith(kind));
  const executive = (o: OfficeInput) => f.executiveKinds.includes(o.kind);
  if ((legislative(a) && executive(b)) || (legislative(b) && executive(a)))
    return { citation: f.citation, tag: "SOURCED" };
  // stopgapId: SG-GOV-dual-office-law — exceptions await per-place research.
  const row = (
    laws.places as Record<
      string,
      { multipleElectiveOffices: boolean; citation: string }
    >
  )[stateKey];
  if (!row) throw new Error(`No incompatibility rule for ${stateKey}`);
  return a.elected && b.elected && !row.multipleElectiveOffices
    ? { citation: row.citation, tag: "ESTIMATED" }
    : null;
}
