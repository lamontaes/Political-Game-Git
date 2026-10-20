/**
 * Personality in the news engine (civic family): who passes a story on, and
 * who takes in a story a neighbor tells them. A drawn place's played world
 * (seed `d1`, the place `drawPlace` names), every resident a full person,
 * played 60 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnWorld,
  studyLogOdds,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { believesClaim } from "../heard-claims";
import { newsKey, storiesOwedAtContact } from "./news";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = process.env.GOLDEN_PATH_SEED ?? "d1";

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town 60 days takes about 25 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnWorld(
    SEED,
    drawPlace(SEED, "trait-wiring"),
    "2025-03-21",
  ));
  adults = adultsOf(core);
});

/** Mean stories owed at a contact in the third leaning most toward telling, over the third leaning least, logged. */
function logRateGap(): number {
  const rows = adults
    .map((p) => ({
      lean: decisionLean(core, p, "news.pass-on", "tell", "keep"),
      owed: storiesOwedAtContact(api, p),
    }))
    .sort((a, b) => a.lean - b.lean);
  const n = Math.floor(rows.length / 3);
  const mean = (part: typeof rows) =>
    part.reduce((sum, r) => sum + r.owed, 0) / part.length;
  return Math.log(mean(rows.slice(-n)) / mean(rows.slice(0, n)));
}

describe("news.pass-on reads one calibrated trait term", () => {
  it("the third leaning most toward telling owes stories at Lin et al.'s extraversion-sized rate over the third leaning least", () => {
    const target = studyLogOdds("news.pass-on", "extraversion")!;
    const flat = withTraitWeight(core, "news.pass-on", 0, logRateGap);
    const net = logRateGap() - flat;
    console.log(
      `pass-on: net log rate ${net.toFixed(3)} against the study's ${target.toFixed(3)} (flat ${flat.toFixed(3)})`,
    );
    expect(net).toBeGreaterThan(target - 0.05);
    expect(net).toBeLessThan(target + 0.05);
  });
});

describe("conversation.believe-claim reads the hearer's lean where a neighbor passes a story on", () => {
  it("hearers whose traits lean hard toward doubt took no story in from a neighbor, and the rest did", () => {
    const told = new Map<string, number>();
    for (const p of adults) {
      let count = 0;
      for (const [key, fact] of core.knowledgeByPerson.get(p.id) ?? [])
        if (
          key.startsWith(newsKey("")) &&
          !key.endsWith(":outlet") &&
          fact.access === "told"
        )
          count += 1;
      told.set(p.id, count);
    }
    const doubters = adults.filter((p) => !believesClaim(core, p));
    const believers = adults.filter((p) => believesClaim(core, p));
    const meanTold = (who: PersonState[]) =>
      who.reduce((sum, p) => sum + told.get(p.id)!, 0) / who.length;
    console.log(
      `believe: ${doubters.length} doubters took in ${meanTold(doubters).toFixed(2)} told stories each; ${believers.length} others ${meanTold(believers).toFixed(2)}`,
    );
    expect(doubters.length).toBeGreaterThan(10);
    expect(doubters.every((p) => told.get(p.id) === 0)).toBe(true);
    expect(meanTold(believers)).toBeGreaterThan(0.5);
  });
});
