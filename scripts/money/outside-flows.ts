/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** What moves into and out of the outside markets in a year, by reason: npx tsx scripts/money/outside-flows.ts <seed> <placeKey> [years] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";

const seed = process.argv[2] ?? "money-1";
const placeKey = process.argv[3] ?? "4763340";
const years = Number(process.argv[4] ?? 1);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core: any = world.core;
const api: any = coreAPI(core);
const markets = new Set<string>(
  [...core.organizations.keys()].filter((id: string) =>
    id.startsWith("outside-market"),
  ),
);
const flows = new Map<string, number>();
const origAccounts = api.accounts.bind(api);
api.accounts = () => {
  const facade: any = origAccounts();
  const orig = facade.transfer.bind(facade);
  facade.transfer = (t: any) => {
    const r = orig(t);
    const own = (account: string) =>
      [...markets].find((m) => account === facade.main(m));
    const from = own(t.from),
      to = own(t.to);
    if (from || to) {
      const k = `${to ? "into" : "out of"} ${(to ?? from)!.slice(-6)} ${String(t.reasonKey).replace(/:.*/, "")}`;
      flows.set(k, (flows.get(k) ?? 0) + (to ? 1 : -1) * r.paidMinor);
    }
    return r;
  };
  return facade;
};
advanceCore(core, addDays(makeIsoDate(core.date), 365 * years));
console.log(`${years} year(s), markets ${[...markets].join(", ")}`);
for (const [k, v] of [...flows].sort((a, b) => a[0].localeCompare(b[0])))
  console.log(k.padEnd(80), (v / 100).toFixed(0));
