/**
 * A phase-in from the seat (pool item gov-m3-01-phase-in-by-dated-steps, the
 * owner's ruling of Sept 12, travel clarification item 1): a member of the
 * town's lawmaking body drafts a minimum wage in two dated steps through
 * `seatAct`, as sections of the one bill; the body votes it on its own
 * meeting day by every member's own reasons, the executive acts as the
 * engine has them act, and the laws engine's calendar puts each step into
 * law on its own date. The law in force is the first step's amount the day
 * after the first date and the second step's the day after the second, each
 * row naming the bill by record id.
 *
 * The bench world, in a place drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins one). A place whose records give its local bodies
 * no power to set a wage floor (the state preempts or grants none) is passed
 * over for the next draw, read from the starting law the laws engine opens
 * with; a budget line cannot stand in, as a budget section's own date is not
 * read yet (SG-LEGISLATURE-dated-budget-line-amended-on-enactment). A body
 * whose whip count stays short after the sponsor's offers to holdouts
 * (each taken or declined on the member's own position), or whose vote
 * does not carry the bill, is passed over the same way: the vote is never
 * forced. So is a place whose state withdraws the town's wage power before
 * a step's date: the step is its level's law, set aside by the state's; and
 * one whose bill became law too late for the first step to fall after the
 * day an undated section would take effect.
 *
 * Then an edge case on a hand-set fixture in the same world: a step whose
 * date passed before the bill became law, the next inside the rule's window.
 * The passed step is overtaken, so the law ends at the next step's amount.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { LawRowInput } from "../core2/laws-starting";
import type { ModuleRow } from "../core2/module-data";
import { LAWS_MODULE_ID, lawInForce } from "../core2/modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  draftBill,
  effectiveRule,
  executiveDecision,
  memberPosition,
  members,
  memberKey,
  offerDeal,
  sectionDates,
  whipCount,
  type Provision,
} from "../core2/modules/legislature";
import { upcomingMeeting } from "../core2/modules/office-day";
import { coreAPI } from "../core2/state";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`phase-in:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);
const SERIES = "minimum-wage";
/**
 * World builds tried before the test gives up, and places drawn in all (a
 * draw whose state gives its places no wage power costs no build).
 */
const BUILDS = 16;
const DRAWS = 200;
/** A town's lawmaking bodies, in the order a member is looked for. */
const BODIES = ["council", "township-board", "county-board"];
/** The starting law on whether a state lets its places set a wage floor. */
const localWage = (
  JSON.parse(
    readFileSync(
      "data/research/laws/starting-law-2026/labor-workforce.json",
      "utf8",
    ),
  ) as {
    questions: Record<string, { answers: Record<string, { answer: string }> }>;
  }
).questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]!
  .answers;

const ENACTED = new Set(["enacted", "signed", "overridden"]);
const ENDED = new Set(["failed", "vetoed", "blocked"]);

