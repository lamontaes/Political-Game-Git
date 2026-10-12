import type { EntityId } from "../../simulation/types";
import type {
  SeatView,
  ChamberView,
} from "../../simulation/living-world/contract";
export function totalsFor(seats: readonly SeatView[]): ChamberView["totals"] {
  const byParty = new Map<EntityId | null, number>();
  const byCaucus = new Map<EntityId | null, number>();
  let members = 0;
  let vacancies = 0;
  let noCurrentRecord = 0;
  for (const seat of seats) {
    if (seat.occupant.kind === "vacancy") vacancies += 1;
    else if (seat.occupant.kind === "no-current-record") noCurrentRecord += 1;
    else {
      members += 1;
      const { partyOrganizationId, caucusOrganizationId } =
        seat.occupant.member;
      byParty.set(
        partyOrganizationId,
        (byParty.get(partyOrganizationId) ?? 0) + 1,
      );
      byCaucus.set(
        caucusOrganizationId,
        (byCaucus.get(caucusOrganizationId) ?? 0) + 1,
      );
    }
  }
  const order = <K>(map: Map<K, number>) =>
    [...map.entries()].sort(
      (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
    );
  return {
    seats: seats.length,
    members,
    vacancies,
    noCurrentRecord,
    byParty: order(byParty).map(([partyOrganizationId, count]) => ({
      partyOrganizationId,
      members: count,
    })),
    byCaucus: order(byCaucus).map(([caucusOrganizationId, count]) => ({
      caucusOrganizationId,
      members: count,
    })),
  };
}
