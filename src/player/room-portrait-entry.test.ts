import { beforeAll, describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  type NewGameSetup,
} from "../presentation/new-game";
import {
  currentOpeningLifeScene,
  openNextLifeScene,
} from "../presentation/life-scene-flow";
import { openConversationWith } from "../presentation/person-conversation-entry";
import {
  activeChildAuthoritiesAt,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { roomPortraitConversationEntry } from "./room-portrait-entry";

let world: World;
let player: EntityId;
let present: readonly EntityId[];
let guardians: EntityId[];
beforeAll(() => {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "room-portrait-existing-guardian-entry",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
  player = game.playerPersonId;
  world = openNextLifeScene(game.world, player);
  present = currentOpeningLifeScene(world, player)!.presentPersonIds;
  guardians = activeChildAuthoritiesAt(world, player).flatMap(
    ({ authority }) =>
      authority.holder.kind === "person" &&
      present.includes(authority.holder.personId)
        ? [authority.holder.personId]
        : [],
  );
});

describe("room portrait entry through existing conversation eligibility", () => {
  it("opens the exact selected saved guardian without changing time or recording a turn", () => {
    expect(guardians.length).toBeGreaterThan(0);
    const before = serializeWorld(world);
    for (const selected of guardians) {
      const entry = roomPortraitConversationEntry(
        world,
        player,
        selected,
        present,
      );
      expect(entry).toEqual(openConversationWith(world, player, selected));
      expect(entry.kind).toBe("available");
      if (entry.kind === "available") expect(entry.addressee).toBe(selected);
    }
    expect(serializeWorld(world)).toBe(before);
  });
  it("rejects a stale/offsite activation even when that person has an eligible conversation", () => {
    const selected = guardians[0]!;
    expect(openConversationWith(world, player, selected).kind).toBe(
      "available",
    );
    const before = serializeWorld(world);
    const entry = roomPortraitConversationEntry(world, player, selected, []);
    expect(entry.kind).toBe("unavailable");
    if (entry.kind === "unavailable")
      expect(entry.reason).toContain("not here with you");
    expect(serializeWorld(world)).toBe(before);
  });
  it("preserves the actual eligibility refusal rather than forcing an exchange", () => {
    const selected = Object.values(world.people).find(
      (person) => !present.includes(person.id),
    )!.id;
    const expected = openConversationWith(world, player, selected);
    expect(expected.kind).toBe("unavailable");
    expect(
      roomPortraitConversationEntry(world, player, selected, present),
    ).toEqual(expected);
  });
});
