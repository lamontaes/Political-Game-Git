/**
 * Recalls and veto overrides leave public records, in the world the owner
 * plays: the bench world in places drawn from all 56 on a seed nobody chose,
 * played for a year each. Every recall that reaches a result (a petition that
 * falls short, one that goes to the ballot, a member removed or kept) and every
 * vetoed bill's override vote is announced as an event the press and the
 * director can read, named by the recall's or the bill's id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { recallsOf } from "./modules/recalls";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.RECALL_RECORDS_SEED || randomBytes(8).toString("hex");

describe(`recall and override records (seed ${seed})`, () => {
  it("announce every recall result and every override vote by id", () => {
    const opening = gameStartDate();
    const seen: string[] = [];
    let recalls = 0;
    let overrides = 0;
    for (let draw = 0; draw < 16 && !(recalls || overrides); draw++) {
      const place = drawPlace(`${seed}:${draw}`, "recall-records");
      const world = buildBenchWorld(`${seed}:${draw}`, opening, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const events = new Set<string>();
      api.subscribeEvents(
        "recall-override-records-test",
        ["recall-outcome", "veto-override"],
        (_api, event) => {
          events.add(event.id);
        },
      );
      advanceCore(world.core, addDays(makeIsoDate(opening), 365));
      const done = recallsOf(api).filter((r) => r.status !== "circulating");
      for (const recall of done) {
        expect(
          events.has(`recall-outcome:${recall.id}:${recall.status}`),
          recall.id,
        ).toBe(true);
        recalls += 1;
      }
      const bills = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[];
      for (const bill of bills.filter((b) => b.status === "overridden")) {
        expect(events.has(`veto-override:${bill.id}`), bill.id).toBe(true);
        overrides += 1;
      }
      seen.push(
        `${place.name} (${place.key}): ${done.length} recall results, ${bills.filter((b) => b.status === "overridden").length} overrides`,
      );
    }
    console.log(`recall-override-records: ${seen.join("; ")}`);
    expect(recalls + overrides, seen.join("; ")).toBeGreaterThan(0);
  }, 3_600_000);
});
