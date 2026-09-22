import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import { currentStateExecutiveHolders } from "../simulation/nationwide-world/state-executives";
import { governorFieldCloseHandler } from "../simulation/nationwide-world/state-executive-turnover";
import { GOVERNOR_FIELD_CLOSE } from "../simulation/nationwide-world/state-executive-turnover-calendar";
import { recordPersonDeath } from "../simulation/vitality";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * C28: a governor who dies in office, through the save a player actually
 * starts. The unit test beside the writer proves the record can be written;
 * this one proves the field closing on a real opening — seated governor, dated
 * calendar, living world — carries on past the death and survives Save and
 * Continue without reviving the dead or seating two people at once.
 *
 * Measured with the full year-long advance before this was written: on main
 * without the fix the save threw "A historical event must involve at least one
 * entity" inside its first year; with the fix it ran three more years.
 */
describe("a Kentucky governor who dies in office", () => {
  it("leaves a vacancy the next field closing can record and contest", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "drift-A",
        startAge: 40,
        depth: "summarize-earlier-life",
        questionnaire: "skipped",
        placeKey: "kentucky",
      }),
    ).game!;
    let world = openOrdinaryLife(game.world, game.playerPersonId);
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.officeKey === "us-ky-governor",
    );
    expect(governor).toBeDefined();

    world = recordPersonDeath(world, {
      stableKey: `c28-death:${governor!.personId}`,
      personId: governor!.personId,
      diedAt: world.currentDate,
      causeKey: "cause:c28-fixture",
      sourceEntityIds: [world.id],
      summary: "Died in office.",
      provenance: { kind: "authored", note: "C28 acceptance fixture." },
    });
    expect(
      currentStateExecutiveHolders(world).some(
        (holder) => holder.officeKey === "us-ky-governor",
      ),
    ).toBe(false);

    // Moving the clock puts each governorship's next field closing on the
    // calendar; the death does not take it off.
    world = passOrdinaryDays(world, 1);
    const fieldClose = world.history.futureDueItems.find(
      (due) =>
        due.transitionKey === GOVERNOR_FIELD_CLOSE &&
        due.stableKey.includes(":us-ky-governor:"),
    );
    expect(fieldClose).toBeDefined();
    const result = governorFieldCloseHandler(world, fieldClose!);
    expect(result.status).toBe("resolved");

    const saved = deserializeWorld(serializeWorld(result.world));
    const intent = saved.history.events.findLast(
      (event) => event.type === "election.governor-candidacy-intent",
    )!;
    expect(intent.participants).toEqual([]);
    expect(intent.involvedEntityIds).toEqual([intent.jurisdictionId]);
    expect(intent.summary).toContain("no sitting governor is on record.");

    const contest = (saved.history.electionContests ?? []).find(
      (candidate) => candidate.office.officeKey === "us-ky-governor",
    )!;
    // Two challengers for an open seat, and the dead governor is not one.
    expect(contest.candidatePersonIds).toHaveLength(2);
    expect(contest.candidatePersonIds).not.toContain(governor!.personId);
    expect(currentStateExecutiveHolders(saved)).toEqual(
      currentStateExecutiveHolders(result.world),
    );
    expect(
      saved.history.events.every((event) => event.involvedEntityIds.length > 0),
    ).toBe(true);
  });
});
