import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "../minimum-wage";
import { LEGISLATIVE_TERM_LIMIT_QUESTION } from "../nationwide-world/state-legislative-term-limits";
import { OUTCOME_LINKS, outcomeLinkStatus } from "../outcome-web";
import { RENT_LAW_KEYS } from "../living-world/town-rent";
import { TAX_QUESTION_EFFECTS } from "../public-budgets/rules";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "../state-income-tax-law";
import { PAID_LEAVE_QUESTION } from "../state-paid-leave-law";
import type { PolicyCatalog } from "../types";

/**
 * WHICH LAWS ACT IN THE WORLD (Claude CTO's 8:00 a.m. all-hands, September
 * 29, 2026: "every team wires laws now").
 *
 * A policy question is wired when enacting a law on it moves money, people or
 * places through a sized path that the world runs. Two kinds of path count:
 * 1. a link in the outcome web from `law:<question>` whose status is "built":
 *    its size is set, its cause is read and its outcome is produced;
 * 2. a module that reads the law in force on the question and changes a
 *    paycheck, a budget, a rent, a lease or a seat from it, with sizes from
 *    its own sources. Each is listed below with the file that does it.
 *
 * An "about-zero" link does not count here: it says one outcome is not moved,
 * not that the law does nothing. A link whose size is not set, whose cause
 * is not read, or whose outcome nothing produces does not count either.
 */

export type LawEffectPathKind =
  | "outcome-web"
  | "paycheck"
  | "state-revenue"
  | "rent-and-eviction"
  | "seat-turnover";

export interface LawEffectPath {
  readonly questionKey: string;
  readonly kind: LawEffectPathKind;
  /** The link key, or the module that applies the law. */
  readonly via: string;
}

/** Modules that read the law in force and change the world from it. */
const DIRECT_PATHS: readonly LawEffectPath[] = [
  {
    questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    kind: "paycheck",
    via: "src/simulation/minimum-wage.ts",
  },
  {
    questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
    kind: "paycheck",
    via: "src/simulation/minimum-wage.ts",
  },
  {
    questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
    kind: "paycheck",
    via: "src/simulation/state-income-tax-law.ts",
  },
  {
    questionKey: GRADUATED_STATE_INCOME_TAX_QUESTION,
    kind: "paycheck",
    via: "src/simulation/state-income-tax-law.ts",
  },
  {
    questionKey: PAID_LEAVE_QUESTION,
    kind: "paycheck",
    via: "src/simulation/state-paid-leave-law.ts",
  },
  {
    questionKey: LEGISLATIVE_TERM_LIMIT_QUESTION,
    kind: "seat-turnover",
    via: "src/simulation/nationwide-world/state-legislative-term-limits.ts",
  },
  ...Object.values(RENT_LAW_KEYS).map((questionKey): LawEffectPath => ({
    questionKey,
    kind: "rent-and-eviction",
    via: "src/simulation/living-world/town-rent.ts",
  })),
  // A tax question moves a state's revenue only where its research set a
  // size; a null size moves no money, so it is no path.
  ...TAX_QUESTION_EFFECTS.filter(
    (effect) => effect.toYes !== null || effect.toNo !== null,
  ).map((effect): LawEffectPath => ({
    questionKey: effect.questionKey,
    kind: "state-revenue",
    via: "src/simulation/public-budgets/rules.ts",
  })),
];

const LAW_CAUSE_PREFIX = "law:";

/** Every sized, built path by which a law on a question acts in the world. */
export function lawEffectPaths(): readonly LawEffectPath[] {
  const web = OUTCOME_LINKS.filter(
    (link) =>
      link.from.startsWith(LAW_CAUSE_PREFIX) &&
      outcomeLinkStatus(link) === "built",
  ).map((link): LawEffectPath => ({
    questionKey: link.from.slice(LAW_CAUSE_PREFIX.length),
    kind: "outcome-web",
    via: link.key,
  }));
  return [...web, ...DIRECT_PATHS];
}

export interface UnwiredQuestion {
  readonly key: string;
  readonly name: string;
  readonly domain: string;
  /**
   * Why no path counts yet, from the outcome web's own reading of each link
   * from the question ("size-not-set", "about-zero" ...); empty when the web
   * has no link from it at all.
   */
  readonly linkStatuses: readonly string[];
}

/** The catalog's questions that no sized, built path reaches, in catalog order. */
export function unwiredQuestions(
  catalog: PolicyCatalog,
): readonly UnwiredQuestion[] {
  const wired = new Set(lawEffectPaths().map((path) => path.questionKey));
  return catalog.propositionOrder.flatMap((id) => {
    const proposition = catalog.propositions[id]!;
    if (wired.has(proposition.stableKey)) return [];
    const issue = catalog.issues[proposition.issueId];
    const domain = issue ? catalog.domains[issue.domainId] : undefined;
    return [
      {
        key: proposition.stableKey,
        name: proposition.name,
        domain: domain?.name ?? "No domain",
        linkStatuses: OUTCOME_LINKS.filter(
          (link) => link.from === `${LAW_CAUSE_PREFIX}${proposition.stableKey}`,
        ).map((link) => outcomeLinkStatus(link)),
      },
    ];
  });
}
