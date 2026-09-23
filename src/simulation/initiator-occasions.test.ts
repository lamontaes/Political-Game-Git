import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { addDays, ageOnDate } from "./dates";
import { initiatorOccasions } from "./initiator-occasions";
import { householdMembershipsAt } from "./life-queries";
import type { EntityId, IsoDate, World } from "./types";

function start() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "saturday-2015900-d",
    startAge: 35,
    placeKey: "2015900",
    startKind: "custom",
    household: "shares-a-home",
  });
  return { world: game.world, personId: game.playerPersonId };
}

/** The same world read on another day; nothing is written. */
function on(world: World, date: IsoDate): World {
  return { ...world, currentDate: date };
}

function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function hostsWithHomes(world: World, playerId: EntityId): EntityId[] {
  return world.personOrder.filter(
    (id) =>
      id !== playerId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      householdMembershipsAt(world, id).length > 0,
  );
}

describe("a reason to have people over, read from the host's own life", () => {
  it("is a birthday only in the days before it, and names the real age and date", () => {
    const { world, personId } = start();
    const hosts = hostsWithHomes(world, personId);
    expect(hosts.length).toBeGreaterThan(0);
    for (const hostId of hosts) {
      const host = world.people[hostId]!;
      const year = world.currentDate.slice(0, 4);
      const birthday = `${year}${host.birthDate.slice(4)}` as IsoDate;
      // Early enough that the whole run of days is in the same year.
      if (birthday < `${year}-02-01` || birthday > `${year}-11-30`) continue;
      let offered = 0;
      for (let back = 0; back <= 20; back += 1) {
        const today = addDays(birthday, -back);
        const found = initiatorOccasions(on(world, today), hostId).filter(
          (entry) => entry.reason === "birthday",
        );
        if (found.length === 0) continue;
        offered += 1;
        const occasion = found[0]!;
        expect(occasion.hostPersonId).toBe(hostId);
        expect(occasion.sourceRecordId).toBe(hostId);
        expect(weekday(occasion.date)).toBe(6);
        expect(occasion.date >= birthday).toBe(true);
        expect(occasion.date <= addDays(birthday, 6)).toBe(true);
        const turning = ageOnDate(host.birthDate, birthday);
        expect(occasion.details.opening).toContain(`I turn ${turning}`);
        expect(occasion.summary).toContain(`turns ${turning}`);
      }
      // Not every day: only the notice window before the gathering.
      expect(offered).toBeGreaterThan(0);
      expect(offered).toBeLessThanOrEqual(11);
      // And never months away.
      expect(
        initiatorOccasions(on(world, addDays(birthday, -60)), hostId).filter(
          (entry) => entry.reason === "birthday",
        ),
      ).toEqual([]);
    }
  });

  it("has nothing to say for somebody with no recorded home", () => {
    const { world, personId } = start();
    const homeless = world.personOrder.filter(
      (id) => id !== personId && householdMembershipsAt(world, id).length === 0,
    );
    for (const id of homeless) {
      const birthday =
        `${world.currentDate.slice(0, 4)}${world.people[id]!.birthDate.slice(4)}` as IsoDate;
      expect(initiatorOccasions(on(world, addDays(birthday, -5)), id)).toEqual(
        [],
      );
    }
  });
});
