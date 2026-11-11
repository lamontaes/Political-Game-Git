/**
 * A counted resident out of work brings their problem to an official from the
 * same records a full person's would come from (pool item
 * gov-cases-never-open-in-played-world). A case to an official the player
 * does not watch leaves them counted (owner, Oct 11, "Keep it simple": a
 * counted person is filled in when the player meets them; Speed, Nov 11,
 * core-speed-counted-cases-stay-counted): the case row is theirs, the office
 * keeps the visit, and nothing makes a full person of them.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { govReport } from "./gov-test-report";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { allCases } from "./modules/constituent-cases";
import { countedSinceOpening } from "./modules/residents";
import { coreAPI } from "./state";
import { keepsWhy } from "./why-kept";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a counted resident out of work brings a case and stays counted when the player does not watch the official, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(seed, `counted-cases:${attempt}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${seed}`;
    tried.push(where);
    // A year of the played world, in four stretches so a world that stops is named.
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const fromCounted = allCases(api).filter(
      (row) =>
        row.problem === "looking-for-work" &&
        countedSinceOpening(core, row.personId),
    );
    if (!fromCounted.length) continue;
    const row = fromCounted.find((c) => !keepsWhy(core, c.officialId));
    if (!row) continue;
    // Counted at the opening, and the case did not fill them in.
    expect(core.people.has(row.personId), `${where}: ${row.id}`).toBe(false);
    expect(row.severity, where).toBeGreaterThan(0);
    expect(row.facts.cushionMonths, where).toBeDefined();
    // The office took the case: it is on the official's record and was handled or is open.
    expect(core.people.has(row.officialId), where).toBe(true);
    expect(["open", "helped", "declined"]).toContain(row.status);
    govReport(
      "constituent-cases-counted",
      JSON.stringify({
        place: where,
        caseId: row.id,
        resident: row.personId,
        official: row.officialId,
        status: row.status,
        handledBy: row.handledBy,
        severity: row.severity,
        counted: fromCounted.length,
        all: allCases(api).length,
      }),
    );
    return;
  }
  throw new Error(`No counted resident brought a case in ${tried.join("; ")}`);
}, 1_200_000);
