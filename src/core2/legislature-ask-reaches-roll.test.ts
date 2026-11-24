/**
 * A sponsor asks for votes only on a bill that reaches its roll call (pool
 * item legislature-ask-skips-bills-the-committee-will-hold). The evening
 * before a floor day, each bill the floor takes up goes before its first
 * chamber's committee (`holdCommittee`, as a scheduled bill does), so a bill
 * the committee holds, by its chair or by its vote, leaves the agenda before
 * anyone is asked. Every vote-ahead ask in a played year names a bill that the
 * next floor day's roll call votes on, by ask id and roll call id.
 *
 * Played in the bench world for a year, the player seated in their state's
 * lower chamber (or the town's largest body where the state's has no
 * full-person member), in a place drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins it). A draw with no ask in the year is passed over
 * and printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  LEGISLATURE_MODULE_ID,
  committeeRecords,
  memberKey,
  members,
  type CommitteeRecord,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const DAYS = 365;

it(`every ask the evening before a floor vote names a bill its roll call votes on (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ask-reaches-roll");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    const bodies = [
      ...new Map(
        townSeats(api)
          .filter((row) => full(row.office.id).length > 1)
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ];
    const body =
      bodies.find((o) => o.level === "state" && o.id.endsWith("-lower")) ??
      bodies.find((o) => o.level === "state") ??
      bodies
        .filter((o) => ["city", "county", "township"].includes(o.level))
        .sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) {
      tried.push(`${where}: no body with two full-person members`);
      continue;
    }
    core.playerId = full(body.id)[0]!;
    const asks: CoreEventInput[] = [];
    const rolls = new Map<string, string>();
    api.subscribeEvents("ask-reaches-roll-test", ["vote-ahead"], (_, e) => {
      asks.push(e);
    });
    api.subscribeEvents(
      "ask-reaches-roll-test-votes",
      ["legislative-vote"],
      (_, e) => {
        rolls.set(e.id, e.date);
      },
    );
    const end = addDays(makeIsoDate(gameStartDate()), DAYS);
    advanceCore(core, end);
    // Asks whose floor day has come.
    const due = asks.filter((e) => String(e.facts?.floorDate) <= core.date);
    if (!due.length) {
      tried.push(`${where}: no ask in ${DAYS} days (player in ${body.id})`);
      continue;
    }
    const lines: string[] = [];
    for (const ask of due) {
      const billId = String(ask.facts!.billId);
      const chamber = String(ask.facts!.chamber);
      const floor = String(ask.facts!.floorDate);
      const rollId = `bill-vote:${billId}:${chamber}`;
      expect(
        rolls.get(rollId),
        `${where}: ${ask.id} (${ask.date}) asked about ${billId} for ${floor}, and no roll call ${rollId} that day; its committee records: ${JSON.stringify(
          committeeRecords(api, billId).map((c) => ({
            chamber: c.chamber,
            date: c.date,
            heard: c.heard,
            reported: c.reported,
          })),
        )}`,
      ).toBe(floor);
      if (lines.length < 3) lines.push(`${ask.id} -> ${rollId} on ${floor}`);
    }
    // A bill its committee held drew no ask in that chamber.
    const asked = new Set(
      asks.map((e) => `${String(e.facts!.billId)}|${String(e.facts!.chamber)}`),
    );
    const held = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees")
        .rows() as unknown as CommitteeRecord[]
    ).filter((c) => !c.reported);
    for (const c of held)
      expect(
        asked.has(`${c.billId}|${c.chamber}`),
        `${where}: ${c.billId} was held in committee (heard: ${c.heard}) on ${c.date} and drew an ask`,
      ).toBe(false);
    console.log(
      `ASK REACHES ROLL ${where}: player ${core.playerId} in ${body.id}; ${due.length} asks, each followed by its roll call; ${held.length} bills held in committee (${held.filter((c) => !c.heard).length} not heard by the chair), none asked about${tried.length ? `\n  passed over: ${tried.join("; ")}` : ""}\n  ${lines.join("\n  ")}`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
