/**
 * The jobs engine reads the outcome web's retirement-age link when a worker
 * weighs retiring: with the web row for the link set, the worker's retire
 * score falls by the weight times the log of the web's factor for their age
 * and sex, and by nothing with the row at zero. Played world in a place drawn
 * from all 56 (name and seed in every message; GOLDEN_PATH_SEED repeats it).
 * The size of the effect on the 62-to-67 working share is not fitted here:
 * see pool item web-calibrate-labor-participation.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { retireWebTerm } from "./modules/jobs";
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";

const LINK = "retirement-age-to-older-work";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a worker's pull toward retiring falls by the web's factor for their age and sex, and not at all with the link at zero", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "jobs-retire-web");
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const opening = gameStartDate();
    const { core, playerId } = buildBenchWorld(draw.seed, opening, {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const person = core.people.get(playerId!)!;
    let day = makeIsoDate(opening);
    // Past the first web month, which is written on the 3rd.
    for (let i = 0; i < 40; i += 1) {
      day = addDays(day, 1);
      advanceCore(core, day);
    }
    // The web's latest row for the town; the factor is read once a day, so
    // each effect is set and then a day passes before it is read.
    const setEffect = (effect: number) => {
      const latest = [
        ...(months.rows() as unknown as { placeId: string; month: string }[]),
      ]
        .filter((row) => row.placeId === person.placeId)
        .sort((a, b) => (a.month < b.month ? 1 : -1))[0] as unknown as {
        effects: Record<string, number>;
      };
      expect(latest, where).toBeDefined();
      months.put({
        ...latest,
        effects: { ...latest.effects, [LINK]: effect },
      } as never);
      day = addDays(day, 1);
      advanceCore(core, day);
    };
    const sex =
      person.looks?.gender === "female" || person.looks?.gender === "male"
        ? { sex: person.looks.gender }
        : {};
    setEffect(0);
    expect(retireWebTerm(api, person, 64), where).toBe(0);
    setEffect(0.1);
    const factor = webReach(api, person.placeId, "labor.older-employment", {
      age: 64,
      ...sex,
    }).factor;
    expect(factor, where).toBeGreaterThan(1);
    const term = retireWebTerm(api, person, 64);
    expect(term, where).toBeCloseTo(
      -api.parameter("jobsRetireWebWeight") * Math.log(factor),
      10,
    );
    expect(term, where).toBeLessThan(0);
    // A bigger effect pulls harder.
    setEffect(0.22);
    expect(retireWebTerm(api, person, 64), where).toBeLessThan(term);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
