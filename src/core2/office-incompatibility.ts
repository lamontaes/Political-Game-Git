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
  // A seat in Congress is barred from an office under the United States
  // (above), not from a local one: the state's bar covers its own state and
  // local offices among themselves (owner defect, Orem, Utah, seed
  // fed-filing-1: the House seat was lost on winning a council seat).
  const local = (o: OfficeInput) => !["federal", "state"].includes(o.level);
  if ((legislative(a) && local(b)) || (legislative(b) && local(a))) return null;
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
