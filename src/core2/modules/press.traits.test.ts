/**
 * Personality in the press engine (civic family): who keeps up with the
 * local news. A drawn place's played world (a place drawn from all 56 from a
 * fresh seed, played over the window around its own next election), every
 * resident a full person, played 60 days. A person's habit is their political
 * engagement plus the lean at its fitted weight, and each kind of news takes
 * the top of each age band by habit.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { adultsOf, drawnRaceWorld, RUN_SEED } from "../trait-test-kit";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import { engagementOf, NATIONAL_ENGAGEMENT } from "../electorate";
import { followersOf, habitScore, outletsHere } from "./press";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = `${RUN_SEED}:press`;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town 60 days takes about 20 seconds.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld((attempt) => {
    const seed = `${SEED}:${attempt}`;
    return { seed, place: drawPlace(seed, "trait-wiring") };
  }, 60));
  adults = adultsOf(core);
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

describe("press.follow-news reads the person's calibrated lean toward following", () => {
  it("each adult's habit is their engagement plus their lean at the fitted weight, and the town's followers keep a stronger habit than those who follow none", () => {
    const followers = new Set<string>();
    for (const outlet of outletsHere(api))
      for (const id of followersOf(api, outlet.id)) followers.add(id);
    const weight = decisionTraitWeight(core, "press.follow-news");
    const town = adults.filter((p) =>
      core.peopleByPlace.get(p.placeId)?.has(p.id),
    );
    for (const p of town) {
      const engaged =
        (engagementOf(core, p) ?? NATIONAL_ENGAGEMENT) - NATIONAL_ENGAGEMENT;
      const lean = decisionLean(core, p, "press.follow-news", "follow", "skip");
      expect(habitScore(p, core)).toBeCloseTo(engaged + weight * lean, 12);
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const yes = town
      .filter((p) => followers.has(p.id))
      .map((p) => habitScore(p, core));
    const no = town
      .filter((p) => !followers.has(p.id))
      .map((p) => habitScore(p, core));
    console.log(
      `follow-news at weight ${weight}: ${yes.length} follow (mean habit ${mean(yes).toFixed(3)}), ${no.length} do not (${mean(no).toFixed(3)})`,
    );
    expect(yes.length).toBeGreaterThan(5);
    expect(no.length).toBeGreaterThan(5);
    // Each kind of news takes the top of each age band by habit.
    expect(mean(yes)).toBeGreaterThan(mean(no));
  });
});
