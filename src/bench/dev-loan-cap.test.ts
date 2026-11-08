/**
 * The loan-cap proof, through dev mode (docs/reports/law-wiring-table.md, "cap consumer loan
 * rates"): in a town with a small-dollar lender, a member introduces the cap as a bill at the
 * state legislature, every member votes yes through castMemberVote, the body votes and the
 * governor signs; any repeal bill the world's legislature drafts is voted down by its members;
 * the world runs past the cap links' twelve-month lag; the lender then reads the cap's factor
 * where it quotes and sizes a loan. A place drawn from all 56 on a seed nobody chose, named so
 * a failure can be replayed (DEV_LOAN_SEED).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { lawInForce } from "../core2/modules/laws";
import { smallDollarTerms } from "../core2/modules/credit";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed = process.env.DEV_LOAN_SEED ?? randomBytes(8).toString("hex");
const CAP = "us-policy-positions:business-commerce.cap-consumer-loan-rates";
const STATE_LINK = "loan-rate-cap-to-high-cost-borrowing";
/** Past the links' twelve-month lag, with the lender's quotes reading it the month after. */
const DAYS = 590;

type Row = Record<string, unknown>;

describe(`the loan cap through dev mode (seed ${seed})`, () => {
  it(
    "a cap passed by a real bill is read by the lender past the lag",
    { timeout: 3_600_000 },
    () => {
      const tried: string[] = [];
      for (let i = 0; i < 40; i += 1) {
        const drawn = drawPlace(seed, `dev-loan-cap:${i}`);
        if (!smallDollarTerms(drawn.state)) {
          tried.push(`${drawn.name}: state ends payday lending`);
          continue;
        }
        const world = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        });
        const api = coreAPI(world.core);
        const lenders = (
          api.moduleState("credit").table("lenders").rows() as Row[]
        ).length;
        if (!lenders) {
          tried.push(`${drawn.name}: no lender`);
          continue;
        }
        const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
        const dev = new DevMode(
          world.core,
          world.director,
          new BenchPlayer(world.core, world.director),
          world.placeId,
        );
        expect(lawInForce(api, CAP).value, `${where} begins without it`).toBe(
          0,
        );
        // The state's legislature: a member introduces the cap and every member votes yes.
        const body = dev
          .lawmakingBodies()
          .find((b) => b.level === "state" && b.members.length > 2);
        expect(body, `${where}: a state body`).toBeDefined();
        const { bill } = dev.introduce({
          bodyOfficeId: body!.id,
          sponsorId: body!.members[0]!.key,
          series: CAP,
          value: 1,
        });
        expect(bill.status, `${where}: ${bill.id}`).not.toBe("blocked");
        const decided = dev.decideAt(bill.id, 100_000, { sign: true });
        process.stderr.write(
          `${where}: ${bill.number} ${decided.bill.status} ${JSON.stringify(decided.tallies)} held=${decided.held.length}\n`,
        );
        if (decided.bill.status !== "enacted") {
          tried.push(`${where}: bill ${decided.bill.status}`);
          continue;
        }
        expect(lawInForce(api, CAP).value, where).toBe(1);
        // Thirteen months and more, the members voting down any repeal.
        const ran = dev.runUntil({ days: DAYS, cap: DAYS, defeat: [CAP] });
        expect(ran.days, where).toBe(DAYS);
        expect(lawInForce(api, CAP).value, `${where}: cap still in force`).toBe(
          1,
        );
        const loans = (
          api.moduleState("credit").table("loans").rows() as Row[]
        ).filter((l) => l.kind === "small-dollar");
        const reads = loans.filter((l) =>
          ((l.webLinks as string[] | undefined) ?? []).includes(STATE_LINK),
        );
        process.stderr.write(
          `${where}: ${loans.length} small-dollar loans, ${reads.length} read the cap link; repeals voted down: ${ran.defeated.length}\n`,
        );
        expect(reads.length, `${where}: a lender read the cap`).toBeGreaterThan(
          0,
        );
        for (const loan of reads) {
          expect(Number(loan.webFactor), String(loan.id)).toBeLessThan(1);
          expect(
            Number(loan.principalMinor),
            String(loan.id),
          ).toBeLessThanOrEqual(Number(loan.askedMinor));
        }
        process.stderr.write(
          `READ ${reads[0]!.id} factor ${Number(reads[0]!.webFactor).toFixed(3)} from ${String(reads[0]!.webRecordId)}\n`,
        );
        return;
      }
      throw new Error(
        `No drawn place had a lender and a cap bill that passed:\n${tried.join("\n")}`,
      );
    },
  );
});
