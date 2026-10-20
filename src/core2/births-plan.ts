import { addDays, ageOnDate, daysBetween, makeIsoDate } from "./kernel/dates";
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import type { EntityId } from "./kernel/brands";
import { healthReport } from "./modules/health";
import { currentCloseness } from "./closeness";
import { renewalParameter } from "./births-parameters";
import { webReach } from "./outcome-web-reach";
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

const HUD_DOLLAR = 100;

/** The place's HUD record: area median income and fair market rents (fixed tables, read once). */
const hudRows = new Map<string, ReturnType<typeof hudRentRowFor>>();
function placeHousing(placeId: string) {
  if (!hudRows.has(placeId))
    hudRows.set(placeId, hudRentRowFor(placeId as EntityId));
  return hudRows.get(placeId)!;
}

/** The health module's live conditions index, looked up once per world. */
const conditionIndexes = new WeakMap<
  object,
  ReadonlyMap<string, readonly string[]>
>();

/** A restored health runtime may supply a different conditions map. */
export function forgetBirthConditions(core: object): void {
  conditionIndexes.delete(core);
}

function conditionsOf(api: CoreAPI, personId: string): number {
  let index = conditionIndexes.get(api.state);
  if (!index) {
    const report = healthReport(api.state);
    index = report.conditionsByPerson;
    if (report.initialized) conditionIndexes.set(api.state, index);
  }
  return index.get(personId)?.length ?? 0;
}

/** When the couple got together: their partner fact, else an estimate from their records. */
export function partnershipStart(
  api: CoreAPI,
  couple: BirthCouple,
  births: readonly string[],
): string {
  if (couple.startedAt < api.state.startedAt) return couple.startedAt;
  const p = (key: string) => renewalParameter(api, key);
  const mother = api.state.people.get(couple.motherId)!;
  // SG-PW8-partnership-start: no partner fact was recorded, so the start is
  // estimated: one spacing interval before their first child, else the age
  // women first live with a partner (NSFG), never the opening day.
  api.stopgap("SG-PW8-partnership-start");
  const estimate = births.length
    ? addDays(
        makeIsoDate(births[0]!),
        -Math.round(p("renewalTimingPeakYears") * p("daysPerMeanYear")),
      )
    : addDays(
        makeIsoDate(mother.birthDate),
        Math.round(p("renewalUnionAgeYears") * p("daysPerMeanYear")),
      );
  return estimate < couple.startedAt ? estimate : couple.startedAt;
}

/** The link left out of the plan's web term: a lost job already lowers the couple's own work and income terms. */
const OWN_RECORD_LINK = "unemployment-to-births";

/** Whether the couple owns their home, from the housing dwelling record (undefined where no record says). */
function tenureOf(
  api: CoreAPI,
  householdId: string,
): "own" | "rent" | undefined {
  if (!api.state.modules.has("housing")) return undefined;
  const row = api
    .moduleState("housing")
    .table("dwellings")
    .get(`dwelling:${householdId}`) as { tenure?: string } | undefined;
  return row?.tenure ? (row.tenure === "own" ? "own" : "rent") : undefined;
}

/**
 * The outcome web's pull on a couple's plan: the log of the birth factor for
 * the mother's age and home (the links her own records do not carry), times
 * the web weight, so a factor of 1.01 raises the share of couples that plan
 * by about one percent.
 */
function webPull(api: CoreAPI, mother: Readonly<PersonState>, age: number) {
  const reach = webReach(api, mother.placeId, "births.rate", {
    age,
    sex: "female",
    tenure: tenureOf(api, mother.householdId),
  });
  let factor = 1;
  for (const part of reach.parts)
    if (part.link !== OWN_RECORD_LINK) factor *= 1 + part.effect * part.weight;
  return (
    renewalParameter(api, "renewalWebWeight") *
    Math.log(Math.max(factor, Number.MIN_VALUE))
  );
}

