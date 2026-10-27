import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
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
  const counters = new Set(
    governmentView(core, me).contests.map((c) => c.filingOffice.filedWith),
  );
  expect(counters.size, `no counter in ${where}`).toBeGreaterThan(0);
  let withClerk = 0;
  for (const filedWith of counters) {
    const visit = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    if (!visit.visit.clerkId) {
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
  expect(withClerk, `no clerk counter in ${where}`).toBeGreaterThan(0);
}, 600_000);
