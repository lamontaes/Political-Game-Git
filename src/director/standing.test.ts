/**
 * Scenes carry tags for who the player is (pool item
 * director-scene-tags-from-player-standing; owner, Nov 15: "these 10 scenes
 * can only play if you're a state legislator"). Every situation type and
 * every circumstance row says in `holds` who the person must be, the words
 * parse, and in a played world of a place drawn from all 56 a seated state
 * legislator, a council member and a resident in no office each stand where
 * their records say: the state legislature's own scene binds only for the
 * legislator, the desk's only for an executive, and "none" only out of
 * office. The place and seed are in every message; replay with STANDING_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import circumstances from "./data/circumstances.json" with { type: "json" };
import situations from "./data/situation-types.json" with { type: "json" };
import {
  holdsAny,
  holdsWord,
  playerStanding,
  type PlayerStanding,
} from "./standing";

const bare = (over: Partial<PlayerStanding> = {}): PlayerStanding => ({
  offices: [],
  officeIds: new Set(),
  filedIn: [],
  working: false,
  ...over,
});
const legislator = bare({
  offices: [
    {
      officeId: "o1",
      kind: "legislature-lower",
      branch: "lawmaking",
      level: "state",
    },
  ],
});
const council = bare({
  offices: [
    { officeId: "o2", kind: "council", branch: "lawmaking", level: "local" },
  ],
});
const mayor = bare({
  offices: [
    { officeId: "o3", kind: "mayor", branch: "executive", level: "local" },
  ],
});

const typeHolds = (key: string) =>
  (situations as { types: { key: string; holds: string[] }[] }).types.find(
    (type) => type.key === key,
  )!.holds;

describe("every scene kind says who must hold it", () => {
  it("each situation type and each circumstance row carries holds words that parse", () => {
    const rows = [
      ...(
        situations as { types: { key: string; holds?: string[] }[] }
      ).types.map((type) => [`type ${type.key}`, type.holds] as const),
      ...(
        circumstances as { rows: { id: string; holds?: string[] }[] }
      ).rows.map((row) => [`circumstance ${row.id}`, row.holds] as const),
    ];
    expect(rows.length).toBe(89 + 34);
    for (const [owner, holds] of rows) {
      expect(holds?.length, `${owner} has no holds`).toBeGreaterThan(0);
      for (const word of holds!)
        expect(
          () => holdsWord(word, legislator),
          `${owner}: ${word}`,
        ).not.toThrow();
    }
  });

  it("reads each word by office branch and level, filing and work", () => {
    expect(holdsWord("office:lawmaking:state", legislator)).toBe(true);
    expect(holdsWord("office:lawmaking:state", council)).toBe(false);
    expect(holdsWord("office:lawmaking:local", council)).toBe(true);
    expect(holdsWord("office:lawmaking", council)).toBe(true);
    expect(holdsWord("office:executive", mayor)).toBe(true);
    expect(holdsWord("office:executive:state", mayor)).toBe(false);
    expect(holdsWord("office:executive", legislator)).toBe(false);
    expect(holdsWord("office:state", legislator)).toBe(true);
    expect(holdsWord("office", mayor)).toBe(true);
    expect(holdsWord("none", bare())).toBe(true);
    expect(holdsWord("none", mayor)).toBe(false);
    expect(holdsWord("none", bare({ filedIn: ["c1"] }))).toBe(false);
    expect(holdsWord("filed", bare({ filedIn: ["c1"] }))).toBe(true);
    expect(holdsWord("working", bare({ working: true }))).toBe(true);
    expect(() => holdsWord("office:judicial", mayor)).toThrow();
    expect(() => holdsWord("rich", mayor)).toThrow();
  });
});

const seed = process.env.STANDING_SEED ?? randomBytes(8).toString("hex");

describe(`a played world's standing (seed ${seed})`, () => {
  it("a seated state legislator, a council member and a resident stand where their records say", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < 8; draw++) {
      const place = drawPlace(seed, `standing:${draw}`);
      const where = `${place.name} (${place.key}), seed ${seed}, draw ${draw}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const seats = townSeats(coreAPI(core)).filter(
        (row) => row.holder?.personId,
      );
      const held = (test: (kind: string) => boolean) =>
        seats.find((row) => test(row.office.kind))?.holder?.personId as
          PersonId | undefined;
      const stateMember = held((kind) => kind.startsWith("legislature-"));
      const councilMember = held((kind) => kind === "council");
      if (!stateMember || !councilMember) {
        passed.push(
          `${where}: ${stateMember ? "" : "no state legislator filled in; "}${councilMember ? "" : "no council member filled in"}`,
        );
        continue;
      }
      const asLegislator = playerStanding(core, stateMember);
      const asCouncil = playerStanding(core, councilMember);
      const resident = playerStanding(core, playerId! as PersonId);
      const chairHold = typeHolds("hold-chair-sought");
      const desk = typeHolds("desk-visit");
      expect(holdsAny(chairHold, asLegislator), where).toBe(true);
      expect(holdsAny(chairHold, asCouncil), where).toBe(false);
      expect(holdsAny(desk, asLegislator), where).toBe(false);
      expect(holdsAny(desk, asCouncil), where).toBe(false);
      expect(holdsAny(["office:lawmaking:local"], asCouncil), where).toBe(true);
      expect(holdsAny(["none"], asLegislator), where).toBe(false);
      expect(holdsAny(["none"], asCouncil), where).toBe(false);
      // The new life's player starts in no office.
      expect(resident.offices, where).toEqual([]);
      expect(
        holdsAny(["none"], resident) || holdsAny(["filed"], resident),
        where,
      ).toBe(true);
      const mayorId = held((kind) => kind === "mayor");
      if (mayorId)
        expect(holdsAny(desk, playerStanding(core, mayorId)), where).toBe(true);
      process.stdout.write(
        `standing: ${where}; legislator ${stateMember}, council ${councilMember}, mayor ${mayorId ?? "none filled in"}; passed over: ${passed.join(" | ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No drawn place had both: ${passed.join(" | ")}`);
  }, 900_000);
});
