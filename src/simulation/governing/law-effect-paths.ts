import {
  FAIRNESS_CITY_QUESTION,
  FAIRNESS_STATE_QUESTION,
} from "../fairness-pay-law";
import { NATIONAL_DATA_PRIVACY_QUESTION } from "../federal-data-privacy-law";
import { DEBT_LIMIT_CUTS_QUESTION } from "../federal-outlay-laws";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "../federal-top-income-tax-law";
import { COUNCIL_TERM_LIMIT_QUESTION } from "../living-world/local-council-term-limits";
import { STATEHOOD_QUESTION } from "../living-world/statehood-seats";
import { WARD_COMMISSION_QUESTION } from "../living-world/town-wards";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "../minimum-wage";
import { LEGISLATIVE_TERM_LIMIT_QUESTION } from "../nationwide-world/state-legislative-term-limits";
import {
  LAW_QUESTION_MEASURES,
  OUTCOME_LINKS,
  outcomeLinksFedByQuestion,
  outcomeLinkStatus,
} from "../outcome-web";
import { HOUSING_SUPPLY_LAWS } from "../living-world/housing-market";
import { RENT_LAW_KEYS } from "../living-world/town-rent";
import { CANNABIS_SALES_QUESTION } from "../public-budgets/cannabis-sales-tax";
import { MILEAGE_FEE_QUESTION } from "../public-budgets/road-usage-charge";
import {
  SPENDING_QUESTION_EFFECTS,
  TAX_QUESTION_EFFECTS,
} from "../public-budgets/rules";
import { TUITION_FREEZE_QUESTION } from "../public-budgets/tuition-freeze";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "../state-income-tax-law";
import { PAID_LEAVE_QUESTION } from "../state-paid-leave-law";
import { TEACHER_SALARY_FLOOR_QUESTION } from "../teacher-salary-floor";
import type { PolicyCatalog } from "../types";
import { HOME_RULE_QUESTION } from "./question-authority";

/**
 * WHICH LAWS ACT IN THE WORLD (Claude CTO's 8:00 a.m. all-hands, September
 * 29, 2026: "every team wires laws now").
 *
 * A policy question is wired when enacting a law on it moves money, people or
 * places through a sized path that the world runs. Two kinds of path count:
 * 1. a link in the outcome web from `law:<question>` whose status is "built":
 *    its size is set, its cause is read and its outcome is produced;
 * 2. a module that reads the law in force on the question and changes a
 *    paycheck, a budget, a rent, a lease, a town's home prices or a seat
 *    from it, with sizes from its own sources. Each is listed below with the file that does it.
 *
 * An "about-zero" link does not count here: it says one outcome is not moved,
 * not that the law does nothing. A link whose size is not set, whose cause
 * is not read, or whose outcome nothing produces does not count either.
 */

