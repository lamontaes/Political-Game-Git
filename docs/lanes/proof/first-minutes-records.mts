import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../../src/bench/world.ts";
import {
  applyChosenPerson,
  readChosenPerson,
  chosenBirthDate,
} from "../../../src/bench/creator.ts";
import {
  backdropFor,
  roomCondition,
  homeOf,
} from "../../../src/bench/scene.ts";
import { coreAPI } from "../../../src/core2/state.ts";
import { setBookkeeping } from "../../../src/core2/bookkeeping.ts";
import { gameStartDate } from "../../../src/core2/game-start.ts";
import { ageOnDate, makeIsoDate } from "../../../src/core2/kernel/dates.ts";
import { HOUSING_MODULE_ID } from "../../../src/core2/modules/housing.ts";
const root = fileURLToPath(
  new URL("../../../test-results/lane-2-first-minutes/", import.meta.url),
);
const rows = JSON.parse(readFileSync(`${root}/results.json`, "utf8"));
assert.equal(rows.length, 8);
setBookkeeping(false);
const evidence = [];
for (const row of rows) {
  const url = new URL(row.newlifeURL),
    chosen = readChosenPerson(url.searchParams.get("person")!);
  const world = buildBenchWorld(row.replay, gameStartDate(), {
    twoLevel: true,
    placeKey: row.key,
    playerBirthDate: chosenBirthDate(chosen),
    playerGender: chosen.gender,
  });
  const core = world.core;
  assert.equal(world.playerId, row.life.personId);
  applyChosenPerson(core, world.playerId!, chosen);
  assert.equal(
    core.date,
    row.life.date,
    "audit reproduces the opening day without advancing it",
  );
  let siblingLinks = 0,
    parentLinks = 0;
  const collisions = [],
    underage = [];
  for (const person of core.people.values())
    for (const fact of person.pastFacts ?? []) {
      if (
        !["family:parent", "family:other-parent", "family:sibling"].includes(
          fact.kind,
        )
      )
        continue;
      const otherId = fact.facts?.otherPersonId!;
      const other = core.people.get(otherId) ?? core.husks.get(otherId);
      assert(other, `missing family record ${fact.id}`);
      if (
        fact.kind === "family:parent" ||
        fact.kind === "family:other-parent"
      ) {
        parentLinks++;
        const years = ageOnDate(
          makeIsoDate(other.birthDate),
          makeIsoDate(person.birthDate),
        );
        if (years < 15)
          underage.push({
            person: person.id,
            parent: other.id,
            years,
            recordId: fact.id,
          });
      } else if (
        person.alive &&
        ("alive" in other ? other.alive : !other.diedOn)
      ) {
        siblingLinks++;
        if (person.givenName.toLowerCase() === other.givenName.toLowerCase())
          collisions.push({
            person: person.id,
            sibling: other.id,
            name: person.givenName,
            recordId: fact.id,
          });
      }
    }
  assert(parentLinks > 0);
  assert(siblingLinks > 0);
  assert.deepEqual(underage, []);
  assert.deepEqual(collisions, []);
  const api = coreAPI(core),
    table = api.moduleState(HOUSING_MODULE_ID).table("dwellings");
  const missing = [...core.households.values()]
    .filter((h) => !table.get(`dwelling:${h.id}`))
    .map((h) => h.id);
  assert.deepEqual(
    missing,
    [],
    "every full household has its home at New Game",
  );
  const home = table.get(
    `dwelling:${core.people.get(world.playerId!)!.householdId}`,
  );
  assert(home);
  assert.deepEqual(home, row.card.dwelling);
  assert.equal(
    homeOf(core, world.playerId!),
    row.scene.place,
    "the displayed room comes from the actual home reader",
  );
  const backdrop = backdropFor(
    core,
    row.scene.place,
    row.life.minuteOfDay,
    world.playerId!,
  );
  assert.equal(backdrop.file, row.scene.backdrop.file);
  const result = {
    town: world.place.displayName,
    key: row.key,
    replay: row.replay,
    personId: world.playerId,
    date: core.date,
    households: core.households.size,
    homes: table.rows().length,
    siblingLinks,
    parentLinks,
    collisions,
    underage,
    missing,
    home,
    room: row.scene.place,
    condition: roomCondition(core, world.playerId!),
    backdrop,
  };
  evidence.push(result);
  writeFileSync(`${root}/record-audit.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(result));
}