it(`a bill drafted from the seat phases in a minimum wage by two dated steps, and the law in force follows each (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    let builds = 0;
    for (let draw = 0; draw < DRAWS && builds < BUILDS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "phase-in");
      const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}, world seed ${place.seed}`;
      if (localWage[place.state]?.answer !== "yes") continue;
      builds += 1;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const offices = api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      // A member who is a full person, of a body that meets on a calendar
      // and may set the town's wage floor (its own catalog says so).
      const seat = BODIES.flatMap((kind) =>
        offices.filter((o) => o.kind === kind),
      )
        .filter((office) => upcomingMeeting(api, office.id))
        .flatMap((office) =>
          members(api, office.id).flatMap((term) =>
            term.personId && core.people.has(term.personId)
              ? [{ office, member: memberKey(term) }]
              : [],
          ),
        )
        .find(({ office, member }) =>
          seatView(core, member)
            .bodies.find((b) => b.officeId === office.id)
            ?.menus.flatMap((m) => m.items)
            .some((item) => item.series === SERIES && item.allowed),
        );
      if (!seat) {
        tried.push(`${where}: no seated member of a body that may set a wage`);
        continue;
      }
      // Two steps over the law in force: one and two dollars over the
      // highest floor already on record for either date (a rise a higher
      // level has scheduled included), three and five months on: after any
      // meeting, signature and ordinance delay.
      const today = makeIsoDate(core.date);
      const dates = [addDays(today, 90), addDays(today, 150)] as const;
      const base = Math.max(
        ...[today, ...dates].map((d) => lawInForce(api, SERIES, d).value ?? 0),
      );
      const steps = [
        { value: base + 100, effectiveDate: dates[0] },
        { value: base + 200, effectiveDate: dates[1] },
      ];
      const drafted = seatAct(core, seat.member, {
        kind: "draft",
        officeId: seat.office.id,
        series: SERIES,
        steps,
      }) as ReturnType<typeof seatAct>;
      // One bill, one section per step, each with its own date.
      expect(drafted.provisions, `${where}: ${drafted.id}`).toHaveLength(2);
      expect(
        drafted.provisions.map((p) => [p.series, p.value, p.effectiveDate]),
        `${where}: ${drafted.id}`,
      ).toEqual(steps.map((s) => [SERIES, s.value, s.effectiveDate]));
      if (drafted.status !== "drafted") {
        tried.push(`${where}: ${drafted.id} ${drafted.status}`);
        continue;
      }
      // Short of a majority, the sponsor negotiates (golden path step 7):
      // each holdout, nearest even first, is offered the sponsor's backing for
      // an item of their own, then a favor owed; each takes or declines it on
      // their own position (offerDeal), and the whip is counted again.
      const whip = () =>
        whipCount(api, drafted.id).reduce(
          (sum, row) => ({
            yes: sum.yes + row.yes.length,
            no: sum.no + row.no.length,
            holdouts: [...sum.holdouts, ...row.no, ...row.undecided],
          }),
          { yes: 0, no: 0, holdouts: [] as string[] },
        );
      const offers: string[] = [];
      for (const kind of ["back-their-item", "favor"] as const) {
        const holdouts = whip()
          .holdouts.filter((key) => key !== seat.member)
          .map((key) => ({
            key,
            total: memberPosition(api, drafted.id, key).total,
          }))
          .sort((a, b) => b.total - a.total);
        for (const { key } of holdouts) {
          const counted = whip();
          if (counted.yes > counted.no) break;
          const deal = offerDeal(api, {
            billId: drafted.id,
            memberId: key,
            kind,
          });
          offers.push(
            `${kind} to ${key}: ${deal.accepted ? "took" : "declined"}`,
          );
        }
      }
      const counted = whip();
      if (counted.yes <= counted.no) {
        tried.push(
          `${where}: ${drafted.id} whipped ${counted.yes} for, ${counted.no} against after ${offers.length} offers`,
        );
        continue;
      }
      // The paper for a bill whose sections name two dates.
      const paper = billPaper(core, drafted.id);
      console.log(
        `PHASE-IN PAPER ${drafted.id}:\n  ${[paper.title, ...paper.sections.map((s) => `${s.text} [effective ${s.estimate.effectiveDate}]`), `closing: ${paper.effective}`].join("\n  ")}`,
      );
      expect(
        paper.sections.map((s) => s.estimate.effectiveDate),
        drafted.id,
      ).toEqual([...dates]);
      expect(paper.effective, `${drafted.id}: no one closing date`).toBeNull();
      // The second step amends the law as the first leaves it.
      expect(
        paper.sections.map((s) => s.estimate.beforeValue)[1],
        drafted.id,
      ).toBe(steps[0]!.value);
      // The body's own meeting votes it, and the executive acts: day by day
      // until the bill is law or has failed.
      let bill = billOf(api, drafted.id);
      let rule: ReturnType<typeof effectiveRule> | null = null;
      for (let day = 0; day < 120; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        bill = billOf(api, drafted.id);
        if (ENACTED.has(bill.status)) {
          // The day it became law: when an undated section would take effect.
          rule = effectiveRule(api, bill);
          break;
        }
        if (ENDED.has(bill.status)) break;
      }
      if (!ENACTED.has(bill.status)) {
        tried.push(
          `${where}: ${bill.id} ${bill.status} on ${core.date} (agenda ${drafted.agendaDate ?? "none"})`,
        );
        continue;
      }
      const enactedOn = core.date;
      // Both steps fall after the day the bill could take effect; a body
      // slow enough to pass it later is passed over, not failed.
      if (rule!.date >= dates[0]) {
        tried.push(
          `${where}: ${bill.id} became law ${enactedOn}, its rule date ${rule!.date} not before the first step ${dates[0]}`,
        );
        continue;
      }
      const rows = (
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .query("bySeriesOnly", [SERIES]) as unknown as LawRowInput[]
      )
        .filter((row) => row.terms?.enactedByBill === bill.id)
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      expect(
        rows.map((row) => [row.effectiveDate, row.value]),
        `${where}: ${bill.id}`,
      ).toEqual(steps.map((s) => [s.effectiveDate, s.value]));
      // Through each date: the day before, the step is not yet law; the day
      // after, it is the law at the bill's level and governs, its row naming
      // the bill. A state law that sets the town's own wage aside on that day
      // (its legislature withdrew the power in the meantime) is the world's
      // own law, not the phase-in's: that place is passed over for the next.
      const before = lawInForce(api, SERIES, addDays(dates[0], -1)).governing;
      const levelsOn = (date: string) =>
        lawInForce(api, SERIES, date)
          .levels.map(
            (l) =>
              `${l.level} ${l.jurisdiction}: ${l.row?.id ?? "none"} ${l.row?.value ?? ""}${l.setAside ? ` (set aside: ${l.setAside})` : ""}`,
          )
          .join("; ");
      let setAside: string | null = null;
      for (const [index, date] of dates.entries()) {
        const after = addDays(date, 1);
        advanceCore(core, after);
        const answer = lawInForce(api, SERIES, after);
        const own = answer.levels.find((l) => l.row?.id === rows[index]!.id);
        expect(
          own,
          `${where}: ${after}, step ${index + 1} is its level's law; levels ${levelsOn(after)}`,
        ).toBeDefined();
        if (own!.setAside) {
          setAside = `${after}: ${own!.setAside} (levels ${levelsOn(after)})`;
          break;
        }
        expect(
          answer.governing?.id,
          `${where}: ${after}, levels ${levelsOn(after)}`,
        ).toBe(rows[index]!.id);
        expect(answer.governing?.value, `${where}: ${after}`).toBe(
          steps[index]!.value,
        );
        expect(
          answer.governing?.terms?.enactedByBill,
          `${where}: ${after}`,
        ).toBe(bill.id);
        expect(lawInForce(api, SERIES).governing?.id, `${where}: today`).toBe(
          rows[index]!.id,
        );
      }
      if (setAside) {
        tried.push(`${where}: ${bill.id} enacted; ${setAside}`);
        continue;
      }
      expect(before?.terms?.enactedByBill, where).not.toBe(bill.id);
      const late = passedStep(
        core,
        seat,
        rows[0]!.unit,
        steps[1]!.value,
        where,
      );
      console.log(
        `PHASE-IN ${where}: ${bill.id} (${bill.number}) ${bill.status} ${enactedOn}, rule ${rule!.kind} ${rule!.date}; before ${before?.id} ${before?.value}; step 1 ${rows[0]!.id} ${rows[0]!.value} from ${dates[0]}; step 2 ${rows[1]!.id} ${rows[1]!.value} from ${dates[1]}; offers ${offers.join(", ") || "none"}; passed over: ${tried.join(" | ") || "none"}; passed-step fixture ${late}`,
      );
      return;
    }
    throw new Error(`No drawn place phased in a wage: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);

/**
 * Edge case, a hand-set fixture (the vote is skipped: the bill is put on the
 * executive's desk as passed): two steps of one law, the first dated the day
 * before the bill becomes law, the second the day after, inside the window
 * the government's rule gives an undated section. The passed step is
 * overtaken before it could take effect: it writes no row, and the day after
 * the rule's date the second step governs, never the first step's amount.
 */
function passedStep(
  core: Parameters<typeof seatAct>[0],
  seat: { office: { id: string }; member: string },
  unit: string | undefined,
  over: number,
  where: string,
): string {
  const api = coreAPI(core);
  const today = makeIsoDate(core.date);
  const late = [
    { value: over + 100, effectiveDate: addDays(today, -1) },
    { value: over + 200, effectiveDate: addDays(today, 1) },
  ];
  const drafted = draftBill(api, {
    bodyOfficeId: seat.office.id,
    sponsorId: seat.member,
    provisions: late.map((step): Provision => ({
      kind: "law-amount",
      series: SERIES,
      value: step.value,
      ...(unit ? { unit } : {}),
      effectiveDate: step.effectiveDate,
    })),
  });
  const rule = effectiveRule(api, drafted);
  expect(
    rule.date > late[1]!.effectiveDate,
    `${where}: ${drafted.id} rule ${rule.date}`,
  ).toBe(true);
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .put({
      ...drafted,
      status: "awaiting-signature",
      passedOn: today,
      tallies: [],
    } as unknown as ModuleRow);
  const enacted = executiveDecision(api, drafted.id, true);
  expect(ENACTED.has(enacted.status), `${where}: ${enacted.id}`).toBe(true);
  const written = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [SERIES]) as unknown as LawRowInput[]
  ).filter((row) => row.terms?.enactedByBill === drafted.id);
  expect(
    written.map((row) => [row.effectiveDate, row.value]),
    `${where}: ${drafted.id}`,
  ).toEqual([[late[1]!.effectiveDate, late[1]!.value]]);
  const after = addDays(rule.date, 1);
  const answer = lawInForce(api, SERIES, after);
  const own = answer.levels.find((l) => l.row?.id === written[0]!.id);
  expect(own, `${where}: ${after}`).toBeDefined();
  if (!own!.setAside) {
    expect(answer.governing?.id, `${where}: ${after}`).toBe(written[0]!.id);
    expect(answer.governing?.value, `${where}: ${after}`).toBe(late[1]!.value);
  }
  return `${drafted.id}: step ${late[0]!.value} from ${late[0]!.effectiveDate} overtaken, ${written[0]!.id} ${written[0]!.value} from ${late[1]!.effectiveDate} governs ${after} (rule ${rule.date})`;
}

it("a step whose date passed before the bill became law is overtaken by a later step of the same law that takes effect by the rule's date", () => {
  const law = (value: number, effectiveDate?: string): Provision => ({
    kind: "law-amount",
    series: SERIES,
    value,
    ...(effectiveDate ? { effectiveDate } : {}),
  });
  const today = "2026-03-01";
  const rule = "2026-03-31";
  // Passed, then a step inside the rule's window: the first is overtaken.
  expect(
    sectionDates([law(1, "2026-02-20"), law(2, "2026-03-20")], today, rule),
  ).toEqual([null, "2026-03-20"]);
  // Passed, then a step after the rule's date: the first moves to the rule's.
  expect(
    sectionDates([law(1, "2026-02-20"), law(2, "2026-05-01")], today, rule),
  ).toEqual([rule, "2026-05-01"]);
  // Two passed steps: the later one takes effect by the rule, alone.
  expect(
    sectionDates([law(1, "2026-02-10"), law(2, "2026-02-20")], today, rule),
  ).toEqual([null, rule]);
  // Undated and future sections keep the rule's date and their own.
  expect(sectionDates([law(1), law(2, "2026-03-02")], today, rule)).toEqual([
    rule,
    "2026-03-02",
  ]);
  // A struck later step, another law, or a budget line overtakes nothing.
  expect(
    sectionDates(
      [law(1, "2026-02-20"), law(2, "2026-03-20")],
      today,
      rule,
      [1],
    )[0],
  ).toBe(rule);
  expect(
    sectionDates(
      [
        law(1, "2026-02-20"),
        { ...law(2, "2026-03-20"), series: "other" },
        {
          kind: "budget-line",
          line: "parks",
          value: 5,
          effectiveDate: "2026-03-20",
        },
      ],
      today,
      rule,
    )[0],
  ).toBe(rule);
});
