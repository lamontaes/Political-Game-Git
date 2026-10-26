import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { officeActsOf, officeHost, prepareAct } from "./modules/office-day";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { followersOf, interviewsFor, outletsHere } from "./modules/press";
import { officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`an official picks the outlet for an interview (seed ${seed})`, () => {
  it("asks the outlet the player picked, and the widest-reaching one when they pick none", () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "interview-outlet");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const terms = (seatId: string) =>
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
      const seats = townSeats(api).filter(
        ({ office, seat }) =>
          ["council", "mayor"].includes(office.kind) &&
          terms(seat.id)[0]?.personId,
      );
      const outlets = outletsHere(api)
        .filter((o) => o.tier !== "national")
        .map((o) => ({ o, reach: followersOf(api, o.id).length }))
        .sort((a, b) => b.reach - a.reach || a.o.id.localeCompare(b.o.id));
      if (seats.length < 2 || outlets.length < 2) continue;
      const handler = officeActHandlers(officeHost).interview;
      const [a, b] = seats.map(({ seat }) => terms(seat.id)[0]!.personId!);
      // The second-widest outlet, picked by the player.
      const picked = outlets[1]!.o.id;
      prepareAct(api, a!, "interview", { outletId: picked });
      handler(api, a!);
      const rows = interviewsFor(api, a!);
      expect(rows.map((row) => row.outletId)).toEqual([picked]);
      expect(
        officeActsOf(api, a!).some((row) => row.kind === "interview"),
        `${place.name}; seed ${place.seed}`,
      ).toBe(true);
      // No pick: the widest-reaching outlet that has not had them on yet.
      handler(api, b!);
      const widest = outletsHere(api)
        .map((o) => ({ o, reach: followersOf(api, o.id).length }))
        .sort((x, y) => y.reach - x.reach || x.o.id.localeCompare(y.o.id))[0]!.o
        .id;
      expect(interviewsFor(api, b!).map((row) => row.outletId)).toEqual([
        widest,
      ]);
      return;
    }
    throw new Error(
      `No town with two outlets and two seats in 8 draws; ${seed}`,
    );
  }, 1_200_000);
});
