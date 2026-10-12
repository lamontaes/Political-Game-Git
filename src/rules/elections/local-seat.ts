import { addDays, type IsoDate } from "./calendar";
import { nextTownElectionDay, type LocalCalendarFacts } from "./local-calendar";
import { seatIsUp } from "./seat-and-candidate";
import type {
  CouncilWardPlan,
  TownWardMap,
} from "../../simulation/living-world/town-wards";
import type { LocalGoverningBodyRules } from "../../simulation/nationwide-world/local-governing-body-rules";
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

export function seatWard(map: TownWardMap, seat: number): number {
  return map.seatWards.get(seat) ?? seat;
}
export interface LocalSeatFacts {
  readonly rules: LocalGoverningBodyRules | null;
  readonly calendar: LocalCalendarFacts;
  readonly plan: CouncilWardPlan | null;
  readonly map: TownWardMap | null;
  readonly home: number | null;
}
export function localCampaignSeat(
  facts: LocalSeatFacts,
  mayor: boolean,
  electionDate: IsoDate,
): number | null {
  if (mayor) return 0;
  const rules = facts.rules;
  const seatCount = rules?.seats?.value ?? 0;
  const termYears = rules?.termYears?.value ?? 4;
  const year = Number(electionDate.slice(0, 4));
  const { cadenceYears } = nextTownElectionDay(
    facts.calendar,
    addDays(electionDate, -1),
  );
  const up: number[] = [];
  for (let n = 1; n <= seatCount; n += 1)
    if (seatIsUp(n, year, cadenceYears, termYears)) up.push(n);
  const plan = facts.plan;
  const map = facts.map;
  const home = map ? facts.home : null;
  if (plan && map && home !== null) {
    const ward = wardAt(map, home);
    const own = up.find(
      (n) => isWardSeat(plan, n) && seatWard(map, n) === ward,
    );
    if (own !== undefined) return own;
    const atLarge = up.find((n) => !isWardSeat(plan, n));
    if (atLarge !== undefined) return atLarge;
  }
  return up[0] ?? null;
}
export function censusRedrawDue(
  map: { readonly drawnAt: IsoDate } | null,
  currentDate: IsoDate,
): { readonly censusYear: number } | null {
  const year = Number(currentDate.slice(0, 4));
  if (!map || year % 10 !== 1 || map.drawnAt >= `${year}-01-01`) return null;
  return { censusYear: year - 1 };
}
export function wardMembers<Id extends string>(
  seats: readonly (readonly [number, { readonly personId: Id }])[],
) {
  return [...seats]
    .filter(([seat]) => seat > 0)
    .map(([seat, row]) => ({ seat, personId: row.personId }));
}
