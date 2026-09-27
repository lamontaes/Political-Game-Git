import { describe, expect, it } from "vitest";

import { latestPersonalityTendenciesForPerson } from "./queries";
import { traitDefinitionFromPack } from "./trait-packs";
import { traitRegistryFor } from "./trait-registry";
import {
  upbringingFor,
  upbringingTraitTendencies,
  type PersonUpbringing,
} from "./people-upbringing";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import type { EntityId } from "./types";

function adultLife(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "3918000",
    household: "shares-a-home",
  });
  return {
    playerId: game.playerPersonId,
    world: openOrdinaryLife(game.world, game.playerPersonId),
  };
}

function notableRecords(
  world: ReturnType<typeof adultLife>["world"],
  id: EntityId,
) {
  const definitions = new Set(
    [...traitRegistryFor(world).traits.values()]
      .filter(({ pack }) => pack === "personality-v1")
      .map((trait) => traitDefinitionFromPack(trait).id),
  );
  return latestPersonalityTendenciesForPerson(world, id).filter(
    ({ tendencyId }) => definitions.has(tendencyId),
  );
}

describe("upbringing and starting traits", () => {
  it("gives every generated NPC in an ordinary opening three to five notable traits", () => {
    const { world, playerId } = adultLife("upbringing-ordinary-route");
    const people = world.personOrder.filter((id) => id !== playerId);
    expect(people.length).toBeGreaterThan(20);
    for (const id of people) {
      const records = notableRecords(world, id);
      expect(records.length).toBeGreaterThanOrEqual(3);
      expect(records.length).toBeLessThanOrEqual(5);
      const inborn = records.filter(({ scopeTags }) =>
        scopeTags.includes("personality-v1.inborn"),
      );
      expect(inborn.length).toBeGreaterThanOrEqual(1);
      expect(inborn.length).toBeLessThanOrEqual(3);
      expect(
        records.every(({ scopeTags }) =>
          scopeTags.some(
            (tag) =>
              tag === "personality-v1.inborn" ||
              tag === "personality-v1.upbringing",
          ),
        ),
      ).toBe(true);
    }
  });

  it("is deterministic and labels unsourced calibration as a game profile", () => {
    const first = adultLife("upbringing-repeat");
    const second = adultLife("upbringing-repeat");
    const firstNpc = first.world.personOrder.find(
      (id) => id !== first.playerId,
    )!;
    const secondNpc = second.world.personOrder.find(
      (id) => id !== second.playerId,
    )!;
    expect(upbringingFor(first.world, firstNpc)).toEqual(
      upbringingFor(second.world, secondNpc),
    );
    expect(
      upbringingFor(first.world, firstNpc).money.every(
        ({ source }) => source.kind === "game-profile",
      ),
    ).toBe(true);
  });

  it("uses protective care as a counterweight after a parent's death", () => {
    const base: PersonUpbringing = {
      personId: "person_test" as EntityId,
      money: [],
      homeStability: "stable",
      caregiving: "consistent-firm",
      protectiveCaregiver: true,
      events: ["parent-death"],
      schooling: [],
      firstJob: "none",
    };
    const protectedTraits = upbringingTraitTendencies(base).map(
      ({ trait }) => trait,
    );
    const unprotectedTraits = upbringingTraitTendencies({
      ...base,
      protectiveCaregiver: false,
    }).map(({ trait }) => trait);
    expect(protectedTraits).toContain("personality-v1:facet-devoted");
    expect(protectedTraits).not.toContain(
      "personality-v1:facet-intimacy-guarded",
    );
    expect(unprotectedTraits).toContain(
      "personality-v1:facet-intimacy-guarded",
    );
  });

  it("keeps first-job effects in work and law inputs separate", () => {
    const upbringing: PersonUpbringing = {
      personId: "person_test" as EntityId,
      money: [],
      homeStability: "stable",
      caregiving: "consistent-firm",
      protectiveCaregiver: false,
      events: [
        "law-allegation",
        "adjudicated-law-trouble",
        "harsh-authority-treatment",
      ],
      schooling: [],
      firstJob: "autonomy",
    };
    const rows = upbringingTraitTendencies(upbringing);
    expect(
      rows
        .filter(({ because }) => because.includes("first job"))
        .every(({ lifePart }) => lifePart === "work"),
    ).toBe(true);
    expect(rows.some(({ because }) => because.includes("adjudicated"))).toBe(
      true,
    );
    expect(rows.some(({ because }) => because.includes("authorities"))).toBe(
      true,
    );
  });
});
