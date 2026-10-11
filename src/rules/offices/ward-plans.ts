import { OFFICES_PARAMETERS } from "./parameters";
// STOPGAP offices.ward-size-rank: Population rank chooses at-large/ward/mixed composition from national survey shares where the charter is unread.
// stopgapId: "offices.ward-size-rank"
import type {
  CouncilWardPlan,
  TownWardMap,
  WardDrawer,
} from "../../simulation/living-world/town-wards";
import type { MunicipalReading } from "../../simulation/municipal-government";
import { drawWardCuts, wardAt, wardRange, isWardSeat } from "./ward-seats";
type Composition = NonNullable<MunicipalReading["composition"]>;
export interface National {
  readonly atLarge: number;
  readonly wards: number;
  readonly combinationWardShare: number;
  readonly citation: string;
}
export function sizeRank(
  unitId: string,
  towns: readonly { readonly id: string; readonly population: number }[],
): number {
  const ordered = [...towns].sort(
    (left, right) =>
      left.population - right.population || left.id.localeCompare(right.id),
  );
  const state = new Map(
    ordered.map((row, index) => [
      row.id,
      (index + OFFICES_PARAMETERS.wardRankOffset.value) / towns.length,
    ]),
  );
  return state.get(unitId) ?? 0;
}
export function charterWardSeats(
  compiled: { readonly key: string } | null,
  composition: Composition | null,
  seats: number,
): CouncilWardPlan | null {
  if (!compiled || !composition) return null;
  const read =
    composition.pattern === "AT_LARGE"
      ? 0
      : (composition.districtSeats ?? 0) + (composition.wardSeats ?? 0);
  if (read === 0 && composition.pattern !== "AT_LARGE") return null;
  const wardSeats = Math.min(read, seats);
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "charter",
    citation: `${compiled.key}: the charter's council composition (${composition.pattern}).`,
  };
}
export function councilWardPlan(
  hasIdentity: boolean,
  seats: number | null,
  charter: CouncilWardPlan | null,
  rank: number,
  NATIONAL: National,
): CouncilWardPlan | null {
  if (!hasIdentity) return null;
  if (seats === null || seats < 1) return null;
  if (charter) return charter;
  const wardSeats =
    seats < 3 || rank < NATIONAL.atLarge
      ? 0
      : rank < NATIONAL.atLarge + NATIONAL.wards
        ? seats
        : Math.min(
            seats - 1,
            Math.max(2, Math.round(seats * NATIONAL.combinationWardShare)),
          );
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "estimated",
    citation: NATIONAL.citation,
  };
}
export function redrawTownWards(input: {
  readonly unit: { readonly id: string };
  readonly plan: CouncilWardPlan | null;
  readonly households: number;
  readonly homes: readonly {
    readonly seat: number;
    readonly personId: string;
    readonly home: number | null;
  }[];
  readonly drawnBy: WardDrawer;
  readonly onDate: string;
  readonly governingAnswer: string | null;
}) {
  const { plan, households, onDate, drawnBy } = input;
  if (!plan || plan.wardSeats < 2) return null;
  if (households < plan.wardSeats) return null;
  const homes = input.homes
    .filter((row) => isWardSeat(plan, row.seat))
    .flatMap((row) => (row.home === null ? [] : [{ ...row, home: row.home }]));
  const cuts = drawWardCuts(
    households,
    plan.wardSeats,
    drawnBy,
    homes.map((row) => row.home),
  );
  const draft: TownWardMap = {
    unitId: input.unit.id,
    wards: plan.wardSeats,
    households,
    cuts,
    seatWards: new Map(),
    drawnBy: drawnBy,
    drawnAt: onDate,
    paired: [],
  };
  const seatWards = new Map<number, number>();
  const claimed = new Set<number>();
  for (const row of homes) {
    const ward = wardAt(draft, row.home);
    if (claimed.has(ward)) continue;
    seatWards.set(row.seat, ward);
    claimed.add(ward);
  }
  const free = Array.from({ length: plan.wardSeats }, (_, i) => i + 1).filter(
    (ward) => !claimed.has(ward),
  );
  for (let seat = 1; seat <= plan.wardSeats; seat += 1)
    if (!seatWards.has(seat)) seatWards.set(seat, free.shift()!);
  const shared = homes.filter(
    (row) => seatWards.get(row.seat) !== wardAt(draft, row.home),
  );
  const paired = homes.filter((row) =>
    homes.some(
      (other) =>
        other.personId !== row.personId &&
        wardAt(draft, other.home) === wardAt(draft, row.home),
    ),
  );
  const sizes = Array.from({ length: plan.wardSeats }, (_, i) => {
    const [from, to] = wardRange(draft, i + 1);
    return to - from;
  });
  const deviation =
    (Math.max(...sizes) - Math.min(...sizes)) / (households / plan.wardSeats);

  return {
    map: { ...draft, seatWards, paired: paired.map((row) => row.personId) },
    shared: shared.map((row) => row.personId),
    deviation,
    attributionEligible:
      (input.governingAnswer === "yes"
        ? "commission"
        : input.governingAnswer === "no"
          ? "council"
          : null) === drawnBy,
  };
}
