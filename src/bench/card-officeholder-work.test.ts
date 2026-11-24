import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { personWorkOf } from "../core2/person-work";

// An officeholder's card tells the office from the office record, never the
// seat's own pay record as a job at an employer ("Works as president at US.",
// Fable A on #8928, Nov 12). Fails when a seat's job is told as work.
// Pinned (Nov 16, trial batch). Before, the seed came at run time from
// process.env GOLDEN_PATH_SEED or randomBytes, so the places it drew changed
// every run. The fixed seed below draws Alleene, Arkansas (0500820) first for
// "card-officeholder-work".
// Limit: the slowest case took 21 s, run two files at a time (Nov 16,
// Train 6d12556a); each case's limit is about twice that, 50 s.
const seed = "pin-card-officeholder-work";
const place = drawPlace(seed, "card-officeholder-work");

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(seed, "card-officeholder-work")).toMatchObject({
    key: "0500820",
    name: "Alleene, Arkansas",
  });
});

it(`an officeholder's card tells the office, not the seat's pay as a job, ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} (${place.key}), seed ${seed}`;
  let told = 0;
  for (const person of core.people.values()) {
    if (!person.alive || person.id === playerId || !person.jobId) continue;
    const work = personWorkOf(core, person.id);
    if (!work.offices.length) continue;
    const job = core.jobs.get(person.jobId)!;
    // The seat's own pay: a job at a government itself (its treasury, or the
    // federal government), which is no employer a card names.
    const kind = core.organizations.get(job.organizationId)?.kind ?? "";
    if (!/^government-(treasury|outside)$/.test(kind)) continue;
    const card = knownCard(core, playerId!, person.id);
    const here = `${where}: ${person.givenName} ${person.familyName}`;
    expect(work.job, here).toBeNull();
    expect(card.summary.join(" "), here).not.toMatch(/\bWorks as\b/);
    told += 1;
  }
  // Every world seats a President, whose own job is the seat's.
  expect(told, `${where}: no officeholder with a seat's job`).toBeGreaterThan(
    0,
  );
}, 50_000);
