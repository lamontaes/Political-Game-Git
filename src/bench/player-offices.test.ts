import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  openContests,
  playerContests,
  playerMayFileFor,
  type FilingRow,
} from "../core2/modules/elections";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import playerOffices from "../core2/data/offices/player-offices.json";
import { coreAPI } from "../core2/state";
import { fileForOffice, governmentView } from "./government";
import { buildBenchWorld } from "./world";

// A kind the data lists at all (its `onlyWhereNo` rows widen it only where the home has none).
const listed = (kind: string) =>
  playerOffices.playerOffices.some((row) => kind.startsWith(row.kindPrefix));

describe("the player files only for the offices the data lists (owner, Oct 29)", () => {
  // One drawn place: the choices narrow, the rest stays open; returns how many simulated
  // filings landed outside the player's offices (a very small place may have none).
  const check = (seed: string) => {
    const place = drawPlace(seed, "player-offices");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const api = coreAPI(core);
    const kindOf = (officeId: string) =>
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(officeId) as unknown as { kind: string }
      ).kind;
    const open = openContests(api);
    const mine = playerContests(api);
    expect(mine.length, `${where}: some choice is open`).toBeGreaterThan(0);
    for (const contest of mine)
      expect(
        listed(kindOf(contest.officeId)) && playerMayFileFor(api, contest.id),
        `${where}: ${contest.title}`,
      ).toBe(true);
    // The world still runs the others: county and other seats are open contests.
    const others = open.filter((c) => !playerMayFileFor(api, c.id));
    // The screen's own view lists the same choices and no others.
    const player = [...core.people.values()].find(
      (p) => p.alive && p.tier !== "husk",
    )!;
    const view = governmentView(core, player.id);
    expect(view.contests.map((c) => c.contest.id).sort(), where).toEqual(
      mine.map((c) => c.id).sort(),
    );
    // A place whose every open contest is the player's (a territory's one lawmaking body) has
    // no other office to refuse or to watch file: it is redrawn, named.
    if (!others.length) return { where, outside: 0 };
    // The player's filing is refused for the rest, by the one reader.
    expect(() => fileForOffice(core, player.id, others[0]!.id), where).toThrow(
      /files only for/,
    );
    // Simulated candidates file for the others through the same filing engine: run the
    // world's year and some filing lands on an office outside the player's offices.
    const filingsOutside = () => {
      const filings = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[];
      return filings.filter((f) => !playerMayFileFor(api, f.contestId));
    };
    // Up to two years, a quarter at a time, until a simulated filing lands.
    for (let q = 0; q < 8 && !filingsOutside().length; q += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 91));
    const outside = filingsOutside();
    process.stdout.write(
      `${where}: ${mine.length} choices for the player, ${others.length} other open contests, ${api.moduleState(ELECTIONS_MODULE_ID).table("filings").rows().length} filings in the world after the run, ${outside.length} outside the player's offices\n`,
    );
    return { where, outside: outside.length };
  };
  it("narrows the filing choices and leaves the rest of the world filing", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    // A place whose world has no other office open, or files nothing outside the player's offices in two years, is redrawn,
    // named, so the world-still-files claim is always proven on a place that shows it.
    const skipped: string[] = [];
    for (let draw = 0; draw < 5; draw += 1) {
      const result = check(draw ? `${seed}-${draw}` : seed);
      if (result.outside > 0) return;
      skipped.push(result.where);
      process.stdout.write(
        `${result.where}: no other office to refuse or watch file, or none filed in two years, redrawn\n`,
      );
    }
    expect.fail(
      `no drawn place filed outside the player's offices: ${skipped}`,
    );
  }, 1_800_000);
});
