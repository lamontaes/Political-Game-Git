// @vitest-environment node
// How much a record mattered is one number on the reader's events (CTO, Nov
// 26, 2:53 a.m. ET: "Put the score on the reader's events, so the Journal,
// the card, the news and speeches can all read the same number"). The
// director's ledger reads that number for a person's recorded past; it keeps
// no scale of its own.
import {
  buildBenchWorldInStages,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
  type BenchWorld,
} from "../bench/world";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import mattered from "./data/history/mattered.json" with { type: "json" };
import { historyOf } from "./past";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const TABLE = mattered as unknown as {
  rows: readonly { kindPrefix: string; parameter: string }[];
  parameters: Readonly<
    Record<string, { value: number; tag: string; citation: string }>
  >;
};

it("every row of the score table names a parameter with its source", () => {
  for (const row of TABLE.rows) {
    const parameter = TABLE.parameters[row.parameter];
    expect(parameter, row.parameter).toBeDefined();
    expect(["SOURCED", "ESTIMATED", "TUNABLE"]).toContain(parameter!.tag);
    expect(parameter!.citation.length, row.parameter).toBeGreaterThan(0);
  }
});

it(
  "a person's history carries how much each record mattered, and the ledger reads that number",
  { timeout: 600_000 },
  async () => {
    setBookkeeping(false);
    // A place with no adult in a household has no one to play: it is passed
    // over by name and the place drawn again.
    const passed: string[] = [];
    let world: BenchWorld | undefined;
    let where = "";
    for (let again = 0; !world && again < 5; again++) {
      const drawSeed = again ? `${seed}:again:${again}` : seed;
      const place = drawPlace(drawSeed, "history-mattered");
      where = `${place.name} (${place.key}), seed ${drawSeed}`;
      try {
        world = await buildBenchWorldInStages(
          place.seed,
          gameStartDate(),
          {
            twoLevel: true,
            placeKey: place.key,
            warmUpDays: OPENING_WARMUP_DAYS,
          },
          () => undefined,
        );
      } catch (error) {
        if (!(error instanceof NoPlayerHereError)) throw error;
        passed.push(where);
      }
    }
    expect(world, `no one to play in ${passed.join("; ")}`).toBeDefined();
    if (!world) return;
    const { core, director } = world;
    const me = world.playerId as PersonId;
    new BenchPlayer(core, director).select(me);
    const scoreOf = (kind: string) => {
      const row = TABLE.rows.find((entry) => kind.startsWith(entry.kindPrefix));
      return row ? TABLE.parameters[row.parameter]!.value : undefined;
    };
    // On a person's history: the table's number for a kind it has a row for,
    // and none for a kind it has none for.
    const household = core.households.get(core.people.get(me)!.householdId)!;
    let scored = 0;
    let unscored = 0;
    for (const personId of household.memberIds) {
      for (const event of historyOf(core, { person: personId as PersonId })) {
        expect(event.mattered, `${where}: ${event.id}`).toBe(
          scoreOf(event.record),
        );
        if (event.mattered === undefined) unscored += 1;
        else scored += 1;
      }
    }
    expect(scored, where).toBeGreaterThan(0);
    expect(unscored, where).toBeGreaterThan(0);
    // A read of the nation is no one's life: it carries no score.
    expect(
      historyOf(core, { nation: true }, { from: "past" }).some(
        (event) => event.mattered !== undefined,
      ),
      where,
    ).toBe(false);
    // The ledger's recorded past: each moment's weight is the reader's number
    // for the fact it cites.
    const book = director.ledger.people.get(me)!;
    const past = book.moments.filter((moment) => moment.past);
    expect(past.length, where).toBeGreaterThan(0);
    const facts = new Map(
      historyOf(core, { person: me }, { from: "built" }).map((event) => [
        event.id,
        event,
      ]),
    );
    for (const event of historyOf(
      core,
      { person: me },
      { kinds: ["school.started"], from: "past" },
    ))
      facts.set(event.id, event);
    for (const moment of past) {
      const fact = facts.get(moment.causeFactId!);
      expect(fact, `${where}: ${moment.id}`).toBeDefined();
      expect(moment.impact, `${where}: ${moment.id}`).toBe(fact!.mattered);
    }
    process.stdout.write(
      `history mattered: ${where}${passed.length ? ` (passed over ${passed.join("; ")})` : ""}: ${scored} scored and ${unscored} unscored events in the household; ${past.length} past moments, each the reader's number\n`,
    );
  },
);
