/**
 * A tie's lost hours run from the last day the two were together anywhere: a
 * talk on their row, or a sitting both sat (pool:
 * people-tie-lost-hours-ignore-sittings-since). Before, the row's part ran
 * from the row's last contact even when the two had sat together since, so a
 * colleague with an old talk on record pulled as if unseen for weeks.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate and seats of
 * the lying thread's played files (player at seat 016). Pinned by
 * lost/find.mts on the scratch branch: on Feb 28 2025 senators 026 and 030
 * last talked on Feb 3, and have sat on the floor together since. Measured on
 * this head: the row's own lost hours 0.14433; the tie's 0.02785. Every
 * senator pair who last talked a week or more before and know each other
 * through the floor (103 on this head) has lost less than its row says.
 * Seen red in this world: with the old form of tieHoursLost read at the same
 * date (the row's part from its last contact, each reader's from its own
 * last day), 026 and 030 read 0.14939 against 0.02785. On the parent itself
 * the world differs and no such pair exists, so the count reads 0.
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

// Measured on this head: 103 such pairs, every one below its row.
const STALE = 103;

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
  const a = named("026");
  const b = named("030");

  advanceCore(core, makeIsoDate("2025-02-28"));
  // Every pair of senators who last talked at least a week ago and know each
  // other through the floor: the floor has sat since, so each has lost less
  // than their row alone says.
  const stale: string[] = [];
  for (const x of ids)
    for (const y of ids) {
      if (x >= y) continue;
      const row = core.relationships.get(`${x}:${y}`);
      if (!row || row.lastContactDate > "2025-02-21") continue;
      if (!(sharedHoursBetween(core, x as PersonId, y as PersonId) > 0))
        continue;
      stale.push(`${x.split(":")[5]}-${y.split(":")[5]}`);
      expect(
        tieHoursLost(core, x as PersonId, y as PersonId),
        `${x} and ${y}`,
      ).toBeLessThan(hoursLost(core, row));
    }
  expect(stale.length).toBe(STALE);

  // One of them, by the numbers.
  const row = core.relationships.get(`${a}:${b}`)!;
  expect(row.lastContactDate).toBe("2025-02-03");
  expect(metThrough(core, a, b)?.date).toBe("2025-02-03");
  expect(hoursLost(core, row)).toBeCloseTo(0.14433, 5);
  expect(tieHoursLost(core, a, b)).toBeCloseTo(0.02785, 5);
}, 90_000);
