/**
 * The President acts when nobody plays them (Nation, Nov 8, 2026). The
 * cabinet machinery is the one the played president uses
 * (office-day-federal-president.ts): `nominate` takes the candidate the
 * appointments engine ranks first by the president's own reasons (their
 * side, a candidate's years in office, whether they know them), the Senate
 * votes on its sitting day (`confirmGivenVotes`, by the members' sides), and
 * each step is a public record the press reports. This module only drives
 * it for a sitting president who is not the player: every open post gets its
 * nomination the day it is open, and every nomination due a vote is voted.
 * Orders and pardons stay with their stopgaps
 * (SG-OFFICE-FED-presidential-orders, SG-OFFICE-FED-pardons): the executive
 * engine has no federal orders and the justice engine no federal convictions.
 */
// The federal day first: the president file registers a part of it on load.
import { OFFICE_DAY_FEDERAL_MODULE_ID } from "../office-day-federal";
import {
  cabinetOf,
  confirmGivenVotes,
  nominate,
} from "../office-day-federal-president";
import { OFFICES_MODULE_ID } from "./offices";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const PRESIDENT_ACTS_MODULE_ID = "president-acts";

interface TermRow {
  readonly personId: string;
}

/** The sitting president, or null. */
function sittingPresident(api: CoreAPI): string | null {
  const term = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
  )[0];
  return term?.personId ?? null;
}

export const PRESIDENT_ACTS_MODULE: CoreModule = {
  id: PRESIDENT_ACTS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {} } },
  onDay(api) {
    const core = api.state as CoreState;
    if (
      !core.modules.has(OFFICES_MODULE_ID) ||
      !core.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID)
    )
      return;
    const president = sittingPresident(api);
    // A played president (the player's character, bound the first day it is played)
    // chooses their own nominees and calls their own votes.
    if (
      !president ||
      president === core.playerId ||
      isExplicitlyControlledPersonV1(core, president)
    )
      return;
    if (!core.people.get(president)?.alive) return;
    for (const row of cabinetOf(api)) {
      if (row.status !== "vacant" && row.status !== "rejected") continue;
      try {
        nominate(api, president, row.postId);
      } catch {
        // No one to nominate for this post yet: it stays open.
      }
    }
    confirmGivenVotes(api, president);
  },
};

/** Install the engine in a world (after the offices and the federal office day). */
export function openPresidentActs(core: CoreState): void {
  if (!core.modules.has(PRESIDENT_ACTS_MODULE_ID))
    registerModule(core, PRESIDENT_ACTS_MODULE);
}
