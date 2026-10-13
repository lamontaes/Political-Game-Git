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
import {
  authorityFor,
  POLICY_QUESTIONS,
  draftBill,
} from "./modules/legislature";
import { jobsAt } from "./law-reach/group-b-money";
import { OFFICES_MODULE_ID, townSeats } from "./modules/offices";
import { ELECTIONS_MODULE_ID, checkEligibility } from "./modules/elections";
import {
  resultOf,
  turnout,
  VOTING_MODULE_ID,
  type BallotRow,
} from "./modules/voting";
import {
  felonyDisenfranchisedShare,
  RESTORE_VOTE,
  PHOTO_ID,
  TERM_LIMITS,
  termLimitReached,
} from "./law-reach/group-a-voting";
import { reachParameter } from "./law-reach/group-b-people";

import { residentsRuntime } from "./modules/residents";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import { outcomeIssueView } from "./modules/views";
import { WEB_LINKS, WEB_SETTINGS } from "./outcome-web-model";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import groupA from "./data/laws/reach-group-a.json" with { type: "json" };
import groupB from "./data/laws/reach-group-b.json" with { type: "json" };
import construction from "./data/housing/construction.json" with { type: "json" };
import lawAParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };

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

describe("59 policies in the played world, 90 days or the next required event", () => {
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
      const publicTeachersBefore = jobsAt(
        api,
        ["service:school"],
        "profession:teacher",
      );
      const teachersBefore = (
        publicTeachersBefore.length
          ? publicTeachersBefore
          : jobsAt(api, ["service:private-school"], "profession:teacher")
      ).map((job) => ({ id: job.id, wageDailyMinor: job.wageDailyMinor }));
      const workerClasses = [
        ...new Set(
          [...core.organizations.values()].map(
            (org) => org.classification ?? "",
          ),
        ),
      ];
      const workersBefore = jobsAt(api, workerClasses)
        .filter((job) => (job.hourlyMinor ?? 0) > 0)
        .map((job) => ({ id: job.id, hourlyMinor: job.hourlyMinor! }));
      const oldIncomeTax = lawInForce(api, "income-tax");
      const oldBudgets = new Map(
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("budgets")
          .rows()
          .map((row) => [
            row.id,
            { ...(row.spendingMinor as Record<string, number>) },
          ]),
      );
      const oldStock = api
        .moduleState("housing")
        .table("stock")
        .get(`stock:${chain.townPlaceId}`);
      const oldZoning = oldStock?.zoning as
        { inclusionaryShare: number } | undefined;
      const oldInclusionaryShare = oldZoning?.inclusionaryShare;
      const oldMultiCarry = Number(oldStock?.carryMulti);
      const wageProvision = {
        kind: "law-amount" as const,
        series: "minimum-wage",
        value: (lawInForce(api, "minimum-wage").value ?? 0) + 1,
      };
      const openingPolicyRate = Number(
        api.moduleState("macro").table("state").get("macro:state")
          ?.policyRatePct,
      );
      const unregulatedQuestion = questions.find(
        (key) =>
          key.startsWith("us-policy-positions:") &&
          !POLICY_QUESTIONS[key]?.answers[chain.stateKey],
      );
      const localSeat = question.endsWith("broaden-local-authority")
        ? townSeats(api).find(
            (seat) =>
              seat.holder?.personId &&
              (seat.office.kind === "council" ||
                seat.office.kind.includes("board")),
          )
        : undefined;
      const draftHomeRule = () =>
        localSeat && unregulatedQuestion
          ? draftBill(api, {
              bodyOfficeId: localSeat.office.id,
              sponsorId: localSeat.holder!.personId!,
              provisions: [
                {
                  kind: "policy-question",
                  question: unregulatedQuestion,
                  value: 1,
                },
              ],
            })
          : undefined;
      const previousHomeBill = draftHomeRule();
      const voter = [...core.people.values()].find(
        (person) => person.alive && person.placeId === chain.townPlaceId,
      );
      const priorTurnoutCost = voter ? turnout(api, voter, {}).cost : undefined;
      const priorVotingShare = felonyDisenfranchisedShare(api);
      const priorAuthority = authorityFor(api, wageProvision);
      const lawId = enact(question, 1).id;
      const enactedTurnoutCost = voter
        ? turnout(api, voter, {}).cost
        : undefined;
      const enactedVotingShare = felonyDisenfranchisedShare(api);
      const enactedAuthority = authorityFor(api, wageProvision);
      const enactedHomeBill = draftHomeRule();
      if (
        question ===
        "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit"
      ) {
        for (const row of api
          .moduleState(BUDGETS_MODULE_ID)
          .table("budgets")
          .rows()) {
          const old = oldBudgets.get(row.id);
          const spending = row.spendingMinor as Record<string, number>;
          if (!old || !String(row.adoptedBy).includes(lawId)) continue;
          const moved = (spending.transit ?? 0) - (old.transit ?? 0);
          if (
            moved > 0 &&
            (old.highways ?? 0) - (spending.highways ?? 0) === moved
          ) {
            evidence.set(question, {
              recordId: row.id,
              measure: "budget:highways-to-transit",
              before: old.transit ?? 0,
              after: spending.transit ?? 0,
              lawId,
            });
            reasons.set(
              question,
              `fixed check: enacted amendment moved ${moved} cents from highways to transit in the active budget; total appropriations unchanged`,
            );
          }
        }
      }

      const end = addDays(makeIsoDate(core.date), 90);
      advanceCore(core, end);
      assert.equal(core.date, end);
      assert.equal(
        core.cashJournal.totals.grossDebitMinor,
        core.cashJournal.totals.grossCreditMinor,
        "Every dollar balances",
      );

      if (question === RESTORE_VOTE) {
        if (priorVotingShare === enactedVotingShare) {
          evidence.set(question, {
            recordId: lawId,
            measure: "no-op-in-this-town",
            before: priorVotingShare,
            after: enactedVotingShare,
            lawId,
          });
          reasons.set(
            question,
            "no-op in this town: another active level already restores the counted electorate's rights",
          );
        } else {
          const contests = api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows();
          const eligibleResult = () =>
            contests
              .map((contest) => resultOf(api, contest.id))
              .find(
                (row) =>
                  row &&
                  row.date >= "2026-01-02" &&
                  row.countedEligible > 0 &&
                  lawInForce(api, question, row.date).governing?.id === lawId,
              );
          let result = eligibleResult();
          if (!result) {
            const next = contests
              .filter((contest) => String(contest.electionDate) > core.date)
              .sort((a, b) =>
                String(a.electionDate).localeCompare(String(b.electionDate)),
              )[0];
            if (next) {
              advanceCore(
                core,
                addDays(makeIsoDate(String(next.electionDate)), 1),
              );
              result = eligibleResult();
              assert.equal(
                core.cashJournal.totals.grossDebitMinor,
                core.cashJournal.totals.grossCreditMinor,
              );
            }
          }
          if (result) {
            evidence.set(question, {
              recordId: result.id,
              measure: "eligibility:disenfranchised-share-at-election",
              before: priorVotingShare,
              after: enactedVotingShare,
              lawId,
            });
            reasons.set(
              question,
              `fixed check: election on ${result.date} served ${result.countedEligible} eligible counted voters under the changed restoration rule`,
            );
          }
        }
      }

      if (question === PHOTO_ID && priorTurnoutCost !== enactedTurnoutCost) {
        const next = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows()
          .filter((row) => String(row.electionDate) > core.date)
          .sort((a, b) =>
            String(a.electionDate).localeCompare(String(b.electionDate)),
          )[0];
        if (next)
          advanceCore(core, addDays(makeIsoDate(String(next.electionDate)), 1));
        const ballots = api
          .moduleState(VOTING_MODULE_ID)
          .table("ballots")
          .rows() as unknown as BallotRow[];
        const observed = ballots.find(
          (row) =>
            row.date >= "2026-01-02" &&
            lawInForce(api, question, row.date).governing?.id === lawId &&
            core.people.has(row.voterId),
        );
        if (observed) {
          const person = core.people.get(observed.voterId)!;
          const withRule = turnout(api, person, {}).cost;
          enact(question, 0);
          const withoutRule = turnout(api, person, {}).cost;
          if (
            withRule !== withoutRule &&
            observed.turnoutReasons.cost === withRule
          ) {
            evidence.set(question, {
              recordId: observed.id,
              measure: "decision:ballot-turnout-cost",
              before: withoutRule,
              after: withRule,
              lawId,
            });
            reasons.set(
              question,
              `fixed check: election ${observed.date}; recorded turnout cost matches the voting engine, and repealing the ID rule changes that cost`,
            );
          }
        }
        assert.equal(
          core.cashJournal.totals.grossDebitMinor,
          core.cashJournal.totals.grossCreditMinor,
        );
      }

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
        if (!evidence.has(question)) {
          let noOp: { recordId: string; reason: string } | undefined;
          if (
            question ===
            "us-policy-positions:housing-land-use.inclusionary-requirement"
          ) {
            const stock = api
              .moduleState("housing")
              .table("stock")
              .get(`stock:${chain.townPlaceId}`);
            const zoning = stock?.zoning as
              { inclusionaryShare: number } | undefined;
            const projects = api
              .moduleState("housing")
              .table("projects")
              .rows()
              .filter(
                (row) =>
                  row.placeId === chain.townPlaceId &&
                  row.kind === "multi" &&
                  String(row.startedAt) >= "2026-01-02",
              );
            const project = projects.find(
              (row) =>
                Number(row.affordableUnits) > 0 && Number(row.paidMinor) > 0,
            );
            if (project) {
              evidence.set(question, {
                recordId: project.id,
                measure: "construction:paid-affordable-units",
                before: 0,
                after: Number(project.affordableUnits),
                lawId,
              });
              reasons.set(
                question,
                "fixed check: a paid construction project includes the required affordable units",
              );
            } else if (
              stock &&
              zoning &&
              oldInclusionaryShare === 0 &&
              zoning.inclusionaryShare > 0 &&
              Number.isFinite(oldMultiCarry) &&
              Number(stock.carryMulti) !== oldMultiCarry
            ) {
              evidence.set(question, {
                recordId: stock.id,
                measure: "construction:monthly-inclusionary-rule",
                before: oldInclusionaryShare,
                after: zoning.inclusionaryShare,
                lawId,
              });
              reasons.set(
                question,
                `fixed check: monthly construction decision read the changed set-aside rule; fractional starts ${oldMultiCarry} -> ${stock.carryMulti}; ${projects.length} apartment projects started; no completed affordable units claimed`,
              );
            }
          }

          if (
            question === PHOTO_ID &&
            priorTurnoutCost === enactedTurnoutCost &&
            voter
          )
            noOp = {
              recordId: voter.id,
              reason:
                "another active level already requires photo ID; the voting engine's turnout cost is unchanged",
            };
          if (question === TERM_LIMITS) {
            const terms = api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .rows();
            const barred = terms.filter(
              (row) =>
                row.personId &&
                row.officeId &&
                termLimitReached(
                  api,
                  String(row.personId),
                  String(row.officeId),
                ),
            );
            if (!barred.length)
              noOp = {
                recordId: terms[0]?.id ?? lawId,
                reason: `none of ${terms.length} recorded terms has reached the engine's legislative term limit`,
              };
            else {
              const decision = barred.flatMap((term) =>
                api
                  .moduleState(ELECTIONS_MODULE_ID)
                  .table("contests")
                  .rows()
                  .filter(
                    (contest) =>
                      contest.officeId === term.officeId &&
                      core.people.has(String(term.personId)),
                  )
                  .flatMap((contest) =>
                    checkEligibility(api, String(term.personId), contest.id)
                      .filter(
                        (check) => check.rule === "term-limit" && !check.met,
                      )
                      .map(() => ({ term, contest })),
                  ),
              )[0];
              if (decision) {
                evidence.set(question, {
                  recordId: decision.contest.id,
                  measure: "eligibility:term-limit",
                  before: 1,
                  after: 0,
                  lawId,
                });
                reasons.set(
                  question,
                  `fixed check: election engine rejects another term; term record ${decision.term.id}`,
                );
              }
            }
          }
          if (question === "us-policy-positions:fiscal.adopt-income-tax") {
            const existing = oldIncomeTax.levels.find(
              (row) =>
                row.level === "state" && row.row && (row.row.value ?? 0) > 0,
            );
            if (existing?.row)
              noOp = {
                recordId: existing.row.id,
                reason:
                  "state already collects income tax under this rule; adoption does not replace its existing schedule",
              };
          }
          if (question === "us-policy-positions:fiscal.graduated-income-tax") {
            const existing = oldIncomeTax.levels.find(
              (row) => row.level === "state" && row.row?.terms?.schedules,
            );
            if (existing?.row)
              noOp = {
                recordId: existing.row.id,
                reason:
                  "state already collects income tax using a graduated schedule",
              };
          }
          if (
            question ===
            "us-policy-positions:education.raise-teacher-minimum-salary"
          ) {
            const teachers = teachersBefore;
            const floor =
              (reachParameter("teacherMinimumSalaryDollars") *
                reachParameter("centsPerDollar")) /
              reachParameter("daysPerYear");
            if (teachers.every((job) => job.wageDailyMinor >= floor))
              noOp = {
                recordId: teachers[0]?.id ?? lawId,
                reason: `${teachers.length} covered teachers; all already meet the daily salary floor ${floor}`,
              };
          }
          if (
            question ===
            "us-federal-positions:labor-commerce.raise-federal-minimum-wage"
          ) {
            const workers = workersBefore;
            const target =
              lawAParameters.parameters.federalMinimumWageTargetMinor.value;
            const federal = lawInForce(api, "minimum-wage").levels.find(
              (row) => row.level === "federal",
            )?.row;
            const national = chain.levels.find(
              (row) => row.level === "federal",
            )?.jurisdiction;
            if (
              federal &&
              federal.jurisdiction !== national &&
              !federal.id.includes(lawId)
            )
              noOp = {
                recordId: federal.id,
                reason:
                  "the place-specific federal wage schedule still governs; the national general-floor act does not amend that specific schedule",
              };
            if (workers.every((job) => job.hourlyMinor! >= target))
              noOp = {
                recordId: workers[0]?.id ?? lawId,
                reason: `${workers.length} covered hourly jobs already pay at least ${target} cents; repealing a floor does not cut an existing wage`,
              };
          }
          if (
            question ===
            "us-policy-positions:business-commerce.cap-consumer-loan-rates"
          ) {
            const meetings = api
              .moduleState("macro")
              .table("meetings")
              .rows()
              .filter((row) => String(row.effectiveAt) <= core.date);
            const peak = Math.max(
              openingPolicyRate,
              ...meetings.flatMap((row) => [
                Number(row.fromRatePct),
                Number(row.toRatePct),
              ]),
            );
            const market =
              (peak +
                api.parameter("macroPrimeSpreadPct") +
                api.parameter("creditPersonalSpreadPct")) /
              api.parameter("macroHundred");
            const cap = lawAParameters.parameters.consumerLoanRateCap.value;
            if (Number.isFinite(market) && market <= cap)
              noOp = {
                recordId: meetings.at(-1)?.id ?? "macro:state",
                reason: `highest offered personal-loan market rate ${market} remains below the statutory ${cap} ceiling throughout this window`,
              };
          }
          if (
            question ===
            "us-policy-positions:labor-workforce.local-minimum-wage-authority"
          ) {
            const delegation = api
              .moduleState(LAWS_MODULE_ID)
              .table("enactments")
              .query("bySeries", ["local-minimum-wage-authority"])
              .find((row) => row.measureId === lawId);
            if (
              delegation &&
              priorAuthority.allowed !== enactedAuthority.allowed
            ) {
              evidence.set(question, {
                recordId: delegation.id,
                measure: "decision:local-wage-authority",
                before: Number(priorAuthority.allowed),
                after: Number(enactedAuthority.allowed),
                lawId,
              });
              reasons.set(
                question,
                `fixed check: legislature authority decision changed from ${priorAuthority.reason} to ${enactedAuthority.reason}`,
              );
            }
          }
          if (
            question ===
            "us-policy-positions:government-operations.broaden-local-authority"
          ) {
            if (!unregulatedQuestion || !localSeat)
              noOp = {
                recordId: lawId,
                reason: !localSeat
                  ? "no seated local council or board can exercise the home-rule grant in this town"
                  : "all catalog local matters have a state answer; home rule overrides none",
              };
            else if (
              previousHomeBill &&
              enactedHomeBill &&
              enactedHomeBill.authority[0]?.source === lawId &&
              previousHomeBill.authority[0]?.reason !==
                enactedHomeBill.authority[0]?.reason
            ) {
              evidence.set(question, {
                recordId: enactedHomeBill.id,
                measure: "decision:home-rule-authority-basis",
                before: 0,
                after: 1,
                lawId,
              });
              reasons.set(
                question,
                `fixed: native bill authority now cites the home-rule grant; previous bill ${previousHomeBill.id}`,
              );
            }
          }
          if (noOp) {
            evidence.set(question, {
              recordId: noOp.recordId,
              measure: "no-op-in-this-town",
              before: 0,
              after: 0,
              lawId,
            });
            reasons.set(question, `no-op in this town: ${noOp.reason}`);
          }
        }
        if (!evidence.has(question)) {
          const cause = api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("laws")
            .get(lawId);
          const deferred = links.find((link) => {
            const due = new Date(`${String(cause?.effectiveDate)}T00:00:00Z`);
            if (!Number.isFinite(due.getTime())) return false;
            const effectiveDay = due.getUTCDate();
            const landingDay = WEB_SETTINGS.schedule.dayOfMonth;
            due.setUTCDate(landingDay);
            due.setUTCMonth(
              due.getUTCMonth() +
                link.lagMonths +
                (effectiveDay > landingDay ? 1 : 0),
            );
            return (
              cause?.series === question &&
              Number(cause.value) === 1 &&
              link.size !== null &&
              Number.isFinite(link.size) &&
              link.lagMonths > 0 &&
              due.toISOString().slice(0, 10) > core.date &&
              table.query("byPlace", [chain.townPlaceId]).some((raw) => {
                const row = raw as unknown as WebMonth;
                return (
                  row.date >= String(cause.effectiveDate) &&
                  Number.isFinite(row.effects[link.key]) &&
                  outcomeIssueView(api, chain.townPlaceId, question, 0.5)
                    .recordIds.length > 0
                );
              })
            );
          });
          if (deferred) {
            evidence.set(question, {
              recordId: String(cause!.id),
              measure: `registered-cause:${deferred.key}:lag=${deferred.lagMonths}:size=${deferred.size}`,
              before: 0,
              after: 1,
              lawId,
            });
            reasons.set(
              question,
              `fixed check: cause registered with size ${deferred.size} and researched lag ${deferred.lagMonths} months; no premature outcome change claimed`,
            );
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
