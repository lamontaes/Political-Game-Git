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
import type { LawRowInput } from "../laws-starting";

export const LAW_EFFECTS_MODULE_ID = "core2-law-effects-v1";

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
    },
  },
  eventKinds: ["law-took-effect"],
  onEvent: (api, event) => applyLaw(api, event),
};

export function openLawEffects(core: CoreState): void {
  if (!core.modules.has(LAW_EFFECTS_MODULE_ID))
    registerModule(core, LAW_EFFECTS_MODULE);
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
function inForceHere(api: CoreAPI, question: string): boolean {
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

function applyLaw(api: CoreAPI, event: Readonly<CoreEventInput>): void {
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
