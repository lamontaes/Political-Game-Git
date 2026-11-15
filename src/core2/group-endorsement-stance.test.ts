/**
 * What a group stands for when it weighs a candidate, and whom its word
 * reaches (one model, two tiers). A group has its own cause (a cause group's
 * topic, a residents' or employers' side, a party's positions); on every
 * other question a candidate runs on, its members' own views speak for it
 * (`groupPositions` in src/core2/modules/campaigns.ts), so a party chapter
 * weighs a budget-line plank by what its members want. Its endorsement
 * reaches its members by name, and the counted residents who share its cause
 * by the same rule times their count: the share of the town's holders of the
 * stance it reached, by how firmly each holds it (`endorsedOn` in
 * src/core2/modules/voting.ts, read by `countedAppeal`).
 *
 * Pinned: Marshfield, Massachusetts, world seed 75d9b7ad, the township board
 * races of Nov 4, 2025, whose groups weigh them in late September. Playing
 * Jan 20 to Oct 1 is the game's own days, about 110 seconds, so the test sets
 * its own limit near twice that.
 */
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { groupStance, personLean } from "./campaign-views";
import {
  countedAppeal,
  countedResidents,
  type CountedFieldEntry,
} from "./electorate";
import {
  CAMPAIGNS_MODULE_ID,
  groupPositions,
  organizedGroupsIn,
  townLean,
  type EndorsementRow,
} from "./modules/campaigns";
import { endorsedOn } from "./modules/voting";
import { countedStanceProfile, viewOn } from "./modules/views";

const MARSHFIELD = {
  name: "Marshfield, Massachusetts",
  key: "2538820",
  seed: "75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78",
};
const where = `${MARSHFIELD.name} (${MARSHFIELD.key}), seed ${MARSHFIELD.seed}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

describe("a group's stance and its reach", () => {
  it("a group weighs other questions by its members' views, and its endorsement reaches the counted residents who share its cause", () => {
    const { core } = buildBenchWorld(MARSHFIELD.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: MARSHFIELD.key,
    });
    advanceCore(core as CoreState, makeIsoDate("2025-10-01"));
    const state = core as CoreState;
    const api = coreAPI(state);
    const lean0 = townLean(api);
    // A group (never a paper) that backed a candidate, on a stance, and
    // reached its members.
    const row = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("endorsements")
        .rows() as unknown as EndorsementRow[]
    ).find(
      (r) =>
        r.answer === "yes" &&
        r.organizationId !== null &&
        r.stance !== null &&
        r.reached > 0 &&
        state.organizations.get(r.organizationId as never)?.kind !== "media",
    );
    expect(row, where).toBeDefined();
    const placeId = state.organizations.get(row!.organizationId as never)!
      .placeId as string;
    const group = organizedGroupsIn(api, placeId).find(
      (g) => g.organizationId === row!.organizationId,
    );
    expect(group, `${where}: ${row!.id}`).toBeDefined();

    // Its own cause stands as it is; any other question is its members' mean view.
    const positionOn = groupPositions(api, group!);
    for (const own of group!.stance)
      expect(positionOn(own.question), where).toBe(own.position);
    const other =
      row!.stance!.question === "budget-line:schools"
        ? "budget-line:police"
        : "budget-line:schools";
    expect(
      group!.stance.some((s) => s.question === other),
      where,
    ).toBe(false);
    const members = group!.memberIds.filter(
      (id) => state.people.get(id)?.alive,
    );
    expect(members.length, where).toBeGreaterThan(0);
    const mean =
      members.reduce(
        (sum, id) =>
          sum +
          viewOn(
            api,
            id,
            other,
            personLean(state.people, state.people.get(id)!, lean0),
          ),
        0,
      ) / members.length;
    expect(positionOn(other), where).toBeCloseTo(mean, 12);
    expect(mean, `${where}: ${other}`).not.toBe(0);

    // Its endorsement reaches the counted residents who share its cause.
    const endorsed = endorsedOn(api, row!.filingId).find(
      (by) => by.question === row!.stance!.question,
    );
    expect(endorsed, `${where}: ${row!.id}`).toBeDefined();
    expect(endorsed!.warmth, where).toBeGreaterThan(0);
    const entry: CountedFieldEntry = {
      id: row!.candidateId,
      side: 0,
      isIncumbent: false,
      standing: 0,
      localStanding: 0,
      recognition: 0,
      platform: [],
    };
    const counted = countedResidents(state).filter(
      (v) => v.placeId === placeId,
    );
    const read = (voter: (typeof counted)[number]) => {
      const profile = countedStanceProfile(api, voter);
      const lean = personLean(state.people, voter as never, lean0);
      const at = { inTown: true, local: true, incumbentLean: 0, profile };
      const without = countedAppeal(lean, [entry], at)[entry.id]!.warmth ?? 0;
      const withIt =
        countedAppeal(lean, [{ ...entry, endorsed: [endorsed!] }], at)[
          entry.id
        ]!.warmth ?? 0;
      const holds =
        groupStance(lean, endorsed!.question, profile) * endorsed!.position;
      return { holds, gain: withIt - without };
    };
    const reads = counted.map(read);
    const sharing = reads.filter((r) => r.holds > 0);
    const opposed = reads.filter((r) => r.holds < 0);
    expect(sharing.length, where).toBeGreaterThan(0);
    expect(opposed.length, where).toBeGreaterThan(0);
    // Those who share the cause hear it, by how firmly they hold it.
    for (const r of sharing)
      expect(r.gain, where).toBeCloseTo(endorsed!.warmth * r.holds, 12);
    // Those who hold the other side are not its people.
    for (const r of opposed) expect(r.gain, where).toBe(0);
    console.log(
      `${where}: ${row!.id} on ${endorsed!.question}; ${sharing.length} counted records share it, ${opposed.length} oppose; warmth ${endorsed!.warmth.toFixed(4)}; ${other} members' view ${mean.toFixed(3)}`,
    );
  }, 200_000);
});
