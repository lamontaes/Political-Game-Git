import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

// The sales tax's counted reach is the counted people it stands for, once: a
// law's counted groups add up to no more than the town's counted people (a
// buyer household stands for its own record's people, the residents account
// for the rest), never the whole town once per buyer.
const seed = process.env.PURCHASE_REACH_SEED ?? randomBytes(8).toString("hex");
const KEYS = [
  "sales-tax",
  "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
];

describe(`sales tax counted reach (seed ${seed})`, () => {
  it("never stands for more people than the town's counted residents", () => {
    // A state with no general sales tax (a gross receipts tax instead, in the
    // starting law) writes no sales-tax reach rows, so a draw that lands there
    // has no case: it is passed over by name and the next draw is tried, up to
    // MAX_DRAWS, and the test fails naming every place passed over if none holds.
    const MAX_DRAWS = 8;
    const passedOver: string[] = [];
    const run = (place: { name: string; key: string; seed: string }) => {
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      // A row counts the people its household stood for on the day it was
      // written, and the town's counted people move in the 40 days (households
      // are filled in as staff and leave the counts), so the reach is held to
      // the most counted people the town had on any day of the window, not to
      // the town at the end of it.
      const town = [...core.visiblePlaceIds][0]!;
      const peopleToday = () =>
        residentsRuntime(core)?.store.weightedPeople(town) ?? 0;
      let whole = peopleToday();
      for (let day = 0; day < 40; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        whole = Math.max(whole, peopleToday());
      }
      let witnessed = 0;
      for (const key of KEYS) {
        const rows = appliedOn(api, key).filter((r) => r.target === "group");
        const byLaw = new Map<string, number>();
        for (const r of rows)
          byLaw.set(r.lawId, (byLaw.get(r.lawId) ?? 0) + r.count);
        for (const [lawId, people] of byLaw) {
          witnessed += 1;
          expect(
            people,
            `${where}: ${key} (${lawId}) counted groups stand for ${people} of at most ${whole} counted people`,
          ).toBeLessThanOrEqual(whole);
        }
      }
      if (witnessed === 0)
        passedOver.push(`${where}: no counted sales-tax reach rows`);
      return witnessed;
    };
    // Prescott, Michigan is pinned: its state has the tax, so it must witness.
    expect(
      run({
        name: "Prescott, Michigan",
        key: "2666300",
        seed: "a91c03e7d2b84f10",
      }),
      passedOver.join("; "),
    ).toBeGreaterThan(0);
    let witnessed = 0;
    for (let draw = 0; draw < MAX_DRAWS && witnessed === 0; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "purchase-tax-reach");
      witnessed = run(place);
    }
    process.stdout.write(
      `purchase-tax-counted-reach: seed ${seed}; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    expect(
      witnessed,
      `no drawn place had counted sales-tax reach rows in ${MAX_DRAWS} draws; passed over: ${passedOver.join("; ")}`,
    ).toBeGreaterThan(0);
  }, 1_800_000);
});
