/**
 * The bill paper's catalog (M3-01): the owner-accepted 18 subject menus with
 * the policies the engine supports under each topic (`data/legislature/
 * bill-catalog.json`, built by `scripts/research/build-bill-catalog.py`).
 *
 * `billCatalog` gives a body what it can draft: only policies its level can
 * pass, each with the amount in force today (amounts start from the law in
 * force) and, for a town, whether the state lets it act (the city attorney's
 * warning or block). `provisionFor` turns a pick and an operation into a bill
 * provision. Outcomes never appear in the drafting controls.
 */
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import type { CoreAPI } from "./types";
import {
  authorityFor,
  currentAmount,
  type Authority,
  type Provision,
} from "./modules/legislature";

export type Operation =
  "raise" | "lower" | "expand" | "restrict" | "enact" | "repeal";
type Level = "federal" | "state" | "city";

interface CatalogPolicy {
  readonly id: string;
  readonly name: string;
  readonly kind: Provision["kind"];
  readonly series?: string;
  readonly question?: string;
  readonly line?: string;
  readonly unit?: string;
  readonly operations: readonly Operation[];
  readonly levels: readonly Level[];
}

export interface DraftablePolicy extends CatalogPolicy {
  readonly inForce: number | null;
  readonly authority: Authority;
}

export interface CatalogMenu {
  readonly id: string;
  readonly name: string;
  readonly topics: readonly {
    readonly name: string;
    readonly supported: boolean;
    readonly policies: readonly DraftablePolicy[];
  }[];
}

const subjects = (
  catalog as unknown as {
    subjects: {
      id: string;
      name: string;
      topics: { name: string; supported: boolean; policies: CatalogPolicy[] }[];
    }[];
  }
).subjects;

/** What a body at this level can draft, menu by menu. */
export function billCatalog(
  api: CoreAPI,
  level: Level,
): readonly CatalogMenu[] {
  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    topics: subject.topics.map((topic) => ({
      name: topic.name,
      supported: topic.supported,
      policies: topic.policies
        .filter((p) => p.levels.includes(level))
        .map((p) => {
          const provision = {
            kind: p.kind,
            series: p.series,
            question: p.question,
            line: p.line,
            value: 1,
          } as Provision;
          return {
            ...p,
            inForce: p.series ? currentAmount(api, p.series, level) : null,
            authority:
              level === "city"
                ? authorityFor(api, provision)
                : {
                    allowed: true,
                    warning: "none" as const,
                    reason: "within-own-power" as const,
                    source: "",
                  },
          };
        }),
    })),
  }));
}

/**
 * A bill provision from a catalog pick: an amount for a law (raise or lower,
 * starting from the law in force), a change to a budget line (expand or
 * restrict by an amount), or a policy enacted or repealed. An optional
 * effective date phases it in.
 */
export function provisionFor(input: {
  readonly policyId: string;
  readonly operation: Operation;
  readonly amount?: number;
  readonly effectiveDate?: string;
}): Provision {
  const policy = subjects
    .flatMap((s) => s.topics.flatMap((t) => t.policies))
    .find((p) => p.id === input.policyId);
  if (!policy) throw new Error(`No such catalog policy: ${input.policyId}`);
  if (!policy.operations.includes(input.operation))
    throw new Error(`${policy.name} doesn't support ${input.operation}`);
  const dated = {
    ...(input.effectiveDate ? { effectiveDate: input.effectiveDate } : {}),
    policyId: policy.id,
    operation: input.operation,
  };
  if (policy.kind === "policy-question")
    return {
      kind: "policy-question",
      question: policy.question!,
      value: input.operation === "enact" ? 1 : -1,
      ...dated,
    };
  if (policy.kind === "budget-line")
    return {
      kind: "budget-line",
      line: policy.line!,
      value:
        (input.operation === "expand" ? 1 : -1) * Math.abs(input.amount ?? 0),
      ...dated,
    };
  if (input.amount === undefined)
    throw new Error(`${policy.name} needs the new amount`);
  return {
    kind: "law-amount",
    series: policy.series!,
    value: input.amount,
    ...(policy.unit ? { unit: policy.unit } : {}),
    ...dated,
  };
}
