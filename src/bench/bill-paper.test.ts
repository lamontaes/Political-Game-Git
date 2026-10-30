import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  LEGISLATURE_MODULE_ID,
  employerCosts,
  memberKey,
  members,
  type BillRow,
} from "../core2/modules/legislature";
import { policyAuthority } from "../core2/policy-authority";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { coreAPI } from "../core2/state";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// A bill opens as one paper document read from its own records: the
// designation and title in plain words, the sponsor by name, each section with
// the estimate the records give for it, the floor date and whip, and the vote
// and signature records when the body has made them. The bench world, a place
// drawn from all 56 on a seed nobody chose.
const seed =
  process.env.BILL_PAPER_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const place = drawPlace(seed, "bill-paper");
/** The amount, in minor units, the spending bill sets for its budget line. */
const BUDGET_LINE_AMOUNT_MINOR = 10000;

describe(`a bill on paper (${place.name}, seed ${seed})`, () => {
  it("reads the filed bill from its records, with the estimate beside each section", () => {
    // A town where a wage bill is drafted, not blocked: the draw goes on to
    // the next place until one is, bounded.
    let found:
      | {
          world: ReturnType<typeof buildBenchWorld>;
          api: ReturnType<typeof coreAPI>;
          council: { id: string; kind: string };
          where: string;
          key: string;
          seed: string;
          first: string;
          bill: { id: string; number: string };
          wageNow: number;
        }
      | undefined;
    for (let i = 0; i < 10 && !found; i += 1) {
      const draw = i
        ? drawPlace(`${seed}:${i}`, "bill-paper")
        : { name: place.name, key: place.key, seed };
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const offices = api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      const council = ["council", "township-board", "county-board"]
        .map((kind) => offices.find((o) => o.kind === kind))
        .find((o) => o !== undefined);
      if (!council) continue;
      const [first] = members(api, council.id);
      if (!first) continue;
      const wage = seatView(world.core, memberKey(first)).amounts.find(
        (a) => a.series === "minimum-wage",
      );
      const bill = seatAct(world.core, memberKey(first), {
        kind: "draft",
        officeId: council.id,
        series: "minimum-wage",
        value: (wage?.current ?? 0) + 200,
      }) as { id: string; number: string; status: string };
      if (bill.status !== "drafted") continue;
      found = {
        world,
        api,
        council,
        where: draw.name,
        key: draw.key,
        seed: draw.seed,
        first: memberKey(first),
        bill,
        wageNow: wage?.current ?? 0,
      };
    }
    expect(found, "a place where a wage bill is drafted").toBeTruthy();
    const { world, api, council, where, key, first, bill, wageNow } = found!;
    const drawn = found!.seed;
    expect(where.length, bill.id).toBeGreaterThan(0);
    const level = council.kind === "county-board" ? "county" : "city";
    const paper = billPaper(world.core, bill.id);
    expect(paper.number, bill.id).toBe(bill.number);
    expect(paper.title.length, bill.id).toBeGreaterThan(0);
    expect(
      `${paper.title} ${paper.sections.map((s) => s.text).join(" ")}`,
    ).not.toMatch(/[{}]|undefined|NaN/);
    expect(paper.sponsor.length, bill.id).toBeGreaterThan(0);
    expect(paper.sections.length, bill.id).toBeGreaterThan(0);
    expect(paper.sections[0]!.text ?? "", bill.id).toMatch(/^Section 1\. /);
    // The floor date and whip the rows used to carry, now on the paper.
    expect(paper.floorDate, bill.id).toBeTruthy();
    expect(paper.whip.length, bill.id).toBeGreaterThan(0);
    // The estimate names the law record the section amends, with the values
    // the record gives before and after.
    const estimate = paper.sections[0]!.estimate;
    expect(
      estimate.statute ?? estimate.lawId,
      `${bill.id} names the law it changes`,
    ).toBeTruthy();
    expect(estimate.afterValue, bill.id).toBe(wageNow + 200);
    // The fiscal note at drafting (DECISION-REGISTER, "How laws reach
    // people", Sept 26: every bill gets a fiscal note when drafted). The
    // paper's estimate is the bill's own cost estimate; its workers are the
    // open work commitments paid under the new floor, counted here from the
    // employers' own records and named by commitment id, employer by
    // employer as employerCosts counts them; its yearly pay is what those
    // employers' rows add to.
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const open = [...world.core.work.commitments.values()].filter(
      (c) => c.endsAt === undefined,
    );
    expect(open.length, "open work commitments on record").toBeGreaterThan(0);
    const noteOf = (billId: string) => {
      const row = bills.get(billId) as unknown as BillRow;
      const floor = row.provisions.find(
        (p) => p.kind === "law-amount" && p.series === "minimum-wage",
      )!.value;
      const raised = open.filter((c) => c.hourlyMinor < floor);
      const ids = raised.map((c) => c.id).sort();
      const note = billPaper(world.core, billId).estimate;
      expect(note, billId).toEqual({
        workers: row.costEstimate.workersRaised,
        payMinor: row.costEstimate.annualPayMinor,
        note: row.costEstimate.note,
      });
      expect(note.workers, `${billId} raises ${ids.join(", ")}`).toBe(
        ids.length,
      );
      const byEmployer = new Map<string, number>();
      for (const c of raised)
        byEmployer.set(
          c.organizationId,
          (byEmployer.get(c.organizationId) ?? 0) + 1,
        );
      const costs = employerCosts(api, row);
      expect(
        new Map([...costs].map(([org, cost]) => [org, cost.workers])),
        `${billId} employer by employer`,
      ).toEqual(byEmployer);
      expect(
        [...costs.values()].reduce((sum, cost) => sum + cost.annualMinor, 0),
        `${billId} the employers' rows add to the note`,
      ).toBe(note.payMinor);
      if (ids.length) expect(note.payMinor, billId).toBeGreaterThan(0);
      else expect(note.payMinor, billId).toBe(0);
      expect(
        note.note.length,
        `${billId} the note says what it counts`,
      ).toBeGreaterThan(0);
      console.log(
        `fiscal note: ${where} (${key}, root seed ${seed}, place seed ${drawn}) bill ${billId} floor ${floor} minor/hour: ${note.workers} workers, ${note.payMinor} minor a year, ${costs.size} employers; commitments ${ids.join(", ") || "none"}`,
      );
      return ids.length;
    };
    // A floor that raises nobody in this town says so: the draft goes on
    // to a floor above the lowest open pay on record, so the note is checked
    // with workers in it.
    if (!noteOf(bill.id)) {
      const lowest = Math.min(...open.map((c) => c.hourlyMinor));
      const raise = seatAct(world.core, first, {
        kind: "draft",
        officeId: council.id,
        series: "minimum-wage",
        value: lowest + 200,
      }) as { id: string; status: string };
      expect(raise.status, raise.id).toBe("drafted");
      expect(noteOf(raise.id), raise.id).toBeGreaterThan(0);
    }
    // A second bill before the same body opens the same paper.
    const question = Object.keys(POLICY_QUESTIONS).find(
      (q) => policyAuthority(api, q, level).allowed,
    )!;
    expect(question, "a question this body may act on").toBeTruthy();
    const other = seatAct(world.core, first, {
      kind: "draft",
      officeId: council.id,
      question,
      value: 1,
    }) as { id: string; number: string };
    const otherPaper = billPaper(world.core, other.id);
    expect(otherPaper.number, other.id).toBe(other.number);
    expect(otherPaper.sections.length, other.id).toBeGreaterThan(0);
    expect(otherPaper.floorDate, other.id).toBeTruthy();
    // A spending bill opens too, its line with its amount.
    const line = seatView(world.core, first)
      .bodies.flatMap((b) => b.menus)
      .flatMap((m) => m.items)
      .find((item) => item.line && item.allowed !== false)?.line;
    expect(line, "a budget line this body may set").toBeTruthy();
    const budget = seatAct(world.core, first, {
      kind: "draft",
      officeId: council.id,
      line: line!,
      value: BUDGET_LINE_AMOUNT_MINOR,
    }) as { id: string; number: string };
    const budgetPaper = billPaper(world.core, budget.id);
    expect(budgetPaper.sections.length, budget.id).toBeGreaterThan(0);
    expect(budgetPaper.sections[0]!.estimate.line, budget.id).toBe(line);
    // The paper carries the amount the bill sets for its line, as filed,
    // and its note says it moves no pay rather than standing blank.
    const budgetRow = bills.get(budget.id) as unknown as BillRow;
    const set = budgetRow.provisions.find(
      (p) => p.kind === "budget-line" && p.line === line,
    )!;
    expect(set.value, budget.id).toBe(BUDGET_LINE_AMOUNT_MINOR);
    expect(
      budgetPaper.sections[0]!.estimate.lineAmountMinor,
      `${budget.id} carries its line amount`,
    ).toBe(set.value);
    expect(budgetPaper.estimate, budget.id).toEqual({
      workers: budgetRow.costEstimate.workersRaised,
      payMinor: budgetRow.costEstimate.annualPayMinor,
      note: budgetRow.costEstimate.note,
    });
    expect(budgetPaper.estimate.note.length, budget.id).toBeGreaterThan(0);
    console.log(
      `budget line: ${where} (${key}, root seed ${seed}, place seed ${drawn}) bill ${budget.id} line ${line} amount ${budgetPaper.sections[0]!.estimate.lineAmountMinor} minor, note ${budgetPaper.estimate.workers} workers ${budgetPaper.estimate.payMinor} minor`,
    );
  }, 600_000);
});
