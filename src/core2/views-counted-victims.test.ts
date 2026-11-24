/**
 * A counted group lives the crimes the crime engine tallies for it, by the
 * full victim's rule (owner, Oct 14: one model, two tiers): its stance on the
 * question the crime ties to moves by the share of its adults the crimes
 * reached, citing the tally row, and the press reads it (countedNewsConcern).
 * Each counted member holds the group's stance where a ballot reads them
 * (`groupStance`, through `countedStanceProfile`), and a member filled in
 * from the group starts from it as a full person.
 *
 * Pinned: Gilliam, Missouri (2927028), world seed 53a4a04a, played Jan 20 to
 * May 5, 2025, the game's own days: the crime engine tallies counted groups
 * once a month. One world for both tests, about 30 seconds; the first test
 * sets its own limit near twice that.
 */
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { groupAgreement, groupStance } from "./campaign-views";
import { countedNewsConcern, countedNewsGroups } from "./counted-news-views";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CRIME_EVENT, CRIME_MODULE_ID } from "./modules/crime";
import { residentsRuntime } from "./modules/residents";
import {
  countedStanceProfile,
  stanceOn,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import { livedQuestion } from "./outcome-news";
import { coreAPI, fillInPerson } from "./state";
import { ageOnDate } from "./kernel/dates";
import viewsJson from "./data/views/views.json" with { type: "json" };
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

let world: CoreState | undefined;
function played(): CoreState {
  if (!world) {
    const { core } = buildBenchWorld(GILLIAM.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: GILLIAM.key,
    });
    world = core as CoreState;
    advanceCore(world, makeIsoDate("2025-05-05"));
  }
  return world;
}

describe("a counted group lives the crimes tallied for it", () => {
  it("moves its stance on the crime's question by the share of its adults reached, citing the tally", () => {
    const core = played();
    const api = coreAPI(core);
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

  it("is held by each counted member where a ballot reads them, and by a member filled in", () => {
    const core = played();
    const api = coreAPI(core);
    const question = livedQuestion(CRIME_EVENT)!;
    const weight = viewsJson.parameters.stanceViewWeight.value;
    const stances = api.moduleState(VIEWS_MODULE_ID).table("countedStances");
    const store = residentsRuntime(core)!.store;
    const adult = api.parameter("votingAge");
    // The first counted adult, in the store's order, of a group the crimes moved.
    let voterId: string | undefined;
    let row: Stance | undefined;
    for (const group of store.groups) {
      row = stances.get(`counted-news:${group.id}:${question}`) as unknown as
        Stance | undefined;
      if (!row) continue;
      for (const ix of group.households) {
        const h = store.households[ix]!;
        if (h.gone) continue;
        voterId = store
          .countedMembers(h)
          .filter((m) => ageOnDate(store.born[m]!, core.date) >= adult)
          .map((m) => store.ids[m]!)[0];
        if (voterId) break;
      }
      if (voterId) break;
    }
    expect(voterId, where).toBeDefined();
    const signed = (row!.desiredChange === "enact" ? 1 : -1) * row!.strength;
    expect(signed, where).not.toBe(0);
    const voter = residentsRuntime(core)!.store.personInput(
      store.memberOf.get(voterId as never)!,
    );
    const profile = countedStanceProfile(api, voter);
    // The ballot's read of a counted voter: their stance and their agreement
    // with a platform on the question move with the group's row.
    expect(profile.heard?.(question), where).toBeCloseTo(weight * signed, 12);
    const without = { ...profile, heard: undefined };
    for (const lean of [-0.5, 0, 0.5]) {
      const moved =
        groupStance(lean, question, profile) -
        groupStance(lean, question, without);
      if (
        Math.abs(groupStance(lean, question, without)) <
        1 - weight * Math.abs(signed)
      )
        expect(moved, `${where}: lean ${lean}`).toBeCloseTo(
          weight * signed,
          12,
        );
    }
    const platform = [{ question, position: 1 } as never];
    expect(
      Math.sign(
        groupAgreement(0, platform, profile) -
          groupAgreement(0, platform, without),
      ),
      where,
    ).toBe(Math.sign(signed));
    // Filled in, they start from the group's stance and cite what moved it.
    const person = fillInPerson(core, voterId as never);
    const own = api
      .moduleState(VIEWS_MODULE_ID)
      .table("stances")
      .get(`${person.id}:${question}`) as unknown as Stance | undefined;
    expect(own, where).toBeDefined();
    expect(own!.desiredChange, where).toBe(row!.desiredChange);
    expect(own!.strength, where).toBe(row!.strength);
    expect(own!.causes, where).toEqual(row!.causes);
    expect(stanceOn(api, person.id, question), where).toBeCloseTo(signed, 12);
    console.log(
      `${where}: counted voter ${voterId} holds ${row!.desiredChange} ${row!.strength.toFixed(4)} on ${question}; filled in with it`,
    );
  });
});
