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
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { layOffWorker } from "./modules/jobs";
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

it("a worker whose hours were cut in the quarter before a layoff draws the same weekly benefit as one whose hours were not, in a played world", () => {
  // Twin worlds of one drawn place and seed. In both, the payroll folds each
  // quarter's pay (core.work.payByQuarter) as the world runs; in one the
  // worker's hours are cut to a third through the core's own hours seam
  // (rehourJob) in the last completed quarter, and in both the business lays
  // the worker off through its own layoff. The claim reads the first four of
  // the last five completed quarters, so the cut falls outside it.
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:played:${draw}`, "ui-base-period-played");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const build = () =>
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
    const cutWorld = build();
    const steadyWorld = build();
    const api = coreAPI(cutWorld);
    const terms = unemploymentTerms(api);
    if (!terms.hasProgram || !terms.basisQuarters || !terms.weeklyFraction) {
      tried.push(`${where}: no program or no quarters basis`);
      continue;
    }
    const town = lawChain(api).townPlaceId;
    const job = [...cutWorld.jobs.values()]
      .filter(
        (j) =>
          j.endsAt === undefined &&
          j.wageDailyMinor > 0 &&
          (j.hoursDaily ?? 0) > 0 &&
          cutWorld.people.get(j.personId)?.placeId === town &&
          cutWorld.organizations.get(j.organizationId)?.kind === "employer",
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!job) {
      tried.push(`${where}: no named worker at an employer`);
      continue;
    }
    // About 15 months: the cut falls in the last completed quarter before the layoff.
    const start = makeIsoDate(cutWorld.date);
    const cutDate = addDays(start, 405);
    const layoffDate = addDays(start, 455);
    advanceCore(cutWorld, cutDate);
    advanceCore(steadyWorld, cutDate);
    const held = (core: typeof cutWorld) => {
      const row = core.jobs.get(job.id);
      return row && row.endsAt === undefined ? row : undefined;
    };
    if (!held(cutWorld) || !held(steadyWorld)) {
      tried.push(`${where}: the worker left before the cut`);
      continue;
    }
    coreAPI(cutWorld).rehourJob(
      job.id,
      Math.max(0.5, Math.round(((job.hoursDaily ?? 8) / 3) * 2) / 2),
      {
        tag: "SOURCED",
        citation: "Test: the employer cuts the worker's hours",
        asOf: cutWorld.date,
      },
    );
    advanceCore(cutWorld, layoffDate);
    advanceCore(steadyWorld, layoffDate);
    const claimOf = (core: typeof cutWorld) => {
      if (!held(core)) return undefined;
      layOffWorker(coreAPI(core), job.id);
      return (
        coreAPI(core)
          .moduleState("jobs")
          .table("claims")
          .query("byPerson", [job.personId, true]) as unknown as {
          id: string;
          weeklyMinor: number;
          lawId: string;
        }[]
      )[0];
    };
    const folded = (
      cutWorld.work as unknown as { payByQuarter: Map<string, unknown[]> }
    ).payByQuarter.get(job.personId);
    const cutClaim = claimOf(cutWorld);
    const steadyClaim = claimOf(steadyWorld);
    if (!cutClaim || !steadyClaim || !folded?.length) {
      tried.push(
        `${where}: no claim or no quarters folded (${folded?.length ?? 0})`,
      );
      continue;
    }
    console.log(
      `${where}: ${job.personId} claim ${cutClaim.id} after an hours cut ${cutClaim.weeklyMinor} a week, ${steadyClaim.id} with steady hours ${steadyClaim.weeklyMinor} a week (${folded.length} quarters folded)`,
    );
    expect(cutClaim.weeklyMinor, where).toBe(steadyClaim.weeklyMinor);
    return;
  }
  throw new Error(`no played claim: ${tried.join("; ")}; ${seed}`);
}, 3_600_000);
