import { describe, expect, it } from "vitest";

import { contactBases } from "./people-contact";
import { ageOnDate } from "./dates";
import {
  ensurePeopleTraits,
  notableQualityRoom,
  upbringingQualities,
} from "./people-traits";
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

function expectNotableTraits(
  world: ReturnType<typeof adultLife>["world"],
  id: EntityId,
) {
  const records = notableRecords(world, id);
  const room = notableQualityRoom(
    ageOnDate(world.people[id]!.birthDate, world.currentDate),
  );
  expect(records.length).toBeGreaterThanOrEqual(1);
  expect(records.length).toBeLessThanOrEqual(room);
  // Every notable quality is one the upbringing leans toward; none is drawn.
  const leans = new Set(
    upbringingQualities(upbringingFor(world, id)).map(({ trait }) => trait),
  );
  const keyOf = new Map(
    [...traitRegistryFor(world).traits.values()].map((trait) => [
      traitDefinitionFromPack(trait).id,
      trait.qualifiedKey,
    ]),
  );
  for (const record of records) {
    expect(record.scopeTags).toContain("personality-v1.upbringing");
    expect(leans.has(keyOf.get(record.tendencyId)!)).toBe(true);
  }
}

/** A person's notable traits without the record ids a history assigns. */
function drawn(world: ReturnType<typeof adultLife>["world"], id: EntityId) {
  return notableRecords(world, id).map(
    ({ stableKey, tendencyId, expressionKey, strength, scopeTags }) => ({
      stableKey,
      tendencyId,
      expressionKey,
      strength,
      scopeTags,
    }),
  );
}

describe("upbringing and starting traits", () => {
  it("gives every generated NPC the notable traits their upbringing leans toward: the player's contacts at opening, anyone else when first needed", () => {
    const { world, playerId } = adultLife("upbringing-ordinary-route");
    const contacts = new Set(
      contactBases(world, playerId).map(({ personId }) => personId),
    );
    const others = world.personOrder.filter(
      (id) => id !== playerId && !contacts.has(id),
    );
    expect(contacts.size).toBeGreaterThan(0);
    expect(contacts.size + others.length).toBeGreaterThan(20);
    // The player's household, family, work and other contacts hold their
    // traits as soon as the life opens.
    for (const id of contacts) expectNotableTraits(world, id);
    // Nobody else is written at opening: writing the whole world made
    // starting a life take about half an hour.
    for (const id of others) expect(notableRecords(world, id)).toEqual([]);
    // Anyone else is drawn the first time a decision asks for them.
    for (const id of others) {
      expectNotableTraits(ensurePeopleTraits(world, [id]), id);
    }
    // The played character is never given any.
    expect(notableRecords(world, playerId)).toEqual([]);
  }, 120_000);

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

    // The same opening writes the same traits for the same contacts.
    const contacts = contactBases(first.world, first.playerId).map(
      ({ personId }) => personId,
    );
    expect(contacts.length).toBeGreaterThan(0);
    expect(
      contactBases(second.world, second.playerId).map(
        ({ personId }) => personId,
      ),
    ).toEqual(contacts);
    for (const id of contacts) {
      expect(drawn(first.world, id)).toEqual(drawn(second.world, id));
    }

    // Someone drawn later gets the same traits in both worlds, and the same
    // traits whether they are drawn alone or alongside other people.
    const others = first.world.personOrder.filter(
      (id) => id !== first.playerId && !contacts.includes(id),
    );
    expect(others.length).toBeGreaterThan(1);
    const [later, alongside] = others;
    const alone = drawn(ensurePeopleTraits(first.world, [later!]), later!);
    expect(alone.length).toBeGreaterThanOrEqual(1);
    expect(drawn(ensurePeopleTraits(second.world, [later!]), later!)).toEqual(
      alone,
    );
    expect(
      drawn(ensurePeopleTraits(first.world, [alongside!, later!]), later!),
    ).toEqual(alone);
  }, 120_000);

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
