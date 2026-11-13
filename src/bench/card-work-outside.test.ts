import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";

// The market's stand-in for work out of town ("Buyers and sellers outside the
// town") is never told as an employer on a card: a person whose work is there
// works outside the town they live in (skill words-engine). Fails on "Works as
// works outside the town at Buyers and sellers outside the town."
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "card-work-outside");

it(`a card tells work out of town as work outside the town, ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} (${place.key}), seed ${seed}`;
  let told = 0;
  for (const person of core.people.values()) {
    if (!person.alive || person.id === playerId || !person.jobId) continue;
    const job = core.jobs.get(person.jobId);
    if (!job || !core.organizations.get(job.organizationId)?.outsideFlow)
      continue;
    const summary = knownCard(core, playerId!, person.id).summary.join(" ");
    const here = `${where}: ${person.givenName} ${person.familyName}`;
    expect(summary, here).not.toMatch(/outside the town at|Works as works/);
    if (/Works outside /.test(summary)) told += 1;
  }
  expect(told, `${where}: no card told work outside the town`).toBeGreaterThan(
    0,
  );
}, 600_000);
