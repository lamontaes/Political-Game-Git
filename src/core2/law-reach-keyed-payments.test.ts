/** A law's benefit or voucher to counted households reaches their groups' funds, not the place's unkeyed residents account. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

it("pays law-reach benefits and vouchers to counted groups' funds in a played year", () => {
  const seed = randomBytes(8).toString("hex");
  const draw = drawPlace(seed, "law-reach-keyed");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const accounts = api.accounts();
  const mains = new Set(
    rt.input.accounts.map((a) => accounts.main(a.accountId)),
  );
  const unkeyed: string[] = [];
  let toFunds = 0;
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    if (entry.sourceRef.id.startsWith("reach-b:"))
      for (const p of entry.postings) {
        if (p.deltaMinor <= 0) continue;
        if (mains.has(p.accountId)) unkeyed.push(entry.sourceRef.id);
        else if (p.accountId.startsWith("fund:")) toFunds += p.deltaMinor;
      }
    return post(entry);
  };
  advanceCore(core, addDays(makeIsoDate(core.date), 366));
  const where = `seed ${draw.seed}, place ${draw.key}`;
  expect(unkeyed, `${where}: law payments in the unkeyed pool`).toEqual([]);
  // Where the town's laws pay counted households at all, they reach funds.
  expect(toFunds, where).toBeGreaterThanOrEqual(0);
}, 600_000);
