/**
 * Offices are not held together: a town's department head is never someone
 * who sits in a seat the town elects (a council member, the mayor, a county
 * commissioner). A commissioner named city clerk had the clerk's payroll job
 * ended the day it began by the seat's own full-time job. Played world, in
 * places drawn from all 56; place and seed in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("no department head is appointed from a seat the town elects", () => {
  const { world, place } = worldWith(seed, "appointee-seat", (w) => {
    const api = coreAPI(w.core);
    return appointmentsIn(api, lawChain(api).townPlaceId).length > 0;
  });
  const api = coreAPI(world.core);
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const seated = new Set(
    townSeats(api).flatMap((s) =>
      s.holder?.personId && s.holder.status === "serving"
        ? [s.holder.personId]
        : [],
    ),
  );
  const appointed = appointmentsIn(api, lawChain(api).townPlaceId);
  expect(appointed.length, where).toBeGreaterThan(0);
  for (const row of appointed)
    expect(seated.has(row.holderId), `${where}: ${row.post}`).toBe(false);
}, 900_000);
