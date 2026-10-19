/** Generated play evidence: a counted worker who retires is paid the award the retirement-claims engine sizes, not their place's average. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { retirementClaims } from "./modules/retirement-claims";
import { residentsRuntime } from "./modules/residents";

it("pays each counted worker who retired their own claim, once, and no place-average flow", () => {
  const draw = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex"),
    "world-jobs-counted-retiree-income",
  );
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    for (let day = 0; day < 365; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const retired = (
      api.moduleState(JOBS_MODULE_ID).table("changes").rows() as unknown as {
        kind: string;
        personId: string;
        id: string;
      }[]
    ).filter((row) => row.kind === "left-work");
    const flows = [...residentsRuntime(core)!.flows.values()];
    // No flow carries a place average for retirees added in play.
    expect(
      flows.filter((f) => f.id.startsWith("residents:retirement:added:")),
      where,
    ).toEqual([]);
    const claims = retirementClaims(core);
    for (const row of retired) {
      const claim = claims.get(row.personId);
      // A retiree under the claim engine's minimum of covered work has no award.
      if (!claim) continue;
      const own = flows.find(
        (f) => f.id === `retirement-claim:${row.personId}`,
      );
      if (claim.counted)
        expect(own?.amountMinor, `${where}: ${row.id}`).toBe(
          claim.monthlyMinor,
        );
    }
    console.log(where, {
      retired: retired.length,
      claimed: retired.filter((r) => claims.has(r.personId)).length,
    });
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
