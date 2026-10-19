/**
 * An outlet's revenue follows its audience (pool item gov-press-outlet-revenue,
 * the subscriptions half): the standing outside-sales flow is re-sized each
 * month to what the audience and the outlet's people cost are now, instead of
 * staying at its opening amount. A random place from all 56 whose town has
 * local outlets.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  outletCapacityMinor,
  outletsHere,
  pressParameter,
} from "./modules/press";
import { resizeOutletRevenue } from "./press-money";
import { outsideSalesBaseOf } from "./residents-economy";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("re-sizes a local outlet's revenue to its audience each month", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-money");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const rt = residentsRuntime(core);
    const flowOf = (organizationId: string) =>
      rt?.flows.get(`outside-sales:press:${organizationId}`);
    const local = outletsHere(api).filter(
      (o) => o.tier === "local" && flowOf(o.organizationId),
    );
    if (!local.length) continue;
    const where = `${place.name}, seed ${seed}:${draw}`;
    const periodsPerYear = (organizationId: string) => {
      const cadence = flowOf(organizationId)!.cadence;
      return cadence.kind === "months"
        ? pressParameter("monthsPerYear") / cadence.every
        : pressParameter("daysPerYear") / cadence.every;
    };
    // The first monthly review (the first week of a month) leaves each flow at
    // the outlet's capacity as the audience stands then.
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    for (const outlet of outletsHere(api).filter((o) => o.tier === "local")) {
      const flow = flowOf(outlet.organizationId);
      if (!flow) continue;
      const base = outsideSalesBaseOf(core, flow.id);
      expect(base, `${where}, ${outlet.id}: base kept`).toBeDefined();
      expect(
        Math.abs(
          base! * periodsPerYear(outlet.organizationId) -
            outletCapacityMinor(api, outlet),
        ),
        `${where}, ${outlet.id}`,
      ).toBeLessThanOrEqual(periodsPerYear(outlet.organizationId));
    }
    // A smaller audience pays less, a larger one more: the flow is the
    // yearly amount over its periods.
    const first = local[0]!;
    const before = flowOf(first.organizationId)!.amountMinor;
    const baseBefore = outsideSalesBaseOf(
      core,
      flowOf(first.organizationId)!.id,
    )!;
    resizeOutletRevenue(api, {
      organizationId: first.organizationId,
      annualMinor: Math.round(
        before * periodsPerYear(first.organizationId) * 2,
      ),
      monthsPerYear: pressParameter("monthsPerYear"),
      daysPerYear: pressParameter("daysPerYear"),
    });
    const flow = flowOf(first.organizationId)!;
    expect(outsideSalesBaseOf(core, flow.id), where).toBeCloseTo(before * 2, 0);
    // The nation's scaling and output limit stay applied on top of the new base.
    expect(
      flow.amountMinor / outsideSalesBaseOf(core, flow.id)!,
      where,
    ).toBeCloseTo(before / baseBefore, 3);
    return;
  }
  throw new Error(`No town with local outlets: ${tried.join("; ")}`);
}, 3_600_000);
