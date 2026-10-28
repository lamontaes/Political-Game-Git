/**
 * The one electorate (owner, Oct 14, 2026): the town's counted residents
 * vote from their own records, and every place outside them is counted on
 * the same engine at a coarser level. The real 2024 figures are inputs and
 * checks, never a second decision path: the counted turnout in a
 * presidential year is checked against the state's CPS citizen turnout, and
 * each drawn state's count against its 2024 presidential share, each within
 * a TUNABLE tolerance (src/core2/data/electorate/parameters.json).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { CAMPAIGNS_MODULE_ID, openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { electorateSample, openVoting } from "./modules/voting";
import {
  countPlaces,
  countedChoice,
  countedResidents,
  type CountedFieldEntry,
} from "./electorate";
import { cpsTurnout, stateRightShare, statePlaces } from "./electorate-places";
import { appealOfShare, electorateParameter } from "./electorate-inputs";
import { campaignParameter } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-20";
const PRESIDENTIAL = "2028-11-07";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`electorate:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
// States with a presidential vote (the island areas cast none).
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR"].includes(k))
  .sort();

/** Two typical party candidates, no one holding the seat. */
const typical: readonly CountedFieldEntry[] = [-1, 1].map((side) => ({
  id: side > 0 ? "R" : "D",
  side,
  isIncumbent: false,
  standing: 0,
  localStanding: 0,
  recognition: 0,
  platform: [],
}));

function world() {
  const state = pick(states, "state");
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const key = pick(places, "place").key;
  const full = buildPopulation({
    seed,
    placeKey: key,
    startedAt: START,
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  return { core, state, key };
}

describe(`the one electorate (seed ${seed})`, () => {
  const { core, state, key } = world();
  const api = coreAPI(core);
  const usps = state.slice(3);
  const where = `${state} ${key}`;

  it("counted turnout in a presidential year lands near the state's CPS citizen turnout", () => {
    const sample = electorateSample(api, PRESIDENTIAL, 0);
    expect(sample.length, where).toBeGreaterThan(core.people.size);
    const lean = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("town")
        .get("town") as unknown as {
        lean: number;
      }
    ).lean;
    const town = countPlaces(
      sample,
      [
        {
          id: "town",
          name: "town",
          eligible: sample.length,
          rightShare: (1 + lean) / 2,
          votes2024: 0,
          source: "the town's counted adults",
        },
      ],
      typical,
    );
    const turnout = town.cast / sample.length;
    const cps = cpsTurnout(usps)!;
    const tolerance = electorateParameter("countedTurnoutTolerance");
    console.log(
      `${where}: counted turnout ${turnout.toFixed(3)} against CPS ${cps.turnout.toFixed(3)} (tolerance ${tolerance})`,
    );
    expect(Math.abs(turnout - cps.turnout), where).toBeLessThan(tolerance);
  });

  it("each drawn state's count with the opening's inputs lands near its 2024 presidential share", () => {
    const sample = electorateSample(api, PRESIDENTIAL, 0);
    const tolerance = electorateParameter("stateShareTolerance");
    // The town's own state and two more drawn from all of them: one rule.
    for (const other of [
      usps,
      ...[1, 2].map((i) => pick(states, `other:${i}`).slice(3)),
    ]) {
      const counted = countPlaces(
        sample,
        statePlaces(other, api.state.seed),
        typical,
      );
      const r = counted.votes.R ?? 0,
        d = counted.votes.D ?? 0;
      const share = r / (r + d);
      const real = stateRightShare(other, api.state.seed)!;
      console.log(
        `${other}: counted R ${share.toFixed(3)} against this world's 2024 ${real.toFixed(3)} (tolerance ${tolerance}, sample from ${where})`,
      );
      expect(Math.abs(share - real), other).toBeLessThan(tolerance);
    }
  });

  it("standing moves the vote by its research size, and the same inputs give the same votes", () => {
    const sample = electorateSample(api, PRESIDENTIAL, 0);
    const places = statePlaces(usps, api.state.seed);
    const share = (field: readonly CountedFieldEntry[]) => {
      const v = countPlaces(sample, places, field).votes;
      return (v.R ?? 0) / ((v.R ?? 0) + (v.D ?? 0));
    };
    const base = share(typical);
    expect(share(typical)).toBe(base);
    const lift = campaignParameter("incumbencyShare");
    const moved = share(
      typical.map((c) =>
        c.side > 0 ? { ...c, standing: appealOfShare(lift) } : c,
      ),
    );
    // On the uniform lean order a share of standing moves about that share
    // of the vote (turnout follows interest, so not exactly).
    expect(moved - base, where).toBeGreaterThan(lift / 2);
    expect(moved - base, where).toBeLessThan(lift * 2);
  });

  it("every counted resident decides from their own record, with reasons", () => {
    const voters = countedResidents(core);
    expect(voters.length, where).toBeGreaterThan(0);
    // The choice rule leaves a race blank when nothing separates the leaders.
    expect(countedChoice({ a: { total: 0.2 }, b: { total: 0.2 } })).toBeNull();
    expect(countedChoice({ a: { total: 0.3 }, b: { total: 0.2 } })).toBe("a");
    expect(countedChoice({ a: { total: -0.1 } })).toBeNull();
    // A lone candidate nobody knows, the voter not against them.
    expect(countedChoice({ a: { total: 0 } })).toBe("a");
  });
});
