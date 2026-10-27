/**
 * Personality in the voting engine (civic family): who turns out, who backs
 * the incumbent and who tells an exit pollster. A drawn place's played world
 * (a place drawn from all 56 from a fresh seed, played over the weeks to just after its own next election), every resident a full person.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnRaceWorld,
  RUN_SEED,
  netLogOdds,
  studyLogOdds,
  weightOf,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { propensityOf } from "../turnout";
import { NATIONAL_ENGAGEMENT } from "../electorate";
import electionParameters from "../data/elections/parameters.json" with { type: "json" };
import {
  VOTING_MODULE_ID,
  incumbentLeanOf,
  turnoutReasons,
  type BallotRow,
} from "./voting";
import type { CoreAPI, CoreState, PersonState } from "../types";
import { setKeepEveryonesWhy } from "../why-kept";

const SEED = `${RUN_SEED}:voting`;
/** The thirds' mean lean gap toward voting over the six places the turnout weight was found on. */
const CALIBRATION_LEAN_GAP = 0.66;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town to its election takes about 20 seconds,
// inside the 60 second hook limit.
let keptBefore = false;

afterAll(() => {
  setKeepEveryonesWhy(keptBefore);
});

beforeAll(() => {
  // A voter's reasons are kept for the player's circle only; the exit-poll test
  // reads the reasons of voters nobody deals with, so it asks for everyone's.
  keptBefore = setKeepEveryonesWhy(true);
  ({ core, api } = drawnRaceWorld(
    (attempt) => {
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    },
    44,
    undefined,
    2,
    // A race counted only among the counted population leaves no full person's
    // ballot for the exit-poll test to read.
    (world) =>
      polledBallots(world.api).length > 0 ? null : "no full person's ballot",
  ));
  adults = adultsOf(core);
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

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
    // The weight is found over six places (its parameter row names them). The
    // net log odds grow with how far apart a place's thirds sit in lean: 0.83
    // to 0.88 per unit of that gap across the six, whose gaps run 0.47 to 0.73
    // and average 0.660 (measured Oct 24). So this place is held to the
    // study's size scaled by its own gap over that average, within 0.2.
    const sorted = [...lean].sort((a, b) => a - b);
    const third = Math.floor(sorted.length / 3);
    const mean = (part: number[]) =>
      part.reduce((sum, v) => sum + v, 0) / part.length;
    const gap = mean(sorted.slice(-third)) - mean(sorted.slice(0, third));
    const target =
      (studyLogOdds("voting.turnout", "openness")! * gap) /
      CALIBRATION_LEAN_GAP;
    const { net, flat } = netLogOdds(core, "voting.turnout", measure);
    console.log(
      `turnout: net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)} at this place's lean gap ${gap.toFixed(3)} (circumstances alone ${flat.toFixed(3)})`,
    );
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

/** The ballots of full people who voted for someone, with their exit-poll answer. */
function polledBallots(api: CoreAPI): BallotRow[] {
  return (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .rows() as unknown as BallotRow[]
  ).filter((b) => b.voted && b.choice !== null && b.toldPollster !== null);
}

describe("voting.exit-poll is told by voters whose engagement, stake in the race and temperament carry them over", () => {
  it("every voter in the drawn town's race tells the pollster exactly when their own reasons and their lean at the decision's weight clear zero, and both answers occur", () => {
    const polled = polledBallots(api).filter((b) => b.pollsterReasons);
    console.log(`exit poll: ${polled.length} voters with a choice`);
    expect(polled.length).toBeGreaterThan(0);
    const param = (key: string) =>
      (
        electionParameters as unknown as {
          parameters: Record<string, { value: number }>;
        }
      ).parameters[key]!.value;
    const weight = weightOf(core, "voting.exit-poll");
    let told = 0;
    for (const b of polled) {
      const { engagement, interest, lean } = b.pollsterReasons!;
      const reasons =
        param("exitPollBase") +
        param("exitPollEngagementWeight") * (engagement - NATIONAL_ENGAGEMENT) +
        param("exitPollInterestWeight") * interest;
      expect(b.toldPollster !== "declined", b.id).toBe(
        reasons + weight * lean > 0,
      );
      if (b.toldPollster !== "declined") told += 1;
    }
    console.log(`exit poll: ${told} of ${polled.length} told`);
    expect(told).toBeGreaterThan(0);
    expect(told).toBeLessThan(polled.length);
  });
});
