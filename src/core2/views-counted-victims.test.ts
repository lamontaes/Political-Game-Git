/**
 * A counted group lives the crimes the crime engine tallies for it, by the
 * full victim's rule (owner, Oct 14: one model, two tiers): its stance on the
 * question the crime ties to moves by the share of its adults the crimes
 * reached, citing the tally row, and the press reads it (countedNewsConcern).
 *
 * Pinned: Gilliam, Missouri (2927028), world seed 53a4a04a, played Jan 20 to
 * May 5, 2025, the game's own days: the crime engine tallies counted groups
 * once a month. About 25 seconds; the test sets its own limit near twice
 * that.
 */
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countedNewsConcern, countedNewsGroups } from "./counted-news-views";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CRIME_EVENT, CRIME_MODULE_ID } from "./modules/crime";
import { VIEWS_MODULE_ID, type Stance } from "./modules/views";
import { livedQuestion } from "./outcome-news";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const GILLIAM = {
  name: "Gilliam, Missouri",
  key: "2927028",
  seed: "53a4a04aa5cce8c364ead5828f0c15569e8e360f4edf96fbb8e4ee784c7d2076",
};
const where = `${GILLIAM.name} (${GILLIAM.key}), seed ${GILLIAM.seed}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

interface Tally {
  readonly id: string;
  readonly placeId: string;
  readonly groupId: string;
  readonly counts: Readonly<Record<string, number>>;
}

describe("a counted group lives the crimes tallied for it", () => {
  it("moves its stance on the crime's question by the share of its adults reached, citing the tally", () => {
    const { core } = buildBenchWorld(GILLIAM.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: GILLIAM.key,
    });
    advanceCore(core as CoreState, makeIsoDate("2025-05-05"));
    const api = coreAPI(core as CoreState);
    const question = livedQuestion(CRIME_EVENT)!;
    expect(question, where).toBeTruthy();
    const tallies = api
      .moduleState(CRIME_MODULE_ID)
      .table("tallies")
      .rows() as unknown as Tally[];
    expect(tallies.length, where).toBeGreaterThan(0);
    const stances = api.moduleState(VIEWS_MODULE_ID).table("countedStances");
    const groups = new Map(countedNewsGroups(api).map((g) => [g.id, g]));
    let moved = 0;
    for (const tally of tallies) {
      const groupId = `counted-news:${tally.groupId}`;
      if (!groups.get(groupId)?.count) continue;
      const row = stances.get(`${groupId}:${question}`) as unknown as
        | (Stance & { reachedCount: number; representedCount: number })
        | undefined;
      // Every group a crime reached holds a stance on the question; a group
      // with no side on it (a view of exactly zero) is the one exception,
      // and none has one here.
      expect(row, `${where}: ${tally.id}`).toBeDefined();
      expect(row!.strength, `${where}: ${tally.id}`).toBeGreaterThan(0);
      // A share of one victim's move: never the whole group's.
      expect(row!.reachedCount, `${where}: ${tally.id}`).toBeLessThan(
        row!.representedCount,
      );
      moved += 1;
    }
    expect(moved, where).toBeGreaterThan(0);
    // Each latest move cites the tally row it came from.
    const tallyIds = new Set(tallies.map((t) => t.id));
    const cited = (
      stances.rows() as unknown as (Stance & { groupId: string })[]
    ).filter(
      (row) =>
        row.topic === question &&
        row.causes.some((c) => c.learnedFrom && tallyIds.has(c.learnedFrom)),
    );
    expect(cited.length, where).toBe(moved);
    // The press reads it: the town's concern with the question.
    const town = tallies[0]!.placeId;
    expect(countedNewsConcern(api, town, question), where).toBeGreaterThan(0);
    console.log(
      `${where}: ${tallies.length} tally rows, ${moved} counted groups moved on ${question}, press concern ${countedNewsConcern(api, town, question).toFixed(4)}`,
    );
  }, 60_000);
});
