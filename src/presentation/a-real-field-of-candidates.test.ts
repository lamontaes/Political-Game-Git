import { describe, expect, it } from "vitest";

import {
  CONTEST_FIELD_MAXIMUM_OPPONENTS,
  CONTEST_FIELD_MINIMUM_OPPONENTS,
  contestFieldOpponentCount,
} from "../simulation";
import { createNewGameWorld } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { projectCampaign } from "./campaign-projection";
import { fileForOffice } from "./campaign-projection";

/**
 * A candidate faces more than one person.
 *
 * Walked in eleven towns across five states on 2026-09-22: every candidacy in
 * the game drew exactly one opponent, because both filing routes passed
 * `count: 1`. lamontae settled it: "Of course the candidate should face more
 * than one. there's primaries. And an independent could run."
 *
 * The exact shape of an American legislative field is not established and is
 * filed as research, so what is asserted here is the floor, the variation and
 * the stability — not a particular number.
 */
const PLACES: readonly (readonly [string, string, string])[] = [
  ["US-IL", "Springfield", "us-il-general-assembly-v1:house"],
  ["US-MD", "Baltimore", "us-md-general-assembly-v1:house"],
  ["US-NV", "Reno", "us-nv-legislature-v1:assembly"],
];

function lifeIn(state: string, city: string, seed: string) {
  const home = requireLocalityInState(state, city);
  return createNewGameWorld({
    placeKey: home.key,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
}

describe("who else is on the ballot", () => {
  it.each(PLACES)("is more than one person in %s %s", (state, city, office) => {
    const created = lifeIn(state, city, `field:${state}:${city}`);
    const filed = fileForOffice(
      created.world,
      created.playerPersonId,
      null,
      office,
    );
    const view = projectCampaign(filed, created.playerPersonId);
    expect(view.opponentNames.length).toBeGreaterThanOrEqual(
      CONTEST_FIELD_MINIMUM_OPPONENTS,
    );
    expect(view.opponentNames.length).toBeLessThanOrEqual(
      CONTEST_FIELD_MAXIMUM_OPPONENTS,
    );
    // Real people in the world, each named once.
    expect(new Set(view.opponentNames).size).toBe(view.opponentNames.length);
    for (const name of view.opponentNames) expect(name.trim()).not.toBe("");
  });

  it("gives one save the same ballot every time it is loaded", () => {
    const first = lifeIn("US-IL", "Springfield", "stable");
    const again = lifeIn("US-IL", "Springfield", "stable");
    const office = "us-il-general-assembly-v1:house";
    const left = projectCampaign(
      fileForOffice(first.world, first.playerPersonId, null, office),
      first.playerPersonId,
    );
    const right = projectCampaign(
      fileForOffice(again.world, again.playerPersonId, null, office),
      again.playerPersonId,
    );
    expect(right.opponentNames).toEqual(left.opponentNames);
  });

  it("does not hand every contest the same number of people", () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) {
      counts.add(contestFieldOpponentCount("a-seed", `contest:${seed}`));
    }
    expect(counts.size).toBeGreaterThan(1);
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(CONTEST_FIELD_MINIMUM_OPPONENTS);
      expect(count).toBeLessThanOrEqual(CONTEST_FIELD_MAXIMUM_OPPONENTS);
    }
  });

  it("never leaves a candidate unopposed", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      expect(
        contestFieldOpponentCount(`seed-${seed}`, `contest:${seed}`),
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
