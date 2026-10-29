import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { familyRelation } from "./closeness";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";

// One reader says how two people are family, for every engine that asks (the
// press asks whether a vote went to a firm the official's family owns): the
// relation either one's records name, the household relation for people who
// share a home, nothing for strangers or a partnership that ended.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "closeness-family-relation");

it(`reads the generated family, the household and a partnership in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const api = coreAPI(core);
  const people = [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  // Every relative a person's own facts name reads back as that relation,
  // from either side, whether the relative is a full person or still counted.
  let named = 0,
    counted = 0;
  for (const person of people) {
    for (const fact of person.pastFacts ?? []) {
      const otherId = fact.facts?.otherPersonId;
      if (!otherId || !fact.kind.startsWith("family:")) continue;
      expect(familyRelation(core, person.id, otherId), where).toBe(
        fact.kind.slice("family:".length),
      );
      if (core.people.has(otherId))
        expect(familyRelation(core, otherId, person.id), where).not.toBeNull();
      else counted += 1;
      named += 1;
    }
  }
  expect(named, where).toBeGreaterThan(0);
  expect(counted, `${where}: relatives still counted`).toBeGreaterThan(0);
  // People sharing a home with no recorded kin tie are household.
  const housemates = people.find((person) =>
    people.some(
      (other) =>
        other.id !== person.id &&
        other.householdId === person.householdId &&
        !person.familyIds.has(other.id) &&
        !other.familyIds.has(person.id),
    ),
  );
  if (housemates) {
    const other = people.find(
      (row) =>
        row.id !== housemates.id &&
        row.householdId === housemates.householdId &&
        !housemates.familyIds.has(row.id) &&
        !row.familyIds.has(housemates.id),
    )!;
    expect(familyRelation(core, housemates.id, other.id), where).toBe(
      "household",
    );
  }
  // Strangers are nothing to each other, and nobody is their own family.
  const adult = (row: (typeof people)[number]) =>
    row.alive &&
    Number(core.date.slice(0, 4)) - Number(row.birthDate.slice(0, 4)) >= 21;
  const a = people.find(adult)!;
  const stranger = people.find(
    (row) =>
      adult(row) &&
      row.id !== a.id &&
      row.householdId !== a.householdId &&
      !row.familyIds.has(a.id) &&
      !a.familyIds.has(row.id) &&
      !a.pastFacts?.some((fact) => fact.facts?.otherPersonId === row.id) &&
      !row.pastFacts?.some((fact) => fact.facts?.otherPersonId === a.id),
  )!;
  expect(familyRelation(core, a.id, stranger.id), where).toBeNull();
  expect(familyRelation(core, a.id, a.id), where).toBeNull();
  // A partnership makes them partners; once it ends they are not family.
  const single = (row: (typeof people)[number]) =>
    ![...core.familyLinks.values()].some(
      (link) => link.kind === "partner" && link.personIds.includes(row.id),
    );
  const pair = people.filter(
    (row) => adult(row) && single(row) && row.id !== stranger.id,
  );
  const left = pair.find((row) => single(row))!;
  const right = pair.find(
    (row) =>
      row.id !== left.id &&
      row.householdId !== left.householdId &&
      familyRelation(core, left.id, row.id) === null,
  )!;
  const source = {
    tag: "SOURCED" as const,
    citation: "A family-relation test partners two adults.",
    asOf: core.date,
  };
  api.setPartnersV1({
    personIds: [left.id, right.id],
    together: true,
    source,
  });
  expect(familyRelation(core, left.id, right.id), where).toBe("partner");
  expect(familyRelation(core, right.id, left.id), where).toBe("partner");
  api.setPartnersV1({
    personIds: [left.id, right.id],
    together: false,
    source,
  });
  expect(familyRelation(core, left.id, right.id), where).toBeNull();
}, 600_000);
