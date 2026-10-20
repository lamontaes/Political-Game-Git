/**
 * Who holds the pen, and what they choose. The independent-redistricting law
 * in force (state or local level) says whether a legislature or council
 * draws the lines or an independent commission does. The body then chooses
 * among the printed plans (redistricting-plans.ts) by a score of each plan's
 * measured facts, the weights depending on who it is, and records the reason
 * each fact counted. Nothing is rolled.
 */
import weights from "./data/redistricting/choice-weights.json" with { type: "json" };
import type { LawInForceAnswer } from "./laws-in-force";
import { lawInForce } from "./modules/laws";
import type { CoreAPI } from "./types";

export const INDEPENDENT_REDISTRICTING =
  "us-policy-positions:government-operations.independent-redistricting";

export type Drawer = "legislature" | "commission";

export interface WhoDraws {
  readonly drawer: Drawer;
  readonly level: "state" | "local";
  /** The law row that put the pen in a commission's hands, when it did. */
  readonly lawRowId?: string;
}

/** Whether the law at a level gives the pen to an independent commission (1) or leaves it with the legislature or council. */
export function whoDraws(
  answer: LawInForceAnswer,
  level: "state" | "local",
): WhoDraws {
  const row = answer.levels.find((l) => l.level === level && !l.setAside)?.row;
  return row?.value === 1
    ? { drawer: "commission", level, lawRowId: row.id }
    : { drawer: "legislature", level };
}

/** The same, read from the world's laws in force. */
export function whoDrawsIn(api: CoreAPI, level: "state" | "local"): WhoDraws {
  return whoDraws(lawInForce(api, INDEPENDENT_REDISTRICTING), level);
}

/** What a printed plan measures. */
export interface PlanFacts {
  readonly id: string;
  /** Largest district minus smallest over the ideal. */
  readonly totalDeviation: number;
  /** The most the level's law allows. */
  readonly deviationLimit: number;
  readonly majorityMinorityDistricts: number;
  /** Districts holding two or more sitting members, counted once per extra member. */
  readonly pairedMembers: number;
  /** Districts the drawing body's majority party would win. */
  readonly drawerSeats: number;
  readonly districts: number;
}

export interface PlanReason {
  readonly fact: string;
  readonly value: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface PlanChoice {
  readonly drawer: Drawer;
  readonly chosen: string;
  /** Every plan's score and the reasons that made it. */
  readonly scored: readonly {
    readonly id: string;
    readonly score: number;
    readonly reasons: readonly PlanReason[];
  }[];
}

/** A body's choice among printed plans, with a reason for every fact that counted. */
export function choosePlan(
  drawer: Drawer,
  plans: readonly PlanFacts[],
): PlanChoice {
  if (!plans.length) throw new Error("There are no plans to choose among.");
  const w = weights[drawer];
  const scored = plans.map((plan) => {
    const districts = Math.max(1, plan.districts);
    const reasons: PlanReason[] = [
      {
        fact: "evenness",
        value: 1 - plan.totalDeviation / Math.max(plan.deviationLimit, 1e-9),
        weight: w.evenness.value,
      },
      {
        fact: "majorityMinorityDistricts",
        value: plan.majorityMinorityDistricts / districts,
        weight: w.majorityMinorityDistricts.value,
      },
      {
        fact: "pairedMembers",
        value: -plan.pairedMembers / districts,
        weight: w.pairedMembers.value,
      },
      {
        fact: "drawerSeats",
        value: plan.drawerSeats / districts,
        weight: w.drawerSeats.value,
      },
      {
        fact: "limitBreach",
        value: plan.totalDeviation > plan.deviationLimit ? -1 : 0,
        weight: weights.limitBreach.value,
      },
    ].map((r) => ({ ...r, contribution: r.value * r.weight }));
    return {
      id: plan.id,
      score: reasons.reduce((n, r) => n + r.contribution, 0),
      reasons,
    };
  });
  // Ties go to the plan whose id sorts first, never to a roll.
  const best = [...scored].sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id),
  )[0]!;
  return { drawer, chosen: best.id, scored };
}
