/**
 * Personality in the ballot measures engine (civic family): a voter's lean
 * toward change over keeping things as they are adds to their support for a
 * measure. A drawn place in a state with a measure on its November 2026
 * ballot (the state and place come from the seed), every resident a full
 * person. No study gives a size for this, so the decision runs at the
 * general weight.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "../population";
import { advanceCore, createLifeCore } from "../life";
import { coreAPI } from "../state";
import { openLaws } from "./laws";
import { openCampaigns } from "./campaigns";
import { openOffices } from "./offices";
import { openElections } from "./elections";
import {
  measuresOf,
  measureVoteOf,
  openBallotMeasures,
} from "./ballot-measures";
import { decisionLean } from "../trait-decisions";
import { weightOf } from "../trait-test-kit";
import measures from "../data/elections/ballot-measures.json" with { type: "json" };
import { searchCorePlaces } from "../place-lookup";

const START = "2026-10-26";
const SEED = process.env.GOLDEN_PATH_SEED ?? "d3";
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${SEED}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
const states = [
  ...new Set(
    measures.measures
      .filter((m) => m.electionDate > START)
      .map((m) => m.stateKey),
  ),
].sort();

describe("ballot-measures.vote reads the voter's calibrated lean toward change", () => {
  it("each voter's support carries their trait term, and the ones who lean toward change back a measure more than the ones who lean toward keeping things", () => {
    const state = pick(states, "state");
    const key = pick(
      [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key)),
      "place",
    ).key;
    const core = createLifeCore(
      buildPopulation({
        seed: SEED,
        placeKey: key,
        startedAt: START,
        minimumPeople: 900,
      }),
    );
    openLaws(core);
    openOffices(core, SEED);
    openElections(core);
    openCampaigns(core);
    openBallotMeasures(core);
    const api = coreAPI(core);
    const onBallot = measuresOf(api);
    expect(onBallot.length, `${state} ${key}`).toBeGreaterThan(0);
    advanceCore(core, "2026-11-04");
    const weight = weightOf(core, "ballot-measures.vote");
    const rows = [...core.people.values()].flatMap((p) => {
      const vote = measureVoteOf(api, onBallot[0]!.id, p.id) as unknown as {
        voted: boolean;
        choice: string | null;
        reasons: { trait: number };
      } | null;
      return vote?.choice
        ? [
            {
              id: p.id,
              choice: vote.choice,
              trait: vote.reasons.trait,
              lean: decisionLean(core, p, "ballot-measures.vote", "yes", "no"),
            },
          ]
        : [];
    });
    console.log(
      `measure vote: ${state} ${key}, ${rows.length} voters, weight ${weight}`,
    );
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows)
      expect(row.trait, row.id).toBeCloseTo(weight * row.lean, 9);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const yes = rows.filter((r) => r.choice === "yes").map((r) => r.lean);
    const no = rows.filter((r) => r.choice === "no").map((r) => r.lean);
    expect(yes.length).toBeGreaterThan(0);
    expect(no.length).toBeGreaterThan(0);
    expect(mean(yes)).toBeGreaterThan(mean(no));
  });
});
