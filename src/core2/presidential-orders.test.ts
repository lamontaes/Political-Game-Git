/**
 * The president's executive order (pool item
 * office-presidential-orders-pardons-the-situation-room): the federal pay
 * floor is a federal law row, in force the next day, that the public pay floor
 * review reads for the federal government's own employers in the town: a
 * federal job paid under it is raised through `rerateJob`, and a state job is
 * not. A place is drawn from all 56 on a seed nobody chose (set
 * PRESIDENTIAL_ORDERS_SEED to repeat one); a draw with no federal job paid
 * under the floor is skipped, and the test fails if none is found.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { jobsAt } from "./law-reach/group-b-money";
import { advanceCore } from "./life";
import { lawInForce } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  issuePresidentialOrder,
  pendingPresidentialOrders,
} from "./modules/executive";
import { PUBLIC_PAY_FLOOR } from "./public-pay-floor";
import { presidentialOrders } from "./office-day-federal-president";
import { coreAPI } from "./state";

const seed =
  process.env.PRESIDENTIAL_ORDERS_SEED ?? randomBytes(8).toString("hex");
const FEDERAL = ["sector:federal-government-office"];
const STATE = ["sector:state-government-office"];
const yearly = (wageDailyMinor: number) => (wageDailyMinor * 365) / 100;

it("the federal pay floor order raises federal jobs paid under it and no state job", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 40; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "presidential-orders");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    expect(presidentialOrders()).toContain("federal-pay-floor");
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId;
    const floor = 15 * 2080;
    const under = jobsAt(api, FEDERAL).filter(
      (j) => yearly(j.wageDailyMinor) < floor,
    );
    if (!president || !under.length) {
      tried.push(
        `${where}: ${president ? "no job under the floor" : "no president"}`,
      );
      continue;
    }
    const stateBefore = new Map(
      jobsAt(api, STATE).map((j) => [j.id, j.wageDailyMinor] as const),
    );
    const before = new Map(under.map((j) => [j.id, j.wageDailyMinor] as const));
    // Whatever the character would order from their own views is a read of the same records.
    pendingPresidentialOrders(api, president);
    const { lawId, orderId } = issuePresidentialOrder(api, {
      executiveId: president,
      order: "federal-pay-floor",
    });
    expect(orderId, where).toBe(
      `order:US:federal-pay-floor:${world.core.date}`,
    );
    const date = new Date(
      Date.parse(`${world.core.date}T00:00:00Z`) + 3 * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    advanceCore(world.core, date);
    const federal = lawInForce(api, PUBLIC_PAY_FLOOR).levels.find(
      (l) => l.level === "federal",
    )?.row;
    expect(federal?.id, where).toBe(lawId);
    expect(federal?.terms?.executiveOrder, where).toBe(true);
    const after = new Map(
      jobsAt(api, FEDERAL).map((j) => [j.id, j.wageDailyMinor] as const),
    );
    const raised = [...before].filter(
      ([id, was]) => (after.get(id) ?? 0) > was,
    );
    expect(raised.length, `${where}: a federal job was raised`).toBeGreaterThan(
      0,
    );
    for (const [id, was] of before)
      if (after.has(id))
        expect(
          yearly(after.get(id)!),
          `${where}: ${id} from ${yearly(was)}`,
        ).toBeGreaterThanOrEqual(floor * 0.99);
    // The order binds the federal government's own employers only.
    for (const job of jobsAt(api, STATE))
      if (stateBefore.has(job.id))
        expect(job.wageDailyMinor, `${where}: ${job.id}`).toBeLessThanOrEqual(
          stateBefore.get(job.id)! * 1.2,
        );
    console.log(
      `${where}: order ${orderId}, law ${lawId}, raised ${raised.map(([id]) => id).join(", ")}`,
    );
    return;
  }
  throw new Error(
    `no federal job under the floor in 40 places: ${tried.join("; ")}; ${seed}`,
  );
}, 1_800_000);
