import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { pastBillsOf } from "../core2/past-module";
import { townOffices } from "../core2/past-bodies";
import { coreAPI } from "../core2/state";
import { recentVotesOf } from "./government-bodies";

// A body's Recent votes on the Government screen carry the whole roll call:
// every seat counted, the earlier holders of seats included, and a body that
// voted last term lists those votes however many of its members have changed
// since (the lead's trace of Golden Shores, Arizona's county board, Nov 24:
// five commissioners seated Jan 1, 2025, no list; a seven-seat Wyoming board
// showing "2 yes, 0 no"). The oracle is the body's seat count: a roll call
// counts every seat, so a measure's yes and no add up to at least its seats.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a body's recent votes count every seat, seed ${seed}`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let placesChecked = 0;
  let listed = 0;
  for (let draw = 0; draw < 8 && placesChecked < 3; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "recent-votes-whole-count");
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
    for (const office of townOffices(api)) {
      if (office.level === "federal" || office.seats < 2) continue;
      const shown = recentVotesOf(api, office.id);
      for (const vote of shown) {
        expect(
          vote.yes + vote.no,
          `${where}: ${office.kind} ${office.id} shows ${vote.yes}-${vote.no} on ${vote.billId}, a body of ${office.seats} seats`,
        ).toBeGreaterThanOrEqual(office.seats);
        listed += 1;
      }
      if (pastBillsOf(api, office.id).length > 0)
        expect(
          shown.length,
          `${where}: ${office.kind} ${office.id} voted last term and lists nothing`,
        ).toBeGreaterThan(0);
    }
    placesChecked += 1;
  }
  expect(placesChecked, `passed over: ${passedOver.join("; ")}`).toBe(3);
  expect(listed, "no recent vote listed in any place").toBeGreaterThan(0);
}, 250_000);
