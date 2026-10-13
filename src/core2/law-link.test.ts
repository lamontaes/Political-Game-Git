/** LAW-LINK: an enacted law must reach a price, money, or a measure the game reads. */
import { randomBytes } from "node:crypto";
// The same proof runs directly in Node (without Vite transform cost) and in Vitest.
import * as nodeTest from "node:test";
const vitest = process.env.VITEST ? await import("vitest") : undefined;
const afterEach = vitest?.afterEach ?? nodeTest.afterEach;
const describe = (name: string, body: () => void) => {
  if (vitest) vitest.describe(name, body);
  else nodeTest.describe(name, body);
};
const it = (name: string, body: () => void) => {
  if (vitest) vitest.it(name, body, 300_000);
  else nodeTest.it(name, { timeout: 300_000 }, body);
};
import assert from "node:assert/strict";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../simulation/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import {
  OUTCOME_WEB_MODULE_ID,
  placeOutcome,
  type WebMonth,
} from "./modules/outcome-web";
import { BUDGETS_MODULE_ID, type withholdingOf } from "./modules/budgets";
import { REACH_A_MODULE_ID } from "./law-reach/group-a-records";
import { withholdingFor } from "./tax-withholding";
import { residentsRuntime } from "./modules/residents";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import { outcomeIssueView } from "./modules/views";
import { WEB_LINKS } from "./outcome-web-model";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import groupA from "./data/laws/reach-group-a.json" with { type: "json" };
import groupB from "./data/laws/reach-group-b.json" with { type: "json" };
import construction from "./data/housing/construction.json" with { type: "json" };

const questions = [
  ...new Set(
    catalog.subjects.flatMap((s) =>
      s.topics.flatMap((t) =>
        (t.policies ?? []).flatMap((p) =>
          "question" in p ? [p.question as string] : [],
        ),
      ),
    ),
  ),
].sort();
const seed = process.env.LAW_LINK_SEED ?? randomBytes(16).toString("hex");
const drawn = drawPlace(seed, "law-link");
const evidence = new Map<
  string,
  {
    recordId: string;
    measure: string;
    before: number;
    after: number;
    lawId: string;
  }
>();
const reasons = new Map<string, string>();
afterEach(() => (globalThis as { gc?: () => void }).gc?.());

it("contains every policy and rejects note-only mechanics", () => {
  assert.equal(questions.length, 59);
  for (const question of questions) {
    assert.ok(
      WEB_LINKS.some((l) => l.from === `law:${question}`),
      question,
    );
  }
  const unfinished = [
    ...Object.entries(groupA.policies),
    ...Object.entries(groupB.policies),
  ]
    .filter(([, p]) => ["none", "records"].includes(p.mechanic))
    .map(([key]) => key);
  assert.deepEqual(unfinished, [], "A person-record note is not an effect");
});

