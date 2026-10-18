/**
 * A body with committees takes a scheduled bill to its committee on a day of
 * its own, ahead of the floor (pool item office-committee-seats-on-a-council-
 * that-has): the committee's record is dated before the floor sitting, a held
 * bill never reaches the floor, and the floor's vote cites the committee's
 * report by record id. Tried in drawn places until a chamber above the
 * committee-of-the-whole size is the player's own state's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  billOf,
  committeeRecords,
  draftBill,
  LEGISLATURE_MODULE_ID,
  members,
  scheduleVote,
  votesOn,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 8;
/** The committee-of-the-whole size in data (campaigns parameters): bodies above it have committees. */
const WHOLE = 9;

function trial(draw: number) {
  const place = drawPlace(`${seed}-${draw}`, "committee-meeting");
  const where = `seed ${place.seed}, ${place.name} (${place.key})`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (row) =>
      row.holder?.personId &&
      core.people.has(row.holder.personId) &&
      row.office.level === "state" &&
      members(api, row.office.id).length > WHOLE,
  );
  if (!seat) return undefined;
  const policy = billCatalog(api, "state")
    .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
    .find((row) => row.kind === "policy-question" && row.authority.allowed);
  if (!policy) return undefined;
  const bill = draftBill(api, {
    bodyOfficeId: seat.office.id,
    sponsorId: seat.holder!.personId!,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  const floorDate = scheduleVote(api, bill.id);
  const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
  const committeeDate = calendar.get(`committee:${bill.id}`)?.date;
  return { core, api, where, bill, floorDate, committeeDate };
}

it("a bill's committee meets before the floor, and the floor's vote cites its report", () => {
  let proof: string | undefined;
  for (let draw = 0; draw < DRAWS && !proof; draw++) {
    const t = trial(draw);
    if (!t) continue;
    const { core, api, where, bill, floorDate, committeeDate } = t;
    // A sitting far enough off leaves the committee its own day, ahead of it.
    expect(committeeDate, `${where}: committee scheduled`).toBeDefined();
    expect(committeeDate! < floorDate, `${where}: committee before floor`).toBe(
      true,
    );
    expect(committeeDate! > core.date, `${where}: committee after today`).toBe(
      true,
    );
    // Nothing is decided before the committee's day.
    advanceCore(core, addDays(makeIsoDate(committeeDate!), -1));
    expect(committeeRecords(api, bill.id), `${where}: not yet met`).toEqual([]);
    advanceCore(core, makeIsoDate(committeeDate!));
    const [record] = committeeRecords(api, bill.id);
    expect(record, `${where}: committee met`).toBeDefined();
    expect(record!.date, where).toBe(committeeDate);
    expect(votesOn(api, bill.id), `${where}: no floor vote yet`).toEqual([]);
    advanceCore(core, addDays(makeIsoDate(floorDate), 1));
    const after = billOf(api, bill.id);
    const votes = votesOn(api, bill.id);
    if (record!.reported) {
      expect(after.committeeId, `${where}: vote cites the report`).toBe(
        record!.id,
      );
      expect(votes.length, `${where}: floor voted`).toBeGreaterThan(0);
      expect(["passed", "failed", "signed", "vetoed", "enacted"]).toContain(
        after.status,
      );
    } else {
      // A bill its committee held never reaches the floor.
      expect(after.status, `${where}: held`).toBe("failed");
      expect(votes, `${where}: no floor vote`).toEqual([]);
    }
    proof = `${where}: ${bill.id} committee ${record!.id} met ${committeeDate} (${record!.yes} to ${record!.no}, ${record!.reported ? "reported" : "held"}), floor ${floorDate}, status ${after.status}`;
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) had a state chamber above ${WHOLE} members with a sitting`,
  ).toBeDefined();
  console.log(`COMMITTEE ${proof}`);
}, 3_600_000);
