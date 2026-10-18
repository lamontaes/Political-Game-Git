import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { OFFICIAL_PAY_MODULE_ID } from "./modules/official-pay";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";

// An official who dies is paid no more, and their pay row ends with them. It
// used to stay, moving its pay date forward each month for years, so the
// books showed a salary earned and never paid. Pinned to a place where a
// U.S. representative died in the first year (the draw of seed
// 9a11da355dc8b557 for "official-salary-payroll"), and a place drawn at random.
const seed =
  process.env.OFFICIAL_PAY_DEATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS: readonly (readonly [string, string])[] = [
  ["9a11da355dc8b557", "official-salary-payroll"],
  [seed, "official-pay-death"],
];

describe("an official who died", () => {
  for (const [drawSeed, purpose] of DRAWS)
    it(`has no pay row left (seed ${drawSeed}, draw ${purpose})`, () => {
      setBookkeeping(false);
      const place = drawPlace(drawSeed, purpose);
      const where = `${place.name} (${place.key}), seed ${drawSeed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
      const officials = api
        .moduleState(OFFICIALS_MODULE_ID)
        .table("officials")
        .rows() as unknown as OfficialRow[];
      const dead = officials.filter((o) => !core.people.get(o.id)?.alive);
      if (drawSeed === "9a11da355dc8b557")
        expect(
          dead.map((o) => o.id),
          `an official who died in ${where}`,
        ).toContain("official:seat:US-TX:us-house:10");
      for (const o of dead)
        expect(pay.get(o.id), `${o.id} in ${where}`).toBeUndefined();
    }, 1_800_000);
});
