/**
 * Law reach: what each catalog policy does once it's law, through the engine
 * that owns the thing it changes. Each group file registers its policies'
 * handlers with `registerPolicyHandler` (host.ts).
 */
import { registerStandingLineLaws } from "../modules/budgets";
import { registerGroupA } from "./group-a";
import { POLICIES } from "./group-a-records";
import { GROUP_B_KEYS, groupBPolicy, registerGroupB } from "./group-b";
import type { CoreAPI } from "../types";
import { LAW_REACH_HOST_ID, reassertStandingLaws } from "./host";

/** Mechanics whose law sets a budget line's level, which the treasury reads again each close. */
const LINE_MECHANICS_A: readonly string[] = [
  "parks-funding",
  "police-oversight",
];
const LINE_MECHANICS_B: readonly string[] = ["highway-shift", "transit-fares"];

function standingLineKeys(): readonly string[] {
  return [
    ...Object.entries(POLICIES)
      .filter(([, spec]) => LINE_MECHANICS_A.includes(spec.mechanic))
      .map(([key]) => key),
    ...GROUP_B_KEYS.filter((key) =>
      LINE_MECHANICS_B.includes(groupBPolicy(key)?.mechanic ?? ""),
    ),
  ].sort();
}

let standingKeys: readonly string[] | undefined;
/**
 * The treasury's read of the laws that set a budget line, as a plain rule for
 * the treasury to run each month it closes and each year a budget is adopted.
 * Only a world that opened law reach has its laws applied to the budget.
 */
export function reassertStandingLineLaws(api: CoreAPI): void {
  if (!api.state.modules.has(LAW_REACH_HOST_ID)) return;
  standingKeys ??= standingLineKeys();
  reassertStandingLaws(api, standingKeys);
}

let registered = false;
export function registerLawReach(): void {
  if (registered) return;
  registered = true;
  registerGroupA();
  registerGroupB();
  registerStandingLineLaws(reassertStandingLineLaws);
}
