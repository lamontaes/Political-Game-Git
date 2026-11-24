/**
 * A claim's weekly amount comes from the person's base-period wages, not the
 * lost job's pay on the last day: a worker whose hours were cut just before
 * the layoff draws on the higher quarters before the cut. The pay-by-quarter
 * fold is the one payroll's record (core.work.payByQuarter); here it is laid
 * on a real worker of the played world as a fixture. A place is drawn from all
 * 56 on a seed nobody chose (UI_BASE_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { fileClaim, unemploymentTerms } from "./jobs-benefits";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.UI_BASE_SEED ?? randomBytes(8).toString("hex");

it("an hours cut before a layoff barely moves the weekly benefit", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ui-base-period");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const terms = unemploymentTerms(api);
    if (!terms.hasProgram || !terms.basisQuarters || !terms.weeklyFraction) {
      tried.push(`${where}: no program or no quarters basis`);
      continue;
    }
    const claims = api.moduleState("jobs").table("claims");
    const year = Number(core.date.slice(0, 4));
    for (const job of core.jobs.values()) {
      if (
        job.endsAt !== undefined ||
        job.wageDailyMinor <= 0 ||
        core.people.get(job.personId)?.placeId !== lawChain(api).townPlaceId
      )
        continue;
      // Hours cut to a third just before the layoff: the last pay is a third.
      const cut = {
        ...job,
        wageDailyMinor: Math.round(job.wageDailyMinor / 3),
      };
      const lastPay = fileClaim(api, claims, cut, "layoff", 52);
      if (!lastPay) continue;
      claims.put({ ...claims.get(lastPay.id)!, open: false });
      // Five completed quarters at the full pay, the cut falling after them.
      const quarter = job.wageDailyMinor * 91;
      const quarters = [4, 3, 2, 1].map((n) => ({
        quarter: `${year - 1}Q${n}`,
        grossMinor: quarter,
      }));
      (
        core.work as unknown as { payByQuarter: Map<string, object> }
      ).payByQuarter = new Map([
        [
          job.personId,
          [
            { quarter: `${year - 2}Q4`, grossMinor: quarter },
            ...quarters.reverse(),
          ],
        ],
      ]);
      core.date = `${year}-07-15` as typeof core.date;
      const base = fileClaim(api, claims, cut, "layoff", 52);
      expect(base, where).toBeTruthy();
      const expected = Math.round(
        Math.min(
          terms.weeklyMaximumMinor,
          terms.weeklyFraction * quarter * Math.min(terms.basisQuarters, 4),
        ),
      );
      // The benefit follows the full-pay quarters, above the cut job's last pay
      // unless the state's weekly maximum fixed both.
      expect(base!.weeklyMinor, where).toBe(expected);
      expect(base!.weeklyMinor, where).toBeGreaterThanOrEqual(
        lastPay.weeklyMinor,
      );
      console.log(
        `${where}: last pay ${lastPay.weeklyMinor} a week, base period ${base!.weeklyMinor} (${base!.id}, law ${base!.lawId})`,
      );
      return;
    }
    tried.push(`${where}: no worker's claim filed`);
  }
  throw new Error(
    `no claim read the base period: ${tried.join("; ")}; ${seed}`,
  );
}, 1_800_000);
