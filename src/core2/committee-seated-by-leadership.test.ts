/**
 * A committee in play is seated by the chamber's leadership (stopgap SG-GOV-committee-structure): the
 * members and chair on the committee record a bill is heard in are the roster the leadership engine
 * seated for that chamber and subject, not seniority. Pinned to one place and world seed, played a year.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { committeeRoster } from "./modules/leadership";
import {
  LEGISLATURE_MODULE_ID,
  type CommitteeRecord,
} from "./modules/legislature";
import { coreAPI } from "./state";

const PLACE = "4959280";
const SEED = "564821088e03037eace5a05e3a362b8474b65190c8f0dbed146fa9e54c97a2dd";

it(`committee records carry the roster leadership seated (${PLACE}, seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const table = () =>
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("committees")
      .rows() as unknown as CommitteeRecord[];
  // Played a day at a time until a committee meets, then read on the day it did: leadership
  // reorganizes with later vacancies and elections, so a roster is compared with its own day's.
  let records = table();
  for (let week = 0; week < 365 && !records.length; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    records = table();
  }
  expect(records.length, `${PLACE}: a committee met in a year`).toBeGreaterThan(
    0,
  );
  for (const record of records) {
    const seated = committeeRoster(api, record.chamber, record.committee);
    expect(seated, record.id).not.toBeNull();
    expect([...record.memberIds].sort(), record.id).toEqual(
      [...seated!.memberIds].sort(),
    );
    expect(record.chairId, record.id).toBe(seated!.chairId);
  }
  console.log(
    `${PLACE}: ${records.length} committee records, all on leadership's roster`,
  );
}, 240_000);
