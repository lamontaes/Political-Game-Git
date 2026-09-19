import { describe, expect, it } from "vitest";

import { crisisOfficeContinuityNotices } from "../simulation/crisis/notices";
import { projectCongress } from "../simulation/living-world/congress";
import {
  OFFICE_CONTINUITY_EVENT,
  officeContinuityRulings,
} from "../simulation/governing/office-continuity";
import { currentStateExecutiveHolders } from "../simulation/nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import { recordOfficialContinuity } from "../simulation/crisis/continuity";
import { recordPersonDeath } from "../simulation/vitality";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * CRISIS records the death; GOVERNING decides what happens to the office. This
 * proves the two are connected in ordinary time, with no test calling the
 * consumer by hand, and that one death is consumed exactly once however the
 * player moves the clock.
 */

const VITALITY = {
  kind: "authored" as const,
  note: "CRISIS/GOVERNING seam fixture: a supplied death, not a mortality roll.",
};

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

/** A death written the way CRISIS writes one, including its office notice. */
function kill(world: World, personId: EntityId): World {
  const died = recordPersonDeath(world, {
    stableKey: `seam:death:${personId}`,
    personId,
    diedAt: world.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [world.id],
    summary: "An officeholder died.",
    provenance: VITALITY,
  });
  return recordOfficialContinuity(world, died, personId, "death");
}

/**
 * Continuity records for one office only. CRISIS mortality is live in this
 * composition, so other officeholders may legitimately die while the clock
 * runs; this test is about one death being consumed once, not about the world
 * standing still.
 */
const continuityEvents = (world: World, officeKey: string) =>
  world.history.events.filter(
    (event) =>
      event.type === OFFICE_CONTINUITY_EVENT &&
      event.tags.includes(`office:${officeKey}`),
  );

describe("CRISIS to GOVERNING: a death reaches the office on the clock", () => {
  it("consumes one notice once, whatever step size the player takes", () => {
    let world = openingWorld("crisis-governing-seam");
    const governor = currentStateExecutiveHolders(world)[0]!;
    world = kill(world, governor.personId);

    // Nothing is consumed until time moves: a death is not a read.
    expect(continuityEvents(world, governor.officeKey)).toHaveLength(0);
    const before = serializeWorld(world);
    crisisOfficeContinuityNotices(world);
    expect(serializeWorld(world)).toBe(before);

    // One ordinary day, and the office consequence is recorded.
    const oneDay = passOrdinaryDays(world, 1);
    const rulings = officeContinuityRulings(oneDay, governor.officeKey);
    expect(rulings).toHaveLength(1);
    expect(rulings[0]!.outcome).toBe("blocked");
    expect(continuityEvents(oneDay, governor.officeKey)).toHaveLength(1);

    // Moving further writes nothing more for the same death.
    const later = passOrdinaryDays(oneDay, 120);
    expect(continuityEvents(later, governor.officeKey)).toHaveLength(1);

    // A bigger first step reaches the same single record.
    const oneJump = passOrdinaryDays(world, 121);
    expect(continuityEvents(oneJump, governor.officeKey)).toHaveLength(1);
    expect(officeContinuityRulings(oneJump, governor.officeKey)).toEqual(
      officeContinuityRulings(later, governor.officeKey),
    );

    // Reopening the save neither loses nor repeats it.
    const reopened = deserializeWorld(serializeWorld(later));
    expect(continuityEvents(reopened, governor.officeKey)).toHaveLength(1);
    expect(
      continuityEvents(passOrdinaryDays(reopened, 30), governor.officeKey),
    ).toHaveLength(1);
  }, 600_000);

  it("a dead Representative's seat becomes vacant without anyone asking", () => {
    let world = openingWorld("crisis-governing-seam-house");
    const seat = projectCongress(world)!.house.seats.find(
      (row) => row.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    world = passOrdinaryDays(kill(world, seat.occupant.member.personId), 1);
    const view = projectCongress(world)!.house.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )!;
    expect(view.occupant.kind).toBe("vacancy");
    expect(officeContinuityRulings(world, seat.seatKey)[0]!.outcome).toMatch(
      /special-election|vacant/,
    );
  }, 600_000);
});
