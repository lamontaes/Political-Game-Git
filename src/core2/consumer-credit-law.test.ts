/** A native played year distinguishes a live cap read from an actually binding cap. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, fillInPerson } from "./state";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { lawInForce } from "./modules/laws";

const question =
  "us-policy-positions:business-commerce.cap-consumer-loan-rates";
it("quotes native personal loans using the law, and preserves their actual payments", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(randomBytes(32).toString("hex"), "session-a-consumer-credit");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const credit = api.moduleState("credit");
    const receipts = new Map<string, unknown>();
    let observed: string | undefined;
    let observedAt: string | undefined;
    let openedCounted = false;
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      if (!observed) {
        const loan = credit
          .table("loans")
          .rows()
          .find((r) => r.kind === "personal");
        if (loan) {
          observed = String(loan.borrowerId);
          observedAt = core.date;
          openedCounted = !core.people.has(observed);
          core.focusPersonIds.add(observed);
          if (openedCounted) fillInPerson(core, observed);
        }
      }
      for (const receipt of core.cashJournal.detailedReceipts.values()) {
        if (!receipt.sourceRef.id.startsWith("loan-payment:")) continue;
        receipts.set(receipt.id, {
          id: receipt.id,
          date: receipt.date,
          sourceRef: receipt.sourceRef,
          postings: receipt.postings,
          owners: [...receipt.owners],
        });
      }
    }
    const applications = credit
      .table("applications")
      .rows()
      .filter((r) => r.kind === "personal");
    for (const application of applications) {
      const market = Number(application.marketAnnualRate);
      expect(application.annualRate).toBe(
        application.ceilingAnnualRate === null
          ? market
          : Math.min(market, Number(application.ceilingAnnualRate)),
      );
      if (application.ceilingAnnualRate !== null)
        expect(String(application.lawId)).toContain(question);
    }
    const person = observed
      ? (core.people.get(observed) ?? residentPerson(core, observed))
      : undefined;
    const evidence = {
      draw,
      seconds: (performance.now() - started) / 1000,
      date: core.date,
      modules: core.modules.size,
      law: lawInForce(api, question),
      observed: person
        ? { id: person.id, name: `${person.givenName} ${person.familyName}` }
        : null,
      observedAt,
      openedCounted,
      applications,
      countedApplications: applications.filter(
        (row) => !core.people.has(String(row.borrowerId)),
      ),
      settledCountedWageFlows: [
        ...(residentsRuntime(core)?.wageFlowByJob.values() ?? []),
      ].filter((flow) => flow.lastRequestedMinor !== undefined).length,
      loans: credit
        .table("loans")
        .rows()
        .filter((r) => r.kind === "personal"),
      payments: credit.table("payments").rows(),
      receipts: [...receipts.values()],
      journal: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
