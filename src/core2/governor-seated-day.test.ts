import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { seatWinner, townSeats } from "./modules/offices";
it("a player seated as governor lives the next days without the day stopping", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
  for (let a = 0; a < 3; a++) {
    const place = drawPlace(seed, `governor-seated-day:${a}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const row = townSeats(api).find((r) => r.office.kind === "governor");
    if (!row) {
      continue;
    }
    const pid = core.playerId!;
    const p = core.people.get(pid)!;
    seatWinner(api, {
      seatId: row.seat.id,
      officeId: row.office.id,
      personId: pid,
      identity: {
        givenName: p.givenName,
        familyName: p.familyName,
        gender: "recorded",
        birthDate: p.birthDate,
        homeState: place.state,
      },
      party: null,
      endDate: null,
      reached: `elected ${core.date}`,
      resultId: `t:${row.seat.id}`,
      title: row.office.title,
      winnerId: pid,
      news: true,
    });
    expect(
      () => advanceCore(core, addDays(makeIsoDate(core.date), 3)),
      `${place.name} (${place.key}), seed ${place.seed}`,
    ).not.toThrow();
  }
}, 1_800_000);
