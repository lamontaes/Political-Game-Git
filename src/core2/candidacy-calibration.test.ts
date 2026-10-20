import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { candidatesFor } from "./modules/candidacy";
import type { CoreState } from "./types";

// Who runs, checked against the real share of uncontested local races: the
// town's local contests decided in 400 days of the played world, in six
// places drawn from all 56. Ballotpedia counts 71 percent of the 4,500-plus
// local elections it covered in April 2024 as uncontested
// (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/)
// and an average near 58 percent for local races from 2018 to 2023. The check
// bounds the total; it never decides one person's run.
const label = process.env.CALIBRATION_SEED ?? "c";
const LOCAL = ["city", "county", "township"];

// Six worlds of 600 days take over an hour, so this runs only when asked:
// CALIBRATION_RUN=1 npx vitest run src/core2/candidacy-calibration.test.ts
describe.skipIf(!process.env.CALIBRATION_RUN)("uncontested local races", () => {
  it("fall between 50 and 80 percent across six drawn places", () => {
    let contests = 0;
    let uncontested = 0;
    let incumbents = 0;
    let incumbentsRan = 0;
    const where: string[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const place = drawPlace(`${label}${i}`, "candidacy-calibration");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as unknown as CoreState;
      const api = coreAPI(core);
      const start = core.date;
      advanceCore(core, addDays(makeIsoDate(core.date), 600));
      const rows = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).filter(
        (c) =>
          LOCAL.includes(c.level) &&
          c.filingDeadline <= core.date &&
          c.filingDeadline > start,
      );
      let here = 0;
      let none = 0;
      for (const contest of rows) {
        const running = candidatesFor(api, contest.id);
        const count = running.length;
        here += 1;
        // An incumbent seeking the seat again: the share that run is
        // calibrated near 81 percent (candidacyIncumbencyWeight).
        const term = contest.incumbentTermId
          ? (api
              .moduleState("core2-offices-v1")
              .table("terms")
              .get(contest.incumbentTermId) as unknown as
              { personId: string | null } | undefined)
          : undefined;
        if (term?.personId) {
          incumbents += 1;
          if (running.some((d) => d.personId === term.personId))
            incumbentsRan += 1;
        }
        if (count <= 1) none += 1;
      }
      contests += here;
      uncontested += none;
      where.push(
        `${place.name} (${label}${i}): ${none} of ${here} uncontested`,
      );
    }
    if (process.env.CALIBRATION_OUT)
      writeFileSync(
        process.env.CALIBRATION_OUT,
        JSON.stringify(
          { contests, uncontested, incumbents, incumbentsRan, where },
          null,
          1,
        ),
      );
    expect(contests, where.join("; ")).toBeGreaterThan(10);
    const share = uncontested / contests;
    expect(share, where.join("; ")).toBeGreaterThanOrEqual(0.5);
    expect(share, where.join("; ")).toBeLessThanOrEqual(0.8);
  }, 7_200_000);
});
