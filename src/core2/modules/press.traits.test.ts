/**
 * Personality in the press engine (civic family): who keeps up with the
 * local news. A drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every resident a full person, played 60 days. No study gives a size
 * for this, so the decision runs at the general weight.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { adultsOf, drawnRaceWorld, RUN_SEED } from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { followersOf, outletsHere } from "./press";
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
  it("the town's adults who follow a local outlet lean more toward keeping up with the news than those who follow none", () => {
    const followers = new Set<string>();
    for (const outlet of outletsHere(api))
      for (const id of followersOf(api, outlet.id)) followers.add(id);
    const lean = (p: PersonState) =>
      decisionLean(core, p, "press.follow-news", "follow", "skip");
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const town = adults.filter((p) =>
      core.peopleByPlace.get(p.placeId)?.has(p.id),
    );
    const yes = town.filter((p) => followers.has(p.id)).map(lean);
    const no = town.filter((p) => !followers.has(p.id)).map(lean);
    console.log(
      `follow-news: ${yes.length} follow (mean lean ${mean(yes).toFixed(3)}), ${no.length} do not (${mean(no).toFixed(3)})`,
    );
    expect(yes.length).toBeGreaterThan(5);
    expect(no.length).toBeGreaterThan(5);
    // With personality flat the two groups' leans differ only by who the circumstances picked.
    expect(mean(yes)).toBeGreaterThan(mean(no) + 0.01);
  });
});
