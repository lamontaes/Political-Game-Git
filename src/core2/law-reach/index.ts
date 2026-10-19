/**
 * Law reach: what each catalog policy does once it's law, through the engine
 * that owns the thing it changes. Each group file registers its policies'
 * handlers with `registerPolicyHandler` (host.ts).
 */
import { registerGroupA } from "./group-a";
import { registerGroupB } from "./group-b";

let registered = false;
export function registerLawReach(): void {
  if (registered) return;
  registered = true;
  registerGroupA();
  registerGroupB();
}
