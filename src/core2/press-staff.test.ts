/**
 * A press person who lives outside the town has a household that costs them
 * something (pool item people-press-staff-households). A local station's news
 * director works in the market's city, outside the town, and is seated from a
 * recorded identity with no household of their own; they now get the
 * one-person household officials get (official-living.ts): the Consumer
 * Expenditure basket and the state's studio rent, and the savings a family at
 * their pay keeps. Each week they spend that cost out of what they hold.
 *
 * The played world (buildBenchWorld, every module), run for a year, in a place
 * drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins it). A draw
 * whose town has no station is passed over and printed.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, daysBetweenText, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { outletsHere, pressParameter, PRESS_MODULE_ID } from "./modules/press";
import { officialHousehold } from "./official-living";
import { STAFF_ROLES, type StaffRow } from "./press-staff";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;
const bookkeepingBefore = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(bookkeepingBefore);
});

it(`an out-of-town station news director lives on a household cost through a played year (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-staff");
    const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const { stateKey } = lawChain(api);
    const directors = outletsHere(api)
      .filter((o) => o.tier !== "national" && o.kind === "television")
      .map((o) => o.headId)
      .filter((id): id is string => !!id && id.startsWith("person:press:"))
      .filter((id) => core.people.get(id)?.placeId === stateKey);
    if (!directors.length) {
      passed.push(`${where}: no station news director outside the town`);
      continue;
    }
    const head = STAFF_ROLES.find((r) => r.id === "head")!;
    const pay = pressParameter(head.payParameter!);
    const staff = () =>
      new Map(
        (
          api
            .moduleState(PRESS_MODULE_ID)
            .table("staff")
            .rows() as unknown as StaffRow[]
        ).map((r) => [r.id as string, r]),
      );
    const opening = makeIsoDate(core.date);
    const before = new Map<string, number>();
    for (const id of directors) {
      const person = core.people.get(id)!;
      // The cost officials get at this pay in this state: the basket and a
      // studio's fair market rent, per day.
      expect(person.livingCostDailyMinor, `${where} ${id}`).toBe(
        officialHousehold(api, stateKey, pay, id).livingCostDailyMinor,
      );
      expect(staff().get(id)?.livedThrough, `${where} ${id}`).toBe(opening);
      before.set(id, person.liquidMinor);
    }
    advanceCore(core, addDays(opening, 365));
    const today = makeIsoDate(core.date);
    const lines: string[] = [];
    for (const id of directors) {
      const person = core.people.get(id);
      const row = staff().get(id);
      if (!person?.alive || row?.leftOn) continue;
      // Spent through the last press week: the cost is paid as it comes due.
      expect(
        daysBetweenText(row!.livedThrough!, today),
        `${where} ${id} lived through ${row!.livedThrough}`,
      ).toBeLessThanOrEqual(api.parameter("daysPerWeek"));
      // They spent a year of the cost, or everything they had.
      const owed = person.livingCostDailyMinor * 350;
      expect(
        person.liquidMinor,
        `${where} ${id}: held ${before.get(id)} at the opening`,
      ).toBeLessThanOrEqual(Math.max(0, before.get(id)! - owed));
      const latest = core.cashJournal.latestByOwner.get(id);
      lines.push(
        `${id}: ${person.livingCostDailyMinor} a day, held ${before.get(id)} then ${person.liquidMinor}; lived through ${row!.livedThrough}; latest entry ${latest?.id ?? "none"}`,
      );
    }
    console.log(
      `press-staff: ${[...passed, `${where}\n  ${lines.join("\n  ")}`].join("\n")}`,
    );
    expect(
      lines.length,
      `${where}: no director still at the station`,
    ).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `seed ${seed}: no station news director outside the town in ${DRAWS} draws:\n${passed.join("\n")}`,
  );
}, 1_500_000);
