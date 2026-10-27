import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { memberKey, members } from "../core2/modules/legislature";
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
const seed = process.env.BILL_PAPER_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "bill-paper");

function seatedWorld() {
  // A place with a town body to sit on: a council, a township board, or the
  // county board where the place is unincorporated. A territory with no
  // municipal body on record has none, so the draw goes on to the next.
  for (let i = 0; i < 10; i += 1) {
    const where = i ? drawPlace(`${seed}:${i}`, "bill-paper") : place;
    const world = buildBenchWorld(where.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: where.key,
    });
    const api = coreAPI(world.core);
    const offices = api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const council = ["council", "township-board", "county-board"]
      .map((kind) => offices.find((o) => o.kind === kind))
      .find((o) => o !== undefined);
    if (council) return { world, api, council, where };
  }
  return undefined;
}

describe(`a bill on paper (${place.name}, seed ${seed})`, () => {
  it("reads the filed bill from its records, with the estimate beside each section", () => {
    const found = seatedWorld();
    expect(found, "a place with a town body").toBeTruthy();
    const { world, api, council, where } = found!;
    const level = council.kind === "county-board" ? "county" : "city";
    const [first, second] = members(api, council.id);
    expect(first, `a member to sponsor in ${where.name}`).toBeTruthy();
    const wage = seatView(world.core, memberKey(first!)).amounts.find(
      (a) => a.series === "minimum-wage",
    );
    const bill = seatAct(world.core, memberKey(first!), {
      kind: "draft",
      officeId: council.id,
      series: "minimum-wage",
      value: (wage?.current ?? 0) + 200,
    }) as { id: string; number: string };
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
    expect(estimate.afterValue, bill.id).toBe((wage?.current ?? 0) + 200);
    // A second bill before the same body opens the same paper.
    const question = Object.keys(POLICY_QUESTIONS).find(
      (q) => policyAuthority(api, q, level).allowed,
    )!;
    expect(question, "a question this body may act on").toBeTruthy();
    const other = seatAct(world.core, memberKey(second ?? first!), {
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
    const line = seatView(world.core, memberKey(first!))
      .bodies.flatMap((b) => b.menus)
      .flatMap((m) => m.items)
      .find((item) => item.line && item.allowed !== false)?.line;
    expect(line, "a budget line this body may set").toBeTruthy();
    const budget = seatAct(world.core, memberKey(first!), {
      kind: "draft",
      officeId: council.id,
      line: line!,
      value: 10000,
    }) as { id: string; number: string };
    const budgetPaper = billPaper(world.core, budget.id);
    expect(budgetPaper.sections.length, budget.id).toBeGreaterThan(0);
    expect(budgetPaper.sections[0]!.estimate.line, budget.id).toBe(line);
  }, 600_000);
});
