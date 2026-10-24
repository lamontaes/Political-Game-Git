/**
 * A counted claimant's award leaves town with them (pool item
 * world-counted-claim-pays-after-household-leaves; one model, two tiers).
 * An award a counted person claims in play is its own residents flow, not one
 * of the household's income contracts, so when the counted moves engine
 * moved the household away the award kept paying the residents account of the
 * town they left. In a played year of a drawn place, every such claimant's
 * award must end on the day their household moves out. A place where no
 * claimant's household moves away is drawn again, a bounded number of times;
 * set COUNTED_CLAIM_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves } from "./modules/counted-moves";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const ATTEMPTS = 6;
const PREFIX = "retirement-claim:";

it("a counted claimant's award ends on the day their household moves away", () => {
  const base = process.env.COUNTED_CLAIM_SEED ?? randomBytes(8).toString("hex");
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed = `${base}:${attempt}`;
    const place = drawPlace(seed, "counted-claim-departure");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const rt = residentsRuntime(core)!;
      // Each in-play counted claim and the household its claimant lives in,
      // read while they are still counted (the scan runs each month).
      const homeOf = new Map<
        string,
        { personId: string; householdId: string }
      >();
      const scan = () => {
        for (const flow of rt.flows.values()) {
          if (flow.kind !== "retirement" || !flow.id.startsWith(PREFIX))
            continue;
          if (homeOf.has(flow.id)) continue;
          const personId = flow.id.slice(PREFIX.length).split(":")[0]!;
          const person = residentPerson(core, personId);
          if (person)
            homeOf.set(flow.id, { personId, householdId: person.householdId });
        }
      };
      const end = addDays(makeIsoDate(core.date), 365);
      while (core.date < end) {
        advanceCore(core, addDays(makeIsoDate(core.date), 28));
        scan();
      }
      const outs = new Map(
        countedMoves(api)
          .filter((m) => m.direction === "out")
          .map((m) => [m.householdId, m] as const),
      );
      const left = [...homeOf].filter(([, h]) => outs.has(h.householdId));
      if (!left.length) {
        passed.push(
          `${where}: ${homeOf.size} counted claims in play, none whose household moved away`,
        );
        continue;
      }
      for (const [flowId, { householdId }] of left) {
        const flow = rt.flows.get(flowId)!;
        const move = outs.get(householdId)!;
        expect(flow.endedAt, `${where}: ${flowId} after ${move.id}`).toBe(
          move.date,
        );
        expect(flow.endedReason, `${where}: ${flowId}`).toBe("household-left");
      }
      const [flowId, { personId, householdId }] = left[0]!;
      const move = outs.get(householdId)!;
      console.log(
        `COUNTED-CLAIM ${where}: ${left.length} of ${homeOf.size} counted claims in play left town with their household; ${flowId} (${personId}) ended on ${rt.flows.get(flowId)!.endedAt}, the day of ${move.id}; passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    } finally {
      setBookkeeping(was);
    }
  }
  throw new Error(
    `No drawn place had a counted claimant's household move away: ${passed.join("; ")}`,
  );
}, 3_600_000);
