/**
 * Personality in the meetings engine (civic family): who stands up at a
 * public meeting, who fills a town hall's room, and which officials hold a
 * town hall. A drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every resident a full person, played 120 days with the probe on so
 * the cases the hosts weighed are on record.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnRaceWorld,
  RUN_SEED,
  netLogOdds,
  studyLogOdds,
  thirdsLogOdds,
  weightOf,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { POLICY_QUESTIONS } from "../policy-answers";
import { questionAxis } from "../campaign-views";
import { meetingParameter, standUpDrive, townHallDrives } from "./meetings";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = `${RUN_SEED}:meetings`;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];
/** The host's reasons apart from personality, for each town hall the days weighed. */
const hostCases: number[] = [];
/** Fewer weighed cases than this leave the thirds' gap mostly noise. */
const MIN_HOST_CASES = 10;

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld(
    (attempt) => {
      hostCases.length = 0;
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    },
    120,
    (row) => {
      if (
        row.decisionId === "meetings.hold-town-hall" &&
        row.bare !== undefined
      )
        hostCases.push(row.bare);
    },
    2,
    // A place whose officials weighed too few town halls has nothing for the hosting test to read.
    () =>
      hostCases.length > MIN_HOST_CASES
        ? null
        : `${hostCases.length} town halls weighed`,
  ));
  adults = adultsOf(core);
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

describe("meetings.take-part reads one calibrated trait term", () => {
  it("the third leaning most toward taking part stands up at public comment at Mondak's extraversion-sized odds over the third leaning least, net of circumstances", () => {
    const questions = Object.keys(POLICY_QUESTIONS)
      .filter((q) => questionAxis(q) !== 0)
      .sort()
      .slice(0, 12);
    const lean = adults.map((p) =>
      decisionLean(core, p, "meetings.take-part", "take-part", "stay-away"),
    );
    // The meeting's time lets about a tenth of the town speak on a question:
    // the most driven tenth on each question stands up.
    const measure = () => {
      const stands = adults.map(() => 0);
      for (const question of questions) {
        const drives = adults.map(
          (p) => standUpDrive(api, p, { question, position: 1 }).drive,
        );
        const cut = [...drives].sort((a, b) => b - a)[
          Math.floor(adults.length / 10)
        ]!;
        drives.forEach((d, i) => {
          if (d > cut) stands[i]! += 1;
        });
      }
      return adults.map((_, i) => ({
        lean: lean[i]!,
        p: stands[i]! / questions.length,
      }));
    };
    const target = studyLogOdds("meetings.take-part", "extraversion")!;
    const { net, flat } = netLogOdds(core, "meetings.take-part", measure);
    console.log(
      `take-part: net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)} (circumstances alone ${flat.toFixed(3)})`,
    );
    // One drawn town against a size calibrated over several: towns seen so far
    // sit from 0.45 below it to 0.61 above it; flat personality nets 0.
    expect(net).toBeGreaterThan(target - 0.75);
    expect(net).toBeLessThan(target + 0.75);
  });

  it("each resident's drive to fill a town hall's room is their drive with personality flat times one plus the weight times their lean", () => {
    const w = weightOf(core, "meetings.take-part");
    const played = townHallDrives(api, "nobody");
    const flat = new Map(
      withTraitWeight(core, "meetings.take-part", 0, () =>
        townHallDrives(api, "nobody"),
      ).map((row) => [row.p.id, row.drive]),
    );
    expect(played.length).toBeGreaterThan(0);
    let moved = 0;
    for (const row of played) {
      const lean = decisionLean(
        core,
        row.p,
        "meetings.take-part",
        "take-part",
        "stay-away",
      );
      expect(row.drive, row.p.id).toBeCloseTo(
        flat.get(row.p.id)! * (1 + w * lean),
        9,
      );
      if (Math.abs(row.drive - flat.get(row.p.id)!) > 1e-9) moved += 1;
    }
    console.log(
      `town hall drives: ${played.length} residents driven, ${moved} moved by temperament (weight ${w}), room of ${meetingParameter("townHallSize")}`,
    );
    expect(moved).toBeGreaterThan(0);
  });
});

describe("meetings.hold-town-hall reads the calibrated lean of the host", () => {
  it("across the cases the officials weighed, the third leaning most toward hosting holds one at Mondak's extraversion-sized odds over the third leaning least", () => {
    expect(
      hostCases.length,
      "town halls weighed in the played days",
    ).toBeGreaterThan(MIN_HOST_CASES);
    const w = weightOf(core, "meetings.hold-town-hall");
    const leans = adults
      .map((p) =>
        decisionLean(core, p, "meetings.hold-town-hall", "hold", "skip"),
      )
      .sort((a, b) => a - b);
    // Each weighed case crossed with every adult's lean: the host's circumstances come from the days, the traits from the town.
    const gapAt = (weight: number) =>
      thirdsLogOdds(
        leans.flatMap((lean) =>
          hostCases.map((bare) => ({
            lean,
            p: bare + weight * lean > 0 ? 1 : 0,
          })),
        ),
      );
    const net = gapAt(w) - gapAt(0);
    const target = studyLogOdds("meetings.hold-town-hall", "extraversion")!;
    console.log(
      `hold-town-hall: ${hostCases.length} cases, weight ${w}, net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    // A town's officials weigh tens of cases, so its gap swings: drawn towns so far
    // sit from a third of the study's size to twice it; flat personality nets 0.
    expect(net).toBeGreaterThan(target / 3.5);
    expect(net).toBeLessThan(target * 2.5);
  });
});
