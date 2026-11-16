/**
 * An executive's bill carries a phase-in the way a member's does (the owner's ruling of
 * Sept 30, 2026: the sponsor writes "a start date and a phase-in"; pool item
 * play-draft-card-executive-phase-in-asked-as-zero). A mayor whose bills go through a member asks
 * one to carry a law amount in two dated steps, and then as a percent a year: the ask the member
 * weighs holds one section per step with its date, never one section of zero, and a bill the
 * member carries is filed with those dated sections. Pinned to Ridgeville, Alabama (0164656), the
 * draw "8341-pin"/"p6" executive-bill-menu.test.ts already names, its serving mayor.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, addMonths, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { BillRow } from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { seatAsk, seatView } from "./legislature";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };

it("a mayor's bill through a member carries its dated steps and its percent a year (Ridgeville AL)", () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const offices = api.moduleState("core2-offices-v1");
  const mayor = (
    offices.table("terms").rows() as unknown as {
      personId?: string;
      officeId: string;
      status: string;
    }[]
  ).find((term) => {
    const office = offices.table("offices").get(term.officeId) as
      { kind: string } | undefined;
    return (
      term.status === "serving" && term.personId && office?.kind === "mayor"
    );
  });
  expect(mayor?.personId, `${where}: no serving mayor`).toBeTruthy();
  const body = seatView(core, mayor!.personId!).bodies.find(
    (b) => "byRequest" in b && b.byRequest,
  );
  expect(
    body,
    `${where}: the mayor sends no bill through a member`,
  ).toBeDefined();
  // A law amount with an amount in force above zero, so a percent a year has something to raise.
  const item = body!.menus
    .flatMap((menu) => menu.items)
    .find(
      (row) => row.series && row.allowed !== false && Number(row.inForce) > 0,
    );
  expect(
    item,
    `${where}: the mayor's menu has no law amount in force`,
  ).toBeDefined();
  const today = makeIsoDate(core.date);
  const first = makeIsoDate(addMonths(today, 6));
  const second = makeIsoDate(addMonths(today, 18));
  const legislature = api.moduleState("core2-legislature-v1");
  const bills = legislature.table("bills");
  const sectionsOf = (
    provisions: readonly { value: number; effectiveDate?: string }[],
  ) => provisions.map((p) => [p.value, p.effectiveDate ?? null]);

  // Two dated steps.
  const stepped = seatAsk(core, mayor!.personId!, {
    officeId: body!.officeId,
    series: item!.series!,
    steps: [
      { value: Number(item!.inForce) + 1, effectiveDate: first },
      { value: Number(item!.inForce) + 2, effectiveDate: second },
    ],
  });
  const steppedAsk = (
    legislature.table("carryAsks").rows() as unknown as {
      id: string;
      memberId: string;
      provisions: { value: number; effectiveDate?: string }[];
    }[]
  ).find(
    (row) => row.memberId === stepped.asked.memberId && row.id.includes(today),
  );
  expect(steppedAsk, `${where}: the ask was not kept`).toBeDefined();
  expect(
    sectionsOf(steppedAsk!.provisions),
    `${where}: the ask's sections`,
  ).toEqual([
    [Number(item!.inForce) + 1, first],
    [Number(item!.inForce) + 2, second],
  ]);
  // At this place the likeliest member carries it (Wayne Webster, on the sales tax).
  expect(
    stepped.asked.carried,
    `${where}: ${stepped.asked.name} did not carry it`,
  ).toBe(true);
  const bill = bills.get(String(stepped.asked.billId)) as unknown as BillRow;
  expect(
    sectionsOf(bill.provisions),
    `${where}: the carried bill's sections`,
  ).toEqual([
    [Number(item!.inForce) + 1, first],
    [Number(item!.inForce) + 2, second],
  ]);

  // A percent a year, asked of the same member on another day: 10% for two years from `first`.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const risen = seatAsk(core, mayor!.personId!, {
    officeId: body!.officeId,
    series: item!.series!,
    memberId: stepped.asked.memberId,
    risePerYear: { percent: 10, years: 2, firstDate: first },
  });
  const day = makeIsoDate(core.date);
  const risenAsk = (
    legislature.table("carryAsks").rows() as unknown as {
      id: string;
      memberId: string;
      provisions: { value: number; effectiveDate?: string }[];
    }[]
  ).find(
    (row) => row.memberId === risen.asked.memberId && row.id.includes(day),
  );
  expect(risenAsk, `${where}: the percent ask was not kept`).toBeDefined();
  expect(
    risenAsk!.provisions.map((p) => p.effectiveDate),
    `${where}: one section a year from the first day`,
  ).toEqual([first, `${Number(first.slice(0, 4)) + 1}${first.slice(4)}`]);
  expect(
    risenAsk!.provisions.every((p) => p.value > Number(item!.inForce)),
    `${where}: each step raises the amount in force (${item!.inForce})`,
  ).toBe(true);
}, 45_000);