describe("59 policies in the played world, 90 days", () => {
  for (const question of questions)
    it(question, () => {
      setBookkeeping(false);
      console.log(JSON.stringify({ lawLinkSeed: seed, place: drawn }));
      const started = performance.now();
      const world = buildBenchWorld(drawn.seed, "2026-01-01", {
        twoLevel: true,
        placeKey: drawn.key,
      });
      const core = world.core,
        api = coreAPI(core),
        chain = lawChain(api);
      core.observer = true; // Keep the existing cash journal for payment evidence in this test.

      const enact = (question: string, value: number) =>
        enactLaw(api, {
          jurisdiction: question.startsWith("us-federal-")
            ? "US"
            : chain.stateKey,
          level: question.startsWith("us-federal-") ? "federal" : "state",
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `law-link:${question}:${value}`,
          citation: "LAW-LINK played-world enactment through the laws engine.",
        });
      // Establish the counterfactual through the actual law writer, not inserted records.
      enact(question, 0);
      advanceCore(core, "2026-01-02");
      const table = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
      const before = table.get(
        `web:${chain.townPlaceId}:2026-01`,
      ) as unknown as WebMonth;
      const prices = api.moduleState(PLACE_PRICES_MODULE_ID).table("rules");
      const oldPrices = new Map(
        prices.rows().map((row) => [row.id, row.value]),
      );
      const oldHourly = new Map(
        [...core.jobs.values()].map((job) => [job.id, job.hourlyMinor]),
      );
      const oldIncomeTax = lawInForce(api, "income-tax");
      const lawId = enact(question, 1).id;
      const end = addDays(makeIsoDate(core.date), 90);
      advanceCore(core, end);
      assert.equal(core.date, end);
      assert.equal(
        core.cashJournal.totals.grossDebitMinor,
        core.cashJournal.totals.grossCreditMinor,
        "Every dollar balances",
      );

      const after = [...table.query("byPlace", [chain.townPlaceId])].sort(
        (a, b) => String(b.date).localeCompare(String(a.date)),
      )[0] as unknown as WebMonth;
      {
        const links = WEB_LINKS.filter((l) => l.from === `law:${question}`);
        for (const link of links) {
          // Attribute a lagged reading to this enactment, not to an older law
          // or the web's immediate reset to its calibrated baseline.
          const [year, month, day] = after.date.split("-").map(Number);
          const causeDate = new Date(
            Date.UTC(year!, month! - 1 - link.lagMonths, Math.min(day!, 28)),
          )
            .toISOString()
            .slice(0, 10);
          if (lawInForce(api, question, causeDate).governing?.id !== lawId)
            continue;
          const delta =
            (after.effects[link.key] ?? 0) - (before.effects[link.key] ?? 0);
          const reading = placeOutcome(api, chain.townPlaceId, link.to);
          const view = outcomeIssueView(api, chain.townPlaceId, question, 0.5);
          if (
            delta &&
            reading &&
            reading.value !== before.values[link.to] &&
            view.recordIds.includes(after.id)
          ) {
            evidence.set(question, {
              recordId: after.id,
              measure: link.to,
              before: before.values[link.to]!,
              after: reading.value,
              lawId,
            });
            break;
          }
        }
        if (!evidence.has(question)) {
          const changedPrice = prices
            .rows()
            .find(
              (row) =>
                String(row.cause).includes(lawId) &&
                typeof row.value === "number" &&
                row.value !== oldPrices.get(row.id) &&
                row.value !== 0,
            );
          if (changedPrice)
            evidence.set(question, {
              recordId: changedPrice.id,
              measure: `price:${changedPrice.good}:${changedPrice.kind}`,
              before: Number(oldPrices.get(changedPrice.id) ?? 0),
              after: Number(changedPrice.value),
              lawId,
            });
        }
        if (!evidence.has(question)) {
          // A wage is an actual price on the job record, not a person's law note.
          const raise = api
            .moduleState(LAWS_MODULE_ID)
            .table("raises")
            .rows()
            .find((row) => {
              const job =
                core.jobs.get(String(row.jobId)) ??
                residentsRuntime(core)?.jobs.get(String(row.jobId));
              return (
                String(row.lawId).includes(lawId) &&
                Number(row.toMinor) > Number(row.fromMinor) &&
                (job?.hourlyMinor ?? 0) >= Number(row.toMinor)
              );
            });
          if (raise)
            evidence.set(question, {
              recordId: String(raise.jobId),
              measure: "price:hourly-wage",
              before: Number(raise.fromMinor),
              after: Number(raise.toMinor),
              lawId,
            });
        }
        if (!evidence.has(question)) {
          for (const [jobId, changes] of core.work.payChanges) {
            const old = oldHourly.get(jobId);
            const changed = changes.find(
              (row) =>
                row.source.citation.includes(lawId) &&
                old !== undefined &&
                row.hourlyMinor !== old,
            );
            if (changed && old !== undefined) {
              evidence.set(question, {
                recordId: jobId,
                measure: "price:hourly-wage",
                before: old,
                after: changed.hourlyMinor,
                lawId,
              });
              break;
            }
          }
        }
        if (
          !evidence.has(question) &&
          question ===
            "us-policy-positions:environment-energy.ban-new-gas-hookups"
        ) {
          // A new house's installment price includes the electric-code cost
          // factor. Require a project begun under this act and an actual paid
          // installment; a zoning flag or an old project is not evidence.
          const factor = 1 + construction.single.allElectricCostChange;
          for (const project of api
            .moduleState("housing")
            .table("projects")
            .rows()) {
            if (
              project.kind !== "single" ||
              project.placeId !== chain.townPlaceId ||
              lawInForce(api, question, String(project.startedAt)).governing
                ?.id !== lawId
            )
              continue;
            const price = Number(project.monthlyCostMinor);
            const withoutCode = Math.round(price / factor);
            const paid = [...core.cashJournal.detailedReceipts.values()].find(
              (row) =>
                row.sourceRef.id.startsWith(`construction:${project.id}:`) &&
                row.grossDebitMinor > 0,
            );
            if (paid && price > 0 && price !== withoutCode) {
              evidence.set(question, {
                recordId: String(project.id),
                measure: "price:paid-construction-installment",
                before: withoutCode,
                after: price,
                lawId,
              });
              break;
            }
          }
        }
        if (!evidence.has(question)) {
          const paid = [...core.cashJournal.detailedReceipts.values()].find(
            (row) =>
              row.sourceRef.id.includes(lawId) && row.grossDebitMinor > 0,
          );
          if (paid)
            evidence.set(question, {
              recordId: paid.id,
              measure: `cash:${paid.sourceRef.id}`,
              before: 0,
              after: paid.grossDebitMinor,
              lawId,
            });
        }
        if (!evidence.has(question) && core.modules.has("business")) {
          const rule = api
            .moduleState("business")
            .table("operating")
            .rows()
            .find(
              (row) =>
                row.kind === "cost" &&
                String(
                  (row.source as { citation?: string } | undefined)?.citation,
                ).includes(lawId),
            );
          const paid =
            rule &&
            [...core.cashJournal.detailedReceipts.values()].find(
              (row) =>
                row.sourceRef.id.startsWith(`compliance:${rule.id}:`) &&
                row.date >= String(rule.since) &&
                row.grossDebitMinor > 0,
            );
          if (paid)
            evidence.set(question, {
              recordId: paid.id,
              measure: `cash:${paid.sourceRef.id}`,
              before: 0,
              after: paid.grossDebitMinor,
              lawId,
            });
        }
        if (!evidence.has(question) && core.modules.has(REACH_A_MODULE_ID)) {
          const premium = api
            .moduleState(REACH_A_MODULE_ID)
            .table("premiums")
            .rows()
            .find(
              (row) =>
                String(row.reason).includes(lawId) &&
                Number(row.premiumMinor) > 0,
            );
          const paid =
            premium &&
            [...core.cashJournal.detailedReceipts.values()].find(
              (row) =>
                row.sourceRef.id === premium.id && row.grossDebitMinor > 0,
            );
          if (premium && paid)
            evidence.set(question, {
              recordId: paid.id,
              measure: "cash:paid-family-leave-premium",
              before: 0,
              after: Number(premium.premiumMinor),
              lawId,
            });
        }
        if (!evidence.has(question)) {
          const withheld = api
            .moduleState(BUDGETS_MODULE_ID)
            .table("withholding")
            .rows() as unknown as ReturnType<typeof withholdingOf>;
          for (const row of withheld) {
            const line = row.lines.find((item) => item.lawId.includes(lawId));
            if (!line) continue;
            const previous = withholdingFor({
              paidMinor: row.paidMinor,
              periodDays: row.periodDays,
              yearToDateMinor: row.yearToDateMinor,
              incomeTax: oldIncomeTax,
              socialSecurity: lawInForce(api, "social-security-tax", row.date),
              medicare: lawInForce(api, "medicare-tax", row.date),
            }).find(
              (item) =>
                item.jurisdiction === line.jurisdiction &&
                item.tax === line.tax,
            );
            const paid = [...core.cashJournal.detailedReceipts.values()].find(
              (item) =>
                item.sourceRef.id === row.id && item.grossDebitMinor > 0,
            );
            if (paid && line.minor !== (previous?.minor ?? 0)) {
              evidence.set(question, {
                recordId: paid.id,
                measure: `cash:withholding:${line.jurisdiction}`,
                before: previous?.minor ?? 0,
                after: line.minor,
                lawId,
              });
              break;
            }
          }
        }
        if (!evidence.has(question))
          reasons.set(
            question,
            `No changed read measure within 90 days. Links: ${links.map((l) => `${l.to} size=${l.size} lag=${l.lagMonths} months`).join("; ")}. Direct engine effect not yet proven by this test.`,
          );
        console.log(
          JSON.stringify({
            policy: question,
            seed,
            place: drawn.key,
            result: evidence.has(question) ? "PASS" : "FAIL",
            ...evidence.get(question),
            reason: reasons.get(question),
          }),
        );
      }
      console.log(
        JSON.stringify({
          lawLinkSeconds: (performance.now() - started) / 1000,
          reachedDate: core.date,
          passed: evidence.size,
          total: questions.length,
        }),
      );
      assert.ok(evidence.get(question), reasons.get(question));
    });
});
