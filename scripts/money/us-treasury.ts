/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** What moved the U.S. treasury's cash in a year, by reason: npx tsx scripts/money/us-treasury.ts <seed> <placeKey> */
import { buildPopulation } from "../../src/core2/population";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { openLaws } from "../../src/core2/modules/laws";
import { openBudgets, governments } from "../../src/core2/modules/budgets";
import { coreAPI } from "../../src/core2/state";

const seed = process.argv[2] ?? "money-red";
const placeKey = process.argv[3] ?? "1885562";
const core = createLifeCore(
  buildPopulation({
    seed,
    placeKey,
    startedAt: "2026-01-05",
    minimumPeople: 30,
  }),
);
openLaws(core);
openBudgets(core);
const api = coreAPI(core);
const usOrg = governments(api).find(
  (g: any) => g.level === "federal",
)!.organizationId;
const main = api.accounts().main(usOrg);
const flows = new Map<string, number>();
const origAccounts = api.accounts.bind(api);
(api as any).accounts = () => {
  const facade: any = origAccounts();
  const orig = facade.transfer.bind(facade);
  facade.transfer = (t: any) => {
    const r = orig(t);
    const sign = t.to === main ? 1 : t.from === main ? -1 : 0;
    if (sign) {
      const k = `${sign > 0 ? "in " : "out"} ${String(t.reasonKey).replace(/:.*/, "")}`;
      flows.set(k, (flows.get(k) ?? 0) + sign * r.paidMinor);
    }
    return r;
  };
  return facade;
};
console.log(
  "opening",
  core.organizations.get(usOrg)!.liquidMinor,
  (core.cashJournal as any).totalsByAccount.get(`cash:${usOrg}:residual`),
);
advanceCore(core, "2027-01-05");
console.log("balance", core.organizations.get(usOrg)!.liquidMinor);
for (const [k, v] of [...flows].sort((a, b) => a[0].localeCompare(b[0])))
  console.log(k, v);
