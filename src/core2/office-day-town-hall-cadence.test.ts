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

// A named place on a fixed draw (skill pinned-tests), never red by draw.
const PLACES = ["town-hall-pin:0", "town-hall-pin:1"];

describe("a town hall is held on a cadence", () => {
  it.each(PLACES)(
    "is offered again only once the interval has passed since the official's last (%s)",
    (at) => {
      {
        const place = drawPlace(at, "town-hall-cadence");
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
        expect(
          seat,
          `${place.name}: a council or mayor seat held`,
        ).toBeDefined();
        const member = (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .query("bySeatStatus", [
              seat!.seat.id,
              "serving",
            ]) as unknown as TermRow[]
        )[0]!.personId!;
        const offered = () => (townHallDue(api, officeHost, member) ? 1 : 0);
        const interval = api.parameter("townHallIntervalDays");
        const date = (days: number) => {
          const at = new Date(`${core.date}T00:00:00Z`);
          at.setUTCDate(at.getUTCDate() + days);
          return at.toISOString().slice(0, 10);
        };
        // A world opens with the last town hall some days back (day one in
        // motion), so the next one comes due once the interval since it has
        // passed; a holder with none behind them is due at once.
        const opening = officeHost.lastGiven(api, member, "town-hall");
        if (opening) {
          const ago = Math.round(
            (Date.parse(`${core.date}T00:00:00Z`) -
              Date.parse(`${opening}T00:00:00Z`)) /
              86_400_000,
          );
          expect(
            ago,
            "the opening's last town hall is inside the interval",
          ).toBeLessThan(interval);
          if (offered())
            throw new Error(`due on day one with one ${ago} days back`);
          advanceCore(core, date(Math.ceil(interval) - ago));
        }
        expect(offered(), `${place.name}; seed ${place.seed}`).toBeGreaterThan(
          0,
        );
        // One a day: a town hall they already hosted today (an incumbent's
        // forum for their race is one) keeps the office's town hall off the
        // day, and the act, if it comes up anyway, holds no second one.
        const hall = holdTownHall(api, { hostId: member });
        expect(offered(), "hosted one today").toBe(0);
        officeActHandlers(officeHost)["town-hall"](api, member);
        expect(
          officeHost.lastGiven(api, member, "town-hall"),
          "the act held none",
        ).toBe(opening);
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
        advanceCore(core, date(Math.floor(interval) - 1));
        expect(offered(), "a day short of the interval").toBe(0);
        advanceCore(core, date(1));
        expect(offered(), "the interval has passed").toBeGreaterThan(0);
        expect(
          officeActsOf(api, member).filter(
            (row) =>
              row.kind === "town-hall" && row.detail !== "before the start",
          ),
        ).toHaveLength(1);
      }
    },
    120_000,
  );
});
