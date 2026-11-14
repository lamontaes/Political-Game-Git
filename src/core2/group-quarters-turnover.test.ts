/**
 * Group quarters turn over on each type's own calendar: Storrs, Connecticut
 * (0973980, a college town), seed `group-quarters-turnover-1`. A college
 * graduates its class in May and admits the next in August, so its rooms
 * hold fewer residents in the summer and the same number again by September,
 * and its median age stays with the student ages. A nursing home has no stay:
 * its rooms stay as they are, and refill when a resident dies.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { groupQuartersStayOf } from "./gov-rules/place-population";
import { residentsRuntime } from "./modules/residents";

const readRooms = (
  core: Parameters<typeof residentsRuntime>[0],
  type: string,
) => {
  const store = residentsRuntime(core)!.store;
  let people = 0;
  const ages: number[] = [];
  const year = Number(core.date.slice(0, 4));
  for (const h of store.liveHouseholds()) {
    if (h.quarters !== type) continue;
    for (const m of store.countedMembers(h)) {
      people += store.weightOf(h);
      ages.push(year - Number(store.born[m]!.slice(0, 4)));
    }
  }
  ages.sort((a, b) => a - b);
  return { people, median: ages[ages.length >> 1] ?? 0 };
};

it("every type but a nursing home has a stay inside its own spread, and a college has a calendar", () => {
  for (const type of [
    "adultCorrectional",
    "juvenile",
    "otherInstitutional",
    "college",
    "military",
    "otherNoninstitutional",
  ] as const) {
    const stay = groupQuartersStayOf(type)!;
    expect(stay.years, type).toBeGreaterThanOrEqual(stay.spread.low);
    expect(stay.years, type).toBeLessThanOrEqual(stay.spread.high);
  }
  expect(groupQuartersStayOf("nursing")).toBeUndefined();
  expect(groupQuartersStayOf("college")!.leaveMonths).toEqual([5]);
  expect(groupQuartersStayOf("college")!.intakeMonths).toEqual([8]);
});

it("a college graduates its class in May and admits the next in August", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(
    "group-quarters-turnover-1",
    gameStartDate(),
    {
      twoLevel: true,
      placeKey: "0973980",
    },
  );
  const start = readRooms(core, "college");
  expect(start.people).toBeGreaterThan(0);
  let summer = start.people;
  while (core.date < "2025-09-01") {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    if (core.date >= "2025-05-25" && core.date < "2025-08-01")
      summer = Math.min(summer, readRooms(core, "college").people);
  }
  const autumn = readRooms(core, "college");
  // A fourth of the beds turn over in the year's May (a four-year stay).
  expect(summer).toBeLessThan(start.people * 0.85);
  expect(summer).toBeGreaterThan(start.people * 0.6);
  // The class admitted in August fills the beds again.
  expect(autumn.people).toBeGreaterThan(start.people * 0.97);
  // The residents stay the ages of students.
  expect(autumn.median).toBeLessThanOrEqual(22);
}, 600_000);
