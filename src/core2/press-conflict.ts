/**
 * The press-employment conflict (CTO ruling pending owner confirmation, Oct 14, 2026): a working
 * reporter, an outlet's head or an outlet's owner may not hold office,
 * appoint or run while working for or owning the outlet.
 *
 * `pressConflict` reads the press engine's outlets table by module id (an
 * import of the press module's values would close a cycle with the offices
 * and candidacy modules) and indexes every outlet's staff once a day, so a
 * call is a map lookup and never scans the world.
 */
import type { CoreAPI, PersonId } from "./types";

const PRESS = "core2-press-v1";

export type PressConflictRole = "reporter" | "head" | "owner";

export interface PressConflict {
  readonly outletId: string;
  readonly role: PressConflictRole;
}

interface OutletStaff {
  id: string;
  ownerId: string | null;
  headId: string | null;
  reporterIds?: readonly string[];
}

const indexes = new WeakMap<
  object,
  { date: string; byPerson: Map<PersonId, PressConflict> }
>();

function indexFor(api: CoreAPI): Map<PersonId, PressConflict> {
  const held = indexes.get(api.state);
  if (held && held.date === api.state.date) return held.byPerson;
  const byPerson = new Map<PersonId, PressConflict>();
  if (api.state.modules.has(PRESS)) {
    const rows = api
      .moduleState(PRESS)
      .table("outlets")
      .rows() as unknown as OutletStaff[];
    // A person who owns one outlet and writes for another reports the
    // owner's role: the stronger tie, and the order is by outlet id.
    for (const outlet of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const id of outlet.reporterIds ?? [])
        if (!byPerson.has(id))
          byPerson.set(id, { outletId: outlet.id, role: "reporter" });
      if (outlet.headId)
        byPerson.set(outlet.headId, { outletId: outlet.id, role: "head" });
    }
    for (const outlet of rows)
      if (outlet.ownerId)
        byPerson.set(outlet.ownerId, { outletId: outlet.id, role: "owner" });
  }
  indexes.set(api.state, { date: api.state.date, byPerson });
  return byPerson;
}

/** The outlet a person works for or owns today, or null. */
export function pressConflict(
  api: CoreAPI,
  personId: PersonId,
): PressConflict | null {
  const conflict = indexFor(api).get(personId) ?? null;
  if (conflict) {
    // stopgapId: SG-GOV-press-office-owner-confirmation
    api.stopgap("SG-GOV-press-office-owner-confirmation");
  }
  return conflict;
}
