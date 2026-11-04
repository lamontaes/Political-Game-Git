import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  filingOfficeFor,
  filingRequirements,
  openContests,
  type ContestRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { coreAPI } from "../core2/state";
import { openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

// Someone stands at every local filing counter (gov-filing-counter-clerk-at-
// county-board): where a town's races file with a county board of elections
// and the records name no commissioner (North Amityville, New York), the
// executive draws the officer as it draws the state's election chief, and the
// counter shows them. Places are drawn from all 56; a place qualifies by its
// own filing data naming a board, never by its name.
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`local-filing-officer:${Date.now()}`)
    .digest("hex");
const WANTED = 3;
const DRAWS = 200;
const LOCAL = new Set(["municipalOffice", "countyOffice"]);

function checkPlace(placeSeed: string, placeKey: string, where: string) {
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const me = core.playerId!;
  const local = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter((row) => LOCAL.has(row.family));
  expect(local.length, `${where}: no local contest`).toBeGreaterThan(0);
  for (const contest of local) {
    const clerk = filingClerkFor(api, contest.id);
    expect(
      clerk,
      `${where}: nobody at the counter for ${contest.id}`,
    ).toBeTruthy();
    expect(core.people.get(clerk!.personId)?.alive, where).toBe(true);
  }
  // The counter shows them, on a day a local race's filing is open.
  const open = () => openContests(api).filter((row) => LOCAL.has(row.family));
  for (let week = 0; week < 104 && !open().length; week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const shown = open();
  expect(
    shown.length,
    `${where}: no local race open in two years`,
  ).toBeGreaterThan(0);
  const counters = new Set(
    shown.map((row) => filingOfficeFor(api, row.id).filedWith),
  );
  for (const filedWith of counters) {
    const visit = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    const contest = shown.find(
      (row) => filingOfficeFor(api, row.id).filedWith === filedWith,
    )!;
    expect(visit.visit.clerkId, `${filedWith} in ${where}`).toBe(
      filingClerkFor(api, contest.id)!.personId,
    );
  }
  const clerks = local.map((row) => filingClerkFor(api, row.id)!);
  process.stdout.write(
    `LOCAL FILING OFFICER ${where}: ${local.length} local contests; at the counter: ${[
      ...new Set(clerks.map((c) => `${c.title} (${c.basis}, ${c.recordId})`)),
    ].join("; ")}\n`,
  );
}

it(`every local filing counter has someone at it, a county board of elections too (seed ${runSeed})`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let checked = 0;
  for (let draw = 0; draw < DRAWS && checked < WANTED; draw += 1) {
    const place = drawPlace(runSeed, `local-filing-officer:${draw}`);
    const state = place.state;
    const boards = ["municipalOffice", "countyOffice"].some((family) =>
      /board/i.test(
        filingRequirements(state, family as "municipalOffice").filedWith,
      ),
    );
    if (!boards) {
      passedOver.push(place.name);
      continue;
    }
    checkPlace(
      place.seed,
      place.key,
      `${place.name} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
    );
    checked += 1;
  }
  expect(checked, `no board place in ${DRAWS} draws`).toBe(WANTED);
  process.stdout.write(
    `LOCAL FILING OFFICER: ${passedOver.length} drawn places passed over (their filing data names no board)\n`,
  );
}, 1_800_000);

it("North Amityville, New York's county board of elections has someone at its counter (named regression)", () => {
  setBookkeeping(false);
  // The world seed Words found the empty counter on (test seed 96f34b32a90f7079).
  checkPlace(
    "48ecdf8d2595a1bafbf052509fe6e2fa00f861fe559fbc7a97fa73f32b6b6d62",
    "3651396",
    "North Amityville, New York (3651396)",
  );
}, 900_000);
