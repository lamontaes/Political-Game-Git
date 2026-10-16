/**
 * A counted resident out of work brings their problem to an official from the
 * same records a full person's would come from, and the case that reaches
 * the official fills them in: the case, the relationship and the view of the
 * official land on a full person (pool item gov-cases-never-open-in-played-world).
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
import { impressionOf } from "./modules/campaigns";
import { allCases } from "./modules/constituent-cases";
import { countedSinceOpening } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a counted resident out of work brings a case, is filled in, and the official is seen differently, seed ${seed}`, () => {
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
    const row = fromCounted[0]!;
    // They were counted at the opening; the case filled them in.
    expect(core.people.has(row.personId), `${where}: ${row.id}`).toBe(true);
    expect(core.people.get(row.personId)!.alive, where).toBe(true);
    expect(row.severity, where).toBeGreaterThan(0);
    expect(row.facts.cushionMonths, where).toBeDefined();
    // The case moved their view of the official, and only the official in it.
    if (row.status !== "open")
      expect(
        impressionOf(api, row.personId, row.officialId),
        `${where}: view of ${row.officialId} after ${row.id}`,
      ).toBeDefined();
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
