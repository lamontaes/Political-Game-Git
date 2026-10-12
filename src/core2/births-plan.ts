import { ageOnDate, daysBetween, makeIsoDate } from "../simulation/dates";
import { renewalParameter } from "./births-parameters";
import { scoreOffers, decisionFromScores } from "./choice";
import { decisionKinds } from "./trait-decisions";
import type { ActOffer, ActionDefinition, CoreAPI, PersonState } from "./types";

export const BIRTHS_STOPGAP = "SG-M1-births-circumstances";
export interface BirthCouple {
  id: string;
  motherId: string;
  otherParentId: string;
  startedAt: string;
  childIds: readonly string[];
}

/** Natality data is deliberately absent here: observations only check totals. */
export function birthCircumstances(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  couple: BirthCouple,
  asOf = api.state.date,
) {
  const p = (key: string) => renewalParameter(api, key);
  const mother = api.state.people.get(couple.motherId)!;
  const partner = api.state.people.get(couple.otherParentId)!;
  const age = ageOnDate(makeIsoDate(mother.birthDate), makeIsoDate(asOf));
  const births = couple.childIds
    .flatMap((id) => {
      const person = api.state.people.get(id);
      return person && person.birthDate <= asOf ? [person.birthDate] : [];
    })
    .sort();
  const since = Math.max(
    p("zero"),
    daysBetween(
      makeIsoDate(births.at(-p("one")) ?? couple.startedAt),
      makeIsoDate(asOf),
    ) /
      p("daysPerMeanYear") /
      p("renewalTimingPeakYears"),
  );
  const household = api.state.households.get(mother.householdId)!;
  const members = household.memberIds
    .map((id) => api.state.people.get(id)!)
    .filter((person) => person.alive);
  const income = members.reduce(
    (sum, person) =>
      sum +
      (person.jobId
        ? (api.state.jobs.get(person.jobId)?.wageDailyMinor ?? p("zero"))
        : p("zero")),
    p("zero"),
  );
  const costs = members.reduce(
    (sum, person) => sum + person.livingCostDailyMinor,
    p("zero"),
  );
  const cash = members.reduce(
    (sum, person) => sum + person.liquidMinor,
    p("zero"),
  );
  const distance = (age - p("renewalAgeCenter")) / p("renewalAgeSpread");
  // SG-M1-births-circumstances: record proxies explicitly; no missing medical fact means permission.
  return {
    age:
      p("renewalAgeWeight") *
      (p("two") * Math.exp(-distance * distance) - p("one")),
    children:
      p("renewalChildWeight") *
      (p("renewalNoChildPull") - p("renewalPerChildPull") * births.length),
    timing:
      p("renewalTimingWeight") *
      (p("two") * since * Math.exp(p("one") - since) - p("one")),
    income:
      p("renewalIncomeWeight") *
      Math.log(
        (income * p("daysPerMeanYear") + p("one")) /
          p("renewalMedianAnnualIncomeMinor"),
      ),
    housing: (-p("renewalHousingWeight") * costs) / (income + costs + p("one")),
    savings:
      (p("renewalHousingWeight") * cash) /
      (cash + costs * p("moneyBufferDays") + p("one")),
    health:
      -p("renewalHealthWeight") *
      Math.max(p("zero"), actor.affect.stress - actor.affect.mood),
    partnership:
      mother.householdId === partner.householdId
        ? p("one")
        : -p("renewalWaitPull"),
  };
}

function action(id: string, raising: boolean): ActionDefinition {
  return {
    id,
    actKinds: decisionKinds("renewal.plan-child", id),
    goalKinds: [],
    need: "company",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "partnership",
    effect: "birth-plan",
    reasonBindings: [
      {
        id: "circumstances",
        provider: "renewal-circumstances",
        weightParameter: "one",
        arguments: { raising: String(raising) },
        stopgapId: BIRTHS_STOPGAP,
      },
    ],
  };
}
export const PLAN_CHILD = action("renewal-plan-child", true);
export const WAIT_CHILD = action("renewal-wait", false);

export function chooseBirthPlan(
  api: CoreAPI,
  personId: string,
  couple: BirthCouple,
  asOf = api.state.date,
) {
  const offers: ActOffer[] = [WAIT_CHILD, PLAN_CHILD].map((definition) => ({
    definition: {
      ...definition,
      reasonBindings: definition.reasonBindings!.map((binding) => ({
        ...binding,
        arguments: { ...binding.arguments, asOf },
      })),
    },
    targetId: couple.id,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, personId, offers, {
    needValues: { company: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, personId, scored);
  // Persist both alternatives and their component circumstances for every partner, including quiet NPCs.
  return {
    selected: decision.selected!.definition.id,
    reasonKey: decision.reasonKey,
    scores: scored.map((row) => ({
      actionId: row.offer.definition.id,
      score: row.score,
      reasons: row.reasons,
    })),
    circumstances: birthCircumstances(
      api,
      api.state.people.get(personId)!,
      couple,
      asOf,
    ),
  };
}
