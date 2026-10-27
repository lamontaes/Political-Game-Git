/**
 * Personality in the news engine (civic family): who passes a story on, and
 * who takes in a story a neighbor tells them. A drawn place's played world
 * (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every resident a full person,
 * played 60 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adultsOf,
  drawnRaceWorld,
  RUN_SEED,
  studyLogOdds,
  withTraitWeight,
} from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { believesClaim } from "../heard-claims";
import { closenessBetween } from "../closeness";
import { newsKey, storiesOwedAtContact } from "./news";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = `${RUN_SEED}:news`;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town 60 days takes about 25 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld((attempt) => {
    const seed = `${SEED}:${attempt}`;
    return { seed, place: drawPlace(seed, "trait-wiring") };
  }, 60));
  adults = adultsOf(core);
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

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
    // One drawn town against a size calibrated over six: towns seen so far sit 0.07 either side of it.
    expect(net).toBeGreaterThan(target - 0.1);
    expect(net).toBeLessThan(target + 0.1);
  });
});

describe("conversation.believe-claim reads the teller's closeness where a neighbor passes a story on", () => {
  it("hearers who would doubt a stranger's word took in stories from the neighbors they are close to", () => {
    const doubters = adults.filter((p) => !believesClaim(core, p));
    const believers = adults.filter((p) => believesClaim(core, p));
    // The closest tie a doubter took a told story from, by record: the story, the tie and the teller.
    let best:
      | {
          hearer: PersonState;
          tellerId: string;
          tieId: string;
          storyKey: string;
          closeness: number;
        }
      | undefined;
    let tellings = 0;
    for (const hearer of doubters)
      for (const [key, fact] of core.knowledgeByPerson.get(hearer.id) ?? []) {
        if (
          !key.startsWith(newsKey("")) ||
          key.endsWith(":outlet") ||
          fact.access !== "told"
        )
          continue;
        const tie = core.relationships.get(fact.sourceId ?? "");
        if (!tie) continue;
        tellings += 1;
        const tellerId = tie.actorId === hearer.id ? tie.otherId : tie.actorId;
        const closeness = closenessBetween(core, hearer.id, tellerId);
        if (!best || closeness > best.closeness)
          best = { hearer, tellerId, tieId: tie.id, storyKey: key, closeness };
      }
    console.log(
      `believe: ${doubters.length} doubt a stranger's word and took in ${tellings} told stories between them; the closest: ${best?.hearer.id} took ${best?.storyKey} from ${best?.tellerId} (tie ${best?.tieId}, closeness ${best?.closeness.toFixed(2)}); ${believers.length} others`,
    );
    expect(doubters.length).toBeGreaterThan(5);
    expect(best).toBeDefined();
    // The doubter believes this teller, and doubts a stranger.
    expect(
      believesClaim(core, best!.hearer, { tellerId: best!.tellerId }),
    ).toBe(true);
    expect(believesClaim(core, best!.hearer)).toBe(false);
  });
});
