/**
 * How many local races draw a challenger, against Ballotpedia's counts: 71
 * percent of the 4,500-plus local elections it covered in April 2024 were
 * uncontested (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/),
 * 75 percent of the 36,068 elections of all kinds it covered through October
 * 2024, and near 58 percent for local races from 2018 to 2023. The check is
 * on the total over twelve places named below, because the share depends on
 * the town: a small town has a few contests and almost none contested, a
 * town of tens of thousands has most of them contested, so any six places can
 * land on either side of the band (the first six of these twelve sit at 94
 * percent, the whole twelve at about 68). Nobody is drawn to hit a share: the
 * weights are the stay-out pull and the incumbency pull, and each filing
 * traces to a candidacy decision with its reasons (who-runs.test.ts).
 */
import { createHash } from "node:crypto";
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

const PLACES = 12;
const LOCAL = ["city", "county", "township", "school"];

it("the share of local races with no more candidates than seats sits in the real band over twelve drawn places", () => {
  let contests = 0,
    uncontested = 0;
  const lines: string[] = [];
  for (let i = 1; i <= PLACES; i += 1) {
    const seed = createHash("sha256")
      .update(`candidacy-calibration:c${i}`)
      .digest("hex");
    const place = drawPlace(seed, `candidacy-calibration:${i}`);
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const api = coreAPI(core);
    const decided = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((c) => LOCAL.includes(c.level) && c.filingDeadline < core.date);
    let here = 0;
    for (const c of decided) if (ballot(api, c.id).length <= 1) here += 1;
    contests += decided.length;
    uncontested += here;
    lines.push(
      `${place.name} (${place.key}, seed ${place.seed}): ${decided.length} contests, ${here} uncontested`,
    );
  }
  const where = `${uncontested} of ${contests}: ${lines.join("; ")}`;
  expect(contests, where).toBeGreaterThanOrEqual(20);
  expect(uncontested / contests, where).toBeGreaterThanOrEqual(0.5);
  expect(uncontested / contests, where).toBeLessThanOrEqual(0.8);
}, 3_600_000);
