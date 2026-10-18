/**
 * Cabinet secretaries are paid (world-jobless-households-no-income): in a
 * played world, every seated secretary has a salary at Executive Schedule
 * Level I from the national government, receives it on the first of the month,
 * and no household of a living, simulated person goes two months without a
 * dollar coming in unless it is one of the two kinds the pool names. Played
 * world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { OFFICIAL_PAY_MODULE_ID, officialSalary } from "./modules/official-pay";
import { PRESS_MODULE_ID } from "./modules/press";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "cabinet-pay");

it(`pays the cabinet and leaves no simulated household without income in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const credited = (id: string) =>
    core.cashJournal.totalsByOwner.get(id)?.grossCreditMinor ?? 0;
  const homes = [...core.households.values()].filter((home) =>
    home.memberIds.some((id) => core.people.get(id)?.alive),
  );
  const before = new Map<string, number>();
  for (const home of homes)
    for (const id of home.memberIds) before.set(id, credited(id));
  const cash = new Map(
    homes.map((home) => [
      home.id,
      home.memberIds.reduce(
        (n, id) => n + (core.people.get(id)?.liquidMinor ?? 0),
        0,
      ),
    ]),
  );
  // The roster is read the day it grows: the cabinet is seated on the first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as OfficialRow[];
  const secretaries = officials.filter(
    (row) =>
      row.officeKind === "cabinet-secretary" &&
      !row.ended &&
      row.seated !== false &&
      core.people.get(row.id)?.alive,
  );
  expect(secretaries.length, `${where}: seated secretaries`).toBeGreaterThan(0);
  const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
  for (const row of secretaries) {
    const record = pay.get(row.id) as unknown as
      | {
          annualMinor: number;
          tag?: string;
          source: { tag: string };
          payerId: string;
        }
      | undefined;
    expect(record, `${where}: ${row.id} has a salary`).toBeDefined();
    expect(record!.annualMinor, `${where}: ${row.id}`).toBe(253_100 * 100);
    expect(record!.source.tag, `${where}: ${row.id}`).toBe("SOURCED");
  }

  for (let day = 0; day < 69; day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

  for (const row of secretaries)
    expect(
      credited(row.id) - (before.get(row.id) ?? 0),
      `${where}: ${row.id} was paid`,
    ).toBeGreaterThan(0);

  // Every household of a living, simulated person got money in: a wage, a
  // salary, a benefit or a draw. The two kinds the pool already names are
  // listed with their item, so a third kind shows here by id.
  const owners = new Set(
    (
      api.moduleState(PRESS_MODULE_ID).table("outlets").rows() as unknown as {
        ownerId: string | null;
      }[]
    ).flatMap((outlet) => (outlet.ownerId ? [outlet.ownerId] : [])),
  );
  const noSalary = new Set(
    officials
      .filter((row) => officialSalary(row) === null)
      .map((row) => row.id),
  );
  const unexplained: string[] = [];
  for (const home of homes) {
    const members = home.memberIds
      .map((id) => core.people.get(id))
      .filter((person) => person?.alive && person.tier !== "husk");
    if (!members.length) continue;
    const got = home.memberIds.reduce(
      (n, id) => n + credited(id) - (before.get(id) ?? 0),
      0,
    );
    if (got > 0 || (cash.get(home.id) ?? 0) > 0) continue;
    // world-press-outlet-owners-no-household: a press outlet's owner has no cash, no living cost and no draw.
    if (members.every((person) => owners.has(person!.id))) continue;
    // A cabinet candidate the president did not seat is a named stand-in with no post.
    if (members.every((person) => person!.id.startsWith("official:cabinet:")))
      continue;
    // gov-unpaid-posts-officials-no-income: a post with no salary row, and a
    // state's election chief whose line cannot pay the post.
    if (
      members.every(
        (person) =>
          person!.id.startsWith("person:election-chief:") ||
          noSalary.has(person!.id),
      )
    )
      continue;
    unexplained.push(home.id);
  }
  expect(unexplained, `${where}: households with no income`).toEqual([]);
}, 600_000);
