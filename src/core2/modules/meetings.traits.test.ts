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
  studyLogOdds,
  thirdsLogOdds,
  weightOf,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { meetingParameter, townHallDrives } from "./meetings";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = `${RUN_SEED}:meetings`;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];
/** The host's reasons apart from personality, for each town hall the days weighed. */
const hostCases: number[] = [];
/** Each resident weighed for a meeting's room: their lean, whether they took part, and whether they would have with temperament left out. */
const tookPart: { lean: number; value: number; flat: number }[] = [];
/** Fewer weighed residents than this leave the thirds' gap mostly noise. */
const MIN_TAKE_PART = 100;
/** Fewer weighed cases than this leave the thirds' gap mostly noise. */
const MIN_HOST_CASES = 10;

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld(
    (attempt) => {
      hostCases.length = 0;
      tookPart.length = 0;
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
    // A place whose officials weighed too few town halls, or whose meetings
    // weighed too few residents, has nothing for these tests to read.
    () => {
      console.log(
        `meetings draw: ${hostCases.length} town halls weighed, ${tookPart.length} residents weighed for a room`,
      );
      return hostCases.length <= MIN_HOST_CASES
        ? `${hostCases.length} town halls weighed`
        : tookPart.length < MIN_TAKE_PART
          ? `${tookPart.length} residents weighed for a meeting's room`
          : null;
    },
    (row) => {
      if (row.decisionId === "meetings.take-part")
        tookPart.push({ lean: row.lean, value: row.value, flat: row.flat });
    },
  ));
  adults = adultsOf(core);
  // Reason for the hook's time: each drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine, and a small town's officials often weigh too few town halls, so several places may be built before one fits (seed d60345f2ab0b7229abdb17fd1eeee43bbaff5d24 passed over three, at 6, 10 and 6 town halls, before Clatonia, Nebraska held 144).
}, 1_800_000);

describe("meetings.take-part reads one calibrated trait term", () => {
  it("in the meetings the days held, the third leaning most toward taking part took part at public comment and in town halls' rooms at Mondak's extraversion-sized odds over the third leaning least, net of the rooms filled with temperament left out", () => {
    const sorted = [...tookPart].sort((a, b) => a.lean - b.lean);
    const third = Math.floor(sorted.length / 3);
    const logOdds = (part: typeof sorted, key: "value" | "flat") => {
      const rate =
        (part.reduce((n, row) => n + row[key], 0) + 0.5) / (part.length + 1);
      return Math.log(rate / (1 - rate));
    };
    const low = sorted.slice(0, third),
      high = sorted.slice(-third);
    const net =
      logOdds(high, "value") -
      logOdds(low, "value") -
      (logOdds(high, "flat") - logOdds(low, "flat"));
    const target = studyLogOdds("meetings.take-part", "extraversion")!;
    console.log(
      `take-part: ${tookPart.length} residents weighed, net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    // The weight is fitted on two played years (its parameter row names
    // them), whose rooms took most of one town's adults and a third of the
    // other's; one drawn town sits within a factor of two of the study's odds.
    expect(net).toBeGreaterThan(target - Math.log(2));
    expect(net).toBeLessThan(target + Math.log(2));
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
    // A town's officials weigh tens of cases, so its gap swings: six drawn towns
    // at the fitted weight sat from 0.6 to 1.5 times the study's size; flat
    // personality nets 0.
    expect(net).toBeGreaterThan(target / 3.5);
    expect(net).toBeLessThan(target * 2.5);
  });
});
