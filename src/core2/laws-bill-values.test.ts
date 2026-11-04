/** Draft views read generated records; no vote or enacted law is supplied. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { budgetInForce, governments } from "./modules/budgets";
import { billValueInForce, lawInForce } from "./modules/laws";
import {
  billJurisdiction,
  bodyRow,
  billReach,
  billSections,
  currentAmount,
  draftBill,
  memberKey,
  members,
  type Provision,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const places = [
  // Denver records a non-numeric occupational income-tax amount; keep null.
  {
    name: "Denver, Colorado",
    key: "0820000",
    seed: "bill-null-amount",
    replay: "bill-null-amount",
  },
  {
    name: "Brookside, Delaware",
    key: "1009850",
    seed: "4d50e1f88df997f9",
    replay: "4d50e1f88df997f9",
  },
  ...[0, 1].map((i) => ({
    ...drawPlace(`${replay}:${i}`, "bill-values"),
    replay: `${replay}:${i}`,
  })),
];

for (const place of places) {
  it(`draft values cite their government's records in ${place.name}, replay ${place.replay}`, () => {
    setBookkeeping(false);
    process.stdout.write(`BILL-VALUES ${JSON.stringify(place)}\n`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = [
      ...new Map(
        townSeats(api)
          .filter(
            ({ office }) =>
              bodyRow(office.kind) && members(api, office.id).length > 0,
          )
          .map(({ office }) => [office.id, office]),
      ).values(),
    ];
    const seen = new Set<string>();
    let budgetsChecked = 0;
    let stateChecked = 0;
    let localChecked = 0;
    for (const office of offices) {
      if (office.level === "federal") continue;
      const draft = (provisions: readonly Provision[]) =>
        draftBill(api, {
          bodyOfficeId: office.id,
          sponsorId: memberKey(members(api, office.id)[0]!),
          provisions,
        });
      const tax = draft([
        { kind: "law-amount", series: "income-tax", value: 1, unit: "percent" },
      ]);
      const jurisdiction = billJurisdiction(api, tax);
      if (seen.has(jurisdiction)) continue;
      seen.add(jurisdiction);
      const level = billReach(api, tax).state ? "state" : "city";
      if (level === "state") stateChecked++;
      else localChecked++;
      const ownTax = lawInForce(api, "income-tax").levels.find(
        (row) => row.jurisdiction === jurisdiction,
      )?.row;
      const paper = billSections(api, tax)[0]!;
      expect(paper.before.value, tax.id).toBe(ownTax ? ownTax.value : 0);
      expect(paper.before.lawId, tax.id).toBe(ownTax?.id ?? null);
      if (level === "state")
        expect(currentAmount(api, "income-tax", "state")).toBe(
          ownTax ? ownTax.value : 0,
        );
      // Income tax is currently offered only in the city catalog. Do not
      // expand that eligibility as part of correcting the value reader.
      const policies = billCatalog(api, level, jurisdiction).flatMap((menu) =>
        menu.topics.flatMap((topic) => topic.policies),
      );
      const taxCard = policies.find((p) => p.series === "income-tax");
      if (level === "city") {
        expect(taxCard, jurisdiction).toBeDefined();
        expect(taxCard!.inForce, jurisdiction).toBe(paper.before.value);
        expect(taxCard!.inForceRecordId, jurisdiction).toBe(paper.before.lawId);
      }
      process.stdout.write(
        `BILL-VALUE ${JSON.stringify({
          town: place.name,
          replay: place.replay,
          billId: tax.id,
          jurisdiction,
          before: paper.before.value,
          lawId: paper.before.lawId,
          catalog: taxCard?.inForce ?? "not offered at this level",
        })}\n`,
      );

      const gov =
        governments(api).find((g) => g.id === jurisdiction) ??
        governments(api).find(
          (g) =>
            core.organizations.get(g.organizationId)?.governmentFacts
              ?.governmentKey === jurisdiction,
        );
      const budget = gov && budgetInForce(api, gov.id);
      const policy = policies.find(
        (p) =>
          p.kind === "budget-line" &&
          p.line &&
          budget?.spendingMinor[p.line] !== undefined,
      );
      if (budget && policy?.line) {
        const bill = draft([
          { kind: "budget-line", line: policy.line, value: 100 },
        ]);
        const section = billSections(api, bill)[0]!;
        const value = budget.spendingMinor[policy.line]!;
        expect(policy.inForce).toBe(value);
        expect(policy.inForceRecordId).toBe(budget.id);
        expect(section.before.value).toBe(value);
        expect(section.after.value).toBe(value + 100);
        expect(billValueInForce(api, policy, jurisdiction).recordId).toBe(
          budget.id,
        );
        budgetsChecked++;
        process.stdout.write(
          `BILL-BUDGET ${JSON.stringify({
            town: place.name,
            replay: place.replay,
            billId: bill.id,
            budgetId: budget.id,
            line: policy.line,
            value,
          })}\n`,
        );
      }
      // A later section keeps the earlier section's amount, even though
      // the live law remains unchanged while this draft is being read.
      const phased = draft([
        {
          kind: "law-amount",
          series: "income-tax",
          value: 2,
          effectiveDate: "2027-01-01",
        },
        {
          kind: "law-amount",
          series: "income-tax",
          value: 3,
          effectiveDate: "2028-01-01",
        },
      ]);
      const sections = billSections(api, phased);
      expect(sections[0]!.before.value).toBe(ownTax ? ownTax.value : 0);
      expect(sections[1]!.before.value).toBe(2);
      expect(sections[1]!.after.value).toBe(3);
    }
    expect(stateChecked, place.name).toBeGreaterThan(0);
    expect(localChecked, place.name).toBeGreaterThan(0);
    expect(budgetsChecked, place.name).toBeGreaterThan(0);
  }, 240_000);
}
