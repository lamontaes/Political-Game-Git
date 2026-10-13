/**
 * What an enacted law does to people (M3-04): on its effective date a policy
 * reaches the specific named people it covers, as a record on each of them
 * (a right, an eligibility, a rule with its enforcer and penalty, a price or a
 * compliance duty), and a repeal ends it on its own date.
 *
 * The laws module announces "law took effect"; this module reads the policy's
 * effect from `data/laws/policy-effects.json` and the people it reaches from
 * their own records (age, work). Money effects (a minimum wage's raises, a
 * tax's withholding) run in the laws and budgets modules.
 *
 * Each month the module pays what the law in force pays (SNAP; unemployment
 * benefits are recorded under the state's program), as `payment` records, and
 * audits who every law in force reached (`reach`), writing a `no-local-effect`
 * record with the place fact where a law reaches nothing here
 * (`law-reach/law-payments.ts`, `law-reach/law-reach-audit.ts`).
 */
import effects from "../data/laws/policy-effects.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import { lawChain, LAWS_MODULE_ID } from "./laws";
import { registerLawReach } from "../law-reach";
import { addMonths } from "../law-reach/group-b-dates";
import {
  payLaws,
  registerLawUnemploymentTerms,
} from "../law-reach/law-payments";
import { auditLawReach } from "../law-reach/law-reach-audit";
import type { ModuleCalendarWork } from "../module-calendar";
import type { LawRowInput } from "../laws-starting";
import { addDays, makeIsoDate } from "../../simulation/dates";

export const LAW_EFFECTS_MODULE_ID = "core2-law-effects-v1";
const REVIEW_KIND = "law-effects-review";

interface Effect {
  readonly kind: "eligibility" | "right" | "compliance" | "price" | "rule";
  readonly reaches: {
    readonly ageFrom?: number;
    readonly ageBelow?: number;
    readonly employed?: boolean;
  };
  readonly what: string;
  readonly employerDuty?: string;
  readonly enforcer: string;
  readonly penalty: string;
  readonly source: string;
}

export interface AppliedEffect {
  readonly id: string;
  readonly personId: string;
  readonly lawId: string;
  readonly question: string;
  readonly kind: Effect["kind"];
  readonly what: string;
  readonly enforcer: string;
  readonly penalty: string;
  readonly since: string;
  readonly endedOn: string | null;
}

const catalog = (effects as unknown as { effects: Record<string, Effect> })
  .effects;

export const LAW_EFFECTS_MODULE: CoreModule = {
  id: LAW_EFFECTS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      applied: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byQuestion: { fields: ["question", "endedOn"] },
        },
      },
      /** Payments, services and no-local-effect findings (`law-reach/law-records.ts`). */
      records: {
        indexes: {
          byLaw: { fields: ["lawId"] },
          byRecipient: { fields: ["recipientId"] },
        },
      },
      /** Who each law in force reached at the last review. */
      reach: {},
      /** Unemployment benefits already recorded, by claim. */
      paidSoFar: {},
    },
  },
  eventKinds: ["law-took-effect", "budget-line-changed"],
  onEvent: (api, event) => applyLaw(api, event),
  onCalendarWork: (api, work) => review(api, work),
};

/** The monthly review: pay what the law pays, then record who each law reached. */
function review(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== REVIEW_KIND) return;
  payLaws(api);
  auditLawReach(api);
  scheduleReview(api, addMonths(api.state.date));
}

function scheduleReview(api: CoreAPI, date: string): void {
  api.moduleCalendar(LAW_EFFECTS_MODULE_ID).schedule({
    key: `review:${date}`,
    date,
    kind: REVIEW_KIND,
    source: {
      tag: "SOURCED",
      citation:
        "Benefit programs pay and review monthly (7 CFR 273.10, 273.12)",
      asOf: api.state.date,
    },
    sourceRecordIds: [lawChain(api).townPlaceId],
  });
}

export function openLawEffects(core: CoreState): void {
  registerLawReach();
  registerLawUnemploymentTerms();
  const first = !core.modules.has(LAW_EFFECTS_MODULE_ID);
  if (!core.modules.has(LAW_EFFECTS_MODULE_ID))
    registerModule(core, LAW_EFFECTS_MODULE);
  if (first && core.modules.has(LAWS_MODULE_ID)) {
    const api = coreAPI(core);
    scheduleReview(api, addDays(makeIsoDate(api.state.date), 1));
  }
  // The policies already law at the opening reach people from the first day.
  if (first && core.modules.has(LAWS_MODULE_ID)) {
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const rows = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= core.date && r.value === 1)
      .filter(
        (r) => r.series in catalog || policyHandlerKeys().includes(r.series),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const row of rows)
      applyLaw(api, {
        id: `law-in-force:${row.id}`,
        date: core.date,
        kind: "law-took-effect",
        personIds: [],
        placeId: town,
        source: {
          tag: row.estimate ? "ESTIMATED" : "SOURCED",
          citation: String(row.source),
          asOf: core.date,
          ...(row.estimate ? { estimatedFrom: String(row.source) } : {}),
        },
        facts: {
          lawId: row.id,
          series: row.series,
          level: row.level,
          jurisdiction: row.jurisdiction,
          value: String(row.value),
        },
      } as unknown as CoreEventInput);
  }
}