export type LawEffectPathKind =
  | "outcome-web"
  | "paycheck"
  | "state-revenue"
  | "state-spending"
  | "rent-and-eviction"
  | "home-prices"
  | "seat-turnover"
  | "authority-gate"
  | "local-powers"
  | "court-and-jail"
  | "business-costs";

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
    questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
    kind: "paycheck",
    via: "src/simulation/minimum-wage.ts",
  },
  {
    questionKey: LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
    kind: "authority-gate",
    via: "src/simulation/governing/question-authority.ts",
  },
  {
    questionKey: NATIONAL_DATA_PRIVACY_QUESTION,
    kind: "business-costs",
    via: "src/simulation/federal-data-privacy-law.ts",
  },
  {
    questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
    kind: "paycheck",
    via: "src/simulation/federal-top-income-tax-law.ts",
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
  // A fairness law, the state's or a town's, sets the pay of a man partnered
  // with a man hired where it is in force.
  ...[FAIRNESS_STATE_QUESTION, FAIRNESS_CITY_QUESTION].map(
    (questionKey): LawEffectPath => ({
      questionKey,
      kind: "paycheck",
      via: "src/simulation/living-world/town-pay.ts",
    }),
  ),
  {
    questionKey: TEACHER_SALARY_FLOOR_QUESTION,
    kind: "paycheck",
    via: "src/simulation/living-world/town-pay.ts",
  },
  {
    questionKey: LEGISLATIVE_TERM_LIMIT_QUESTION,
    kind: "seat-turnover",
    via: "src/simulation/nationwide-world/state-legislative-term-limits.ts",
  },
  {
    questionKey: COUNCIL_TERM_LIMIT_QUESTION,
    kind: "seat-turnover",
    via: "src/simulation/living-world/local-council-term-limits.ts",
  },
  // An independent ward commission redraws the council's wards without
  // regard to members' homes, pairing incumbents in one ward.
  {
    questionKey: WARD_COMMISSION_QUESTION,
    kind: "seat-turnover",
    via: "src/simulation/living-world/local-elections.ts",
  },
  // Statehood for a nonvoting place adds its seats to both chambers on the day
  // the law takes effect.
  {
    questionKey: STATEHOOD_QUESTION,
    kind: "seat-turnover",
    via: "src/simulation/living-world/statehood-seats.ts",
  },
  // Home rule or Dillon's rule decides which local questions a town's
  // council may answer, so it opens or closes every ordinance on them.
  {
    questionKey: HOME_RULE_QUESTION,
    kind: "local-powers",
    via: "src/simulation/governing/question-authority.ts",
  },
  ...Object.values(RENT_LAW_KEYS).map((questionKey): LawEffectPath => ({
    questionKey,
    kind: "rent-and-eviction",
    via: "src/simulation/living-world/town-rent.ts",
  })),
  ...HOUSING_SUPPLY_LAWS.map((questionKey): LawEffectPath => ({
    questionKey,
    kind: "home-prices",
    via: "src/simulation/living-world/housing-market.ts",
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
  // What carrying out a law costs a state's budget, where a fiscal note set
  // a size.
  ...SPENDING_QUESTION_EFFECTS.filter(
    (effect) => effect.toYes !== null || effect.toNo !== null,
  ).map((effect): LawEffectPath => ({
    questionKey: effect.questionKey,
    kind: "state-spending",
    via: "src/simulation/public-budgets/month.ts",
  })),
  {
    questionKey: DEBT_LIMIT_CUTS_QUESTION,
    kind: "state-revenue",
    via: "src/simulation/federal-outlay-laws.ts",
  },
  {
    questionKey: CANNABIS_SALES_QUESTION,
    kind: "state-revenue",
    via: "src/simulation/public-budgets/cannabis-sales-tax.ts",
  },
  {
    questionKey: MILEAGE_FEE_QUESTION,
    kind: "state-revenue",
    via: "src/simulation/public-budgets/road-usage-charge.ts",
  },
  {
    questionKey: TUITION_FREEZE_QUESTION,
    kind: "state-revenue",
    via: "src/simulation/public-budgets/tuition-freeze.ts",
  },
];

const LAW_CAUSE_PREFIX = "law:";

/**
 * The court reads these laws in force in each case it hears: cash bail
 * decides who waits for trial in jail and off work, mandatory minimums take
 * probation off the table, and the juvenile court age decides who police
 * charge as an adult.
 */
const JUSTICE_PATHS: readonly LawEffectPath[] = [
  {
    questionKey: "us-policy-positions:justice-public-safety.end-cash-bail",
    kind: "court-and-jail",
    via: "src/simulation/justice/pretrial.ts",
  },
  {
    questionKey:
      "us-policy-positions:justice-public-safety.mandatory-minimum-sentences",
    kind: "court-and-jail",
    via: "src/simulation/justice/court-reasoning.ts",
  },
  {
    questionKey:
      "us-policy-positions:justice-public-safety.raise-juvenile-court-age",
    kind: "court-and-jail",
    via: "src/simulation/justice/juvenile-court.ts",
  },
];

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
  // A question whose bill term sets a measure the web reads acts through the
  // links from that measure (`LAW_QUESTION_MEASURES`).
  const viaMeasure = Object.keys(LAW_QUESTION_MEASURES).flatMap((questionKey) =>
    outcomeLinksFedByQuestion(questionKey)
      .filter(
        (link) =>
          !link.from.startsWith(LAW_CAUSE_PREFIX) &&
          outcomeLinkStatus(link) === "built",
      )
      .map((link): LawEffectPath => ({
        questionKey,
        kind: "outcome-web",
        via: link.key,
      })),
  );
  return [...web, ...viaMeasure, ...DIRECT_PATHS, ...JUSTICE_PATHS];
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
