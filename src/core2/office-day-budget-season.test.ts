/**
 * A mayor or county executive sends the budget as an act in its season (pool
 * item office-budget-season-mayor-act): the act opens the lead time before
 * the fiscal year starts, the executive's changes by line become the
 * government's priorities, the council or board votes the budget with them at
 * the year's start, and the act is on the executive's record. A place is
 * drawn from all 56 on a seed nobody chose (BUDGET_SEASON_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUSINESS_MODULE_ID, ownerOf } from "./modules/business";
import { contractFor } from "./modules/contracts";
import { lawChain } from "./modules/laws";
import spendingData from "./data/budgets/treasury-spending.json" with { type: "json" };
import {
  BUDGETS_MODULE_ID,
  budgetPriorities,
  budgetsOf,
  governments,
} from "./modules/budgets";
import {
  lineForPost,
  sameGovernment,
  townShareOf,
  treasuryMonthsOf,
  treasuryParameter,
} from "./budgets-treasury";
import { officeActsOf, officeHost, prepareAct } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import {
  executiveBudgetChanges,
  LEGISLATURE_MODULE_ID,
  memberKey,
  registerLegislatureHooks,
  type BillRow,
} from "./modules/legislature";
import { hireStaff, servingStaffOf, staffCandidates } from "./modules/staff";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { budgetHearingOf } from "./modules/legislature";
import { coreAPI } from "./state";

const PROVIDERS = (
  spendingData as unknown as {
    providers: {
      lines: Record<
        string,
        { classifications: string[]; purchasedShare: { value: number } }
      >;
    };
  }
).providers.lines;
const seed = process.env.BUDGET_SEASON_SEED ?? randomBytes(8).toString("hex");
// How many times the pre-vote pass reached each bill: a floor-stage hook of
// the test's own, which the hearing must run once and nothing run again.
const hookRuns = new Map<string, number>();
registerLegislatureHooks({
  beforeVote: {
    name: "budget-season-test",
    run: (_api, billId) =>
      hookRuns.set(billId, (hookRuns.get(billId) ?? 0) + 1),
  },
});

it("the executive's budget act opens in its season and its changes are what the council votes", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "budget-season");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const mayor = townSeats(api).find(
      (s) => s.office.kind === "mayor" && s.holder?.personId,
    );
    const city = governments(api).find((g) => g.level === "city");
    if (!mayor || !city) {
      tried.push(`${where}: no mayor or city government`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    // Go to the first day of the season: the lead time before the next fiscal year.
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    if (core.date > open) continue;
    const due = budgetProposalDue(api, officeHost, mayorId);
    expect(due, `${where}: the season opened on ${open}`).not.toBeNull();
    expect(
      budgetProposalDue(api, officeHost, mayorId)?.governmentId,
      where,
    ).toBe(city.id);
    const handler = officeActHandlers(officeHost)["propose-budget"]!;
    // The line the executive changes: one that buys work from the town's
    // firms, the one with the most left over its own payroll, so the
    // treasury pays its purchases to the firm the body awarded the work.
    const cityOrg = core.organizations.get(city.organizationId)!;
    const paidByCity = (orgId: string | undefined) => {
      const org = orgId ? core.organizations.get(orgId) : undefined;
      return (
        org !== undefined &&
        (org.id === cityOrg.id || sameGovernment(org, cityOrg))
      );
    };
    const town = lawChain(api).townPlaceId;
    const kinds = new Set(
      [...core.organizations.values()]
        .filter((o) => o.placeId === town && o.outsideFlow === undefined)
        .map((o) => o.classification ?? ""),
    );
    const wagesOn = (l: string) =>
      [...core.jobs.values()]
        .filter(
          (job) =>
            job.endsAt === undefined &&
            paidByCity(job.organizationId) &&
            lineForPost(city.level, job.id) === l,
        )
        .reduce(
          (n, job) => n + job.wageDailyMinor * treasuryParameter("daysPerYear"),
          0,
        );
    const spending = budgetsOf(api, city.id)[0]!.spendingMinor;
    const line = Object.keys(spending)
      .filter((l) => PROVIDERS[l]?.classifications.some((k) => kinds.has(k)))
      .map((l) => [l, spending[l]! - wagesOn(l)] as const)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    if (!line) {
      tried.push(`${where}: no town firm does a line's purchased work`);
      continue;
    }
    // The executive sends their changes; the act is kept with the priorities' record id.
    prepareAct(api, mayorId, "propose-budget", {
      budget: { changes: { [line]: 1_000_000 } },
    });
    handler(api, mayorId, {} as never);
    expect(budgetPriorities(api, city.id)?.changes, where).toEqual({
      [line]: 1_000_000,
    });
    const kept = officeActsOf(api, mayorId).filter(
      (r) => r.kind === "propose-budget",
    );
    expect(
      kept.map((r) => r.recordId),
      where,
    ).toEqual([`priorities:${city.id}`]);
    // Sent: the act is not offered again this season.
    expect(budgetProposalDue(api, officeHost, mayorId), where).toBeNull();
    // What each line fell short at the last close before the year starts:
    // the first month under the new budget pays it on top of its twelfth.
    advanceCore(core, addDays(makeIsoDate(next), -1));
    const arrearsBefore =
      (
        api.moduleState(BUDGETS_MODULE_ID).table("arrears").get(city.id) as
          { lines: Record<string, number> } | undefined
      )?.lines ?? {};
    // The council votes the budget at the year's start with the executive's changes in its bill.
    advanceCore(core, addDays(makeIsoDate(next), 1));
    // The budget bill the council voted carries the executive's line change, sponsored by the executive.
    const bill = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).find(
      (row) =>
        row.sponsorId === mayorId &&
        row.provisions.some(
          (p) =>
            p.kind === "budget-line" &&
            p.line === line &&
            p.value === 1_000_000,
        ),
    );
    expect(
      bill,
      `${where}: the budget bill with the executive's change`,
    ).toBeDefined();
    // The body heard the budget in its season: after the proposal went out, before the vote, and the vote is on the bill that was heard.
    const fiscalYear = Number(next.slice(0, 4));
    const hearing = budgetHearingOf(api, city.id, fiscalYear);
    expect(
      hearing,
      `${where}: the hearing on the ${fiscalYear} budget`,
    ).toBeDefined();
    expect(hearing!.heldOn, where).toBe(
      addDays(makeIsoDate(next), -api.parameter("budgetHearingLeadDays")),
    );
    expect(hearing!.heldOn < next, where).toBe(true);
    expect(hearing!.proposedBy, where).toBe(mayorId);
    expect(hearing!.billId, `${where}: the vote is on the heard bill`).toBe(
      bill!.id,
    );
    // Every speaker at it is a person on the record of the bill they spoke on.
    for (const id of hearing!.speakerIds)
      expect(api.state.people.has(id), `${where} speaker ${id}`).toBe(true);
    // The priorities are spent once the budget is voted.
    expect(budgetPriorities(api, city.id), where).toBeNull();
    const adopted = budgetsOf(api, city.id).find(
      (b) => b.adoptedOn === next || b.startsOn === next,
    );
    // Each pre-vote handler ran once on the budget bill, at the hearing.
    expect(hookRuns.get(bill!.id), `${where}: hooks on ${bill!.id}`).toBe(1);
    const ran = bill!.hooksRun ?? [];
    expect(new Set(ran).size, `${where}: ${ran.join(", ")}`).toBe(ran.length);
    expect(ran, where).toContain("budget-season-test");
    expect(adopted, `${where}: the ${fiscalYear} budget adopted`).toBeDefined();
    // The treasury reads the passed budget when it pays: the first month
    // closed under it pays the line's twelfth plus what it fell short before.
    const owedBefore = arrearsBefore[line] ?? 0;
    const paidUnder = () =>
      treasuryMonthsOf(api, city.id).find((m) => m.budgetId === adopted!.id);
    for (let day = 0; day < 45 && !paidUnder(); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const month = paidUnder();
    expect(
      month,
      `${where}: a treasury month under ${adopted!.id}`,
    ).toBeDefined();
    const paidLine = month!.lines[line]!;
    // The change the council passed on the line is what moved it: the line
    // in force is last year's plus the passed change, and the month below
    // pays the twelfth of that line.
    const passed =
      (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .get(bill!.id) as unknown as BillRow
      ).provisions.find((p) => p.kind === "budget-line" && p.line === line)
        ?.value ?? 0;
    const priorMonth = [...treasuryMonthsOf(api, city.id)]
      .filter((m) => m.budgetId !== adopted!.id && m.date < month!.date)
      .sort((x, y) => x.date.localeCompare(y.date))
      .at(-1);
    const oldBudget = budgetsOf(api, city.id).find(
      (b) => b.id === priorMonth?.budgetId,
    );
    expect(
      oldBudget,
      `${where}: the budget before ${adopted!.id}`,
    ).toBeDefined();
    // The line as the budget in force carries it at the close (an act may
    // have amended it since the vote; the treasury reads it then).
    const inForce = budgetsOf(api, city.id).find((b) => b.id === adopted!.id)!;
    expect(
      (inForce.spendingMinor[line] ?? 0) -
        (oldBudget!.spendingMinor[line] ?? 0),
      `${where}: ${line} moved by the passed change`,
    ).toBe(passed);
    expect(passed, `${where}: a change on ${line} passed`).not.toBe(0);
    expect(paidLine.dueMinor, `${where}: ${month!.id} ${line}`).toBe(
      Math.round(
        (inForce.spendingMinor[line] ?? 0) / treasuryParameter("monthsPerYear"),
      ) + owedBefore,
    );
    // The money the amended line paid out: the line's purchases go to the
    // town firm the body awarded the work, a share of the line in force (a
    // city buys for the whole town); last year's line would have bought less
    // or more by the passed change.
    const purchased = PROVIDERS[line]!.purchasedShare.value;
    const bought = (due: number) =>
      Math.min(
        Math.max(0, due - paidLine.inTownMinor - paidLine.aidMinor),
        Math.round(due * townShareOf(api, city) * purchased),
      );
    const oldDue =
      Math.round(
        (oldBudget!.spendingMinor[line] ?? 0) /
          treasuryParameter("monthsPerYear"),
      ) + owedBefore;
    const award = contractFor(api, city.id, line);
    // A treasury whose cash at the close is all held back for its own
    // payroll pays no line that month (closeTreasuries): that town cannot
    // show a purchase reaching anyone, so another is drawn.
    if (!month!.paymentIds.length) {
      tried.push(
        `${where}: ${month!.id} made no payment (${line} short ${paidLine.shortMinor} of ${paidLine.dueMinor})`,
      );
      continue;
    }
    expect(award, `${where}: ${line} awarded to a town firm`).toBeDefined();
    const paymentId = `treasury:${city.id}:${line}:${award!.organizationId}:${month!.date}`;
    expect(month!.paymentIds, `${where}: ${month!.id}`).toContain(paymentId);
    expect(award!.paymentIds, `${where}: ${award!.id}`).toContain(paymentId);
    // A treasury short of cash pays every line the same share of what it
    // owes at the close (budgets-treasury.ts, closeTreasuries): read that
    // share off this line's own payments. Each payment rounds down, so the
    // purchase is that share of what the line in force buys, to within one
    // unit per payment.
    const linePayments = month!.paymentIds.filter((id) =>
      id.includes(`:${line}:`),
    );
    const owedOut =
      paidLine.dueMinor - paidLine.inTownMinor - paidLine.aidMinor;
    const share = (paidLine.providersMinor + paidLine.outsideMinor) / owedOut;
    const rounding = linePayments.length + 1;
    expect(
      paidLine.providersMinor,
      `${where}: ${paymentId} paid something`,
    ).toBeGreaterThan(0);
    expect(
      Math.abs(paidLine.providersMinor - bought(paidLine.dueMinor) * share),
      `${where}: ${paymentId} is ${share} of what ${line} buys`,
    ).toBeLessThanOrEqual(rounding);
    // Under last year's line the same share would have paid the firm less
    // (or more, for a cut) by more than the rounding.
    const moved = (bought(paidLine.dueMinor) - bought(oldDue)) * share;
    expect(
      Math.sign(moved),
      `${where}: ${paymentId} moved with the passed change`,
    ).toBe(Math.sign(passed));
    expect(Math.abs(moved), `${where}: ${paymentId}`).toBeGreaterThan(rounding);
    // A person the payment reached, shown by the cash posting itself: the
    // firm's owner, whose next monthly draw is chosen from the profit the
    // business kept (the payment in it), or a worker the firm pays after the
    // payment. Their journal receipts are kept from here (focused), so each
    // transfer to them names the balance it raised.
    const firm = award!.organizationId;
    const owner = ownerOf(api, firm);
    const workers = [...core.jobs.values()]
      .filter((job) => job.endsAt === undefined && job.organizationId === firm)
      .map((job) => job.personId);
    const watched = [...new Set([owner, ...workers])].filter(
      (id): id is string => !!id && core.people.has(id),
    );
    for (const id of watched) core.focusPersonIds.add(id);
    const posting = (personId: string, from: (id: string) => boolean) => {
      for (const id of core.cashJournal.detailedByOwner.get(personId) ?? []) {
        const receipt = core.cashJournal.detailedReceipts.get(id);
        const change = receipt?.owners.get(personId);
        if (
          receipt &&
          change &&
          receipt.date > month!.date &&
          change.afterMinor > change.beforeMinor &&
          (from(receipt.id) || from(receipt.sourceRef.id))
        )
          return {
            personId,
            receiptId: receipt.id,
            gained: change.afterMinor - change.beforeMinor,
          };
      }
      return undefined;
    };
    const drawRows = () =>
      (
        api
          .moduleState(BUSINESS_MODULE_ID)
          .table("draws")
          .rows() as unknown as {
          id: string;
          organizationId: string;
          ownerId: string;
          date: string;
          profitMinor: number;
          drawnMinor: number;
        }[]
      ).filter(
        (row) =>
          row.organizationId === firm &&
          row.date > month!.date &&
          row.drawnMinor > 0,
      );
    const reached = () => {
      for (const draw of drawRows()) {
        const paid =
          owner && watched.includes(owner)
            ? posting(owner, (id) =>
                id.includes(`owner-draw:${firm}:${draw.date}`),
              )
            : undefined;
        if (paid) return { ...paid, via: draw.id, profit: draw.profitMinor };
      }
      for (const id of workers) {
        if (!watched.includes(id)) continue;
        const paid = posting(id, (ref) => ref.includes("work-payroll:"));
        if (paid) return { ...paid, via: "payroll", profit: 0 };
      }
      return undefined;
    };
    for (let day = 0; day < 45 && !reached(); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const person = reached();
    expect(
      person,
      `${where}: a positive cash posting from ${firm} to its owner (${owner ?? "none in town"}) or a worker (${workers.length}) after ${paymentId}`,
    ).toBeDefined();
    expect(person!.gained, `${where}: ${person!.receiptId}`).toBeGreaterThan(0);
    // The rest of the year: the amended line stays in force and every month
    // under it pays the firm its purchases.
    advanceCore(core, addDays(gameStartDate(), 365));
    const under = treasuryMonthsOf(api, city.id).filter(
      (m) => m.budgetId === adopted!.id,
    );
    expect(
      budgetsOf(api, city.id).find((b) => b.id === adopted!.id)!.spendingMinor[
        line
      ],
      `${where}: ${line} in force at the year's end`,
    ).toBe(inForce.spendingMinor[line]);
    const paidMonths = under.filter((m) =>
      contractFor(api, city.id, line)?.paymentIds.some((id) =>
        id.endsWith(`:${m.date}`),
      ),
    );
    process.stdout.write(
      `${where}: mayor ${mayorId} sent priorities:${city.id}; ${hearing!.id} on ${hearing!.heldOn} with ${hearing!.speakerIds.length} speakers; bill ${bill!.id} (hooks once: ${ran.join(", ")}); adopted ${adopted!.id} with ${line} from ${oldBudget!.spendingMinor[line]} to ${inForce.spendingMinor[line]} (passed change ${passed}, proposed 1000000); ${month!.id} paid ${line} due ${paidLine.dueMinor} (last year's line ${oldDue}; in town ${paidLine.inTownMinor}, providers ${paidLine.providersMinor}, ${share.toFixed(4)} of the ${bought(paidLine.dueMinor)} the line buys, against ${Math.floor(bought(oldDue) * share)} under last year's line, outside ${paidLine.outsideMinor}) by ${paymentId} to ${firm} (${award!.id}, ${award!.basis}); reached ${person!.personId} (${person!.personId === owner ? "owner" : "worker"}) by ${person!.via}: journal ${person!.receiptId} raised their balance ${person!.gained}${person!.via === "payroll" ? "" : ` (profit kept ${person!.profit})`}; to ${core.date}: ${paidMonths.length} of ${under.length} months under ${adopted!.id} paid ${firm}${tried.length ? `; drawn before: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  throw new Error(
    `no mayor with a city budget in 6 places: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);

it("the character's own budget is cut by an aide's read of the council", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:advice:${draw}`, "budget-advice");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const mayor = townSeats(api).find(
      (s) => s.office.kind === "mayor" && s.holder?.personId,
    );
    const city = governments(api).find((g) => g.level === "city");
    if (!mayor || !city) {
      tried.push(`${where}: no mayor or city`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    const pick = staffCandidates(api, mayorId)[0];
    if (!pick) {
      tried.push(`${where}: no aide candidate`);
      continue;
    }
    hireStaff(api, {
      officialId: mayorId,
      personId: pick.personId,
      role: "aide",
    });
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    expect(
      servingStaffOf(api, mayorId).length,
      `${where}: the aide serves`,
    ).toBeGreaterThan(0);
    const own = executiveBudgetChanges(api, city.id, Number(next.slice(0, 4)));
    if (!own || !Object.keys(own.changes).length) {
      tried.push(`${where}: the mayor's lean changes no line`);
      continue;
    }
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    const sent = budgetPriorities(api, city.id)?.changes ?? {};
    for (const [line, delta] of Object.entries(sent)) {
      expect(Math.sign(delta), `${where} ${line}`).toBe(
        Math.sign(own.changes[line]!),
      );
      expect(Math.abs(delta), `${where} ${line}`).toBeLessThanOrEqual(
        Math.abs(own.changes[line]!),
      );
    }
    const kept = officeActsOf(api, mayorId).find(
      (r) => r.kind === "propose-budget",
    );
    expect(kept?.detail, where).toMatch(/advice /);
    console.log(
      `${where}: ${kept!.detail}; lines ${Object.keys(own.changes).length} to ${Object.keys(sent).length}`,
    );
    return;
  }
  throw new Error(
    `no mayor with an aide and a budget in 6 places: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);