const ageOn = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

function reaches(
  api: CoreAPI,
  person: Readonly<PersonState>,
  effect: Effect,
  town: string,
): boolean {
  if (!person.alive || person.placeId !== town) return false;
  const age = ageOn(person, api.state.date);
  if (effect.reaches.ageFrom !== undefined && age < effect.reaches.ageFrom)
    return false;
  if (effect.reaches.ageBelow !== undefined && age >= effect.reaches.ageBelow)
    return false;
  if (effect.reaches.employed && !person.jobId) return false;
  return true;
}

/**
 * Whether a policy is law for the town on a date: any level of its chain
 * (federal, state, county or city) whose latest row in force says yes. A
 * higher level saying no doesn't undo a lower level's yes.
 */
export function inForceHere(api: CoreAPI, question: string): boolean {
  const date = api.state.date;
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.some(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [
        jurisdiction,
        question,
      ]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

/**
 * What a policy does once it's law, for policies whose effect runs through
 * an engine (money, services, eligibility checks), not only a record on
 * people: one handler per policy key (a policy question, a law series, or
 * "budget-line:<line>"), registered by the law-reach files in
 * `src/core2/law-reach/`. Called whenever the law in force on that key may
 * have changed, with whether it's now in force for the town.
 */
export type PolicyHandler = (
  api: CoreAPI,
  change: {
    readonly key: string;
    readonly lawId: string;
    readonly inForce: boolean;
    readonly level: string;
    readonly value: number | null;
    readonly placeId: string;
  },
) => void;
const handlers = new Map<string, PolicyHandler[]>();
export function registerPolicyHandler(
  key: string,
  handler: PolicyHandler,
): void {
  const list = handlers.get(key) ?? [];
  if (!list.includes(handler)) list.push(handler);
  handlers.set(key, list);
}
export function policyHandlerKeys(): readonly string[] {
  return [...handlers.keys()].sort();
}

function runHandlers(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const key =
    event.kind === "budget-line-changed"
      ? `budget-line:${facts.line}`
      : (facts.series ?? "");
  const list = handlers.get(key);
  if (!list) return;
  const value = facts.value === undefined ? null : Number(facts.value);
  const inForce =
    event.kind === "budget-line-changed"
      ? true
      : key.includes(":")
        ? inForceHere(api, key)
        : true;
  for (const handler of list)
    handler(api, {
      key,
      lawId: facts.lawId ?? facts.measureId ?? "",
      inForce,
      level: facts.level ?? "",
      value: Number.isFinite(value) ? value : null,
      placeId: event.placeId,
    });
}

function applyLaw(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  runHandlers(api, event);
  if (event.kind !== "law-took-effect") return;
  const lawId = event.facts?.lawId;
  const question = event.facts?.series;
  if (!lawId || !question || !(question in catalog)) return;
  const row = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(lawId) as unknown as LawRowInput | undefined;
  if (!row) return;
  const effect = catalog[question]!;
  const table = api.moduleState(LAW_EFFECTS_MODULE_ID).table("applied");
  const date = api.state.date;
  const open = table.query("byQuestion", [
    question,
    null,
  ]) as unknown as AppliedEffect[];
  if (!inForceHere(api, question)) {
    // A repeal with nothing else standing: every open effect ends today.
    for (const applied of open) {
      table.put({ ...applied, endedOn: date } as unknown as ModuleRow);
      api.observe(applied.personId, {
        key: `law-effect:${question}`,
        value: "repealed",
        learnedAt: date,
        sourceId: lawId,
        access: "public",
      });
    }
    return;
  }
  if (row.value !== 1) return;
  const holding = new Set(open.map((a) => a.personId));
  for (const person of api.state.people.values()) {
    if (holding.has(person.id) || !reaches(api, person, effect, event.placeId))
      continue;
    const applied: AppliedEffect = {
      id: `effect:${lawId}:${person.id}`,
      personId: person.id,
      lawId,
      question,
      kind: effect.kind,
      what: effect.what,
      enforcer: effect.enforcer,
      penalty: effect.penalty,
      since: date,
      endedOn: null,
    };
    table.put(applied as unknown as ModuleRow);
    api.observe(person.id, {
      key: `law-effect:${question}`,
      value: effect.kind,
      learnedAt: date,
      sourceId: lawId,
      access: "public",
    });
  }
}

/** Every law effect on one person's record, current and ended. */
export function effectsOn(
  api: CoreAPI,
  personId: string,
): readonly AppliedEffect[] {
  return api
    .moduleState(LAW_EFFECTS_MODULE_ID)
    .table("applied")
    .query("byPerson", [personId]) as unknown as AppliedEffect[];
}

export { coreAPI };
