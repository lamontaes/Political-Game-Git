/**
 * Personality in the meetings engine (civic family): who stands up at a
 * public meeting, who fills a town hall's room, and which officials hold a
 * town hall. A drawn place's played world (seed `c1`, the place `drawPlace`
 * names), every resident a full person, played 120 days with the probe on so
 * the cases the hosts weighed are on record.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnWorld,
  netLogOdds,
  studyLogOdds,
  thirdsLogOdds,
  weightOf,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { POLICY_QUESTIONS } from "../policy-answers";
import { questionAxis } from "../campaign-views";
import { meetingParameter, standUpDrive, townHallDrives } from "./meetings";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = process.env.GOLDEN_PATH_SEED ?? "c1";

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];
/** The host's reasons apart from personality, for each town hall the days weighed. */
const hostCases: number[] = [];

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnWorld(
    SEED,
    drawPlace(SEED, "trait-wiring"),
    "2025-05-20",
    (row) => {
      if (
        row.decisionId === "meetings.hold-town-hall" &&
        row.bare !== undefined
      )
        hostCases.push(row.bare);
    },
  ));
  adults = adultsOf(core);
});

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
    expect(net).toBeGreaterThan(target - 0.4);
    expect(net).toBeLessThan(target + 0.4);
  });

  it("a town hall's room holds the more driven first, and the most civic residents are in it", () => {
    const room = townHallDrives(api, "nobody").slice(
      0,
      meetingParameter("townHallSize"),
    );
    expect(room.length).toBeGreaterThan(0);
    const inRoom = new Set(room.map((row) => row.p.id));
    const leanOf = (p: PersonState) =>
      decisionLean(core, p, "meetings.take-part", "take-part", "stay-away");
    const town = adults.filter((p) => p.placeId === room[0]!.p.placeId);
    const mean = (who: PersonState[]) =>
      who.reduce((sum, p) => sum + leanOf(p), 0) / who.length;
    const inside = town.filter((p) => inRoom.has(p.id));
    const outside = town.filter((p) => !inRoom.has(p.id));
    console.log(
      `town hall room: ${inside.length} of ${town.length}, mean lean ${mean(inside).toFixed(3)} inside, ${mean(outside).toFixed(3)} outside`,
    );
    expect(mean(inside)).toBeGreaterThan(mean(outside));
  });
});

describe("meetings.hold-town-hall reads the calibrated lean of the host", () => {
  it("across the cases the officials weighed, the third leaning most toward hosting holds one at Mondak's extraversion-sized odds over the third leaning least", () => {
    expect(
      hostCases.length,
      "town halls weighed in the played days",
    ).toBeGreaterThan(15);
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
    expect(net).toBeGreaterThan(target - 0.25);
    expect(net).toBeLessThan(target + 0.25);
  });
});
