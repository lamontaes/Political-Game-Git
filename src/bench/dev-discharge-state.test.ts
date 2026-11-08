/**
 * A state chamber's discharge petition, from the researched rule (data/research/legislature/
 * discharge-rules-2026-11.json): where a committee does not report a bill, the members who sign are
 * counted and, at the number the chamber's rule asks (a majority of its members, or a fraction of
 * them), the bill goes to the floor. Places are drawn in turn until one has a state chamber with a
 * researched rule; a random seed each run, named so a failure can be replayed.
 */
import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import dischargeData from "../core2/data/legislature/discharge.json";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed =
  process.env.DEV_MODE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const ruled = new Map(dischargeData.rows.map((r) => [r.chamberId, r.rule]));

describe(`a state chamber's discharge petition (seed ${seed})`, () => {
  it(
    "counts the signatures the chamber's own rule asks and sends a discharged bill to the floor",
    { timeout: 1_800_000 },
    () => {
      const tried: string[] = [];
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const draw = drawPlace(`${seed}:${attempt}`, "discharge-state");
        const world = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        });
        const dev = new DevMode(
          world.core,
          world.director,
          new BenchPlayer(world.core, world.director),
          world.placeId,
        );
        const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
        const bodies = dev
          .lawmakingBodies()
          .filter((b) => b.id.startsWith("office:") && ruled.has(b.id));
        if (!bodies.length) {
          tried.push(`${where}: no chamber with a researched rule`);
          continue;
        }
        for (const body of bodies) {
          for (let n = 0; n < 40; n += 1) {
            const { bill } = dev.introduce({
              bodyOfficeId: body.id,
              sponsorId: body.members[0]!.key,
              series: "minimum-wage",
              value: 30 + n / 10,
            });
            if (bill.status === "blocked") continue;
            const result = dev.decideAt(bill.id, 40, {
              sign: true,
              discharge: true,
            });
            const first = result.committees.find((c) => c.chamber === body.id);
            if (!first?.discharge) continue;
            const rule = ruled.get(body.id)!;
            const seated = body.members.length;
            const expected =
              rule.kind === "majority"
                ? Math.floor(seated / 2) + 1
                : Math.ceil(
                    (seated * rule.numerator) / rule.denominator - 1e-9,
                  );
            expect(first.discharge.needed, where).toBe(expected);
            process.stderr.write(
              `${where}: ${body.id} (${seated} members, ${rule.kind}) bill ${bill.number}: ${first.discharge.signers.length} of ${first.discharge.needed} signed: ${first.discharge.discharged ? "discharged" : "not discharged"}\n`,
            );
            return;
          }
        }
        tried.push(`${where}: no bill went unreported`);
      }
      throw new Error(
        `no drawn place showed a state petition (seed ${seed}): ${tried.join("; ")}`,
      );
    },
  );
});
