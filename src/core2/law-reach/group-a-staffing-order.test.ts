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
import { residentsRuntime } from "../modules/residents";
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
    const rt = residentsRuntime(core);
    const employer = [...core.organizations.values()].find((o) => {
      const counted = [...(rt?.jobs.values() ?? [])].filter(
        (j) => j.organizationId === o.id && j.endsAt === undefined,
      );
      return counted.length >= 3 && layoffOrder(api, o.id).length >= 3;
    });
    if (!employer) {
      tried.push(`${where}: no employer with counted staff`);
      continue;
    }
    return { where, core, api, employerId: employer.id };
  }
  throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
}

it("layoffs go to the newest hire across both tiers, and filling one in does not move anyone", () => {
  const { where, core, api, employerId } = drawTown();
  const order = layoffOrder(api, employerId);
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
