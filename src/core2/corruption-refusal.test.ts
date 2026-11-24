import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import {
  BRIBE_PRESSED,
  BRIBE_REFUSED,
  considerBribe,
  corruptionModule,
  type CrimeRecord,
} from "./modules/corruption";
import { buildPopulation } from "./population";
import { coreAPI, registerModule } from "./state";

// A bribe turned down is a record, and the person who offered it weighs
// pressing the official again (owner, Nov 8: "subtle and open threats"). Rich
// people ask people under money strain in a drawn place, as the corruption
// test does; every offer an official turned down writes `corruption.bribe-refused`
// naming the offerer and the official, the offerer's own reasons decide
// whether `corruption.bribe-pressed` follows, and a press never comes without
// a refusal.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a refused bribe is a record, and the offerer's reasons decide whether they press (seed ${seed})`, () => {
  const place = drawPlace(`${seed}:0`, "corruption-refusal");
  const where = `${place.name} (${place.key}), seed ${seed}:0`;
  const input = buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: "2021-01-01",
    minimumPeople: 500,
  });
  const core = createLifeCore(input, { modules: [corruptionModule] });
  const api = coreAPI(core);
  const refused: string[] = [];
  const pressed: string[] = [];
  registerModule(core, {
    id: "test-refusal-tap",
    eventKinds: [BRIBE_REFUSED, BRIBE_PRESSED],
    onEvent: (_api, event) => {
      (event.kind === BRIBE_REFUSED ? refused : pressed).push(event.id);
    },
  });
  const adults = [...core.people.values()].filter(
    (row) =>
      row.tier !== "husk" &&
      row.alive &&
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 21,
  );
  const byCash = [...adults].sort((a, b) => b.liquidMinor - a.liquidMinor);
  const offerers = byCash.slice(0, 60);
  const targets = [...adults]
    .sort(
      (a, b) =>
        a.liquidMinor / (a.livingCostDailyMinor + 1) -
        b.liquidMinor / (b.livingCostDailyMinor + 1),
    )
    .slice(0, 20);
  const records: CrimeRecord[] = [];
  for (const offerer of offerers)
    for (const target of targets) {
      if (target.id === offerer.id) continue;
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: target.id,
        stakeMinor: 50000000,
        subjectId: `fixture-contract:${offerer.id}:${target.id}`,
      });
      if (record) records.push(record);
    }
  const turnedDown = records.filter((row) => row.offered && !row.taken);
  process.stdout.write(
    `BRIBE REFUSAL ${where}: ${records.length} offers, ${turnedDown.length} turned down, ${refused.length} refusal records, ${pressed.length} pressed\n`,
  );
  expect(
    turnedDown.length,
    `${where}: no bribe was turned down`,
  ).toBeGreaterThan(0);
  // Every offer turned down is a record, and only those.
  expect(refused.sort(), where).toEqual(
    turnedDown.map((row) => `${BRIBE_REFUSED}:${row.id}`).sort(),
  );
  // A press follows only a refusal, and the offerers' own reasons split them.
  for (const id of pressed)
    expect(refused, where).toContain(id.replace(BRIBE_PRESSED, BRIBE_REFUSED));
  expect(pressed.length, `${where}: nobody pressed`).toBeGreaterThan(0);
  expect(pressed.length, `${where}: everybody pressed`).toBeLessThan(
    refused.length,
  );
}, 600_000);
