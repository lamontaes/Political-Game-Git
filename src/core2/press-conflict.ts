/**
 * Who works for or owns an outlet today. Press staff may run for office and
 * hold it (owner, Oct 16, 2026: "a reporter who wants to run may run"); this
 * index is not a bar. The only reader is the stand-in that seats a vacant
 * local office without an election (offices.ts), which does not pick someone
 * because of a press job: the defect the owner named was a reporter put into
 * an empty seat automatically at the opening.
 *
 * `pressConflict` reads the press engine's outlets table by module id (an
 * import of the press module's values would close a cycle with the offices
 * and candidacy modules) and indexes every outlet's staff once a day and
 * again whenever the press changes an outlet's people (`pressStaffChanged`), so
 * a call is a map lookup and never scans the world.
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

/**
 * The press changed an outlet's people: the next call reads the outlets table
 * again, so an answer never depends on when in the day it was first asked.
 */
export function pressStaffChanged(api: CoreAPI): void {
  indexes.delete(api.state);
}

/** The outlet a person works for or owns today, or null. */
export function pressConflict(
  api: CoreAPI,
  personId: PersonId,
): PressConflict | null {
  return indexFor(api).get(personId) ?? null;
}
