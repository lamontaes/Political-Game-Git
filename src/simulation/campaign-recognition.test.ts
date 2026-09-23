import { describe, expect, it } from "vitest";

import { candidacyPackForJurisdiction } from "./candidacy";
import { doorKnockingReturn } from "./campaign-recognition";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type { ElectionContestResultRecord, World } from "./types";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";
import {
  fileForOffice,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import { passOrdinaryDays } from "../presentation/ordinary-life";

/**
 * An unknown candidate gets little from a door at first; each afternoon makes
 * the next one worth more; and a candidate who has won before starts ahead.
 * The magnitudes are placeholders; the shape is what is tested.
 */
describe("what a door returns depends on who is knocking", () => {
  it("starts an unknown candidate at half and snowballs with each afternoon", () => {
    const created = createExplicitGeographyLife({
      placeKey: "4159000", // Portland, Oregon
      seed: "door-return",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const personId = created.game.playerPersonId;
    const office = candidacyPackForJurisdiction(
      created.game.world.people[personId]!.homeJurisdictionId,
    )!.offices.find((candidate) => candidate.officeKey.endsWith(":house"))!;
    let world = fileForOffice(
      created.game.world,
      personId,
      null,
      office.officeKey,
    );
    const campaign = () =>
      world.history.campaigns!.find(
        (candidate) => candidate.candidatePersonId === personId,
      )!;
    expect(doorKnockingReturn(world, campaign())).toMatchObject({
      percent: 50,
      afternoonsBefore: 0,
      racesWonBefore: 0,
    });

    const seen: number[] = [];
    for (let day = 0; day < 30 && seen.length < 12; day += 1) {
      try {
        world = spendAnAfternoon(world, personId, "outreach");
      } catch {
        // A day with no room left for the doors is a day to pass.
      }
      world = passOrdinaryDays(world);
      seen.push(doorKnockingReturn(world, campaign()).percent);
    }
    expect(seen.at(-1)).toBeGreaterThan(50);
    expect(seen.at(-1)).toBeLessThanOrEqual(100);
    for (let index = 1; index < seen.length; index += 1)
      expect(seen[index]!).toBeGreaterThanOrEqual(seen[index - 1]!);

    // A win recorded before this race's election day counts as standing.
    const own = world.history.electionContests!.find(
      (contest) => contest.id === campaign().contestId,
    )!;
    const earlierWin: ElectionContestResultRecord = {
      id: createStableId("election-contest-result", "test:earlier-win"),
      stableKey: "test:earlier-win",
      sequence: 0,
      contestId: createStableId("election-contest", "test:earlier"),
      resolvedAt: makeIsoDate("2020-11-03"),
      winnerPersonId: personId,
      tallies: [],
      outcomeEventId: createStableId("event", "test:earlier-win"),
      provenance: own.provenance,
    };
    const withWin: World = {
      ...world,
      history: {
        ...world.history,
        electionContestResults: [
          ...(world.history.electionContestResults ?? []),
          earlierWin,
        ],
      },
    };
    const before = doorKnockingReturn(world, campaign()).percent;
    const after = doorKnockingReturn(withWin, campaign());
    expect(after.racesWonBefore).toBe(1);
    expect(after.percent).toBe(before + 25);
  }, 300_000);
});
