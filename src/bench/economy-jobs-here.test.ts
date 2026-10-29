/**
 * News's "Jobs here" line counts the town (play-stop-09-jobs-here-count-too-high):
 * in a random place from all 56, the town as the player gets it, six days in,
 * the employed are the town's own residents at work, never more than its
 * people aged 16 and over, and the open count is its employers' open
 * positions. It used to add every full person's job in the country to one per
 * counted job record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { countedResidents } from "../core2/electorate";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PositionRow } from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import { economyView } from "./economy";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("counts the town's own workers, seekers and openings", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "bench-jobs-here");
  const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 6));
  const jobs = economyView(core, placeId).jobs!;
  // The town's people aged 16 and over, a counted resident for its weight.
  const adult = (birthDate: string) => ageOnDate(birthDate, core.date) >= 16;
  let adults = 0;
  for (const person of core.people.values())
    if (person.alive && person.placeId === placeId && adult(person.birthDate))
      adults += 1;
  for (const row of countedResidents(core))
    if (row.placeId === placeId && adult(row.birthDate)) adults += row.weight;
  const open = (
    coreAPI(core)
      .moduleState("jobs")
      .table("positions")
      .query("byStatus", ["open"]) as unknown as PositionRow[]
  )
    .filter(
      (row) => core.organizations.get(row.organizationId)?.placeId === placeId,
    )
    .reduce((n, row) => n + (row.heads ?? 1), 0);
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}, ${core.date}`;
  process.stdout.write(
    `jobs here: ${where}: ${jobs.employed} employed, ${jobs.seekers} looking, ${jobs.openPositions} open; ${adults} people aged 16 and over\n`,
  );
  expect(jobs.employed, where).toBeGreaterThan(0);
  expect(jobs.employed, where).toBeLessThanOrEqual(adults);
  expect(jobs.seekers, where).toBeLessThanOrEqual(adults);
  expect(jobs.openPositions, where).toBe(open);
}, 600_000);
