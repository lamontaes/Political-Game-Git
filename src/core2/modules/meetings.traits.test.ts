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
/** Each resident weighed for a meeting's room that could not hold everyone driven: their lean, whether they took part, and whether they would have with temperament left out. */
type Weighing = { lean: number; value: number; flat: number };
/** One drawn town's weighings and the different residents they came from. */
type Town = {
  name: string;
  key: string;
  seed: string;
  rows: Weighing[];
  residents: Set<string>;
};
/** The towns the take-part case pools, in the order drawn. */
const towns: Town[] = [];
/** Towns the kit's draw has tried, across both draws: the second town is the next in the same stream. */
let drawn = 0;
/**
 * Fewer weighed residents than this leave the thirds' gap mostly noise. Every
 * weighing comes from a room that turned someone away: Lonerock, Oregon's 77
 * sat at 1.40 against the study's 1.09.
 */
const MIN_TAKE_PART = 60;
/**
 * Fewer different residents than this leave the thirds' gap flat at any
 * weight, however many times they are weighed: a room filled by the same few
 * people every time turns almost no one away. Antelope Hills, Wyoming (seed
 * c2ef691f6254c1bafe3eab93d9fd2b7522e5a6a1:meetings:0) weighed 54 residents
 * 418 times and Whitney, Nebraska (seed
 * 5b9f5133d4f09b48c17a1400ad9997c407f6a142:meetings:1) 59 residents 1,068
 * times; both sat at 0.31 and 0.35 against the study's 1.09 at any weight
 * below 0.4, while every town of 138 or more residents read 0.5 to 2.5 at
 * the weights tried (0.26 to 0.32).
 */
const MIN_DIFFERENT_RESIDENTS = 100;
/** Fewer weighed cases than this leave the thirds' gap mostly noise. */
const MIN_HOST_CASES = 10;

/** Personality's own share of the thirds' gap in taking part: the top third's log odds over the bottom third's, less the same with temperament left out. */
function netTakePart(rows: readonly Weighing[]): number {
  const sorted = [...rows].sort((a, b) => a.lean - b.lean);
  const third = Math.floor(sorted.length / 3);
  const logOdds = (part: typeof sorted, key: "value" | "flat") => {
    const rate =
      (part.reduce((n, row) => n + row[key], 0) + 0.5) / (part.length + 1);
    return Math.log(rate / (1 - rate));
  };
  const low = sorted.slice(0, third),
    high = sorted.slice(-third);
  return (
    logOdds(high, "value") -
    logOdds(low, "value") -
    (logOdds(high, "flat") - logOdds(low, "flat"))
  );
}

/**
 * A town drawn by the kit's own draw, played over the window around its next
 * election, with its take-part weighings on record. The world the other
 * cases read (`first`) also needs town halls the officials weighed; the
 * other town is read for its weighings only.
 */
function drawTown(first: boolean) {
  let town: Town = {
    name: "",
    key: "",
    seed: "",
    rows: [],
    residents: new Set(),
  };
  const world = drawnRaceWorld(
    () => {
      if (first) hostCases.length = 0;
      const seed = `${SEED}:${drawn++}`;
      const place = drawPlace(seed, "trait-wiring");
      town = {
        name: place.name,
        key: place.key,
        seed,
        rows: [],
        residents: new Set(),
      };
      return { seed, place };
    },
    120,
    first
      ? (row) => {
          if (
            row.decisionId === "meetings.hold-town-hall" &&
            row.bare !== undefined
          )
            hostCases.push(row.bare);
        }
      : undefined,
    2,
    // A place whose officials weighed too few town halls, or whose meetings
    // weighed too few residents, has nothing for these tests to read. A room
    // that holds everyone driven weighs no one: in Lonerock, Oregon (seed
    // c8ff3f460600582a58a7bf6b9b69d5204859bbc4:meetings:6) about 29 adults
    // filled every town hall's 40 seats, and only its public comments, 6
    // speakers of about 26, turned anyone away.
    () => {
      console.log(
        `meetings draw: ${town.name}, ${first ? `${hostCases.length} town halls weighed, ` : ""}${town.rows.length} residents weighed for a room, ${town.residents.size} different`,
      );
      return first && hostCases.length <= MIN_HOST_CASES
        ? `${hostCases.length} town halls weighed`
        : town.rows.length < MIN_TAKE_PART
          ? `${town.rows.length} residents weighed for a meeting's room`
          : town.residents.size < MIN_DIFFERENT_RESIDENTS
            ? `${town.residents.size} different residents weighed`
            : towns.some((t) => t.key === town.key)
              ? "drawn already"
              : null;
    },
    (row) => {
      if (row.decisionId !== "meetings.take-part") return;
      town.rows.push({ lean: row.lean, value: row.value, flat: row.flat });
      if (row.actorId) town.residents.add(row.actorId);
    },
  );
  towns.push(town);
  return world;
}

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit; two towns are drawn. The town read for its
// weighings alone is drawn first and let go, so one world is held at a time.
beforeAll(() => {
  drawTown(false);
  ({ core, api } = drawTown(true));
  adults = adultsOf(core);
  // Reason for the hook's time: each drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine, and a small town's officials often weigh too few town halls, so several places may be built before one fits (seed d60345f2ab0b7229abdb17fd1eeee43bbaff5d24 passed over three, at 6, 10 and 6 town halls, before Clatonia, Nebraska held 144). Two towns are drawn, in turn from the same seed's stream.
}, 1_800_000);

describe("meetings.take-part reads one calibrated trait term", () => {
  it("in the meetings the days held in two drawn towns pooled, the third leaning most toward taking part took part at public comment and in town halls' rooms at Mondak's extraversion-sized odds over the third leaning least, net of the rooms filled with temperament left out", () => {
    expect(towns.length, "towns drawn").toBe(2);
    const pooled = towns.flatMap((t) => t.rows);
    const net = netTakePart(pooled);
    const target = studyLogOdds("meetings.take-part", "extraversion")!;
    for (const [i, t] of towns.entries())
      console.log(
        `take-part town ${i + 1}: ${t.name} (${t.key}), seed ${t.seed}, ${t.residents.size} different residents weighed ${t.rows.length} times, net log odds ${netTakePart(t.rows).toFixed(3)}`,
      );
    console.log(
      `take-part: ${pooled.length} residents weighed in ${towns.length} towns pooled, net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    // The study pools respondents nationwide; one drawn town's thirds swing
    // nearly the band's width, so the case pools two. The weight is fitted on
    // twenty drawn towns' meeting pools (its parameter row names them): the
    // sixteen with 100 or more different residents read 0.52 to 2.04 singly,
    // geometric mean 1.077 against the study's 1.088, and four runs of two
    // towns pooled read 0.84 to 1.57. Flat personality nets 0.
    expect(net).toBeGreaterThan(target / 2);
    expect(net).toBeLessThan(target * 2);
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
