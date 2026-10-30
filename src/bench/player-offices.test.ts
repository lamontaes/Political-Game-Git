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
  type FilingRow,
} from "../core2/modules/elections";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import playerOffices from "../core2/data/offices/player-offices.json";
import { coreAPI } from "../core2/state";
import { fileForOffice, governmentView } from "./government";
import { buildBenchWorld } from "./world";

const allowed = (kind: string) =>
  playerOffices.playerOffices.some((row) => kind.startsWith(row.kindPrefix));

describe("the player files only for the six offices (owner, Oct 29)", () => {
  it("narrows the filing choices and leaves the rest of the world filing", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
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
        allowed(kindOf(contest.officeId)),
        `${where}: ${contest.title}`,
      ).toBe(true);
    // The world still runs the others: county and other seats are open contests.
    const others = open.filter((c) => !allowed(kindOf(c.officeId)));
    expect(
      others.length,
      `${where}: other offices still hold contests`,
    ).toBeGreaterThan(0);
    // The screen's own view lists the same choices and no others.
    const player = [...core.people.values()].find(
      (p) => p.alive && p.tier !== "husk",
    )!;
    const view = governmentView(core, player.id);
    expect(view.contests.map((c) => c.contest.id).sort(), where).toEqual(
      mine.map((c) => c.id).sort(),
    );
    // The player's filing is refused for the rest, by the one reader.
    expect(() => fileForOffice(core, player.id, others[0]!.id), where).toThrow(
      /files only for/,
    );
    // Simulated candidates file for the others through the same filing engine: run the
    // world's year and some filing lands on an office outside the six.
    const filingsOutside = () => {
      const filings = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[];
      const contestKinds = new Map(
        (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as { id: string; officeId: string }[]
        ).map((c) => [c.id, kindOf(c.officeId)]),
      );
      return filings.filter(
        (f) => !allowed(contestKinds.get(f.contestId) ?? ""),
      );
    };
    // Up to two years, a quarter at a time, until a simulated filing lands.
    for (let q = 0; q < 8 && !filingsOutside().length; q += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 91));
    const outside = filingsOutside();
    expect(
      outside.length,
      `${where}: simulated candidates filed for offices outside the six`,
    ).toBeGreaterThan(0);
    process.stdout.write(
      `${where}: ${mine.length} choices for the player, ${others.length} other open contests, ${api.moduleState(ELECTIONS_MODULE_ID).table("filings").rows().length} filings in the world after the run, ${outside.length} outside the six\n`,
    );
  }, 600_000);
});
