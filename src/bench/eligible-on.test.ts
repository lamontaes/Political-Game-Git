/**
 * The filing overlay says when a player becomes old enough
 * (play-nothing-to-enter-at-eighteen): an unmet minimum age carries the day
 * the person turns the required age, so a player with nothing to enter yet
 * sees when the first door opens. Wait for the age case on the actual filing
 * calendar, and check both sides of the age rule wherever they occur.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { governmentView } from "./government";

/** The age the filing check itself reads on a date (the birthday counts when the month and day have come). */
const filingAge = (born: string, on: string) =>
  Number(on.slice(0, 4)) -
  Number(born.slice(0, 4)) -
  (on.slice(5) < born.slice(5) ? 1 : 0);

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "eligible-on");

it(`names the day a player turns the age a contest asks in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, playerId: me } = world;
  const born = core.people.get(me!)!.birthDate;
  const end = addDays(makeIsoDate(core.date), 731);
  const api = coreAPI(core);
  const tried: string[] = [];
  for (;;) {
    const contests = governmentView(core, me!).contests;
    let checked = 0;
    let tooYoung = 0;
    const today = core.date;
    const actual = filingAge(born, today);
    for (const row of contests) {
      const because = `${where}: ${row.contest.title} on ${today}`;
      const age = row.checks.find((check) => check.rule === "minimum-age");
      expect(age, because).toBeDefined();
      const required = Number(age!.required);
      expect(Number.isInteger(required) && required > 0, because).toBe(true);
      expect(age!.met, because).toBe(actual >= required);
      if (actual >= required) {
        expect(age!.metOn, because).toBeUndefined();
      } else {
        expect(age!.metOn, because).toBeDefined();
        const on = makeIsoDate(age!.metOn!);
        expect(on > today, because).toBe(true);
        expect(filingAge(born, on), `${because}: on ${on}`).toBe(required);
        expect(
          filingAge(born, addDays(on, -1)),
          `${because}: the day before ${on}`,
        ).toBe(required - 1);
        tooYoung += 1;
      }
      checked += 1;
    }
    expect(checked, `${where}: checked every contest on ${today}`).toBe(
      contests.length,
    );
    if (tooYoung > 0) {
      process.stdout.write(
        `${where}: ${tooYoung} contests require an older candidate on ${today}; passed over ${tried.join("; ") || "none"}\n`,
      );
      return;
    }
    tried.push(
      `${today}: ${contests.length} open contests, none requiring an older candidate`,
    );
    const races = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const next = races
      .filter(
        (race) =>
          race.filingOpens &&
          race.filingOpens > today &&
          race.filingOpens <= end,
      )
      .sort((a, b) => a.filingOpens!.localeCompare(b.filingOpens!))[0];
    const january = makeIsoDate(`${Number(today.slice(0, 4)) + 1}-01-01`);
    if (january <= end && (!next || january < next.filingOpens!)) {
      // The next year's filing rows may not exist until its calendar opens.
      const previous = setBookkeeping(false);
      try {
        advanceCore(core, january);
      } finally {
        setBookkeeping(previous);
      }
    } else if (next) {
      advanceToRaceFiling(core, next);
    } else break;
    expect(
      core.date > today,
      `${where}: no calendar progress from ${today}`,
    ).toBe(true);
  }
  throw new Error(
    `${where}: no age-barred filing through ${end}; ${tried.join("; ")}`,
  );
}, 300_000);
