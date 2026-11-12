import { randomBytes } from "node:crypto";
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
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "card-officeholder-work");

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
    // The seat's own job: its organization is the office's.
    if (
      !work.offices.some(
        (office) => office.organizationId === job.organizationId,
      )
    )
      continue;
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
}, 600_000);
