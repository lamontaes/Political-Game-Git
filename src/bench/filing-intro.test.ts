import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { coreAPI } from "../core2/state";
import { openBenchFilingVisit } from "./filing";
import { governmentView } from "./government";
import { buildBenchWorld } from "./world";

// The filing counter opens with the narrator naming the clerk and why the
// player came (owner, Oct 15, night: "Introduce people before they speak";
// playtest Oct 26: the clerk said "Can I help you?" with no introduction).
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`filing-intro:${Date.now()}`).digest("hex");

it("every counter with a clerk is introduced before the clerk speaks", () => {
  const place = drawPlace(runSeed, "filing-intro");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const me = world.playerId!;
  // A counter offers races only while their filing is open (agreement 1-4:
  // the elections engine's window), so the town's weeks go by until a counter
  // someone staffs is offered (read from the records, without a visit: a
  // visit is the player's act and stays on the one day it happens).
  const offered = () => governmentView(core, me).contests;
  const api = coreAPI(core);
  const staffed = () =>
    offered().some((row) => filingClerkFor(api, row.contest.id) !== null);
  for (let week = 0; week < 104 && !staffed(); week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const counters = new Set(offered().map((c) => c.filingOffice.filedWith));
  expect(
    counters.size,
    `no counter in ${where} by ${core.date}`,
  ).toBeGreaterThan(0);
  let withClerk = 0;
  const unstaffed: string[] = [];
  for (const filedWith of counters) {
    const visit = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    if (!visit.visit.clerkId) {
      unstaffed.push(filedWith);
      expect(visit.intro, where).toEqual([]);
      continue;
    }
    withClerk++;
    const clerk = core.people.get(visit.visit.clerkId)!;
    expect(visit.intro.length, `${filedWith} in ${where}`).toBeGreaterThan(0);
    expect(visit.intro.map((l) => l.text).join(" ")).toContain(
      `${clerk.givenName} ${clerk.familyName}`,
    );
    expect(visit.intro.map((l) => l.text).join(" ")).toContain("the ");
    for (const line of visit.intro) {
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
      expect(line.text).not.toMatch(/\{|\}|undefined/);
    }
  }
  process.stdout.write(
    `FILING INTRO ${where} on ${core.date}: ${withClerk} counters with a clerk; with no clerk: ${unstaffed.join("; ") || "none"}\n`,
  );
  expect(
    withClerk,
    `no clerk counter in ${where} by ${core.date} (no clerk: ${unstaffed.join("; ")})`,
  ).toBeGreaterThan(0);
}, 600_000);
