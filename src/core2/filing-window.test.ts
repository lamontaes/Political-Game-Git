import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { electionsParameter } from "./elections-calendar";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// Every regular contest opens its filing on a day (elections-filing-window-
// opens): the calendar's read date, or an estimate the window before the
// deadline, marked with its source. Before, most contests carried no opening
// and stood open from the game's first day, so a November 2026 race could be
// filed for 22 months early. Places are drawn from all 56.
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`filing-window:${Date.now()}`).digest("hex");
const PLACES = 6;

it(`every regular contest opens its filing on a read or estimated day, not on the game's first day (seed ${seed})`, () => {
  const start = gameStartDate();
  const window = electionsParameter("filingWindowDays");
  const lines: string[] = [];
  let checked = 0;
  let estimated = 0;
  let laterThanStart = 0;
  for (let draw = 0; draw < PLACES; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "filing-window");
    const core = createLifeCore(
      buildPopulation({
        seed: place.seed,
        placeKey: place.key,
        startedAt: start,
        minimumPeople: 60,
      }),
    );
    openLaws(core);
    openOffices(core, place.seed);
    openElections(core);
    const api = coreAPI(core);
    const contests = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((row) => !row.special);
    for (const contest of contests) {
      const at = `${contest.id} in ${place.name} (${place.key}), place seed ${place.seed}`;
      expect(contest.filingOpens, at).not.toBeNull();
      expect(contest.filingOpens! <= contest.filingDeadline, at).toBe(true);
      // A race whose deadline is more than the window away opens after the
      // game's first day.
      const windowStart = addDays(makeIsoDate(contest.filingDeadline), -window);
      if (
        windowStart > start &&
        contest.sources.some((s) => s.startsWith("filing opens"))
      ) {
        expect(contest.filingOpens! > start, at).toBe(true);
        laterThanStart += 1;
      }
      if (contest.sources.some((s) => s.startsWith("filing opens"))) {
        expect(
          contest.sources.find((s) => s.startsWith("filing opens")),
          at,
        ).toContain("estimated");
        estimated += 1;
      }
      checked += 1;
    }
    lines.push(`${place.name} (${place.key}): ${contests.length} contests`);
  }
  process.stdout.write(
    `FILING WINDOW seed ${seed}: ${checked} contests in ${lines.join("; ")}; ${estimated} opening days estimated, ${laterThanStart} of them after the game's first day\n`,
  );
  expect(checked).toBeGreaterThan(0);
  expect(laterThanStart).toBeGreaterThan(0);
}, 900_000);
