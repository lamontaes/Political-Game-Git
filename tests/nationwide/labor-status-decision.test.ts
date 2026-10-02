import { describe, expect, it } from "vitest";

import { smallWorld } from "../fixtures/small-world";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  laborStatus,
  type Resident,
} from "../../src/simulation/living-world/town-employment";
import { SeededRng, pickDistinct } from "../../src/simulation/rng";
import type { EntityId } from "../../src/simulation/types";

/**
 * A resident's place in the labor force is decided from their own household's
 * record. Nothing is drawn: another seed, in a place drawn from all 56 by the
 * seed, gives the same answers, and the pulls move smoothly with the record.
 */
const SEED = "labor-status-decision-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const PLACE = state!.jurisdictionKey;

const resident = (over: Partial<Resident>): Resident => ({
  personId: "person_x" as EntityId,
  age: 40,
  enrolled: false,
  parentOfYoungChild: false,
  dependants: 0,
  youngChildren: 0,
  earners: 1,
  ...over,
});

describe(`labor status is decided, not drawn (${PLACE}, seed ${SEED})`, () => {
  const a = smallWorld({ place: PLACE, seed: SEED, people: 3 }).world;
  const b = smallWorld({
    place: PLACE,
    seed: `${SEED}-other`,
    people: 3,
  }).world;

  it("gives the same answer on any seed or id", () => {
    for (const age of [19, 23, 40, 63, 70])
      for (const dependants of [0, 2])
        for (const earners of [0, 1, 2]) {
          const r = resident({ age, dependants, earners, enrolled: age < 25 });
          expect(laborStatus(a, r)).toBe(laborStatus(b, r));
          expect(laborStatus(a, r)).toBe(
            laborStatus(a, { ...r, personId: "person_y" as EntityId }),
          );
        }
  });

  it("keeps a student in school unless the household needs the pay", () => {
    expect(
      laborStatus(a, resident({ age: 19, enrolled: true, earners: 2 })),
    ).toBe("student");
    expect(
      laborStatus(
        a,
        resident({ age: 19, enrolled: true, dependants: 3, earners: 0 }),
      ),
    ).toBe("employed");
  });

  it("retires later when the household has dependants and fewer earners", () => {
    const retiresAt = (over: Partial<Resident>) => {
      for (let age = 62; age <= 90; age++)
        if (laborStatus(a, resident({ age, ...over })) === "retired")
          return age;
      return 91;
    };
    const comfortable = retiresAt({ earners: 2 });
    const alone = retiresAt({ earners: 0 });
    const supporting = retiresAt({ earners: 0, dependants: 2 });
    expect(comfortable).toBeLessThan(alone);
    expect(alone).toBeLessThan(supporting);
    // Once retired, older stays retired: no step back.
    for (let age = alone; age <= 90; age++)
      expect(laborStatus(a, resident({ age, earners: 0 }))).toBe("retired");
  });

  it("keeps a parent of a small child home when another adult earns", () => {
    const base = { parentOfYoungChild: true, youngChildren: 1, dependants: 1 };
    // The pull to care for a small child outweighs the pull to work only
    // once enough other adults earn: more earners, never a step back.
    const home = (earners: number) =>
      laborStatus(a, resident({ ...base, earners })) === "parent-at-home";
    expect(home(4)).toBe(true);
    for (let earners = 0; earners < 8; earners++)
      if (home(earners)) expect(home(earners + 1)).toBe(true);
    expect(laborStatus(a, resident({ ...base, earners: 0 }))).toBe("employed");
  });
});
