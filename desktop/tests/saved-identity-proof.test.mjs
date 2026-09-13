import assert from "node:assert/strict";
import test from "node:test";
import {
  savedIdentity,
  sameSavedIdentity,
} from "../scripts/saved-identity-proof.mjs";

function record({
  saveId = "slot-a",
  worldId = "world-a",
  personId = "person-a",
  appearance = {
    seed: "appearance-a",
    recipeVersion: "appearance-recipe-v2",
    catalogGeneration: 2,
  },
  name = "Alex SAME",
} = {}) {
  return {
    saveId,
    metadata: { worldId, playerPersonId: personId },
    payload: JSON.stringify({
      world: {
        id: worldId,
        control: { kind: "person", personId },
        people: { [personId]: { id: personId, givenName: name, appearance } },
      },
    }),
  };
}
const original = savedIdentity(record());
test("saved identity is stable across formatting-only names, not a heading prefix", () => {
  assert.equal(
    sameSavedIdentity(
      original,
      savedIdentity(record({ name: "Alex Same · Age 27 · date · place" })),
    ),
    true,
  );
});
for (const [label, delta] of [
  ["wrong slot", { saveId: "slot-b" }],
  ["wrong World", { worldId: "world-b" }],
  ["wrong person", { personId: "person-b" }],
  [
    "changed appearance seed",
    { appearance: { ...original.appearance, seed: "appearance-b" } },
  ],
  [
    "changed recipe",
    {
      appearance: {
        ...original.appearance,
        recipeVersion: "appearance-recipe-v3",
      },
    },
  ],
  [
    "changed catalog",
    { appearance: { ...original.appearance, catalogGeneration: 3 } },
  ],
  [
    "changed appearance component",
    { appearance: { ...original.appearance, identity: { face: "different" } } },
  ],
])
  test(`identical names cannot hide ${label}`, () => {
    assert.equal(
      sameSavedIdentity(original, savedIdentity(record(delta))),
      false,
    );
  });
test("mismatched metadata is a real failure", () => {
  const row = record();
  row.metadata.playerPersonId = "person-b";
  assert.throws(() => savedIdentity(row), /identity is invalid/);
});
test("missing appearance is a real failure", () => {
  const row = record({ appearance: null });
  assert.throws(() => savedIdentity(row), /identity is invalid/);
});
