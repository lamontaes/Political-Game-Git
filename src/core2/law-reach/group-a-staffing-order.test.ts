/**
 * The staffing reach lets staff go by one rule across named and counted people
 * (one model, two tiers): the newest hire first, whichever tier. Filling a
 * counted person in does not move them in the order. Hiring is the jobs
 * engine's own matching, which ranks named and counted seekers together. A place is drawn from
 * all 56 on a seed nobody chose (STAFFING_ORDER_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { countedJobsOf } from "../residents-economy";
import { coreAPI, fillInPerson } from "../state";
import { layoffOrder } from "./group-a-staffing";

const seed = process.env.STAFFING_ORDER_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

/** A drawn town with counted adults and an employer with counted staff, or the reasons it failed. */
function drawTown() {
  const tried: string[] = [];
  for (let draw = 0; draw < 25; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "staffing-order");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The employer is chosen from the staff records alone (named current jobs
    // and counted jobs); layoffOrder is what the test then proves.
    const staffOf = (organizationId: string) =>
      new Set([
        ...[...core.jobs.values()]
          .filter(
            (j) =>
              j.organizationId === organizationId &&
              j.endsAt === undefined &&
              core.people.has(j.personId),
          )
          .map((j) => j.id),
        ...countedJobsOf(core, organizationId).map((j) => j.id),
      ]);
    const employer = [...core.organizations.values()].find(
      (o) => countedJobsOf(core, o.id).length >= 3 && staffOf(o.id).size >= 3,
    );
    if (!employer) {
      tried.push(`${where}: no employer with counted staff`);
      continue;
    }
    return {
      where,
      core,
      api,
      employerId: employer.id,
      staff: staffOf(employer.id),
    };
  }
  throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
}

it("layoffs go to the newest hire across both tiers, and filling one in does not move anyone", () => {
  const { where, core, api, employerId, staff } = drawTown();
  const order = layoffOrder(api, employerId);
  // The order is complete: every staff record once, none missing or extra.
  expect(order.length, `${where}: order at ${employerId}`).toBe(staff.size);
  expect(new Set(order.map((s) => s.jobId)), where).toEqual(staff);
  process.stdout.write(
    `staffing order: ${where}: ${employerId}: ${order.map((s) => `${s.jobId}${s.counted ? "*" : ""}@${s.startsAt}`).join(", ")}\n`,
  );
  for (let i = 1; i < order.length; i += 1)
    expect(
      order[i]!.startsAt <= order[i - 1]!.startsAt,
      `${where}: ${order[i]!.jobId} (${order[i]!.startsAt}) laid off after ${order[i - 1]!.jobId} (${order[i - 1]!.startsAt})`,
    ).toBe(true);
  const counted = order.slice(0, 6).filter((s) => s.counted);
  expect(counted.length, `${where}: counted staff`).toBeGreaterThan(0);
  for (const s of counted) fillInPerson(core, s.personId);
  expect(
    layoffOrder(api, employerId).map((s) => s.jobId),
    where,
  ).toEqual(order.map((s) => s.jobId));
}, 600_000);
