// @vitest-environment node
/**
 * The benefits whose amount or income limit is the law's own value (SSI's
 * federal benefit rate, the child care income limit, the home energy
 * assistance income limit) are run by the treasury's monthly close, as every
 * other benefit program is: the close reads the law in force and pays from
 * it, not law reach's own monthly review on a date of its own. In a world
 * drawn from all 56 places, run past the first close: each benefit in force
 * last ran on the close's own date, from the law row in force that day.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  REACH_B_MODULE_ID,
  STANDING_BENEFIT_PROGRAMS,
} from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID } from "./modules/budgets";
import { lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the treasury's monthly close runs SSI, child care and energy assistance from the law in force (replay ${replay})`, () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(replay, "benefits-paid-at-the-close");
    const where = `${place.name} (${place.key}), replay ${replay}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(core);
    const closes = () =>
      (
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("treasuryMonths")
          .rows() as unknown as {
          date: string;
        }[]
      ).map((row) => row.date);
    // Day by day to the first close after the opening, then one day on.
    const opening = core.date;
    for (let day = 0; day < 40 && !closes().some((d) => d > opening); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const close = closes()
      .filter((d) => d > opening)
      .sort()
      .at(-1);
    expect(close, `${where}: a treasury close within 40 days`).toBeDefined();
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const active = api.moduleState(REACH_B_MODULE_ID).table("active");
    const ran: string[] = [];
    for (const key of STANDING_BENEFIT_PROGRAMS) {
      const row = active.get(key) as unknown as
        { since: string; lawId: string } | undefined;
      if (!row) continue;
      expect(row.since, `${where}: ${key} last ran`).toBe(close);
      expect(row.lawId, `${where}: ${key}'s law`).toBe(
        lawInForce(api, key).governing?.id,
      );
      ran.push(key);
    }
    // SSI is federal: in force in every place from the opening.
    expect(ran, where).toContain("ssi-federal-benefit-rate");
    process.stdout.write(
      `BENEFITS ${where}: the close on ${close} ran ${ran.join(", ")} from the law in force\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
