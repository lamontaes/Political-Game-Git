/**
 * A central bank governor's seat is filled by the president's nomination and
 * the Senate's vote (pool: gov-stopgap-central-bank-appointments-faked-mechanic).
 * In a played world a governor's term ends on a real date; the seat's new
 * member is the nominee, and the appointment event carries the reasons and
 * the Senate's count.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { FEDERAL_SENATE, members } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex");

/**
 * One drawn place's year. Returns false when no governor's seat was filled: a
 * Senate that confirms none of the president's candidates leaves each member
 * in place (the Federal Reserve Act's holdover), which is a real outcome, so
 * the test draws another place and fails only if none fills a seat.
 */
function playPlace(attempt: number): boolean {
  const draw = drawPlace(`${seed}:${attempt}`, "board-appointer");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  // The appointment events as the engine emitted them.
  const emitted = new Map<string, Record<string, string>>();
  const emit = api.emit.bind(api);
  api.emit = (event) => {
    if (event.id.startsWith("event:economy.board-appointment:"))
      emitted.set(event.id, event.facts as Record<string, string>);
    return emit(event);
  };
  // The board's members are on the record from the first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const board = () =>
    api.moduleState("macro").table("members").query("all", [true]);
  const before = new Map(board().map((row) => [String(row.seatId), row]));
  // The first governor term to end after the opening ends on January 31, 2026.
  advanceCore(core, addDays(makeIsoDate(core.date), 420));

  const events = [...core.eventIds].filter((id) =>
    id.startsWith("event:economy.board-appointment:"),
  );
  const governors = events.filter((id) => /:governor:\d+$/.test(id));
  if (!governors.length) return false;

  const president = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", ["seat:US:president", "serving"])[0] as unknown as
      TermRow | undefined
  )?.personId;
  expect(president, where).toBeTruthy();
  const senators = members(api, FEDERAL_SENATE).length;
  expect(senators, where).toBeGreaterThan(0);

  for (const id of governors) {
    const seatId = id.split(":").slice(-2).join(":");
    const now = board().find((row) => row.seatId === seatId)!;
    // A new member sits in the seat, a full person in the world.
    expect(now.personId, `${where} ${id}`).not.toBe(
      before.get(seatId)!.personId,
    );
    expect(core.people.get(String(now.personId)), where).toBeTruthy();
    const event = emitted.has(id) ? { facts: emitted.get(id) } : undefined;
    expect(
      event,
      `${where} ${id}: the appointment is on the record`,
    ).toBeTruthy();
    if (!event) continue;
    // The Senate voted, every member once, and a majority confirmed.
    const yes = Number(event.facts!.confirmYes);
    const no = Number(event.facts!.confirmNo);
    expect(yes + no, `${where} ${id}`).toBe(senators);
    expect(yes, `${where} ${id}`).toBeGreaterThan(no);
    // The nominee was ranked on alignment, qualification and acquaintance.
    expect(Number(event.facts!.total), `${where} ${id}`).toBeCloseTo(
      Number(event.facts!.alignment) +
        Number(event.facts!.qualification) +
        Number(event.facts!.acquaintance),
      6,
    );
  }
  return true;
}

it("names a governor by the president's choice and the Senate's vote, with the reasons on the record", () => {
  for (let attempt = 0; attempt < 6; attempt += 1)
    if (playPlace(attempt)) return;
  throw new Error(
    `no drawn place filled a governor's seat in 6 draws (seed ${seed})`,
  );
}, 3_600_000);
