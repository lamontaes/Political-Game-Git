/**
 * A laid-off worker's unemployment benefit is paid from the state's fund: the
 * state treasury, which the employers' state unemployment tax pays into (pool
 * item world-stopgap-jobs-missing-mechanic). A place is drawn from all 56 on
 * a seed nobody chose (UI_FUND_SEED pins one). The claim is a controlled
 * fixture on a real worker of the played world; the payment is the engine's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { fileClaim, payClaims, unemploymentTerms } from "./jobs-benefits";
import { governments } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.UI_FUND_SEED ?? randomBytes(8).toString("hex");

it("pays the benefit from the state treasury", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ui-state-fund");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = governments(api).find((g) => g.level === "state");
    if (!state || !unemploymentTerms(api).hasProgram) {
      tried.push(`${where}: no state treasury or program`);
      continue;
    }
    const claims = api.moduleState("jobs").table("claims");
    // The first worker in town whose lost job qualifies and who files.
    let claim: ReturnType<typeof fileClaim>;
    for (const job of core.jobs.values()) {
      if (
        job.endsAt !== undefined ||
        job.wageDailyMinor <= 0 ||
        core.people.get(job.personId)?.placeId !== lawChain(api).townPlaceId
      )
        continue;
      claim = fileClaim(api, claims, job, "test-layoff", 52);
      if (claim) break;
    }
    if (!claim) {
      tried.push(`${where}: no claim filed`);
      continue;
    }
    // Let the treasury receive its first month of revenue, so it holds cash to pay from.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    claims.put({ ...claims.get(claim.id)!, nextPayAt: core.date });
    const stateAccount = `cash:${state.organizationId}:residual`;
    const before = api.accounts().balance(stateAccount);
    const paidBefore = Number(claims.get(claim.id)!.paidMinor ?? 0);
    payClaims(api, claims);
    const row = claims.get(claim.id)!;
    const paid = Number(row.paidMinor) - paidBefore;
    expect(paid, where).toBeGreaterThan(0);
    expect(before - api.accounts().balance(stateAccount), where).toBe(paid);
    console.log(
      `${where}: ${claim.id} paid ${paid} from ${state.id} (unemployment-benefit:${claim.personId}:${core.date})`,
    );
    return;
  }
  throw new Error(`no claim paid in 6 places: ${tried.join("; ")}; ${seed}`);
}, 1_800_000);
