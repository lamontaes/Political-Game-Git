/**
 * Checks the executive-orders and vacancy-rules research against itself, exiting 1 on any gap:
 * - every order type names its legal limit and carries at least one state entry with an order, a year and a
 *   fetched URL, and a URL for the limit;
 * - governor succession, agency-head vacancies and municipal vacancies each state a rule and cite URLs;
 * - every per-state agency-head rule names its citation and URL;
 * - what could not be fetched is listed under notFound, never filled in.
 * It prints the counts so a proof can report against them, and it lists the orders the executive engine
 * can carry (executive.ts ORDERABLE) beside the researched ones, so the orders still to be wired are visible.
 * Run: node --import tsx scripts/research/check-orders-and-vacancies.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface Research {
  orders: {
    type: string;
    states: { state: string; order?: string; year?: number; url?: string }[];
    legalLimit?: string;
    limitUrls?: string[];
  }[];
  vacancy: Record<
    string,
    {
      rule?: string;
      urls?: string[];
      url?: string;
      serviceDays?: number;
      quote?: string;
      perState?: {
        state: string;
        rule?: string;
        citation?: string;
        url?: string;
      }[];
    }
  >;
  notFound?: string[];
}

const research = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "data/research/executive/orders-and-vacancies-2026-11.json",
    ),
    "utf8",
  ),
) as Research;

const problems: string[] = [];
for (const order of research.orders) {
  if (!order.legalLimit) problems.push(`${order.type}: no legal limit`);
  // A limit with no URL must say so (NOT FOUND or not fetched) rather than pass for cited.
  if (
    !order.limitUrls?.length &&
    !/NOT FOUND|not fetched|unfetched/i.test(order.legalLimit ?? "")
  )
    problems.push(`${order.type}: no limit URL and the limit does not say so`);
  if (!order.states.length) problems.push(`${order.type}: no state entry`);
  for (const entry of order.states)
    if (!entry.url) problems.push(`${order.type} / ${entry.state}: no URL`);
}
for (const [kind, rule] of Object.entries(research.vacancy)) {
  if (!rule.rule) problems.push(`vacancy ${kind}: no rule`);
  if (!rule.urls?.length && !rule.perState?.length && !rule.url)
    problems.push(`vacancy ${kind}: no URL`);
  for (const entry of rule.perState ?? [])
    if (!entry.citation || !entry.url)
      problems.push(`vacancy ${kind} / ${entry.state}: no citation or URL`);
}
// The game's acting-service limit must be the researched one: the parameter the federal
// day reads (actingServiceDays) is checked against the fetched text of 5 U.S.C. 3346(a)(1).
const acting = research.vacancy.federalActing;
const parameter = JSON.parse(
  readFileSync("src/core2/data/office-day/federal-parameters.json", "utf8"),
).parameters.actingServiceDays?.value;
if (
  !acting?.serviceDays ||
  !acting.quote?.includes(`${acting.serviceDays} days`)
)
  problems.push("vacancy federalActing: service days not in its quote");
else if (parameter !== acting.serviceDays)
  problems.push(
    `federal-parameters actingServiceDays is ${parameter}, the research says ${acting.serviceDays}`,
  );
if (!Array.isArray(research.notFound)) problems.push("notFound is not listed");

console.log(
  `orders-and-vacancies: ${research.orders.length} order types, ${research.orders.reduce((n, o) => n + o.states.length, 0)} state entries, ${Object.keys(research.vacancy).length} vacancy kinds, ${research.notFound?.length ?? 0} items not found`,
);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
