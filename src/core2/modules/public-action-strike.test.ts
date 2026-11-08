import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { TERM_MEASURES } from "../term-read";
import { actionsOf } from "./public-action";

// The town's school staff walk out when its schools slide (owner, Nov 8: "if
// you're having a good term except for education, then you might get a
// strike"). The staff are mostly the wider town's people, counted: they are
// asked to join by the same resident decision as a named person, and a strike
// is the named and the counted who say yes. Places are drawn in turn until one
// strikes (a place with no school staff cannot); the web's rows are written
// the way the web writes them, schools sliding over a term a year in.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;

it(`school staff strike when the schools slide (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    setBookkeeping(false);
    const place = drawPlace(`${seed}:${attempt}`, "public-action-strike");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    for (const [at, month] of [
      "2025-01",
      "2026-01",
      "2026-02",
      "2026-03",
    ].entries()) {
      const values: Record<string, number> = {};
      for (const key of TERM_MEASURES)
        values[key] =
          100 *
          (1 +
            (key.startsWith("school.") ? -0.25 : 0) *
              (Math.max(at - 1, 0) / 2));
      web.put({
        id: `web:${world.placeId}:${month}`,
        placeId: world.placeId,
        month,
        date: `${month}-02`,
        values,
        bases: values,
        effects: {},
        engineSources: {},
      } as never);
    }
    advanceCore(core, "2025-07-06");
    const strikes = actionsOf(api, world.placeId).filter(
      (row) => row.kind === "strike",
    );
    if (!strikes.length) {
      tried.push(where);
      continue;
    }
    for (const strike of strikes) {
      expect(strike.area, where).toBe("schools");
      expect(
        strike.participantIds.length + strike.countedParticipants,
        where,
      ).toBeGreaterThanOrEqual(2);
      const event = core.durableLog.get(`civic.strike:${strike.id}`);
      expect(event?.publicRecord, where).toBe(true);
      process.stdout.write(
        `STRIKE ${where}: ${strike.participantIds.length} named, ${strike.countedParticipants} counted, ${strike.months} months\n`,
      );
    }
    return;
  }
  throw new Error(`No strike formed in: ${tried.join("; ")}`);
}, 900_000);
