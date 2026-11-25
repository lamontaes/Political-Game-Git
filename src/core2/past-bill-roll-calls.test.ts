import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { pastBillsOf } from "./past-module";
import { townOffices } from "./past-bodies";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { RECORD_MODULE_ID } from "./modules/record";
import { coreAPI } from "./state";

// A body that turned over wholesale since its last term still has that
// term's bills (the lead's trace of the Arizona county board, Nov 24: five
// commissioners seated Jan 1, 2025, every vote earlier, so no member row and
// an empty Recent votes list). The world keeps each past bill's whole roll
// call by the body's office; the member rows are only those who still live
// in it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`every prior-term bill keeps its whole roll call by its body, seed ${seed}`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let placesChecked = 0;
  let billsChecked = 0;
  for (let draw = 0; draw < 8 && placesChecked < 3; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "past-bill-roll-calls");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let built: ReturnType<typeof buildBenchWorld>;
    try {
      built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passedOver.push(`${where}: ${error.message}`);
      continue;
    }
    const api = coreAPI(built.core);
    const rows = api
      .moduleState(RECORD_MODULE_ID)
      .table("votes")
      .rows() as unknown as {
      body: string;
      billId: string;
      stance: { position: number };
    }[];
    const live = new Set(
      (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as { id: string }[]
      ).map((b) => b.id),
    );
    for (const office of townOffices(api)) {
      const kept = pastBillsOf(api, office.id);
      const members = rows.filter(
        (r) => r.body === office.id && !live.has(r.billId),
      );
      // Every bill a member row names is kept, with a count that holds at
      // least the members' own sides and no more than the body's seats.
      for (const billId of new Set(members.map((r) => r.billId))) {
        const bill = kept.find((b) => b.billId === billId);
        expect(bill, `${where}: ${billId} has no kept roll call`).toBeDefined();
        const mine = members.filter((r) => r.billId === billId);
        const plus = mine.filter((r) => r.stance.position > 0).length;
        const minus = mine.length - plus;
        const sides = [bill!.yes, bill!.no].sort((a, b) => b - a);
        expect(
          bill!.yes + bill!.no,
          `${where}: ${billId} count is not the body's seats`,
        ).toBeGreaterThanOrEqual(mine.length);
        expect(
          sides[0]! >= Math.max(plus, minus) ||
            sides[1]! >= Math.min(plus, minus),
          `${where}: ${billId} kept ${bill!.yes}-${bill!.no}, members ${plus}-${minus}`,
        ).toBe(true);
      }
      billsChecked += kept.length;
    }
    placesChecked += 1;
  }
  expect(placesChecked, `passed over: ${passedOver.join("; ")}`).toBe(3);
  expect(billsChecked, "no prior-term bill kept in any place").toBeGreaterThan(
    0,
  );
}, 200_000);
