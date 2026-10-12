import type {
  TownWardMap,
  CouncilWardPlan,
  WardDrawer,
} from "../../simulation/living-world/town-wards";
import { OFFICES_PARAMETERS } from "./parameters";
const DEVIATION = OFFICES_PARAMETERS.wardPopulationDeviation.value;
export function isWardSeat(
  plan: CouncilWardPlan | null,
  seat: number,
): boolean {
  return plan !== null && seat >= 1 && seat <= plan.wardSeats;
}

export function wardAt(map: TownWardMap, position: number): number {
  let ward = 1;
  for (const cut of map.cuts) if (position >= cut) ward += 1;
  return ward;
}

export function wardRange(
  map: TownWardMap,
  ward: number,
): readonly [number, number] {
  const from = ward <= 1 ? 0 : map.cuts[ward - 2]!;
  const to = ward > map.cuts.length ? map.households : map.cuts[ward - 1]!;
  return [from, to];
}

export function drawWardCuts(
  households: number,
  wards: number,
  drawnBy: WardDrawer,
  homes: readonly number[],
): number[] {
  const ideal = households / wards;
  const slack = Math.floor((ideal * DEVIATION) / 2);
  const sorted = [...homes].sort((left, right) => left - right);
  const cuts: number[] = [];
  let previous = 0;
  for (let k = 1; k < wards; k += 1) {
    const target = Math.round(ideal * k);
    if (drawnBy === "commission" || slack === 0) {
      cuts.push(target);
      previous = target;
      continue;
    }
    const lowest = Math.max(previous + 1, target - slack);
    const highest = Math.min(households - (wards - k), target + slack);
    const inWard = (cut: number) =>
      sorted.filter((home) => home >= previous && home < cut).length;
    let best = target;
    for (let step = 0; step <= slack; step += 1) {
      const options = step === 0 ? [target] : [target - step, target + step];
      const fits = options.find(
        (cut) => cut >= lowest && cut <= highest && inWard(cut) <= 1,
      );
      if (fits !== undefined) {
        best = fits;
        break;
      }
    }
    cuts.push(best);
    previous = best;
  }
  return cuts;
}
