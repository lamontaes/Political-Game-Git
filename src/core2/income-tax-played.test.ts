/** Native-year withholding provenance; controlled transition coverage is separate. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { withholdingOf } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";

it("keeps actual tax-law IDs on a named worker's native paychecks", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(randomBytes(32).toString("hex"), "session-a-income-tax");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const person = [...core.people.values()].find(
      (p) => p.alive && p.placeId === town && p.jobId,
    );
    if (person) core.focusPersonIds.add(person.id);
    const paid = new Map<string, unknown>();
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const row of person ? withholdingOf(api, person.id) : []) {
        const income = row.lines.filter((l) => l.tax === "income");
        if (!income.length) continue;
        for (const line of income)
          expect(
            api.moduleState(LAWS_MODULE_ID).table("laws").get(line.lawId),
          ).toBeTruthy();
        paid.set(row.id, row);
      }
    }
    const taxes = api
      .moduleState("core2-law-reach-b-v1")
      .table("taken")
      .rows()
      .filter((r) => String(r.id).startsWith("tax|"));
    const evidence = {
      draw,
      seconds: (performance.now() - started) / 1000,
      date: core.date,
      modules: core.modules.size,
      observed: person
        ? {
            id: person.id,
            name: `${person.givenName} ${person.familyName}`,
            jobId: person.jobId,
          }
        : null,
      withholdings: [...paid.values()],
      transitions: taxes,
      countedTaxEntries: residentsRuntime(core)?.withheld.size ?? 0,
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
}, 300_000);