/**
 * What each partner weighs, from the couple's records. Natality data is
 * deliberately absent here: real rates only check the town's totals. Every
 * term is a sliding scale with a floor and a ceiling: no cliff at $0 or at
 * any age.
 */
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
      makeIsoDate(
        births.at(-p("one")) ?? partnershipStart(api, couple, births),
      ),
      makeIsoDate(asOf),
    ) /
      p("daysPerMeanYear") /
      p("renewalTimingPeakYears"),
  );
  const household = api.state.households.get(mother.householdId)!;
  const members = household.memberIds
    .map((id) => api.state.people.get(id)!)
    .filter((person) => person.alive);
  const wage = (person: Readonly<PersonState>) =>
    person.jobId
      ? (api.state.jobs.get(person.jobId)?.wageDailyMinor ?? p("zero"))
      : p("zero");
  const income = members.reduce((sum, person) => sum + wage(person), p("zero"));
  const annual = income * p("daysPerMeanYear");
  const costs = members.reduce(
    (sum, person) => sum + person.livingCostDailyMinor,
    p("zero"),
  );
  const cash = members.reduce(
    (sum, person) => sum + person.liquidMinor,
    p("zero"),
  );
  const hud = placeHousing(mother.placeId);
  // HUD's very-low limit is half the area median family income.
  const median =
    hud?.veryLow4 != null
      ? hud.veryLow4 * HUD_DOLLAR * p("renewalMedianPerVeryLowLimit")
      : p("renewalMedianAnnualIncomeMinor");
  const ratio = annual / median;
  // One more bedroom, a year, at the place's fair market rents.
  const size = members.length;
  const room = hud
    ? Math.max(
        p("zero"),
        (hud.rents[bedroomsForHousehold(size + p("one"))]! -
          hud.rents[bedroomsForHousehold(Math.max(size, p("one")))]!) *
          HUD_DOLLAR *
          p("monthsPerYear"),
      )
    : p("zero");
  const employed = [mother, partner].filter(
    (person) => wage(person) > p("zero"),
  ).length;
  const relationship = [
    ...(api.state.relationshipsByPerson.get(actor.id) ?? []),
  ]
    .map((id) => api.state.relationships.get(id))
    .find(
      (row) =>
        row?.otherId === (actor.id === mother.id ? partner.id : mother.id),
    );
  const conditions = conditionsOf(api, mother.id);
  const distance = (age - p("renewalAgeCenter")) / p("renewalAgeSpread");
  // SG-M1-births-circumstances: record proxies explicitly; no missing medical fact means permission.
  // stopgapId: SG-WEB-births-full-tier (the outcome web's birth links that full couples' own records do not carry)
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
    // A recent birth: the mother's recovery pulls against another pregnancy,
    // fading smoothly over about two years.
    recovery: births.length
      ? -p("renewalRecoveryWeight") *
        Math.exp(
          -daysBetween(makeIsoDate(births.at(-p("one"))!), makeIsoDate(asOf)) /
            p("renewalRecoveryDays"),
        )
      : p("zero"),
    income:
      (p("renewalIncomeWeight") * (ratio - p("one"))) / (ratio + p("one")),
    work: p("renewalJobWeight") * (employed - p("one")),
    room: (-p("renewalRoomWeight") * room) / (annual + room + p("one")),
    housing: (-p("renewalHousingWeight") * costs) / (income + costs + p("one")),
    savings:
      (p("renewalHousingWeight") * cash) /
      (cash + costs * p("moneyBufferDays") + p("one")),
    health:
      -p("renewalHealthWeight") *
        Math.max(p("zero"), actor.affect.stress - actor.affect.mood) -
      (p("renewalConditionWeight") * conditions) / (conditions + p("one")),
    closeness:
      p("renewalClosenessWeight") *
      (p("two") *
        (relationship
          ? currentCloseness(api.state, relationship)
          : p("renewalUnknownCloseness")) -
        p("one")),
    web: webPull(api, mother, age),
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
