/**
 * The played town and its county are part of their state's sums, counted once
 * (core-country-tier-town-joins-its-state-part-4): each month the state's
 * cells give up the part the town's own records count, the rest steps, and the
 * state's figures are the rest and the town. Twin worlds: the town's largest
 * employer closes in one, and a month later its state's jobs read lower by
 * about that employer's jobs.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { traceNode } from "../bench/dev-trace";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { countryProblems, type CountryTier } from "./country-model";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ownerOf } from "./modules/business";
import { countryStateParts, countryStates } from "./modules/macro";
import {
  residentCounts,
  residentsAccountFor,
  residentsRuntime,
} from "./modules/residents";
import { isDemoted } from "./counted-groups";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const say = (line: string) => process.stdout.write(`${line}\n`);

/** The town's employers with open books, by the jobs their staff hold today (a counted job stands for its heads). */
function employersByHeads(core: CoreState, places: ReadonlySet<string>) {
  const heads = new Map<string, number>();
  const rt = residentsRuntime(core)!;
  for (const h of rt.store.liveHouseholds())
    for (const job of h.jobs) {
      const flow = rt.wageFlowByJob.get(job.id);
      if (job.endsAt !== undefined || !flow || flow.endedAt) continue;
      heads.set(
        job.organizationId,
        (heads.get(job.organizationId) ?? 0) + rt.store.headsOfJob(h, job.id),
      );
    }
  for (const job of core.jobs.values())
    if (job.endsAt === undefined && core.people.get(job.personId)?.alive)
      heads.set(job.organizationId, (heads.get(job.organizationId) ?? 0) + 1);
  return [...heads]
    .filter(([id]) => {
      const book = core.finance.businesses.get(id);
      const org = core.organizations.get(id);
      return book && !book.closedAt && org && places.has(org.placeId);
    })
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function twin(placeSeed: string, placeKey: string) {
  setBookkeeping(false);
  return buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  }).core;
}

it("counts the town inside its state once, and its state's jobs follow the town's", () => {
  for (const draw of [0, 1]) {
    const place = drawPlace(`${seed}:${draw}`, "country-town-part");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const open = twin(place.seed, place.key);
    const closed = twin(place.seed, place.key);
    // The town and its county: the residents engine's places that are places of the drawn state.
    const key = place.state;
    const places = new Set(
      residentsRuntime(open)!
        .input.accounts.map((row) => row.placeId)
        .filter((id) => placeStateKey(id) === key),
    );
    expect(
      places.size,
      `${where}: no place of ${key} is held in full`,
    ).toBeGreaterThan(0);
    const start = makeIsoDate(open.date);
    // Past two months' first days, so the part has come out and gone back in twice.
    const before = addDays(start, 45);
    for (const core of [open, closed]) advanceCore(core, before);
    const parts = countryStateParts(coreAPI(open), key)!;
    say(
      `${where}: ${key} on ${open.date}, counted for ${parts.month}: people ${Math.round(parts.total.people)} = town and county ${Math.round(parts.part.people)} + rest ${Math.round(parts.rest.people)}; jobs ${Math.round(parts.total.jobs)} = ${Math.round(parts.part.jobs)} + ${Math.round(parts.rest.jobs)}`,
    );
    // The part is the places' own people: the residents engine's counts and the full people living there.
    const row = coreAPI(open)
      .moduleState("macro")
      .table("countryParts")
      .get(`country-part:${key}`) as unknown as {
      month: string;
      workers: number[];
      seekers: number[];
    };
    let people = 0;
    for (const counts of residentCounts(open))
      if (places.has(counts.placeId)) people += counts.people;
    for (const person of open.people.values())
      if (person.alive && !isDemoted(person) && places.has(person.placeId))
        people += 1;
    const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);
    say(
      `${where}: the part counted ${Math.round(sum(row.workers))} at work and ${Math.round(sum(row.seekers))} looking; the residents engine and full people count ${Math.round(people)} people there`,
    );
    expect(
      Math.abs(parts.part.people - people),
      `${where}: part ${parts.part.people} people against ${people} counted on ${open.date}`,
    ).toBeLessThanOrEqual(people * 0.01);
    expect(parts.partId, `${where}: no part row for ${key}`).toBe(
      `country-part:${key}`,
    );
    expect(
      parts.part.people,
      `${where}: the part holds no people`,
    ).toBeGreaterThan(0);
    expect(parts.part.jobs, `${where}: the part holds no jobs`).toBeGreaterThan(
      0,
    );
    expect(
      countryProblems({
        states: [...countryStates(coreAPI(open))],
      } as CountryTier),
      `${where}: the tier holds counts that cannot be`,
    ).toEqual([]);
    // Dev mode's trace on the state's record shows the part and the rest, and they add to the state.
    const node = traceNode(open, undefined, `country-state:${key}`);
    for (const title of ["People", "Jobs"] as const) {
      const panel = node.why.find(
        (row) =>
          row.title.startsWith(`${title} in `) &&
          row.title.endsWith(": the played places and the rest"),
      );
      expect(
        panel,
        `${where}: the trace shows no ${title} panel`,
      ).toBeDefined();
      const [state, town, rest] = panel!.rows.map((row) =>
        Number(String(row.value).replace(/,/g, "")),
      );
      expect(panel!.rows[1]!.id, `${where}: ${title} part row`).toBe(
        `country-part:${key}`,
      );
      expect(
        Math.abs(town! + rest! - state!),
        `${where}: ${title} ${town} + ${rest} against ${state}`,
      ).toBeLessThanOrEqual(1);
    }
    // The largest employer closes in one twin, the way an owner closes it.
    const [largest, heads] = employersByHeads(closed, places)[0] ?? [];
    expect(largest, `${where}: no employer with open books`).toBeDefined();
    const api = coreAPI(closed);
    const owner = ownerOf(api, largest!);
    const org = closed.organizations.get(largest!)!;
    api.closeBusinessByChoice({
      organizationId: largest!,
      ownerAccountId:
        owner && closed.people.has(owner)
          ? api.accounts().main(owner)
          : residentsAccountFor(closed, org.placeId)!,
      reasonKey: "losses",
      source: {
        tag: "ESTIMATED",
        asOf: closed.date,
        citation: "A test closes the town's largest employer.",
        estimatedFrom: `${largest} closed with ${heads} jobs.`,
      },
    });
    const after = addDays(makeIsoDate(open.date), 31);
    for (const core of [open, closed]) advanceCore(core, after);
    const jobs = (core: CoreState) =>
      countryStateParts(coreAPI(core), key)!.total.jobs;
    const lower = jobs(open) - jobs(closed);
    say(
      `${where}: ${org.name} (${largest}) closed with ${heads} jobs; a month later ${key} has ${Math.round(jobs(open))} jobs beside ${Math.round(jobs(closed))}, ${Math.round(lower)} fewer`,
    );
    // About the employer's jobs: some of its workers find work elsewhere in the town within the month.
    expect(
      lower,
      `${where}: ${key} jobs lower by ${lower}, employer had ${heads}`,
    ).toBeGreaterThan(heads! / 2);
    expect(
      lower,
      `${where}: ${key} jobs lower by ${lower}, employer had ${heads}`,
    ).toBeLessThan(heads! * 1.5);
  }
}, 1_800_000);
