import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

// Town workers are let go by the JOLTS pull (jobs.ts reviewTurnover): over a
// played year the jobs engine records layoffs that name the pull, each as a
// change row, and the let-go worker becomes a seeker.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "town-turnover");

it(`town workers are let go by the turnover pull in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const jobs = coreAPI(core).moduleState("jobs");
  const layoffs = (
    jobs.table("changes").rows() as unknown as {
      id: string;
      kind: string;
      personId: string;
      values?: Record<string, number>;
    }[]
  ).filter((row) => row.kind === "layoff" && row.values?.turnoverPull);
  expect(layoffs.length, "turnover layoffs in a year").toBeGreaterThan(0);
  console.log(
    `TURNOVER ${place.name} ${seed} ${layoffs.length} e.g. ${layoffs[0]!.id}`,
  );
}, 600_000);
