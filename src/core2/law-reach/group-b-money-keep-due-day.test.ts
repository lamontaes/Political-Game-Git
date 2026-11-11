/**
 * A recipient whose amount changes keeps the day their payment is next due
 * (pool item laws-work-requirement-pays-households-more): the work
 * requirement's change-day rerun opened the new amount tomorrow, so the
 * federal treasury paid the month twice. Two drawn places; the place and seed
 * are in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { governments } from "../modules/budgets";
import { coreAPI } from "../state";
import { reconcileObligations } from "./group-b-money";
import { rowsOf } from "./group-b-store";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a changed amount keeps the day the payment is next due, in two drawn places (seed ${seed})`, () => {
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "keep-due-day");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const federal = governments(api).find((g) => g.level === "federal");
    expect(federal, `${where}: no federal government`).toBeTruthy();
    const recipient = [...core.people.keys()][0]!;
    const pair = `${federal!.id}|${recipient}`;
    const input = (amountMinor: number) => ({
      rowKind: "benefit" as const,
      key: "keep-due-day-probe",
      want: new Map([[pair, amountMinor]]),
      reasonKey: "probe",
      citation: "keep-due-day test",
    });
    // First amount opens tomorrow and is paid; its next due day is a month on.
    reconcileObligations(api, input(10_000));
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const opened = rowsOf<{ obligationId: string }>(api, "taken").find((r) =>
      r.obligationId?.includes(recipient),
    )!;
    const nextDue = api.accounts().obligation(opened.obligationId)!.nextDueAt;
    expect(
      nextDue,
      `${where}: the first payment has a next due day`,
    ).toBeTruthy();
    // Mid-month the amount changes: the replacement keeps that day.
    advanceCore(core, addDays(makeIsoDate(core.date), 10));
    reconcileObligations(api, input(20_000));
    const rows = rowsOf<{ obligationId: string; amountMinor: number }>(
      api,
      "taken",
    ).filter(
      (r) => r.obligationId?.includes(recipient) && r.amountMinor === 20_000,
    );
    expect(rows.length, `${where}: no replacement`).toBe(1);
    const replacement = api.accounts().obligation(rows[0]!.obligationId)!;
    expect(
      replacement.nextDueAt,
      `${where}: the replacement moved the due day`,
    ).toBe(nextDue);
    expect(replacement.amountMinor, where).toBe(20_000);
  }
}, 600_000);
