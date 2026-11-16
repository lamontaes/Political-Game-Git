// @vitest-environment node
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { officeActsOf } from "../core2/modules/office-day";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

const PINNED = [
  { at: "mayor-acts-1:1", name: "Edmore" },
  { at: "mayor-acts-1:3", name: "Odessa" },
];

describe.each(PINNED)(
  "the world's mayors give the yearly address ($name)",
  ({ at, name }) => {
    it("in its season, as the player's character does", () => {
      setBookkeeping(false);
      const place = drawPlace(at, "mayor-acts");
      expect(place.name).toContain(name);
      const w = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 150));
      const api = coreAPI(w.core);
      const mayors = townSeats(api)
        .filter((r) => r.office.kind === "mayor" && r.holder?.personId)
        .map((r) => r.holder!.personId!);
      const given = mayors.flatMap((id) =>
        officeActsOf(api, id).filter((a) => a.kind === "state-of-the-city"),
      );
      if (process.env.ACTS_OUT)
        appendFileSync(
          process.env.ACTS_OUT,
          `${place.name} ${w.core.date} mayors ${mayors.length} given ${JSON.stringify(given.map((g) => [g.date, g.detail]))}\n`,
        );
      expect(given.length, place.name).toBeGreaterThan(0);
    }, 60_000);
  },
);
