/**
 * A new life's town holds the county's kinds of work and has jobs a player
 * can be offered (pool: core-town-jobs-are-mostly-markets-and-kitchens).
 * In two drawn places, built as the game builds a new life:
 *
 * - every job outside the town is a real role of the county's work (no
 *   fill-in title), with its occupation recorded;
 * - where the county employs anyone in health care, the town holds health
 *   jobs (a clinic or a care home), and its jobs span at least five kinds of
 *   workplace;
 * - open positions stand on the books from the first week, and at least one
 *   has waited out its industry's vacancy duration (so it can be filled, and
 *   a player who applies can be offered it) within three weeks.
 *
 * A place whose employers carry too few staff for a single standing opening
 * is passed over by name, and the next draw is taken.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { fillableOpenings, JOBS_MODULE_ID } from "./modules/jobs";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { countedJobsOf } from "./residents-economy";
import { publishedTownWorkplaceWeights } from "./town-employment-mix";
import { TOWN_WORKPLACES } from "./town-workplaces";
import type { EntityId } from "./kernel/brands";

const HEALTH = new Set(["hospital", "clinic", "care-home"]);
const ROLE_TITLES = new Set(
  TOWN_WORKPLACES.flatMap((place) => place.roles.map((role) => role.title)),
);
const WEEKS = 3;

it("opens a town with the county's kinds of work and openings a player can be offered", () => {
  const seed = process.env.TOWN_JOBS_SEED ?? randomBytes(8).toString("hex");
  setBookkeeping(false);
  const passed: string[] = [];
  let checked = 0;
  for (let draw = 0; draw < 6 && checked < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "town-jobs-real-work");
    const where = `${place.name} [${place.key}], seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const town = world.placeId;

    // Work outside the town is a real role, with its occupation.
    const outside = new Set(
      [...core.organizations.values()]
        .filter((row) => row.kind === OUTSIDE_MARKET_KIND)
        .map((row) => row.id),
    );
    for (const job of core.jobs.values()) {
      if (job.endsAt !== undefined || !outside.has(job.organizationId))
        continue;
      expect(
        ROLE_TITLES.has(job.title) && !!job.occupationClassification,
        `${where}: job ${job.id} outside the town is titled "${job.title}"`,
      ).toBe(true);
    }

    // The town's kinds of work, from its employers' staff.
    const kinds = new Set<string>();
    for (const org of core.organizations.values()) {
      if (org.placeId !== town) continue;
      const kind = TOWN_WORKPLACES.find(
        (row) => row.classification === org.classification,
      )?.key;
      if (!kind) continue;
      const staffed =
        countedJobsOf(core, org.id).length > 0 ||
        [...(core.finance.jobsByOrganization.get(org.id) ?? [])].some(
          (id) => core.jobs.get(id)?.endsAt === undefined,
        );
      if (staffed) kinds.add(kind);
    }
    const county = publishedTownWorkplaceWeights(town as EntityId);
    const countyHealth = [...HEALTH].some((key) => (county.get(key) ?? 0) > 0);
    expect(
      kinds.size,
      `${where}: kinds of work in town ${[...kinds].join(", ")}`,
    ).toBeGreaterThanOrEqual(5);
    if (countyHealth)
      expect(
        [...HEALTH].some((key) => kinds.has(key)),
        `${where}: the county employs people in health care, the town's kinds are ${[...kinds].join(", ")}`,
      ).toBe(true);

    // Openings from the first week; one due to be filled within three.
    const api = coreAPI(core);
    const inTown = (rows: readonly { placeId: string }[]) =>
      rows.filter((row) => row.placeId === town).length;
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const firstWeek = inTown(
      api
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .query("byStatus", ["open"]) as unknown as { placeId: string }[],
    );
    if (firstWeek === 0) {
      passed.push(`${where}: no standing opening in town on ${core.date}`);
      continue;
    }
    let due = 0;
    for (let week = 1; week < WEEKS && due === 0; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      // Due today, or already filled by a seeker in the weekly matching.
      due =
        inTown(fillableOpenings(api)) +
        inTown(
          api
            .moduleState(JOBS_MODULE_ID)
            .table("positions")
            .query("byStatus", ["filled"]) as unknown as { placeId: string }[],
        );
    }
    expect(
      due,
      `${where}: ${firstWeek} openings in the first week, none due or filled by ${core.date}`,
    ).toBeGreaterThan(0);
    console.log(
      `town-jobs-real-work: ${where}: ${kinds.size} kinds of work (${[...kinds].join(", ")}), ${firstWeek} openings in the first week, ${due} due or filled by ${core.date}`,
    );
    checked += 1;
  }
  expect(
    checked,
    `places checked; passed over: ${passed.join("; ") || "none"}`,
  ).toBe(2);
}, 900_000);
