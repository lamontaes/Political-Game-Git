/**
 * A federal raise to the Social Security line reaches the town's retirees on
 * the law's own record (pool item laws-social-security-raise-traced-to-the-law):
 * Congress raises the line a tenth, and after the treasury's next close the
 * law's page and dev mode's bill card name the full retirees whose award rose,
 * count the counted ones, and show the month's extra dollars each was paid.
 * Before the fix the raise was paid but no record named the law. Drawn (CTO,
 * Nov 17: tests draw their place; it was pinned to Eveleth, Minnesota): a
 * place where the raise reaches no full or no counted retiree in town is
 * passed over and named, and one place must be reached.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { amendBudget, governments } from "../modules/budgets";
import { coreAPI } from "../state";
import { budgetToday } from "./group-a-money";
import { lawReach } from "./applied";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const FEDERAL_LAW = "test:federal-social-security";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it(`names the retirees a federal Social Security raise reached, full and counted (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let i = 0; i < DRAWS; i += 1) {
    const draw = drawPlace(`${seed}:${i}`, "social-security-reach");
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const federal = governments(api).find((g) => g.level === "federal")!;
    const line = budgetToday(api, federal)!.spendingMinor.socialSecurity!;
    amendBudget(api, {
      governmentId: federal.id,
      line: "socialSecurity",
      deltaMinor: Math.round(line / 10),
      measureId: FEDERAL_LAW,
      carry: true,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const reach = lawReach(api, FEDERAL_LAW, placeId);
    const awards = reach.by.find(
      (side) => side.what === "social-security-award-changed",
    );
    const named = reach.people.filter(
      (p) => p.what === "social-security-award-changed" && p.inTown,
    );
    if (
      !awards ||
      !awards.fullPeople ||
      !awards.counted ||
      !awards.amountMinor ||
      !named.length
    ) {
      passed.push(
        `${where}: ${awards ? `${awards.fullPeople} full retirees, ${awards.counted} counted, ${named.length} named in town` : "no award changed"}`,
      );
      continue;
    }
    // Each named retiree in town got more than their award's base.
    expect(
      named.every((p) => p.amountMinor > 0),
      `${where}: every named retiree was paid more`,
    ).toBe(true);
    console.log(
      `social security: ${where}: ${awards.fullPeople} full retirees, ${awards.counted} counted, ${awards.amountMinor} minor units more; passed over: ${passed.join("; ") || "none"}`,
    );
    return;
  }
  throw new Error(
    `no drawn place's retirees were reached; passed over: ${passed.join("; ")}`,
  );
}, 400_000);
