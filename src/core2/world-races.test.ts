/**
 * M2-10 (first slice): in an election year every state and federal race
 * resolves: the town's own races with named voters (voting.ts) and every
 * other seat counted on the same engine, place by place
 * (electorate.ts, electorate-places.ts). Winners are seated on the real dates.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  members,
  openLegislature,
} from "./modules/legislature";
import {
  electoralCollege,
  openWorldRaces,
  presidentialOf,
  racesOf,
} from "./modules/world-races";
import { contingentElection } from "./contingent-election";
import { partySide } from "./appointments";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`world-races:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
// Independents in Congress caucus with the Democrats.
const sideOf = (party: string | null) =>
  partySide(party) || (/independent/i.test(party ?? "") ? -1 : 0);
const count = (rows: readonly { party: string | null }[]) => {
  const out = { R: 0, D: 0, other: 0 };
  for (const r of rows) {
    const side = sideOf(r.party);
    if (side > 0) out.R += 1;
    else if (side < 0) out.D += 1;
    else out.other += 1;
  }
  return out;
};

describe("M2-10 state and federal races in the world", () => {
  it("every race this November resolves, and winners take their seats on the real dates", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 120,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    openLegislature(core);
    openWorldRaces(core);
    const api = coreAPI(core);
    const houseBefore = count(members(api, FEDERAL_HOUSE));
    const senateBefore = count(members(api, FEDERAL_SENATE));
    advanceCore(core, "2026-11-04");
    const races = racesOf(api);
    // Every House seat outside the town's own district, and the Senate class up.
    const house = races.filter((r) => r.office === "us-house");
    const senate = races.filter((r) => r.office === "us-senate");
    expect(house.length, `${state} ${key}`).toBeGreaterThanOrEqual(430);
    expect(senate.length).toBeGreaterThanOrEqual(30);
    for (const r of races) {
      expect(r.date).toBe("2026-11-03");
      // Counted in its places: the share is the places' votes, and every
      // race keeps each party's reasons.
      expect(r.reasons?.length).toBe(2);
      // A territory's delegate seat is counted like any district, sized by
      // its registered voters and decided at its 2024 delegate lean.
      if (["PR", "GU", "VI", "AS", "MP"].includes(r.usps))
        expect(
          r.votes!.republican + r.votes!.democratic,
          `${r.seatId}: delegate race counted no voters`,
        ).toBeGreaterThan(0);
      if (!r.votes!.republican && !r.votes!.democratic) {
        expect(sideOf(r.winnerParty), r.seatId).not.toBe(0);
        continue;
      }
      expect(r.places, r.seatId).toBeGreaterThan(0);
      expect(r.republicanShare).toBeCloseTo(
        r.votes!.republican / (r.votes!.republican + r.votes!.democratic),
        9,
      );
      expect(r.reasons?.length).toBe(2);
      if (r.republicanShare !== 0.5)
        expect(sideOf(r.winnerParty)).toBe(r.republicanShare > 0.5 ? 1 : -1);
    }
    // Congress is seated January 3.
    advanceCore(core, "2027-01-02");
    const houseEve = count(members(api, FEDERAL_HOUSE));
    expect(houseEve).toEqual(houseBefore);
    advanceCore(core, "2027-01-04");
    const houseAfter = count(members(api, FEDERAL_HOUSE));
    const senateAfter = count(members(api, FEDERAL_SENATE));
    // State legislative seats the town doesn't vote for were elected and seated.
    const legislative = races.filter((r) =>
      r.office.startsWith("legislature-"),
    );
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    for (const r of legislative.filter((x) => x.seatedOn <= "2027-01-04")) {
      const serving = terms.query("bySeatStatus", [
        r.seatId,
        "serving",
      ]) as unknown as { party: string; startDate: string }[];
      expect(serving[0]?.party, r.seatId).toBe(r.winnerParty);
    }
    const flips = races.filter(
      (r) => sideOf(r.winnerParty) !== sideOf(r.incumbentParty),
    );
    govReport(
      "world-races",
      JSON.stringify({
        seed,
        state,
        place: key,
        races: races.length,
        house: house.length,
        senate: senate.length,
        legislative: legislative.length,
        houseBefore,
        houseAfter,
        senateBefore,
        senateAfter,
        flips: flips
          .map(
            (r) =>
              `${r.seatId}:${r.incumbentParty}->${r.winnerParty}:${r.republicanShare.toFixed(3)}`,
          )
          .slice(0, 25),
      }),
    );
    // Building the town and counting every race in the country takes about
    // 18 seconds alone; beside other worlds in a parallel run, more.
  }, 120_000);

  it("the presidency is won in the electoral college, and the winner and running mate take office January 20", () => {
    const state = pick(states, "pres:state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "pres:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: "2028-10-20",
        minimumPeople: 120,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    openLegislature(core);
    openWorldRaces(core);
    const api = coreAPI(core);
    advanceCore(core, "2029-01-21");
    const pres = presidentialOf(api, 2028);
    expect(pres, `${state} ${key}`).not.toBeNull();
    expect(pres!.states.reduce((a, s) => a + s.electors, 0)).toBe(538);
    const won =
      pres!.winnerParty === "Republican"
        ? pres!.electoral.republican
        : pres!.electoral.democratic;
    // A majority of electors, or (on a tie) the House's choice.
    if (pres!.electoral.republican !== pres!.electoral.democratic)
      expect(won).toBeGreaterThanOrEqual(270);
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    for (const seatId of ["seat:US:president", "seat:US:vice-president"]) {
      const serving = terms.query("bySeatStatus", [
        seatId,
        "serving",
      ]) as unknown as { party: string; startDate: string }[];
      expect(serving.length, seatId).toBe(1);
      expect(serving[0]!.party).toBe(pres!.winnerParty);
      expect(serving[0]!.startDate).toBe("2029-01-20");
    }
    const own = pres!.states.find((s) => s.stateKey === state);
    govReport(
      "world-races-president",
      JSON.stringify({
        seed,
        state,
        place: key,
        electoral: pres!.electoral,
        winner: pres!.winnerParty,
        ownState: own ?? null,
        close: pres!.states
          .filter((s) => Math.abs(s.republicanShare - 0.5) < 0.03)
          .map((s) => `${s.stateKey}:${s.republicanShare.toFixed(3)}`),
      }),
    );
  }, 120_000);

  it("sends a split election to Congress: each delegation votes, the Senate chooses the vice president, and every vote keeps its parts", () => {
    const state = pick(states, "split:state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "split:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: "2028-10-20",
        minimumPeople: 120,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    openLegislature(core);
    openWorldRaces(core);
    const api = coreAPI(core);
    const where = `seed ${seed}, ${state} place ${key}`;
    // The electors meet and the count is whatever the counties gave.
    advanceCore(core, "2028-12-20");
    const counted = presidentialOf(api, 2028)!;
    expect(counted.contingent, where).toBeUndefined();
    // Force a split: no ticket reaches the majority this time.
    electoralCollege(api, 2028, 539);
    const pending = presidentialOf(api, 2028)!;
    expect(pending.contingent?.status, where).toBe("pending");
    expect(pending.contingent?.on).toBe("2029-01-06");
    advanceCore(core, "2029-01-07");
    const row = presidentialOf(api, 2028)!;
    expect(["decided", "deadlocked"], where).toContain(row.contingent!.status);
    const record = api
      .moduleState("core2-world-races-v1")
      .table("contingent")
      .get(row.contingent!.recordId) as unknown as ReturnType<
      typeof contingentElection
    >;
    expect(record, where).toBeDefined();
    // One vote per delegation of a voting state, with every member's parts.
    const house = members(api, FEDERAL_HOUSE);
    const delegations = new Set(house.map((m) => m.seatId.split(":")[1]));
    expect(
      record.house.delegations.map((d) => d.stateKey).sort(),
      where,
    ).toEqual([...delegations].sort());
    expect(record.house.delegations.reduce((n, d) => n + d.members, 0)).toBe(
      house.length,
    );
    for (const delegation of record.house.delegations) {
      expect(delegation.memberVotes).toHaveLength(delegation.members);
      for (const vote of delegation.memberVotes)
        expect(
          vote.total,
          `${vote.memberId} ${vote.parts.party}+${vote.parts.district}+${vote.parts.stateVote}`,
        ).toBeCloseTo(
          vote.parts.party + vote.parts.district + vote.parts.stateVote,
          9,
        );
    }
    // A majority of all the states chose, or nobody did and someone acts.
    expect(record.house.needed).toBe(26);
    if (row.contingent!.status === "decided") {
      const chosen =
        record.house.chosenSide > 0
          ? record.house.republicanStates
          : record.house.democraticStates;
      expect(chosen, where).toBeGreaterThanOrEqual(26);
      expect(record.acting).toBeNull();
    } else {
      expect(record.house.chosenSide).toBe(0);
      expect(record.acting, where).not.toBeNull();
    }
    // The Senate chooses the vice president by a majority of the whole number.
    const senators = members(api, FEDERAL_SENATE);
    expect(record.senate.votes).toHaveLength(senators.length);
    expect(record.senate.needed).toBe(Math.floor(senators.length / 2) + 1);
    govReport(
      "world-races-contingent",
      JSON.stringify({
        seed,
        state,
        place: key,
        status: row.contingent!.status,
        acting: record.acting,
        house: {
          republicanStates: record.house.republicanStates,
          democraticStates: record.house.democraticStates,
          needed: record.house.needed,
        },
        senate: {
          republican: record.senate.republican,
          democratic: record.senate.democratic,
          needed: record.senate.needed,
        },
        president: row.winnerParty,
        vicePresident: row.vicePresidentParty,
      }),
    );
    // Congress's choice is who takes office on January 20.
    advanceCore(core, "2029-01-21");
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const president = terms.query("bySeatStatus", [
      "seat:US:president",
      "serving",
    ]) as unknown as { party: string; reached: string }[];
    expect(president, where).toHaveLength(1);
    expect(president[0]!.party).toBe(row.winnerParty);
    const vice = terms.query("bySeatStatus", [
      "seat:US:vice-president",
      "serving",
    ]) as unknown as { party: string }[];
    expect(vice.length, where).toBe(row.vicePresidentParty ? 1 : 0);
    if (row.vicePresidentParty)
      expect(vice[0]!.party).toBe(row.vicePresidentParty);
    // When the House cannot choose (here: a majority of 200 states, which no
    // delegation count can reach) the vice president-elect acts, else the Speaker.
    const stuck = contingentElection(api, {
      year: 2028,
      electors: Object.fromEntries(
        row.states.map((state) => [state.stateKey, state.winnerSide]),
      ),
      states: 200,
    });
    expect(stuck.house.chosenSide, where).toBe(0);
    expect(stuck.acting, where).not.toBeNull();
    expect(stuck.presidentSide, where).not.toBe(0);
    if (stuck.acting === "vice-president-elect")
      expect(stuck.vicePresidentSide).toBe(0);
  }, 240_000);
});
