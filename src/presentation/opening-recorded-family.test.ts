import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { pickDistinct, SeededRng } from "../simulation/rng";
import { recordKinship } from "../simulation/life";
import {
  describePersonContext,
  serializeWorld,
  deserializeWorld,
} from "../simulation";
import { projectOpeningFamily } from "./opening-story";

const SEED = "opening-all-recorded-family";
const [place] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
it(`includes a recorded sibling living elsewhere (${place!.name}, all56 seed ${SEED})`, () => {
  const small = smallWorld({ place: place!.jurisdictionKey, seed: SEED });
  const siblingId = small.world.personOrder.find(
    (id) => id !== small.personId,
  )!;
  const world = recordKinship(small.world, {
    stableKey: `${SEED}:sibling`,
    personIds: [small.personId, siblingId],
    establishedAt: small.world.currentDate,
    kind: "collateral:sibling",
    provenance: { kind: "authored", note: "Canonical family fixture" },
  });
  const before = serializeWorld(world);
  const family = projectOpeningFamily(world, small.personId);
  expect(family.relatives.map((person) => person.personId)).toContain(
    siblingId,
  );
  expect(
    family.relatives.find((person) => person.personId === siblingId)!
      .livesWithYou,
  ).toBe(false);
  const relation = describePersonContext(
    world,
    small.personId,
    siblingId,
  )!.relationship!;
  expect(
    family.relatives.find((person) => person.personId === siblingId)!
      .introduction,
  ).toContain(relation);
  expect(family.parents.map((person) => person.personId)).not.toContain(
    siblingId,
  );
  expect(
    new Set(
      [...family.parents, ...family.relatives].map((person) => person.personId),
    ).size,
  ).toBe(family.parents.length + family.relatives.length);
  expect(serializeWorld(world)).toBe(before);
  expect(
    projectOpeningFamily(deserializeWorld(before), small.personId),
  ).toEqual(family);
});
it("does not invent relatives when no kinship record exists", () => {
  const small = smallWorld({ place: place!.jurisdictionKey, seed: SEED });
  expect(projectOpeningFamily(small.world, small.personId).relatives).toEqual(
    [],
  );
});
