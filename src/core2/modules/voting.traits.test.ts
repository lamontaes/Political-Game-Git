/**
 * Personality in the voting engine (civic family): who turns out, who backs
 * the incumbent and who tells an exit pollster. A drawn place's played world
 * (seed `c1`, the place `drawPlace` names, played through its March 4, 2025
 * town election), every resident a full person.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnWorld,
  netLogOdds,
  studyLogOdds,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { propensityOf } from "../turnout";
import {
  VOTING_MODULE_ID,
  incumbentLeanOf,
  turnoutReasons,
  type BallotRow,
} from "./voting";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = process.env.GOLDEN_PATH_SEED ?? "c1";

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town to its election takes about 20 seconds,
// inside the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnWorld(
    SEED,
    drawPlace(SEED, "trait-wiring"),
    "2025-03-05",
  ));
  adults = adultsOf(core);
});

describe("voting.turnout reads one calibrated trait term", () => {
  it("the third leaning most toward voting has Mondak's openness-sized odds over the third leaning least, net of circumstances", () => {
    const lean = adults.map((p) =>
      decisionLean(core, p, "voting.turnout", "vote", "stay-home"),
    );
    const measure = () =>
      adults.map((p, i) => {
        const { duty, cost } = turnoutReasons(api, p, undefined, 0);
        return {
          lean: lean[i]!,
          p: propensityOf({ duty, stakes: 0, reach: 0, habit: 0, cost }),
        };
      });
    const target = studyLogOdds("voting.turnout", "openness")!;
    const { net, flat } = netLogOdds(core, "voting.turnout", measure);
    console.log(
      `turnout: net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)} (circumstances alone ${flat.toFixed(3)})`,
    );
    // The weight is found over six places; a single place's trait spread moves
    // the gap (the thirds' lean gap runs 0.47 to 0.73 across them), so this
    // place is held to the study's size within 0.2.
    expect(net).toBeGreaterThan(target - 0.2);
    expect(net).toBeLessThan(target + 0.2);
  });

  it("two voters alike but for their traits differ in the duty they carry by the lean times the weight, and nothing else", () => {
    const ranked = adults
      .map((p) => ({
        p,
        lean: decisionLean(core, p, "voting.turnout", "vote", "stay-home"),
      }))
      .sort((a, b) => a.lean - b.lean);
    const low = ranked[0]!;
    const high = ranked[ranked.length - 1]!;
    const duty = (who: PersonState) => turnoutReasons(api, who, 0, 0).duty;
    const withTraits = duty(high.p) - duty(low.p);
    const flat = withTraitWeight(core, "voting.turnout", 0, () => {
      return duty(high.p) - duty(low.p);
    });
    console.log(
      `turnout: ${high.p.id} (lean ${high.lean.toFixed(2)}) against ${low.p.id} (lean ${low.lean.toFixed(2)}): duty gap ${withTraits.toFixed(3)}, flat ${flat.toFixed(3)}`,
    );
    // Engagement is the only other thing in duty; flat, it is all that is left.
    expect(withTraits - flat).toBeGreaterThan(0.3);
  });
});

describe("voting.back-incumbent reads the calibrated lean toward keeping the known", () => {
  it("a voter leaning toward the known carries a higher incumbent appeal than one leaning toward change, by the weight times the lean gap", () => {
    const ranked = adults
      .map((p) => ({
        p,
        lean: decisionLean(
          core,
          p,
          "voting.back-incumbent",
          "incumbent",
          "challenger",
        ),
      }))
      .sort((a, b) => a.lean - b.lean);
    const low = ranked[0]!;
    const high = ranked[ranked.length - 1]!;
    const gap = incumbentLeanOf(api, high.p) - incumbentLeanOf(api, low.p);
    console.log(
      `back-incumbent: ${high.p.id} against ${low.p.id}: appeal gap ${gap.toFixed(3)}, lean gap ${(high.lean - low.lean).toFixed(3)}`,
    );
    expect(gap).toBeGreaterThan(0.3);
    const flat = withTraitWeight(
      core,
      "voting.back-incumbent",
      0,
      () => incumbentLeanOf(api, high.p) - incumbentLeanOf(api, low.p),
    );
    expect(flat).toBe(0);
  });
});

describe("voting.exit-poll is told by the voters whose traits lean toward telling", () => {
  it("every voter in the March 4 contests who told the pollster leans toward telling, and everyone who declined leans away", () => {
    const ballots = api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .rows() as unknown as BallotRow[];
    const polled = ballots.filter(
      (b) => b.voted && b.choice !== null && b.toldPollster !== null,
    );
    console.log(`exit poll: ${polled.length} voters with a choice`);
    expect(polled.length).toBeGreaterThan(0);
    for (const b of polled) {
      const voter = core.people.get(b.voterId)!;
      const lean = decisionLean(
        core,
        voter,
        "voting.exit-poll",
        "tell",
        "decline",
      );
      if (b.toldPollster === "declined")
        expect(lean, b.id).toBeLessThanOrEqual(0);
      else expect(lean, b.id).toBeGreaterThan(0);
    }
  });
});
