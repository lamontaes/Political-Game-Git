/** Tax law reads in the played world; controlled cap cases follow the native year. */
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
import { ownedHomes } from "./modules/housing";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import capData from "./data/laws/reach-group-b-parameters.json" with { type: "json" };
import statutes from "./data/laws/property-tax-caps.json" with { type: "json" };

const question = "us-policy-positions:fiscal.cap-property-tax-growth";
it("settles owners' tax bills and reads assessment caps when deciding next year's value", () => {
  const pinned = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : undefined;
  const drawSeed = randomBytes(32).toString("hex");
  const tried: string[] = [];
  setBookkeeping(false);
  try {
    // A town with an owned home and a property tax in force; a pinned draw is
    // the only one tried.
    for (let attempt = 0; attempt < (pinned ? 1 : 4); attempt += 1) {
      const draw =
        pinned ?? drawPlace(`${drawSeed}:${attempt}`, "session-a-property-tax");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const receipts = new Map<string, unknown>();
      let observedOwner: string | undefined;
      const dayTimes: { date: string; ms: number }[] = [];
      const started = performance.now();
      for (let day = 0; day < 365; day++) {
        const dayStart = performance.now();
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        dayTimes.push({ date: core.date, ms: performance.now() - dayStart });
        if (!observedOwner) {
          const home = ownedHomes(api).find((h) =>
            core.households.has(h.householdId),
          );
          observedOwner =
            home && core.households.get(home.householdId)?.memberIds[0];
          if (observedOwner) core.focusPersonIds.add(observedOwner);
        }
        for (const receipt of core.cashJournal.detailedReceipts.values()) {
          if (!receipt.sourceRef.id.startsWith("property-tax:")) continue;
          receipts.set(receipt.id, {
            id: receipt.id,
            date: receipt.date,
            sourceRef: receipt.sourceRef,
            postings: receipt.postings,
            owners: [...receipt.owners],
          });
        }
      }
      const housing = api.moduleState("housing");
      const evidence = {
        draw,
        slowestDays: dayTimes.sort((a, b) => b.ms - a.ms).slice(0, 8),
        seconds: (performance.now() - started) / 1000,
        date: core.date,
        modules: core.modules.size,
        cap: lawInForce(api, question),
        rate: lawInForce(api, "property-tax"),
        observedOwner: observedOwner
          ? {
              id: observedOwner,
              name: `${core.people.get(observedOwner)?.givenName} ${core.people.get(observedOwner)?.familyName}`,
            }
          : null,
        assessments: housing.table("assessments").rows(),
        arrears: housing.table("taxArrears").rows(),
        receipts: [...receipts.values()],
        journalTotals: core.cashJournal.totals,
      };
      if (process.env.LAW_LINK_PROOF)
        writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      expect(
        housing
          .table("taxArrears")
          .rows()
          .some((r) => String(r.householdId).startsWith("counted:")),
      ).toBe(false);

      // Controlled cases below establish binding and repeal, not native play acceptance.
      const home = ownedHomes(api)[0];
      if (!home || !lawInForce(api, "property-tax").governing) {
        tried.push(`${draw.name ?? draw.key}`);
        continue;
      }
      const table = housing.table("assessments");
      const id = `assessment:${home.householdId}`;
      const base = Math.round(home.valueMinor / 2);
      const changeLaw = (value: number) => {
        for (const level of lawChain(api).levels)
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: question,
            value,
            effectiveDate: core.date,
            measureId: `fixture:tax-cap:${value}`,
            citation:
              "Controlled cap/repeal edge case after the generated year.",
          });
        table.put({
          ...table.get(id)!,
          id,
          householdId: home.householdId,
          assessedMinor: base,
          year: Number(core.date.slice(0, 4)) - 1,
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 32));
      };
      changeLaw(1);
      // The state's own statute where its row is read, else the estimate.
      const capShare =
        (statutes.states as Record<string, { capShare: number }>)[
          lawChain(api).stateKey.slice(3)
        ]?.capShare ?? capData.parameters.propertyTaxGrowthCapShare.value;
      expect(table.get(id)?.assessedMinor).toBe(
        Math.round(base * (1 + capShare)),
      );
      expect(String(table.get(id)?.capLawId)).toContain("fixture:tax-cap:1");
      changeLaw(0);
      expect(table.get(id)?.capLawId).toBeNull();
      expect(Number(table.get(id)?.assessedMinor)).toBeGreaterThan(base);
      return;
    }
    throw new Error(
      `no drawn town had an owned home and a property tax: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);

it("each state's cap statute row names its size, scope and source, inside the Lincoln Institute's range of caps", () => {
  const rows = Object.entries(statutes.states);
  expect(rows.length).toBeGreaterThanOrEqual(8);
  for (const [state, row] of rows) {
    expect(state, state).toMatch(/^[A-Z]{2}$/);
    expect(row.capShare, state).toBeGreaterThanOrEqual(0.02);
    expect(row.capShare, state).toBeLessThanOrEqual(0.1);
    expect(["all", "homestead", "residential"], state).toContain(row.scope);
    expect(row.source.length, state).toBeGreaterThan(40);
  }
  expect(statutes.tag).toBe("SOURCED");
});
