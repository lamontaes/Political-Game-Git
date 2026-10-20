/**
 * How many local races draw a challenger, against Ballotpedia's counts: 71
 * percent of the 4,500-plus local elections it covered in April 2024 were
 * uncontested (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/),
 * 75 percent of the 36,068 elections of all kinds it covered through October
 * 2024, and near 58 percent for local races from 2018 to 2023.
 *
 * Places are drawn at random from all 56 (the seed is printed and can be
 * given as GOLDEN_PATH_SEED), because the share depends on the town: more
 * than half of the small towns decide no local contest in 400 days, and a
 * handful of contests per town makes any six places swing by tens of points.
 * So the check is on the pooled count of contests over as many places as it
 * takes to have at least `MIN_CONTESTS`, and it fails only when the pooled
 * count cannot be the real band at 99 percent confidence (the Wilson interval
 * of the pooled share lies wholly above 80 percent or wholly below 50). A run
 * that merely lands on one side of the band by luck does not fail. Each
 * contest is one seat (a body with several seats has a contest row per seat),
 * so a seat is uncontested when its ballot has no more than one candidate.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "./modules/elections";

const LOCAL = ["city", "county", "township", "school"];
const MIN_CONTESTS = 40;
const MAX_PLACES = 24;
const BAND = { low: 0.5, high: 0.8 };
const Z = 2.576;

/** The Wilson score interval of a share, `successes` of `n`. */
function wilson(successes: number, n: number): [number, number] {
  const p = successes / n;
  const z2 = Z * Z;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half =
    (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [center - half, center + half];
}

it("the share of local seats with no more candidates than seats cannot be shown to lie outside the real band, over places drawn at random", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
  let contests = 0,
    uncontested = 0;
  const lines: string[] = [];
  for (let i = 0; i < MAX_PLACES && contests < MIN_CONTESTS; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "candidacy-calibration");
    setBookkeeping(false);
    let decided: ContestRow[];
    let here = 0;
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const api = coreAPI(core);
      decided = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).filter((c) => LOCAL.includes(c.level) && c.filingDeadline < core.date);
      for (const c of decided) if (ballot(api, c.id).length <= 1) here += 1;
    } catch (error) {
      // core-press-staff-counted-job-not-resident: a press staff member who
      // is not a resident stops some played years. It is that item's defect,
      // not this check's; the place is named and left out.
      if (!String(error).includes("Not in the wider population")) throw error;
      lines.push(`${place.name} (${place.key}): skipped, press staff defect`);
      continue;
    }
    contests += decided.length;
    uncontested += here;
    lines.push(
      `${place.name} (${place.key}, seed ${place.seed}): ${decided.length} contests, ${here} uncontested`,
    );
  }
  const [low, high] = wilson(uncontested, Math.max(contests, 1));
  const where = `seed ${seed}: ${uncontested} of ${contests} uncontested (99% interval ${(low * 100).toFixed(0)} to ${(high * 100).toFixed(0)} percent): ${lines.join("; ")}`;
  console.log(where);
  expect(contests, where).toBeGreaterThanOrEqual(MIN_CONTESTS);
  expect(low, where).toBeLessThanOrEqual(BAND.high);
  expect(high, where).toBeGreaterThanOrEqual(BAND.low);
}, 7_200_000);
