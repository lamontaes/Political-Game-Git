/**
 * Law reach: what each catalog policy does once it's law, through the engine
 * that owns the thing it changes. Each group file registers its policies'
 * handlers with `registerPolicyHandler` (host.ts).
 */
import { registerStandingLineLaws } from "../modules/budgets";
import { registerGroupA } from "./group-a";
import { POLICIES } from "./group-a-records";
import { registerGroupB } from "./group-b";
import { GROUP_B_KEYS, groupBPolicy } from "./group-b";
import { reassertStandingLaws } from "./host";

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

let registered = false;
export function registerLawReach(): void {
  if (registered) return;
  registered = true;
  registerGroupA();
  registerGroupB();
  const keys = standingLineKeys();
  registerStandingLineLaws((api) => reassertStandingLaws(api, keys));
}
