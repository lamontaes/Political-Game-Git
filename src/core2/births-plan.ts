import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../simulation/dates";
import {
  bedroomsForHousehold,
  hudRentRowFor,
} from "../simulation/living-world/town-rent";
import type { EntityId } from "../simulation/types";
import { healthReport } from "./modules/health";
import { renewalParameter } from "./births-parameters";
import { scoreOffers, decisionFromScores } from "./choice";
import { decisionKinds } from "./trait-decisions";
import { OUTCOME_WEB_MODULE_ID, outcomeWebFactor } from "./modules/outcome-web";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreState,
  PersonState,
} from "./types";

export const BIRTHS_STOPGAP = "SG-M1-births-circumstances";
export interface BirthCouple {
  id: string;
  motherId: string;
  otherParentId: string;
  startedAt: string;
  childIds: readonly string[];
  /** A couple who are dating, not living together: their courtship's id. */
  courtshipId?: string;
}

/** The outcome web's factor on the place's birth rate, 1 where the web is not running. */
/** The household's tenure from WORLD's housing record, when housing runs. */
export function householdTenure(
  api: CoreAPI,
  householdId: string,
): "own" | "rent" | undefined {
  if (!(api.state as CoreState).modules.has("housing")) return undefined;
  const row = api
    .moduleState("housing")
    .table("dwellings")
    .get(`dwelling:${householdId}`) as { tenure?: string } | undefined;
  return row?.tenure === "own" || row?.tenure === "rent"
    ? row.tenure
    : undefined;
}

/**
 * The outcome web's factor on the place's birth rate, times its factor for
 * owners' or renters' births by the household's tenure; 1 where the web is
 * not running or nothing moves it.
 */
function birthRateFactor(
  api: CoreAPI,
  placeId: string,
  householdId: string,
): number {
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID))
    return api.parameter("one");
  const read = (measure: string) => {
    const factor = outcomeWebFactor(api, placeId, measure);
    return factor > api.parameter("zero") ? factor : api.parameter("one");
  };
  const tenure = householdTenure(api, householdId);
  return (
    read("births.rate") *
    (tenure === "own"
      ? read("births.owners")
      : tenure === "rent"
        ? read("births.renters")
        : api.parameter("one"))
  );
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
      (p("two") * (relationship?.level ?? p("renewalUnknownCloseness")) -
        p("one")),
    partnership:
      mother.householdId === partner.householdId
        ? p("one")
        : -p("renewalApartPull"),
    // The place's conditions: the outcome web's factor on the birth rate
    // (1 where nothing moves it, or the web is not running).
    place:
      p("renewalPlaceWeight") *
      Math.log(birthRateFactor(api, mother.placeId, mother.householdId)),
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
