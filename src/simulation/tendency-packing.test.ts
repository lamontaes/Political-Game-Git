import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import {
  ensurePeopleTraits,
  personTraits,
  recordTraitChange,
} from "./people-traits";
import { CONTENT_PACK_API } from "./runtime-content-packs";
import {
  createWorldSnapshot,
  deserializeWorld,
  readWorldSnapshot,
  serializeWorld,
  serializeWorldAs,
  TENDENCY_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
  WORLD_SNAPSHOT_FORMAT_VERSION,
} from "./serialization";
import { packTendencies, unpackTendencies } from "./tendency-packing";
import type { World } from "./types";

/** A place drawn from all 56 by its seed, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `tendency-packing-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

const place = drawPlace();

/**
 * A new life whose neighbors' temperaments a decision has worked out, and one
 * of whom something later changed.
 */
function worldWithWorkedOutTendencies(): World {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: place.seed,
    placeKey: place.placeKey,
    startAge: 40,
    questionnaire: "skipped",
  });
  const isOther = (id: string): boolean =>
    id !== game.playerPersonId && game.world.people[id] !== undefined;
  // Someone who took part in something on record, so a change can cite it.
  const event = game.world.history.events.find(
    (entry) =>
      entry.occurredAt <= game.world.currentDate &&
      entry.involvedEntityIds.some(isOther),
  )!;
  expect(event, `${place.usps} ${place.seed}`).toBeDefined();
  const changing = event.involvedEntityIds.find(isOther)!;
  const others = [
    changing,
    ...game.world.personOrder
      .filter((id) => isOther(id) && id !== changing)
      .slice(0, 5),
  ];
  expect(others.length, `${place.usps} ${place.seed}`).toBe(6);
  const seeded = ensurePeopleTraits(game.world, others);
  const changed = personTraits(seeded, changing).find(
    (entry) => entry.value !== 2,
  )!;
  return recordTraitChange(seeded, {
    personId: changing,
    trait: changed.trait,
    value: 2,
    eventId: event.id,
    reason: "Fixture: a change a life made.",
  });
}

const world = worldWithWorkedOutTendencies();

describe(`worked-out personality tendencies in a save (${place.usps}, seed ${place.seed})`, () => {
  it("packs the unchanged first values and rebuilds every record in order", () => {
    const packed = packTendencies(world)!;
    expect(packed).not.toBeNull();
    const written = packed.world.history.personalityTendencies;
    expect(written.filter(Array.isArray).length).toBeGreaterThan(30);
    // The change a life made, and the player's own, stay verbatim.
    const verbatim = written.filter((record) => !Array.isArray(record));
    expect(
      verbatim.some((record) => record.supersedesTendencyId !== null),
    ).toBe(true);
    const restored = unpackTendencies(packed.world, packed.packing);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(world));
  });

  it("writes the tendency format, opens to the identical world, and still reads the old one", () => {
    const stored = serializeWorld(world);
    const format = JSON.parse(stored).formatVersion as number;
    expect(format).toBeGreaterThanOrEqual(23);
    expect(stored.length).toBeLessThan(
      JSON.stringify(createWorldSnapshot(world)).length,
    );
    const restored = readWorldSnapshot(stored);
    expect(JSON.stringify(restored.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(restored.world, restored.formatVersion)).toBe(
      stored,
    );
    expect(deserializeWorld(stored)).toEqual(world);

    // A save written before tendencies were packed opens to the same world.
    const older = serializeWorldAs(world, (format - 8) as never);
    expect(JSON.parse(older).tendenciesPacking).toBeUndefined();
    const reopened = readWorldSnapshot(older);
    expect(JSON.stringify(reopened.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(reopened.world, reopened.formatVersion)).toBe(
      older,
    );
  });

  it("keeps a content-pack world in its own packed format", () => {
    const withContentPacks: World = {
      ...world,
      contentPacks: { api: CONTENT_PACK_API, installed: [] },
    };
    const stored = serializeWorld(withContentPacks);
    const format = JSON.parse(stored).formatVersion as number;
    expect(format).toBeGreaterThanOrEqual(
      TENDENCY_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
    );
    expect(format % 2).toBe(0);
    expect(JSON.stringify(readWorldSnapshot(stored).world)).toBe(
      JSON.stringify(withContentPacks),
    );
  });

  it("leaves a world with no worked-out tendency exactly as before", () => {
    const none: World = {
      ...world,
      history: { ...world.history, personalityTendencies: [] },
    };
    expect(packTendencies(none)).toBeNull();
  });

  it("writes a record verbatim when its row would not rebuild it exactly", () => {
    const first = world.history.personalityTendencies.findIndex(
      (record) =>
        record.supersedesTendencyId === null &&
        record.scopeTags.includes("people-mind-v1.seed"),
    );
    const odd = world.history.personalityTendencies.map((record, at) =>
      at === first ? { ...record, id: `${record.id}-moved` } : record,
    ) as World["history"]["personalityTendencies"];
    const packed = packTendencies({
      ...world,
      history: { ...world.history, personalityTendencies: odd },
    })!;
    expect(
      Array.isArray(packed.world.history.personalityTendencies[first]),
    ).toBe(false);
    expect(packed.world.history.personalityTendencies[first]).toBe(odd[first]);
  });

  it("rejects malformed rows and tables and a packed payload under an older format", () => {
    const stored = JSON.parse(serializeWorld(world));
    const rowAt = (save: typeof stored): unknown[] =>
      save.world.history.personalityTendencies.find(Array.isArray);
    for (const value of [-1, 1e9, null, "0", 1.5]) {
      const invalid = structuredClone(stored);
      rowAt(invalid)[1] = value;
      expect(() => readWorldSnapshot(JSON.stringify(invalid))).toThrow();
    }
    const short = structuredClone(stored);
    rowAt(short).pop();
    expect(() => readWorldSnapshot(JSON.stringify(short))).toThrow();
    const changedValue = structuredClone(stored);
    const row = rowAt(changedValue);
    row[4] = row[5];
    expect(() => readWorldSnapshot(JSON.stringify(changedValue))).toThrow();
    const emptyTable = structuredClone(stored);
    emptyTable.tendenciesPacking.strings = [];
    expect(() => readWorldSnapshot(JSON.stringify(emptyTable))).toThrow();
    const extraField = structuredClone(stored);
    extraField.tendenciesPacking.unrecognized = true;
    expect(() => readWorldSnapshot(JSON.stringify(extraField))).toThrow();
    const wrongVersion = structuredClone(stored);
    wrongVersion.formatVersion = WORLD_SNAPSHOT_FORMAT_VERSION;
    expect(() => readWorldSnapshot(JSON.stringify(wrongVersion))).toThrow();
    const notPacked = structuredClone(stored);
    delete notPacked.tendenciesPacking;
    expect(() => readWorldSnapshot(JSON.stringify(notPacked))).toThrow();
  });
});
