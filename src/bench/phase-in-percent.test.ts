/**
 * A phase-in by a percent a year from the seat (owner
 * ruling Sept 12, travel clarification, item 1: a bill phases in by dated steps or a percent a year).
 * `seatAct` takes the percent and the years and drafts the same dated sections the steps form does,
 * one a year, each the amount before it raised by the percent. Pinned to one place and world seed
 * whose council may set a wage floor.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { makeIsoDate } from "../core2/kernel/dates";
import { memberKey, members } from "../core2/modules/legislature";
import { upcomingMeeting } from "../core2/modules/office-day";
import { coreAPI } from "../core2/state";
import { billPageView } from "./bill-stage";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

const PLACE = process.env.PHASE_IN_PERCENT_PLACE ?? "4625741";
const WORLD_SEED =
  process.env.PHASE_IN_PERCENT_SEED ??
  "9294f6051f07f8d272b31d4018e04545cac6c1a295d8bdf5a0852e556de3a241";
const SERIES = "minimum-wage";

it(`a bill phases in an amount by a percent a year, one dated section a year (${PLACE}, seed ${WORLD_SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(WORLD_SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const offices = api
    .moduleState("core2-offices-v1")
    .table("offices")
    .rows() as unknown as { id: string; kind: string }[];
  const seat = ["council", "township-board", "county-board"]
    .flatMap((kind) => offices.filter((o) => o.kind === kind))
    .filter((office) => upcomingMeeting(api, office.id))
    .flatMap((office) =>
      members(api, office.id).flatMap((term) =>
        term.personId && core.people.has(term.personId)
          ? [{ office, member: memberKey(term) }]
          : [],
      ),
    )
    .find(({ office, member }) =>
      seatView(core, member)
        .bodies.find((b) => b.officeId === office.id)
        ?.menus.flatMap((m) => m.items)
        .some((item) => item.series === SERIES && item.allowed),
    );
  expect(
    seat,
    `${PLACE}: a member of a body that may set a wage`,
  ).toBeDefined();
  const item = seatView(core, seat!.member)
    .bodies.find((b) => b.officeId === seat!.office.id)!
    .menus.flatMap((m) => m.items)
    .find((row) => row.series === SERIES)!;
  const base = item.inForce as number;
  const first = makeIsoDate(
    `${Number(core.date.slice(0, 4)) + 1}-${core.date.slice(5)}`,
  );
  const drafted = seatAct(core, seat!.member, {
    kind: "draft",
    officeId: seat!.office.id,
    series: SERIES,
    risePerYear: { percent: 10, years: 3, firstDate: first },
  }) as ReturnType<typeof seatAct>;
  // One bill, one section per year, each the amount before it raised by the percent.
  expect(drafted.provisions).toHaveLength(3);
  const want = [1, 2, 3].map((n) => Math.round(base * 1.1 ** n));
  expect(drafted.provisions.map((p) => p.value)).toEqual(want);
  expect(drafted.provisions.map((p) => p.effectiveDate)).toEqual(
    [0, 1, 2].map((i) => `${Number(first.slice(0, 4)) + i}${first.slice(4)}`),
  );
  expect(() =>
    seatAct(core, seat!.member, {
      kind: "draft",
      officeId: seat!.office.id,
      series: SERIES,
      steps: [{ value: base + 1, effectiveDate: first }],
      risePerYear: { percent: 10, years: 3, firstDate: first },
    }),
  ).toThrow(/not both/);
  expect(() =>
    seatAct(core, seat!.member, {
      kind: "draft",
      officeId: seat!.office.id,
      series: SERIES,
      risePerYear: { percent: 10, years: 1, firstDate: first },
    }),
  ).toThrow(/two years or more/);
  // Nothing rises by a percent from zero: a law amount with none in force is refused.
  const items = seatView(core, seat!.member)
    .bodies.find((b) => b.officeId === seat!.office.id)!
    .menus.flatMap((m) => m.items);
  const none = items.find(
    (row) => row.series && row.allowed && !(Number(row.inForce) > 0),
  );
  expect(none, `${PLACE}: a law amount with nothing in force`).toBeDefined();
  expect(() =>
    seatAct(core, seat!.member, {
      kind: "draft",
      officeId: seat!.office.id,
      series: none!.series,
      risePerYear: { percent: 10, years: 3, firstDate: first },
    }),
  ).toThrow(/above zero/);
}, 120_000);

it(`a bill's paper says a rate in force as the law reads it and one rounding throughout (${PLACE}, seed ${WORLD_SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(WORLD_SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const offices = api
    .moduleState("core2-offices-v1")
    .table("offices")
    .rows() as unknown as { id: string; kind: string }[];
  // A member whose body may set a rate with something in force, found by reading each body's menu.
  const found = ["council", "township-board", "county-board"]
    .flatMap((kind) => offices.filter((o) => o.kind === kind))
    .filter((office) => upcomingMeeting(api, office.id))
    .flatMap((office) =>
      members(api, office.id).flatMap((term) =>
        term.personId && core.people.has(term.personId)
          ? [{ office, member: memberKey(term) }]
          : [],
      ),
    )
    .flatMap(({ office, member }) =>
      (
        seatView(core, member)
          .bodies.find((b) => b.officeId === office.id)
          ?.menus.flatMap((m) => m.items) ?? []
      )
        .filter(
          (item) =>
            item.series &&
            item.allowed &&
            String(item.unit).startsWith("percent") &&
            Number(item.inForce) > 0,
        )
        .map((item) => ({ office, member, item })),
    )[0];
  expect(found, `${PLACE}: a rate with something in force`).toBeDefined();
  const base = Number(found!.item.inForce);
  // A raise by a tenth of today's rate, so the new rate has more than two decimals.
  const drafted = seatAct(core, found!.member, {
    kind: "draft",
    officeId: found!.office.id,
    series: found!.item.series,
    value: base * 1.1,
  }) as ReturnType<typeof seatAct>;
  const view = billPageView(core, (drafted as unknown as { id: string }).id);
  const section = view.sections[0]!;
  // The struck side says what the law in force says, never a raise from a rate to itself.
  expect(section.struck).toMatch(/ is [\d.]+ percent\.?$/);
  expect(section.struck).not.toMatch(/raised from/);
  // The estimate says today's rate and the new one in one unit: a bill sets the law's amount, never its unit.
  const estimate = billPaper(core, (drafted as unknown as { id: string }).id)
    .sections[0]!.estimate;
  expect(estimate.afterUnit).toBe(estimate.beforeUnit);
  // A rate reads to at most two decimals in every line of the paper's text.
  for (const line of [section.inserted ?? "", section.struck ?? ""])
    for (const rate of line.match(/\d+\.\d+(?= percent)/g) ?? [])
      expect(rate.split(".")[1]!.length, line).toBeLessThanOrEqual(2);
}, 120_000);
