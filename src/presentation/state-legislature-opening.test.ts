import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  lifePlaceSearch,
  serializeWorld,
  stateCandidacyPack,
} from "../simulation";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import {
  STATE_LEGISLATURE_KEYS,
  ensureStateLegislatureOpening,
  planStateChambers,
  stateLegislators,
} from "../simulation/nationwide-world/state-legislature-opening";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * A state chamber holds a real person in every seat from the day a life opens.
 *
 * Spread across the states on purpose, and across small places: a village in
 * Nebraska's one-house legislature, a Nevada town whose pack does not know its
 * chamber sizes, small towns in Minnesota and Missouri, and a Wyoming town in
 * a state that has no legislature pack at all yet.
 */
function placeKey(name: string, state: string): string {
  const found = lifePlaceSearch(name, 20).find(
    (place) => place.displayName === `${name}, ${state}`,
  );
  if (!found) throw new Error(`No place ${name}, ${state}`);
  return found.key;
}

function openLife(name: string, state: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: placeKey(name, state),
      seed: `state-legislature-${name}`,
    }),
  ).game!;
}

const SEATED = [
  ["Valentine", "Nebraska"],
  ["Ely", "Minnesota"],
  ["Hermann", "Missouri"],
  ["Tonopah", "Nevada"],
] as const;

describe.each(SEATED)("a life opened in %s, %s", (name, state) => {
  const { world, playerPersonId } = openLife(name, state);
  const usps = homeStateUsps(world, playerPersonId)!;
  const pack = stateCandidacyPack(`US-${usps}`)!;
  const plan = planStateChambers(pack);
  const members = stateLegislators(world, pack.packId);

  it("fills every seat of every chamber with a living person", () => {
    expect(plan.chambers.length).toBe(pack.offices.length);
    for (const chamber of plan.chambers) {
      const inChamber = members.filter(
        (member) => member.officeKey === chamber.officeKey,
      );
      expect(inChamber.length).toBe(chamber.size);
      expect(new Set(inChamber.map((m) => m.ordinal)).size).toBe(chamber.size);
      for (const member of inChamber) {
        expect(world.people[member.personId]).toBeDefined();
        expect(member.title).toContain(chamber.chamberName);
      }
    }
    expect(new Set(members.map((m) => m.personId)).size).toBe(members.length);
  });

  it("sizes a chamber from the rule pack, or from the state's own districts", () => {
    for (const chamber of plan.chambers) {
      const office = pack.offices.find(
        (o) => o.officeKey === chamber.officeKey,
      )!;
      if (office.seats.kind === "known") {
        expect(chamber.basis).toBe("rule-pack");
        expect(chamber.size).toBe(office.seats.value);
      } else {
        expect(chamber.basis).toBe("one-member-per-district");
        expect(
          chamber.districts.every(
            (district) => district !== null && district.stateUsps === usps,
          ),
        ).toBe(true);
      }
    }
  });

  it("seats both parties, drawn from the state's own generated conditions", () => {
    const parties = new Set(members.map((m) => m.party));
    expect(parties.has("democratic")).toBe(true);
    expect(parties.has("republican")).toBe(true);
  });

  it("is written once and survives Save and Continue", () => {
    const again = ensureStateLegislatureOpening(world, playerPersonId, usps);
    expect(again).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(stateLegislators(restored, pack.packId)).toEqual(members);
  });

  it("puts every member in the one body a campaign winner joins", () => {
    const body = world.history.organizations.filter(
      (organization) =>
        organization.stableKey === STATE_LEGISLATURE_KEYS.body(pack.packId),
    );
    expect(body.length).toBe(1);
  });
});

describe("a state with no legislature pack yet", () => {
  it("seats nobody rather than borrowing another state's chamber", () => {
    const { world } = openLife("Ten Sleep", "Wyoming");
    expect(stateCandidacyPack("US-WY")).toBeNull();
    expect(
      world.history.workRelationships.filter(
        (work) => work.kind === "employment:legislative-member",
      ),
    ).toEqual([]);
  });
});
