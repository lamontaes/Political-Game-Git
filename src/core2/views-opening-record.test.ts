/**
 * Opening stances are records (people-opening-stance-record-after-loadings):
 * on a question the 2020 Cooperative Election Study asked, two neighbors of
 * different faith and schooling each hold a stored opening record with its
 * reasons before any campaign, and a platform tally reads them by person and
 * record id. A place is drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import {
  agreementWith,
  openingRecord,
  viewOn,
  VIEWS_MODULE_ID,
} from "./modules/views";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const QUESTION = "civil-family-community.restrict-abortion";

it("two neighbors of different faith and schooling hold different stored opening records that a platform tally reads", () => {
  const place = drawPlace(seed, "opening-record");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const table = api.moduleState(VIEWS_MODULE_ID).table("openings");
  const formed = [...core.people.values()]
    .filter((person) => person.alive)
    .map((person) => ({
      id: person.id,
      record: openingRecord(api, person.id, QUESTION),
    }))
    .filter((row) => row.record !== undefined);
  expect(formed.length, `${where}: people with a record`).toBeGreaterThan(1);
  const high = formed.reduce((a, b) =>
    b.record!.total > a.record!.total ? b : a,
  );
  const low = formed.reduce((a, b) =>
    b.record!.total < a.record!.total ? b : a,
  );
  expect(high.record!.total, where).toBeGreaterThan(low.record!.total);
  // Each is stored once, under its own id, with the reasons that made it.
  for (const row of [high, low]) {
    const stored = table.get(
      `opening:${row.id}:${QUESTION}`,
    ) as never as typeof high.record;
    expect(stored, `${where}: ${row.id} stored`).toBeDefined();
    expect(
      stored!.reasons.map((r) => r.kind),
      where,
    ).toEqual(["faith", "degree"]);
    expect(
      stored!.reasons.reduce((n, r) => n + r.adds, 0),
      `${where}: ${row.id} reasons add up`,
    ).toBeCloseTo(stored!.total, 10);
    // Read again, it is the same record, not formed anew.
    expect(openingRecord(api, row.id, QUESTION), where).toEqual(stored);
  }
  // At the same lean, the views differ by exactly the records' totals.
  const at = (id: string) => viewOn(api, id, QUESTION, 0);
  expect(
    at(high.id) - at(low.id),
    `${where}: ${high.id} vs ${low.id}`,
  ).toBeCloseTo(high.record!.total - low.record!.total, 10);
  // A platform tally reads the records: agreement with a "yes" platform is
  // higher for the person whose record is higher, at the same lean.
  const platform = [{ question: QUESTION, position: 1 }];
  expect(
    agreementWith(api, high.id, 0, platform) -
      agreementWith(api, low.id, 0, platform),
    `${where}: tally by ${high.record!.id} and ${low.record!.id}`,
  ).toBeGreaterThan(0);
  // A question the survey did not ask has no record.
  expect(openingRecord(api, high.id, "no-such-question")).toBeUndefined();
  process.stdout.write(
    `${where}: ${high.record!.id} (${high.record!.total.toFixed(3)}) vs ${low.record!.id} (${low.record!.total.toFixed(3)})\n`,
  );
}, 900_000);
