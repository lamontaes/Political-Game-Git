// @vitest-environment node
/**
 * The federal Medicare line moves what Medicare members' households owe on
 * their medical bills (outcome link medicare-line-to-medical-debt, carried by
 * the coverage engine's bills). Two worlds from one drawn place and seed: one
 * where Congress's budget bill raises the Medicare line a fifth, carried as a
 * passed bill carries it, and one left alone. Production budgets, coverage
 * and bills run in both. A place where no household leaves a Medicare
 * member's bill unpaid in the world left alone is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billRecords } from "../../scripts/law-wiring/bill-records";
import { webLinksOf } from "../../scripts/law-wiring/catalog";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedEver, appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINE = "medicare";
const LINK = "medicare-line-to-medical-debt";
const TRIES = 4;

const billsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];

it(
  `a raise in the federal Medicare line lowers Medicare members' bills and what their households leave unpaid (replay ${replay})`,
  { timeout: 1_200_000 },
  () => {
    // The researched link starts from the line and is carried by the bills.
    const link = WEB_LINKS.find((l) => l.key === LINK);
    expect(link?.from).toBe(`budget.${LINE}-added-pct`);
    expect(link?.carriedBy).toMatch(/medical-bills\.ts/);
    expect(
      webLinksOf({ key: `budget-line:${LINE}`, kind: "budget-line" } as never)
        .map((l) => l.key)
        .includes(LINK),
    ).toBe(true);
    const bookkeeping = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (let attempt = 0; attempt < TRIES; attempt += 1) {
        const drawn = drawPlace(replay, `medicare-line:${attempt}`);
        const where = `${drawn.name} (${drawn.key}), replay ${replay} draw medicare-line:${attempt}, world seed ${drawn.seed}`;
        const build = () =>
          buildBenchWorld(drawn.seed, gameStartDate(), {
            placeKey: drawn.key,
            twoLevel: true,
          }).core;
        const raised = build();
        const alone = build();
        const api = coreAPI(raised);
        const federal = governments(api).find((g) => g.level === "federal")!;
        const budget = [...budgetsOf(api, federal.id)].sort(
          (a, b) => b.fiscalYear - a.fiscalYear,
        )[0]!;
        const base = budget.spendingMinor[LINE] ?? 0;
        expect(base, where).toBeGreaterThan(0);
        const delta = Math.round(base / 5);
        expect(
          amendBudget(api, {
            governmentId: federal.id,
            line: LINE,
            deltaMinor: delta,
            measureId: "H.R. 9003 (Medicare, test)",
            carry: true,
          }),
          where,
        ).not.toBeNull();
        // Two monthly bills, on the 1st.
        const until = addDays(makeIsoDate(raised.date), 45);
        const collector = billRecords(
          WEB_LINKS.filter((l) => l.key === LINK) as never,
        );
        advanceCore(raised, until);
        advanceCore(alone, until);
        collector.collect(raised);

        // Each Medicare member's bill falls by the line's part of their care:
        // what they pay plus what the line paid is their bill left alone.
        const aloneBills = new Map(billsOf(alone).map((r) => [r.id, r]));
        let members = 0,
          example = "";
        let unpaidRaised = 0,
          unpaidAlone = 0;
        for (const row of billsOf(raised)) {
          const other = aloneBills.get(row.id);
          if (!other) continue;
          const medicare = row.members.filter((m) => m.plan === "medicare");
          if (!medicare.length) continue;
          for (const m of medicare) {
            const o = other.members.find((x) => x.personId === m.personId);
            if (!o || o.plan !== "medicare" || o.billMinor < 1000) continue;
            expect(
              m.medicareLineMinor ?? 0,
              `${where} ${m.personId}`,
            ).toBeGreaterThan(0);
            expect(m.billMinor, `${where} ${m.personId}`).toBeLessThan(
              o.billMinor,
            );
            expect(
              Math.abs(m.billMinor + m.medicareLineMinor! - o.billMinor),
              `${where} ${m.personId} (${row.id})`,
            ).toBeLessThanOrEqual(Math.max(2, o.billMinor * 0.01));
            members += 1;
            example ||= `${m.personId} (${row.id}): billed ${m.billMinor}, the line paid ${m.medicareLineMinor}, left alone ${o.billMinor}`;
          }
          unpaidRaised += row.unpaidMinor * row.weight;
          unpaidAlone += other.unpaidMinor * other.weight;
        }
        if (!members) {
          passed.push(`${where}: no Medicare member billed in both`);
          continue;
        }
        if (unpaidAlone <= 0) {
          passed.push(
            `${where}: ${members} Medicare members billed, none left unpaid in the world left alone`,
          );
          continue;
        }
        // What the households with Medicare members leave unpaid falls with
        // their bills: the part that would go to collections after the wait.
        expect(unpaidRaised, where).toBeLessThan(unpaidAlone);
        // The checker's bill-carried rule sees the same bills.
        const carried = collector.result().carried[LINK]!;
        expect(carried.count, where).toBeGreaterThan(0);
        // The bill that changed the line reached those members, by the same
        // rule full and counted (one model, two tiers).
        const reached = appliedOn(api, `budget-line:${LINE}`).filter(
          (r) => r.what === "medicare-share-changed-by-line",
        );
        expect(reached.length, where).toBeGreaterThan(0);
        expect(
          reached.every(
            (r) =>
              (r.target === "person" && api.state.people.has(r.targetId)) ||
              (r.target === "group" && r.count >= 1),
          ),
          where,
        ).toBe(true);
        // Putting the line back ends every member's row at the next bill:
        // the undo shows on the bill card and in the Trace.
        expect(
          amendBudget(api, {
            governmentId: federal.id,
            line: LINE,
            deltaMinor: -delta,
            measureId: "H.R. 9004 (Medicare restored, test)",
            carry: true,
          }),
          where,
        ).not.toBeNull();
        advanceCore(raised, addDays(makeIsoDate(raised.date), 31));
        const stillOpen = appliedOn(api, `budget-line:${LINE}`).filter(
          (r) => r.what === "medicare-share-changed-by-line",
        );
        expect(
          stillOpen.map((r) => r.targetId),
          where,
        ).toEqual([]);
        const ended = appliedEver(api, `budget-line:${LINE}`).filter(
          (r) => r.what === "medicare-share-changed-by-line" && r.endedOn,
        );
        expect(ended.length, where).toBeGreaterThanOrEqual(reached.length);
        process.stdout.write(
          `MEDICARE ${where}: ${members} Medicare members billed less; unpaid by their households ${Math.round(unpaidRaised / 100)} dollars against ${Math.round(unpaidAlone / 100)} left alone; ${carried.count} bill records priced by the line; ${reached.length} reach rows, all ended once the line was put back; e.g. ${example}. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(
        `No place showed an unpaid Medicare member's bill: ${passed.join("; ")}`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
