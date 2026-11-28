/**
 * The counted families' school tuition: the households with children in a
 * private school, and setting the tuition a household pays. They are the
 * residents engine's own writers, moved here as written; modules/residents.ts
 * re-exports both.
 */
import { ageOn } from "./counted-groups";
import { makeIsoDate, addDays } from "./kernel/dates";
import type { CountedSchoolFamily } from "./modules/residents";
import { ownMap } from "./resident-flows";
import { schedule } from "./resident-households";
import { nextMonthDay } from "./residents";
import {
  runtimes,
  householdCashReader,
  householdPart,
} from "./residents-reads";
import type { CoreState, PlaceId, Source } from "./types";

/** The counted households of these places with children aged `first` to `last`. */
export function countedSchoolFamilies(
  core: CoreState,
  places: ReadonlySet<PlaceId>,
  first: number,
  last: number,
): CountedSchoolFamily[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const at = makeIsoDate(core.date);
  const cash = householdCashReader(rt);
  const out: CountedSchoolFamily[] = [];
  for (const h of rt.store.liveHouseholds()) {
    if (!places.has(h.placeId)) continue;
    let children = 0,
      adults = 0;
    for (const m of rt.store.countedMembers(h)) {
      const age = ageOn(rt.store.born[m]!, at);
      if (age >= first && age <= last) children++;
      else if (age > last) adults++;
    }
    if (!children || !adults) continue;
    out.push({
      householdId: h.id,
      placeId: h.placeId,
      children,
      weight: rt.store.weightOf(h),
      cashPerChild: cash(h) / children,
    });
  }
  return out;
}

/**
 * Set what a counted household pays a private school each month (its record's
 * amount; its group pays it times the households the record stands for), or
 * nothing to end it. The amount is the household's part of the school's
 * merged tuition flow, opened if no counted household has paid it yet.
 */
export function setCountedTuition(
  core: CoreState,
  householdId: string,
  school: { id: string; placeId: PlaceId },
  monthlyMinor: number,
  terms: { financeKind: string; source: Source },
): void {
  const rt = runtimes.get(core);
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || ix === undefined) return;
  const h = rt.store.households[ix]!;
  if (h.gone) return;
  const part = householdPart(householdId);
  const mine = [...rt.flows.values()]
    .filter(
      (flow) =>
        !flow.endedAt &&
        flow.kind === "purchase" &&
        flow.financeKind === terms.financeKind &&
        flow.payeeId === school.id &&
        flow.placeId === h.placeId &&
        flow.amountByContract,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const flow of mine) {
    const present = flow.amountByContract![part] ?? 0;
    if (!present) continue;
    const amounts = ownMap(flow.amountByContract!);
    delete amounts[part];
    flow.amountByContract = amounts;
    flow.amountMinor = Math.max(0, flow.amountMinor - present);
  }
  if (!(monthlyMinor > 0)) return;
  let flow = mine[0];
  if (!flow) {
    const account = rt.input.accounts.find(
      (row) => row.placeId === h.placeId,
    )?.accountId;
    if (!account) return;
    const firstAt = nextMonthDay(
      makeIsoDate(addDays(makeIsoDate(core.date), 1)),
      1,
    );
    flow = {
      id: `residents:purchase:${terms.financeKind}:${school.id}`,
      kind: "purchase",
      financeKind: terms.financeKind,
      payerId: account,
      payeeId: school.id,
      residentsId: account,
      placeId: h.placeId,
      amountMinor: 0,
      firstAt,
      nextAt: firstAt,
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: true,
      marketAdjusted: false,
      amountByContract: {},
      source: terms.source,
      arrearsMinor: 0,
    };
    rt.flows.set(flow.id, flow);
    schedule(rt, flow);
  }
  const amounts = ownMap(flow.amountByContract!);
  amounts[part] = monthlyMinor;
  flow.amountByContract = amounts;
  flow.amountMinor += monthlyMinor;
}
