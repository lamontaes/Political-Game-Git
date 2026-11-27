/**
 * The bodies engine's read doors (bodies-reads.ts) in a played world: one
 * drawn place of the 56, built the way the game builds it with every module
 * installed, and played 150 days. Each door must hand back exactly the rows
 * its table holds. A door whose table is empty in this world is named in the
 * output and not counted as proved.
 */
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../tests/golden-path/place";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState } from "../types";
import {
  allBills,
  allLeadershipPosts,
  billById,
  debateById,
  memberChoiceOn,
  remarkById,
  studyById,
  townHallById,
} from "./bodies-reads";
import { LEADERSHIP_MODULE_ID } from "./leadership";
import { LEGISLATURE_MODULE_ID } from "./legislature";
import { MEETINGS_MODULE_ID } from "./meetings";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;

let api: CoreAPI;
let name = "";
const passedOver: string[] = [];

beforeAll(() => {
  const seed = `${SEED}:bodies-reads`;
  const place = drawPlace(seed, "bodies-reads");
  name = `${place.name} (${place.key}), seed ${seed}`;
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const end = addDays(makeIsoDate(world.date), DAYS);
  while (world.date < end)
    advanceCore(world, addDays(makeIsoDate(world.date), 1));
  api = coreAPI(world);
}, 900_000);

const rowsOf = (moduleId: string, table: string) =>
  api.state.modules.has(moduleId)
    ? (api.moduleState(moduleId).table(table).rows() as unknown as {
        id: string;
        [key: string]: unknown;
      }[])
    : [];

const tableOf = (moduleId: string, table: string) =>
  api.moduleState(moduleId).table(table);

function proves(
  label: string,
  rows: readonly { id: string }[],
  door: (id: string) => unknown,
  moduleId: string,
  table: string,
): void {
  if (rows.length === 0) passedOver.push(label);
  for (const row of rows.slice(0, 300))
    expect(door(row.id), `${name}: ${label} ${row.id}`).toBe(
      tableOf(moduleId, table).get(row.id),
    );
}

describe("the bodies engine's read doors, in a played world", () => {
  it("bill doors return the stored bills and choices", () => {
    const bills = rowsOf(LEGISLATURE_MODULE_ID, "bills");
    expect(bills.length, `${name}: no bills kept`).toBeGreaterThan(0);
    expect(allBills(api)).toEqual(bills);
    proves(
      "bills",
      bills,
      (id) => billById(api, id),
      LEGISLATURE_MODULE_ID,
      "bills",
    );
    expect(billById(api, "no-such-bill")).toBeUndefined();
    const choices = rowsOf(LEGISLATURE_MODULE_ID, "choices");
    if (choices.length === 0) passedOver.push("choices");
    for (const row of choices.slice(0, 300)) {
      const [billId, memberId] = String(row.id).split("|");
      expect(memberChoiceOn(api, billId!, memberId!)).toBe(
        tableOf(LEGISLATURE_MODULE_ID, "choices").get(String(row.id)),
      );
    }
    proves(
      "studies",
      rowsOf(LEGISLATURE_MODULE_ID, "studies"),
      (id) => studyById(api, id),
      LEGISLATURE_MODULE_ID,
      "studies",
    );
  });

  it("meeting doors return the stored town halls, debates and remarks", () => {
    proves(
      "town halls",
      rowsOf(MEETINGS_MODULE_ID, "townHalls"),
      (id) => townHallById(api, id),
      MEETINGS_MODULE_ID,
      "townHalls",
    );
    proves(
      "debates",
      rowsOf(MEETINGS_MODULE_ID, "debates"),
      (id) => debateById(api, id),
      MEETINGS_MODULE_ID,
      "debates",
    );
    proves(
      "remarks",
      rowsOf(MEETINGS_MODULE_ID, "remarks"),
      (id) => remarkById(api, id),
      MEETINGS_MODULE_ID,
      "remarks",
    );
  });

  it("the leadership door returns the stored posts", () => {
    const posts = rowsOf(LEADERSHIP_MODULE_ID, "posts");
    if (posts.length === 0) passedOver.push("leadership posts");
    expect(allLeadershipPosts(api)).toEqual(posts);
  });

  it("names what this world left empty", () => {
    if (passedOver.length)
      console.log(`Passed over in ${name}: ${passedOver.join(", ")}`);
  });
});
