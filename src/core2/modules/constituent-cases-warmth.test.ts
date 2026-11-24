/**
 * A counted resident's decided case moves the counted ballot (pool item
 * stopgap-elections-read-your-record): the warmth the electorate reads for a
 * counted resident is the warmth filling them in would write, and the counted
 * appeal moves by it. Pinned to a drawn place and seed (named in each
 * message); the place keeps counted residents with decided cases after a year.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI, fillInPerson } from "../state";
import { countedAppeal } from "../electorate";
import { impressionOf } from "./campaigns";
import { allCases, caseWarmthsOf } from "./constituent-cases";
import { ELECTIONS_MODULE_ID } from "./elections";
import { countedBallotsOf } from "./voting";

setBookkeeping(false);

it("a counted resident's decided case is read as the warmth a fill-in would write, and moves their appeal", () => {
  const seed = "kw-4";
  const place = drawPlace(seed, "case-warmth");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const decided = allCases(api).filter(
    (row) => !core.people.has(row.personId) && row.status !== "open",
  );
  expect(decided.length, `${where}: decided counted cases`).toBeGreaterThan(0);
  const row = decided.find((r) => core.people.get(r.officialId)?.alive)!;
  const warmth = caseWarmthsOf(api, row.personId)[row.officialId]!;
  expect(Math.sign(warmth), `${where}: ${row.id} ${row.status}`).toBe(
    row.status === "helped" ? 1 : -1,
  );
  // The same view the filled-in resident holds.
  fillInPerson(core, row.personId as never);
  expect(
    impressionOf(api, row.personId, row.officialId)?.warmth,
    `${where}: ${row.personId}'s view of ${row.officialId}`,
  ).toBeCloseTo(warmth, 6);
  // And the counted appeal moves by it, one reading against none.
  const field = [
    {
      id: row.officialId,
      side: 0,
      isIncumbent: true,
      standing: 0,
      localStanding: 0,
      recognition: 0,
      platform: [],
    },
  ];
  const away = { inTown: true, local: true, incumbentLean: 0 };
  const without = countedAppeal(0, field, away)[row.officialId]!;
  const read = countedAppeal(0, field, {
    ...away,
    warmths: { [row.officialId]: warmth },
  })[row.officialId]!;
  expect(read.total - without.total, where).toBeCloseTo(warmth, 6);
}, 900_000);

it("a real election's counted ballots carry the warmth, up for a helped case and down for a declined one", () => {
  const seed = "kw-6";
  const place = drawPlace(seed, "case-warmth");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const seen = new Set<string>();
  const ups: string[] = [];
  const downs: string[] = [];
  // The ballots are kept for a while after each count: read them as they come.
  for (let month = 0; month < 26; month += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    for (const contest of api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as { id: string }[]) {
      if (seen.has(contest.id)) continue;
      const ballots = countedBallotsOf(api, contest.id);
      if (!ballots.length) continue;
      seen.add(contest.id);
      for (const ballot of ballots)
        for (const [candidateId, appeal] of Object.entries(ballot.appeal)) {
          const warmth = appeal.warmth ?? 0;
          if (!warmth) continue;
          // The ballot's warmth is what this resident's decided cases with
          // the candidate leave, at the share of the record who brought them.
          const cases = allCases(api).filter(
            (c) =>
              c.personId === ballot.voterId &&
              c.officialId === candidateId &&
              c.status !== "open",
          );
          expect(
            cases.length,
            `${where}: ${ballot.id} to ${candidateId}`,
          ).toBeGreaterThan(0);
          const full = caseWarmthsOf(api, ballot.voterId)[candidateId]!;
          expect(Math.sign(warmth), `${where}: ${ballot.id}`).toBe(
            Math.sign(full),
          );
          expect(Math.abs(warmth)).toBeLessThanOrEqual(Math.abs(full) + 1e-9);
          (warmth > 0 ? ups : downs).push(
            `${ballot.id} -> ${candidateId} ${warmth.toFixed(3)}`,
          );
          // Without it the appeal is lower (or higher) by exactly that much.
          const without = countedAppeal(
            ballot.lean,
            [
              {
                id: candidateId,
                side: 0,
                isIncumbent: false,
                standing: 0,
                localStanding: 0,
                recognition: 0,
                platform: [],
              },
            ],
            { inTown: true, local: true, incumbentLean: 0 },
          )[candidateId]!;
          const withIt = countedAppeal(
            ballot.lean,
            [
              {
                id: candidateId,
                side: 0,
                isIncumbent: false,
                standing: 0,
                localStanding: 0,
                recognition: 0,
                platform: [],
              },
            ],
            {
              inTown: true,
              local: true,
              incumbentLean: 0,
              warmths: { [candidateId]: warmth },
            },
          )[candidateId]!;
          expect(withIt.total - without.total).toBeCloseTo(warmth, 9);
        }
    }
  }
  expect(
    ups.length,
    `${where}: ballots warmed by a helped case`,
  ).toBeGreaterThan(0);
  expect(
    downs.length,
    `${where}: ballots cooled by a declined case`,
  ).toBeGreaterThan(0);
}, 3_600_000);
