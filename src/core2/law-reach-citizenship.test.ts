/**
 * A county or city that partners with federal immigration enforcement reaches
 * the noncitizen adults in its town, named and counted, by one rule: each
 * person's citizenship is a seeded draw from their id against their place's
 * share of adult citizens, so a counted member and the person they become
 * when filled in agree. A drawn place and seed, the two-level town.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { govReport } from "./gov-test-report";
import { addDays, makeIsoDate } from "./kernel/dates";
import { isNoncitizen } from "./citizenship";
import { citizenShareOf } from "./electorate-places";
import { ageOn } from "./counted-groups";
import { reachOf } from "./counted-reach";
import { openReach, reachParameter } from "./law-reach/group-a-records";
import { enactLaw, lawChain } from "./modules/laws";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const KEY =
  "us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "citizenship-reach");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  placeKey: place.key,
  twoLevel: true,
});
const core = world.core;
const api = coreAPI(core);
const where = `${place.name} (${place.key}), seed ${seed}`;

describe(`immigration-enforcement partnership in ${place.name}`, () => {
  it("reaches named and counted noncitizen adults by one rule, matching the place's share", () => {
    const chain = lawChain(api);
    const level =
      chain.levels.find((l) => l.level === "city") ??
      chain.levels.find((l) => l.level === "county")!;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level as "city" | "county",
      series: KEY,
      value: 1,
      effectiveDate: addDays(makeIsoDate(core.date), 1),
      measureId: `test:citizenship:${core.date}`,
      citation: "Test measure for the citizenship reach",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 3));

    const share = citizenShareOf(
      core.placeMetadata.placeKey,
      chain.stateKey.slice(3),
    );
    const adult = reachParameter("adultAge");
    const townId = chain.townPlaceId;
    const rows = openReach(api, KEY).filter((r) => r.spec === "noncitizens");
    const named = rows.filter((r) => core.people.has(r.targetId));
    const countedRow = rows.find((r) => r.count !== null);

    // Every named person reached is an adult the shared rule calls a noncitizen.
    for (const row of named) {
      const person = core.people.get(row.targetId)!;
      expect(person.placeId, `${where}: ${row.targetId}`).toBe(townId);
      expect(ageOn(person.birthDate, core.date)).toBeGreaterThanOrEqual(adult);
      expect(isNoncitizen(core.seed, person.id, share)).toBe(true);
    }

    // The counted row equals an independent recount over the store's members.
    const rt = residentsRuntime(core)!;
    let recount = 0;
    let countedAdults = 0;
    for (const h of rt.store.liveHouseholds()) {
      if (h.placeId !== townId) continue;
      const weight = rt.store.weightOf(h);
      for (const m of rt.store.countedMembers(h)) {
        if (ageOn(rt.store.born[m]!, core.date) < adult) continue;
        countedAdults += weight;
        if (isNoncitizen(core.seed, rt.store.ids[m]!, share)) recount += weight;
      }
    }
    expect(countedRow?.count ?? 0, `${where}: counted noncitizens`).toBe(
      Math.round(recount),
    );
    expect(
      Math.round(
        reachOf(core, townId, {
          ageFrom: adult,
          noncitizen: { citizenShare: share },
        }).counted.people,
      ),
    ).toBe(Math.round(recount));

    // Together they match the place's survey share within sampling spread.
    const adults =
      countedAdults + reachOf(core, townId, { ageFrom: adult }).full.people;
    const reached = named.length + (countedRow?.count ?? 0);
    const expected = adults * (1 - share);
    const spread = 4 * Math.sqrt(adults * share * (1 - share)) + 1;
    govReport(
      "law-reach-citizenship",
      JSON.stringify({
        where,
        share: +share.toFixed(4),
        adults: Math.round(adults),
        named: named.length,
        counted: countedRow?.count ?? 0,
        expected: +expected.toFixed(1),
        namedSample: named.slice(0, 2).map((r) => r.targetId),
        countedRow: countedRow?.id,
      }),
    );
    expect(
      Math.abs(reached - expected),
      `${where}: ${reached} reached, ${expected.toFixed(1)} expected of ${Math.round(adults)} adults`,
    ).toBeLessThanOrEqual(spread);
    expect(
      countedAdults,
      `${where}: a two-level town has counted adults`,
    ).toBeGreaterThan(0);
  }, 600_000);
});
