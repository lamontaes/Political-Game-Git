/**
 * A tie's lost hours run from the last day the two were together anywhere: a
 * talk on their row, or a sitting both sat (pool:
 * people-tie-lost-hours-ignore-sittings-since). Before, the row's part ran
 * from the row's last contact even when the two had sat together since, so a
 * colleague with an old talk on record pulled as if unseen for weeks.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate and seats of
 * the lying thread's played files (player at seat 016). On Feb 28 2025 the
 * player and seat 022 last talked on Feb 4, and have sat on the floor
 * together since (last on Feb 24). Measured on this head: the row's own lost
 * hours 0.02985; the tie's 0.02855. Seen red in this world: with the old form of
 * tieHoursLost read at the same date (the row's part from its last contact,
 * each reader's from its own last day), 016 and 022 read 0.05472.
 *
 * Re-pinned when committees, caucuses and the rest of a session day became
 * shared hours (pool: legislature-colleague-ties-stay-slight), and again when
 * the colleagues the player sits with came back into the player's circle
 * (they choose daily again, so more pairs talk). The pair 016 and 022 carries
 * the test and reads the same numbers through both. The count of stale pairs
 * it also asserted (103, then 6, now 32) described the world, not the rule,
 * and is gone. Re-pinned again when officials' sittings and days at the post
 * came to fill their day (pool: office-hours-never-fill-an-officials-day),
 * with the Account lead's yes: the old pins were a last talk on Feb 3 (row
 * 0.03108, tie 0.02855); the new are Feb 4 (row 0.02985, tie 0.02855). The
 * cause is one record moving a day: 016's free-time visit to 022
 * (visit:2025-02-03:016:022 before, visit:2025-02-04:016:022 now). Monday
 * Feb 3 is now a district day whose post takes 480 minutes, and the free
 * block (free-block.ts) takes the day's unmodeled hours (`reserveHours`) and
 * 016's 309.6-minute rest before the 115-minute visit, so the visit no longer
 * fits; on the session day of Feb 4 the effort term ranks the short visit
 * above the long rest, so the visit comes first. The tie's number runs from
 * their last sitting (Feb 24) and is unchanged.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { hoursLost, metThrough, tieHoursLost } from "./closeness";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

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
  // The named pair, by the numbers.
  const row = core.relationships.get(`${a}:${b}`)!;
  expect(row.lastContactDate).toBe("2025-02-04");
  expect(metThrough(core, a, b)?.date).toBe("2025-02-04");
  expect(hoursLost(core, row)).toBeCloseTo(0.02985, 5);
  expect(tieHoursLost(core, a, b)).toBeCloseTo(0.02855, 5);
}, 75_000);
