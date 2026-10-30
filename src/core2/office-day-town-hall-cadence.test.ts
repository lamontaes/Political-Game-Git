import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { officeHost, officeActsOf } from "./modules/office-day";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { officeActHandlers, townHallDue } from "./office-day-acts";
import { holdTownHall, MEETINGS_MODULE_ID } from "./modules/meetings";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`a town hall is held on a cadence (seed ${seed})`, () => {
  it("is offered again only once the interval has passed since the official's last", () => {
    // A place with a seat the player can take (the first of a few draws).
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "town-hall-cadence");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        ({ office, seat }) =>
          ["council", "mayor"].includes(office.kind) &&
          (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .query("bySeatStatus", [
                seat.id,
                "serving",
              ]) as unknown as TermRow[]
          )[0]?.personId,
      );
      if (!seat) continue;
      const member = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [
            seat.seat.id,
            "serving",
          ]) as unknown as TermRow[]
      )[0]!.personId!;
      const offered = () => (townHallDue(api, officeHost, member) ? 1 : 0);
      expect(offered(), `${place.name}; seed ${place.seed}`).toBeGreaterThan(0);
      // One a day: a town hall they already hosted today (an incumbent's
      // forum for their race is one) keeps the office's town hall off the
      // day, and the act, if it comes up anyway, holds no second one.
      const hall = holdTownHall(api, { hostId: member });
      expect(offered(), "hosted one today").toBe(0);
      officeActHandlers(officeHost)["town-hall"](api, member);
      expect(
        officeHost.lastGiven(api, member, "town-hall"),
        "the act held none",
      ).toBeFalsy();
      expect(
        api.moduleState(MEETINGS_MODULE_ID).table("townHalls").get(hall.id),
        "today's town hall stands",
      ).toEqual(hall);
      officeHost.keep(api, {
        personId: member,
        kind: "town-hall",
        how: "own-choice",
        recordId: "fixture-hall",
        position: null,
        detail: "fixture",
      });
      expect(offered(), "just held one").toBe(0);
      const interval = api.parameter("townHallIntervalDays");
      const date = (days: number) => {
        const at = new Date(`${core.date}T00:00:00Z`);
        at.setUTCDate(at.getUTCDate() + days);
        return at.toISOString().slice(0, 10);
      };
      advanceCore(core, date(Math.floor(interval) - 1));
      expect(offered(), "a day short of the interval").toBe(0);
      advanceCore(core, date(1));
      expect(offered(), "the interval has passed").toBeGreaterThan(0);
      expect(
        officeActsOf(api, member).filter((row) => row.kind === "town-hall"),
      ).toHaveLength(1);
      return;
    }
    throw new Error(`No place with a seat in six draws; seed ${seed}`);
  }, 900_000);
});
