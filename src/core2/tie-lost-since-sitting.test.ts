/**
 * A tie's lost hours run from the last day the two were together anywhere: a
 * talk on their row, or a sitting both sat (pool:
 * people-tie-lost-hours-ignore-sittings-since). Before, the row's part ran
 * from the row's last contact even when the two had sat together since, so a
 * colleague with an old talk on record pulled as if unseen for weeks.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate and seats of
 * the lying thread's played files (player at seat 016). On Feb 28 2025 the
 * player and seat 022 last talked on Feb 3, and have sat on the floor
 * together since. Measured on this head: the row's own lost hours 0.03108;
 * the tie's 0.02855. Seen red in this world: with the old form of
 * tieHoursLost read at the same date (the row's part from its last contact,
 * each reader's from its own last day), 016 and 022 read 0.05472.
 *
 * Re-pinned when committees, caucuses and the rest of a session day became
 * shared hours (pool: legislature-colleague-ties-stay-slight). The earlier
 * premise was that every pair who last talked a week or more before (103
 * then) has lost less than its row alone says, with 026 and 030 named. That
 * held only while a pair's shared floor hours were small. Now the chamber
 * gives a pair 4.7 to 6.5 hours, so a few days since the last sitting on the
 * whole tie can lose more than weeks on a 1-hour row. Six pairs are stale
 * here, and two read the tie over the row, right by the rule: 014 and 022
 * (row 0.02983, tie 0.03800; old form 0.06270) and 022 and 024 (row 0.02398,
 * tie 0.02816; old form 0.04762). 026 and 030 are no longer stale.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  hoursLost,
  metThrough,
  sharedHoursBetween,
  tieHoursLost,
} from "./closeness";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

// Measured on this head: 6 pairs who last talked a week or more before.
const STALE = 6;

it("a colleague who sat with you since your last talk is missed from that sitting, not from the talk", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3 &&
      members(api, r.office.id).every((t) => t.personId),
  )!;
  const ids = members(api, seat.office.id).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  core.playerId = ids[15] as PersonId;
  const named = (n: string) =>
    ids.find((id) => id.split(":")[5] === n)! as PersonId;
  const a = named("016");
  const b = named("022");

  advanceCore(core, makeIsoDate("2025-02-28"));
  // Every pair of senators who last talked at least a week ago and know each
  // other through the floor.
  const stale: string[] = [];
  for (const x of ids)
    for (const y of ids) {
      if (x >= y) continue;
      const row = core.relationships.get(`${x}:${y}`);
      if (!row || row.lastContactDate > "2025-02-21") continue;
      if (!(sharedHoursBetween(core, x as PersonId, y as PersonId) > 0))
        continue;
      stale.push(`${x.split(":")[5]}-${y.split(":")[5]}`);
    }
  expect(stale.length).toBe(STALE);

  // One of them, by the numbers.
  const row = core.relationships.get(`${a}:${b}`)!;
  expect(row.lastContactDate).toBe("2025-02-03");
  expect(metThrough(core, a, b)?.date).toBe("2025-02-03");
  expect(hoursLost(core, row)).toBeCloseTo(0.03108, 5);
  expect(tieHoursLost(core, a, b)).toBeCloseTo(0.02855, 5);
}, 90_000);
