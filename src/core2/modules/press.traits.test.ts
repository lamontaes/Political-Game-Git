/**
 * Personality in the press engine (civic family): who keeps up with the
 * local news. A drawn place's played world (seed `c1`, the place `drawPlace`
 * names), every resident a full person, played 60 days. No study gives a size
 * for this, so the decision runs at the general weight.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { adultsOf, drawnWorld } from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { followersOf, outletsHere } from "./press";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = process.env.GOLDEN_PATH_SEED ?? "c1";

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town 60 days takes about 20 seconds.
beforeAll(() => {
  ({ core, api } = drawnWorld(
    SEED,
    drawPlace(SEED, "trait-wiring"),
    "2025-03-21",
  ));
  adults = adultsOf(core);
});

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
    expect(mean(yes)).toBeGreaterThan(mean(no) + 0.05);
  });
});
