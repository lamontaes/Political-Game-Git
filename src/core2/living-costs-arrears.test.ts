/**
 * A household that cannot pay its outside living cost on the 1st pays it when
 * money arrives. Played world in a place drawn from all 56; the place and seed
 * are named in every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { setJournalTrace } from "./journal-state";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("leaves households that earn owing under a tenth of their living costs after 90 days, and the books balance", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "living-costs-arrears");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    // A household that earns pays what it is asked: what it still owes after
    // 90 days is under a tenth of what it was asked. A household with no job
    // and no cash owes what it cannot pay (see the pool item for them).
    const rt = residentsRuntime(core)!;
    let asked = 0,
      owed = 0;
    for (const flow of rt.flows.values()) {
      if (flow.financeKind !== "household.outside-living-costs") continue;
      if (flow.endedAt || flow.payerId === flow.residentsId) continue;
      const home = core.households.get(
        core.people.get(flow.payerId)?.householdId ?? "",
      );
      const earns = (home?.memberIds ?? []).some((id) => {
        const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
        return job !== undefined && job.endsAt === undefined;
      });
      if (!earns) continue;
      asked += flow.amountMinor * 3;
      owed += flow.arrearsMinor;
    }
    expect(asked, where).toBeGreaterThan(0);
    expect(owed / asked, `${where}: owed ${owed} of ${asked}`).toBeLessThan(
      0.1,
    );
    const living = core.finance.totalsByKind.get(
      "household.outside-living-costs",
    );
    expect(living, where).toBeDefined();
    // What is unfunded is what was asked and not yet paid, never more.
    expect(living!.unfundedMinor, where).toBeLessThanOrEqual(
      living!.requestedMinor - living!.paidMinor + 1,
    );
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);

it("writes off a jobless household's living cost unpaid past the charge-off age, so no household owes more than a few bills", () => {
  setBookkeeping(false);
  try {
    // A place where every household paid has nothing to write off: draw on,
    // checking the ceiling and the books in every place drawn, until a place
    // has a household that went unpaid long enough, and name each one passed.
    const passed: string[] = [];
    for (let n = 0; n < 8; n += 1) {
      const draw = drawPlace(`${seed}:${n}`, "living-costs-write-off");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      const api = coreAPI(core);
      const bills = api.parameter("livingCostWriteOffBills");
      const rt = residentsRuntime(core)!;
      const living = () =>
        [...rt.flows.values()].filter(
          (flow) =>
            flow.financeKind === "household.outside-living-costs" &&
            flow.payerId !== flow.residentsId,
        );
      // Whether the household paying a flow holds an active job today (read on the day the write-off is seen).
      const jobless = (payerId: string) => {
        const home = core.households.get(
          core.people.get(payerId)?.householdId ?? "",
        );
        return (
          home !== undefined &&
          !home.memberIds.some((id) => {
            const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
            return job !== undefined && job.endsAt === undefined;
          })
        );
      };
      // The whole year, a day at a time: a household with no job and no cash
      // misses bill after bill until the cost is charged off, and each
      // write-off is matched to the household's jobs on the day it happens.
      const before = new Map<string, number>();
      let found:
        | {
            flowId: string;
            householdId: string;
            date: string;
            written: number;
            owes: number;
            bill: number;
          }
        | undefined;
      const start = core.date;
      for (let day = 0; day < 365; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        for (const flow of living()) {
          const written = flow.writtenOffMinor ?? 0;
          if (
            !found &&
            written > (before.get(flow.id) ?? 0) &&
            jobless(flow.payerId)
          )
            found = {
              flowId: flow.id,
              householdId: core.people.get(flow.payerId)!.householdId,
              date: core.date,
              written,
              owes: flow.arrearsMinor,
              bill: flow.amountMinor,
            };
          before.set(flow.id, written);
        }
      }
      expect(core.date, where).toBe(addDays(makeIsoDate(start), 365));
      let worst = 0;
      for (const flow of living()) {
        // Owing never passes the ceiling, whoever the household is.
        expect(
          flow.arrearsMinor,
          `${where}: ${flow.id} owes ${flow.arrearsMinor} of a ${flow.amountMinor} bill`,
        ).toBeLessThanOrEqual(Math.round(flow.amountMinor * bills) + 1);
        worst = Math.max(
          worst,
          flow.arrearsMinor / Math.max(1, flow.amountMinor),
        );
      }
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      // Not vacuous: a household with no active job went unpaid long enough
      // to have its living cost written off.
      if (found) {
        expect(found.written, `${where}: ${found.flowId}`).toBeGreaterThan(0);
        expect(
          found.owes,
          `${where}: ${found.flowId} (household ${found.householdId}) owes ${found.owes} of a ${found.bill} bill`,
        ).toBeLessThanOrEqual(Math.round(found.bill * bills) + 1);
        process.stdout.write(
          `living-cost write-off: ${where}; household ${found.householdId} with no active job on ${found.date}; flow ${found.flowId}; written off ${found.written}\n`,
        );
        return;
      }
      passed.push(`${where} (worst ${worst} bills)`);
    }
    throw new Error(
      `no drawn place wrote off a jobless household's living cost in 8 draws: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it("a full household and a counted group each carry a living cost across a day with no new bill and repay it when cash arrives, and the books balance", () => {
  setBookkeeping(false);
  try {
    // A year, a day at a time, in places drawn from all 56 until one shows all
    // four witnesses; every place tried is named when none does.
    const tried: string[] = [];
    for (let n = 0; n < 6; n += 1) {
      const draw = drawPlace(`${seed}:${n}`, "living-costs-arrears-both-tiers");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      const rt = residentsRuntime(core)!;
      const living = () =>
        [...rt.flows.values()].filter(
          (flow) =>
            flow.financeKind === "household.outside-living-costs" &&
            !flow.endedAt,
        );
      // Every journal entry a living-cost settlement posts today, by the
      // settlement id it carries (the flow id, @, the day, and for a second
      // payer in a household, its id).
      const posted = new Map<
        string,
        {
          journalId: string;
          postings: { accountId: string; deltaMinor: number }[];
        }[]
      >();
      setJournalTrace((entry) => {
        if (!entry.sourceRef.id.includes(":outside-living:")) return;
        const list = posted.get(entry.sourceRef.id) ?? [];
        list.push({ journalId: entry.id, postings: [...entry.postings] });
        posted.set(entry.sourceRef.id, list);
      });
      /** A settlement's entries today: the flow's own id and any second payer's. */
      const entriesOf = (flowId: string, date: string) =>
        [...posted]
          .filter(
            ([id]) =>
              id === `${flowId}@${date}` || id.startsWith(`${flowId}@${date}:`),
          )
          .flatMap(([, list]) => list);
      // Yesterday's owed amount, written-off total and next bill date, by full
      // flow and by counted group.
      const flowBefore = new Map<
        string,
        { owed: number; written: number; nextAt: string }
      >();
      const groupBefore = new Map<number, number>();
      const seen: Record<
        "fullCarried" | "fullRepaid" | "countedCarried" | "countedRepaid",
        string | undefined
      > = {
        fullCarried: undefined,
        fullRepaid: undefined,
        countedCarried: undefined,
        countedRepaid: undefined,
      };
      for (const flow of living())
        flowBefore.set(flow.id, {
          owed: flow.arrearsMinor,
          written: flow.writtenOffMinor ?? 0,
          nextAt: flow.nextAt,
        });
      for (const [group, owed] of rt.livingArrears)
        groupBefore.set(group, owed);
      for (let day = 0; day < 365; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const flows = living();
        // A day with no new bill: no living-cost flow moved its next bill date.
        const noNewBill = flows.every(
          (flow) => flowBefore.get(flow.id)?.nextAt === flow.nextAt,
        );
        if (noNewBill) {
          for (const flow of flows) {
            const before = flowBefore.get(flow.id);
            if (!before || flow.payerId === flow.residentsId) continue;
            if (before.owed > 0 && flow.arrearsMinor > 0)
              seen.fullCarried ??= `flow ${flow.id} on ${core.date}: owed ${before.owed} then ${flow.arrearsMinor}`;
            if (before.owed > 0 && flow.arrearsMinor < before.owed) {
              // A repayment is a payment: today's settlement entries debit the
              // household and credit the payee, and what it owes fell by
              // exactly what it paid plus what was written off.
              const entries = entriesOf(flow.id, core.date);
              const payee = core.cashJournal.residualAccountByOwner.get(
                flow.payeeId,
              );
              const paid = entries
                .flatMap((e) => e.postings)
                .filter((p) => p.accountId === payee && p.deltaMinor > 0)
                .reduce((n, p) => n + p.deltaMinor, 0);
              const debited = entries
                .flatMap((e) => e.postings)
                .filter((p) => p.deltaMinor < 0)
                .reduce((n, p) => n - p.deltaMinor, 0);
              const written = (flow.writtenOffMinor ?? 0) - before.written;
              const at = `${where}: flow ${flow.id} on ${core.date}`;
              expect(before.owed - flow.arrearsMinor, at).toBe(paid + written);
              if (paid > 0) {
                expect(debited, `${at}: the payer's debit`).toBe(paid);
                seen.fullRepaid ??= `flow ${flow.id} on ${core.date}: owed ${before.owed} then ${flow.arrearsMinor}; paid ${paid} by journal ${entries.map((e) => e.journalId).join(", ")}`;
              }
            }
          }
          // Each counted group owes on the flow of its own place; its payment
          // is the line out of its own fund in that flow's settlement entry.
          const writtenByFlow = new Map<string, number>();
          for (const [group, owed] of rt.livingArrears) {
            const before = groupBefore.get(group) ?? 0;
            if (before <= 0) continue;
            const placeId = rt.store.groups[group]!.placeId;
            const flow = flows.find(
              (f) => f.payerId === f.residentsId && f.placeId === placeId,
            );
            const at = `${where}: group ${group} on ${core.date}`;
            expect(flow, `${at}: its place's living-cost flow`).toBeDefined();
            if (owed > 0)
              seen.countedCarried ??= `group ${group} on ${core.date}: owed ${before} then ${owed} on ${flow!.id}`;
            if (owed >= before) continue;
            const fund = rt.funds.get(group);
            const entries = entriesOf(flow!.id, core.date);
            const lines = entries.flatMap((e) => e.postings);
            const paid = fund
              ? lines
                  .filter((p) => p.accountId === fund && p.deltaMinor < 0)
                  .reduce((n, p) => n - p.deltaMinor, 0)
              : 0;
            const written = before - owed - paid;
            expect(
              written,
              `${at}: paid ${paid} of ${before - owed}`,
            ).toBeGreaterThanOrEqual(0);
            writtenByFlow.set(
              flow!.id,
              (writtenByFlow.get(flow!.id) ?? 0) + written,
            );
            if (paid > 0) {
              const credited = lines
                .filter((p) => p.deltaMinor > 0)
                .reduce((n, p) => n + p.deltaMinor, 0);
              expect(
                credited,
                `${at}: the payee's credit`,
              ).toBeGreaterThanOrEqual(paid);
              seen.countedRepaid ??= `group ${group} on ${core.date}: owed ${before} then ${owed}; paid ${paid} from fund ${fund} by journal ${entries.map((e) => e.journalId).join(", ")} on ${flow!.id}`;
            }
          }
          // What the groups' debt fell by beyond their payments is exactly
          // what each counted flow wrote off today.
          for (const flow of flows) {
            if (flow.payerId !== flow.residentsId) continue;
            const before = flowBefore.get(flow.id);
            if (!before) continue;
            expect(
              writtenByFlow.get(flow.id) ?? 0,
              `${where}: ${flow.id} written off on ${core.date}`,
            ).toBe((flow.writtenOffMinor ?? 0) - before.written);
          }
        }
        for (const flow of flows)
          flowBefore.set(flow.id, {
            owed: flow.arrearsMinor,
            written: flow.writtenOffMinor ?? 0,
            nextAt: flow.nextAt,
          });
        posted.clear();
        for (const [group, owed] of rt.livingArrears)
          groupBefore.set(group, owed);
        // Every day: the flow's arrears hold exactly what its groups owe, and
        // the journal balances.
        if (day % 30 === 0 || day === 364) {
          const counted = flows.filter((f) => f.payerId === f.residentsId);
          const byGroups = [...rt.livingArrears.values()].reduce(
            (a, v) => a + v,
            0,
          );
          expect(
            counted.reduce((a, f) => a + f.arrearsMinor, 0),
            `${where} on ${core.date}: counted flows carry what groups owe`,
          ).toBe(byGroups);
          expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
            core.cashJournal.totals.grossCreditMinor,
          );
        }
      }
      if (Object.values(seen).every(Boolean)) {
        process.stdout.write(
          `living-cost arrears: ${where}\n  full carried: ${seen.fullCarried}\n  full repaid: ${seen.fullRepaid}\n  counted carried: ${seen.countedCarried}\n  counted repaid: ${seen.countedRepaid}\n`,
        );
        return;
      }
      tried.push(
        `${where}: ${Object.entries(seen)
          .filter(([, v]) => !v)
          .map(([k]) => k)
          .join(", ")} missing`,
      );
    }
    throw new Error(
      `no drawn place showed a carried and a repaid living cost in both tiers: ${tried.join("; ")}`,
    );
  } finally {
    setJournalTrace(null);
    setBookkeeping(true);
  }
}, 3_600_000);
