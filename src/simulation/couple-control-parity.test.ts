import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { ageOnDate } from "./dates";
import {
  coupleAskRefusal,
  dateRefusal,
  romanticConsiderations,
} from "./couples";
import {
  familyPlanAvailability,
  proposeFamilyPlan,
} from "./people-family-plan";
import { activePartnershipsAt, kinshipRelationshipsAt } from "./life-queries";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { pickDistinct, SeededRng } from "./rng";
import { serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

const SEED = "a136-canonical-couple-control-parity";

/** One canonical locality per state/territory; sample identities uniformly. */
function onePlaceEach() {
  return lifePlaceStateIdentities().map((identity) => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: identity.jurisdictionKey,
      scope: "locality",
    })[0];
    if (!place) throw new Error(`Missing canonical locality: ${identity.name}`);
    return place;
  });
}

function controlledBy(world: World, personId: EntityId): World {
  return { ...world, control: { kind: "person", personId } };
}

describe("canonical couple and family rules across person control", () => {
  function fixture() {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    const [place] = pickDistinct(new SeededRng(SEED), places, 1);
    console.info(`A136 control parity: place ${place!.key}, seed ${SEED}`);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place!.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    const world = game.world;
    const actor = game.playerPersonId;
    const adult = world.personOrder.find(
      (id) =>
        id !== actor &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
        !world.history.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= world.currentDate,
        ),
    );
    expect(adult, "opening supplies another saved living adult").toBeDefined();
    return { world, actor, other: adult! };
  }

  it("keeps eligibility and recorded romantic considerations identical when only control changes", () => {
    const { world, actor, other } = fixture();
    const actorControlled = controlledBy(world, actor);
    const otherControlled = controlledBy(world, other);
    const beforeActor = serializeWorld(actorControlled);
    const beforeOther = serializeWorld(otherControlled);
    for (const [a, b] of [
      [actor, other],
      [other, actor],
    ] as const) {
      expect(dateRefusal(otherControlled, a, b)).toEqual(
        dateRefusal(actorControlled, a, b),
      );
      expect(coupleAskRefusal(otherControlled, a, b)).toEqual(
        coupleAskRefusal(actorControlled, a, b),
      );
      expect(
        romanticConsiderations(otherControlled, "parity:answer", a, b),
      ).toEqual(romanticConsiderations(actorControlled, "parity:answer", a, b));
      expect(familyPlanAvailability(otherControlled, a)).toEqual(
        familyPlanAvailability(actorControlled, a),
      );
    }
    expect(serializeWorld(actorControlled)).toBe(beforeActor);
    expect(serializeWorld(otherControlled)).toBe(beforeOther);
  }, 60_000);

  it("preserves the generated kinship refusal in both directions and both control states", () => {
    const { world, actor, other } = fixture();
    const kin = kinshipRelationshipsAt(world, actor).find((record) =>
      record.personIds.some(
        (id) =>
          id !== actor &&
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
      ),
    );
    expect(kin, "opening supplies a saved adult relative").toBeDefined();
    const relative = kin!.personIds.find((id) => id !== actor)!;
    for (const controller of [actor, other]) {
      const view = controlledBy(world, controller);
      for (const [a, b] of [
        [actor, relative],
        [relative, actor],
      ] as const) {
        expect(dateRefusal(view, a, b)).toBe("You are family.");
        expect(coupleAskRefusal(view, a, b)).toBe("You are family.");
      }
    }
  }, 60_000);

  it("refuses a saved unpartnered adult's family proposal without history changes under either control", () => {
    const { world, actor, other } = fixture();
    const single = world.personOrder.find(
      (id) =>
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
        activePartnershipsAt(world, id).length === 0 &&
        !world.history.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= world.currentDate,
        ),
    );
    expect(
      single,
      "opening supplies a saved living adult without a partner",
    ).toBeDefined();
    for (const controller of [actor, other]) {
      const view = controlledBy(world, controller);
      const before = serializeWorld(view);
      expect(familyPlanAvailability(view, single!)).toMatchObject({
        available: false,
        partnerPersonId: null,
      });
      for (const kind of ["birth", "adoption"] as const) {
        expect(() =>
          proposeFamilyPlan(view, { personId: single!, kind }),
        ).toThrow();
        expect(serializeWorld(view)).toBe(before);
      }
    }
  }, 60_000);
});
