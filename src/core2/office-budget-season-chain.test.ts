/**
 * The budget season reaches a payment and a person (pool item
 * office-budget-season-payment-chain): the executive's amended line is the
 * adopted budget's line, the treasury's next months pay against it, and the
 * employee whose pay draws on that line is paid from that treasury in those
 * months. A place is drawn from all 56 on a seed nobody
 * chose (BUDGET_CHAIN_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  lineForPost,
  sameGovernment,
  treasuryMonthsOf,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { memberKey } from "./modules/legislature";
import { publicPayTreasuries } from "./public-work-pay";
import { prepareAct, officeHost } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.BUDGET_CHAIN_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("the mayor's amended line is the adopted line, paid against in the next months, and reaches a city employee's payday", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 20; draw += 1) {
    // BUDGET_CHAIN_PIN="<place key>:<world seed>" replays one failing place.
    const pin = process.env.BUDGET_CHAIN_PIN?.split(":");
    const place = pin
      ? { key: pin[0]!, seed: pin[1]!, name: "pinned", state: "" }
      : drawPlace(`${seed}:${draw}`, "budget-chain");
    const where = `${place.name} (${place.key}), world seed ${place.seed}, run seed ${seed} draw ${draw}`;
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
      tried.push(`${where}: no mayor or city government`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    // A city employee paid from the city treasury (an opening public employer's commitment).
    const links = publicPayTreasuries(core);
    const treasuryOrg = core.organizations.get(city.organizationId);
    const employees = [...core.work.commitments.values()]
      .filter((c) => {
        const authority = c.publicPayAuthorityId;
        const employer = core.organizations.get(c.organizationId);
        return (
          authority !== undefined &&
          links.get(authority)?.treasuryId === city.organizationId &&
          employer !== undefined &&
          treasuryOrg !== undefined &&
          sameGovernment(employer, treasuryOrg)
        );
      })
      .sort((x, y) => x.id.localeCompare(y.id));
    const commitment = employees[0];
    if (!commitment) {
      tried.push(`${where}: no city employee paid from the treasury`);
      continue;
    }
    // The line that employee's pay draws on.
    const line = lineForPost(city.level, commitment.jobId);
    // Everyone whose pay draws on that line: a payday for any of them is the chain.
    const onLine = employees.filter(
      (c) => lineForPost(city.level, c.jobId) === line,
    );
    const onLineIds = new Set(onLine.map((c) => c.id));
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    if (core.date > open) continue;
    expect(budgetProposalDue(api, officeHost, mayorId), where).not.toBeNull();
    const priorLine = budgetsOf(api, city.id).at(-1)!.spendingMinor[line];
    // The mayor asks to raise the line by half; the budget bill adds the change to the line.
    const change = Math.floor((priorLine ?? 0) / 2);
    prepareAct(api, mayorId, "propose-budget", {
      budget: { changes: { [line]: change } },
    });
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    // The treasury's paydays on that employee's commitment, from the adoption on.
    const paydays: { id: string; date: string; commitmentId: string }[] = [];
    const post = api.postJournal.bind(api);
    api.postJournal = (entry) => {
      if (
        entry.sourceRef.kind === "work-payroll" &&
        [...onLineIds].some((id) => entry.sourceRef.id.includes(id)) &&
        entry.postings.some(
          (p) => p.accountId.includes(city.organizationId) && p.deltaMinor < 0,
        )
      )
        paydays.push({
          id: entry.sourceRef.id,
          date: api.state.date,
          commitmentId: [...onLineIds].find((id) =>
            entry.sourceRef.id.includes(id),
          )!,
        });
      return post(entry);
    };
    advanceCore(core, addDays(makeIsoDate(next), 62));
    const adopted = budgetsOf(api, city.id).find(
      (b) => b.startsOn === next || b.adoptedOn === next,
    );
    expect(adopted, `${where}: the budget adopted for ${next}`).toBeDefined();
    expect(
      adopted!.spendingMinor[line],
      `${where}: ${line} was ${priorLine}, the mayor sent +${change}; ${JSON.stringify(adopted!.spendingMinor)}`,
    ).toBe((priorLine ?? 0) + change);
    // The treasury paid against the adopted budget in the months after.
    const months = treasuryMonthsOf(api, city.id).filter(
      (row) => row.budgetId === adopted!.id,
    );
    expect(
      months.length,
      `${where}: treasury months on ${adopted!.id}`,
    ).toBeGreaterThan(0);
    // The line is paid against in town: wages spent in town, or payments to the line's payee groups.
    const month = months.find(
      (row) =>
        (row.lines[line]?.dueMinor ?? 0) > 0 &&
        (row.lines[line]!.inTownMinor > 0 ||
          row.paymentIds.some((id) => id.includes(`:${line}:`))),
    );
    expect(month, `${where}: a month paying on ${line}`).toBeDefined();
    const paid = month!.paymentIds.filter((id) => id.includes(`:${line}:`));
    // The person: the city employee, paid from this treasury after the adoption.
    const after = paydays.filter((d) => d.date >= next);
    expect(
      after.length,
      `${where}: no payday after ${next} for any of ${onLine.length} employees on ${line}: ${onLine.map((c) => `${c.personId} ${c.id} ends ${c.endsAt ?? "never"} ledger ${JSON.stringify(core.work.payrollLedgerByCommitment.get(c.id) ?? null)}`).join("; ")}`,
    ).toBeGreaterThan(0);
    const paidCommitment = core.work.commitments.get(after[0]!.commitmentId)!;
    console.log(
      `${where}: line ${line} ${priorLine} -> ${adopted!.spendingMinor[line]} on ${adopted!.id}; ${month!.id} due ${month!.lines[line]!.dueMinor} in town ${month!.lines[line]!.inTownMinor} payments ${paid.join(",")}; ${paidCommitment.personId} (${paidCommitment.jobId}) paid by ${after[0]!.id}\n`,
    );
    return;
  }
  throw new Error(
    `no mayor with a city budget and salary in 20 places: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);
