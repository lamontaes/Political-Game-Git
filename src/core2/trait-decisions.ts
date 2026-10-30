/**
 * The shared table of every decision a person makes and the act kinds each
 * option expresses (`data/content/trait-decisions.json`), so every trait in
 * `trait-act-pulls.json` reaches every option. Modules whose options live in
 * the table read their act kinds here; formula decisions add the same trait
 * lean the chooser uses (`traitLean`), never a hand-picked trait sum.
 */
import table from "../../data/content/trait-decisions.json" with { type: "json" };
import { traitLean } from "./choice";
import { affectAt } from "./emotion";
import { parameter, parameterValues } from "./parameters";
import { retainLog } from "./state";
import { stopgap } from "./stopgaps";
import { probeCallerSite, traitProbe } from "./trait-probe";
import type { Affect, CoreState, PersonState } from "./types";

interface OptionRow {
  id: string;
  actKinds?: readonly string[];
  from?: string;
}

/** Counted people carry no stored stress, so a rule that reads it stands at none for them (registered). */
const COUNTED_HARDSHIP_STOPGAP = "SG-TRAITS-counted-hardship-stress";

const OPTIONS = new Map(
  (
    table.decisions as readonly { id: string; options: readonly OptionRow[] }[]
  ).map((decision) => [
    decision.id,
    new Map(decision.options.map((option) => [option.id, option])),
  ]),
);

/** The act kinds of one option the table names directly. */
export function decisionKinds(
  decisionId: string,
  optionId: string,
): readonly string[] {
  const kinds = OPTIONS.get(decisionId)?.get(optionId)?.actKinds;
  if (!kinds)
    throw new Error(
      `Trait decision ${decisionId} has no act kinds for ${optionId}.`,
    );
  return kinds;
}

/**
 * How much more a person's traits lean toward one option than another, scaled
 * so the strongest personalities reach about 1 (`traitLeanScale`): the trait
 * term a formula decision adds, through the same table and the same lean the
 * chooser scores.
 */
export function traitLeanBetween(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  toward: readonly string[],
  over: readonly string[],
): number {
  const p = (key: string) => parameter(key, core.data.parameters);
  const lean = leanBetween(core, person, toward, over, p);
  const probe = traitProbe();
  if (probe?.formula && !probingDecision)
    probe.formula({ decisionId: probeCallerSite(), lean });
  return lean;
}

/** Set while `decisionLean` reads, so the probe counts the call once, by its table id. */
let probingDecision = false;

function leanBetween(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  toward: readonly string[],
  over: readonly string[],
  p: (key: string) => number,
): number {
  // Clamped to -1..1: the raw difference over the scale can reach 3.3, and every caller weighs the lean as a -1..1 term.
  return Math.max(
    p("negativeOne"),
    Math.min(
      p("one"),
      (traitLean(core, person, toward) - traitLean(core, person, over)) /
        p("traitLeanScale"),
    ),
  );
}

/** `traitLeanBetween` for two options the table names directly. */
export function decisionLean(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  decisionId: string,
  towardOptionId: string,
  overOptionId: string,
): number {
  const probe = traitProbe();
  if (!probe?.formula)
    return traitLeanBetween(
      core,
      person,
      decisionKinds(decisionId, towardOptionId),
      decisionKinds(decisionId, overOptionId),
    );
  probingDecision = true;
  try {
    const lean = traitLeanBetween(
      core,
      person,
      decisionKinds(decisionId, towardOptionId),
      decisionKinds(decisionId, overOptionId),
    );
    probe.formula({ decisionId, lean });
    return lean;
  } finally {
    probingDecision = false;
  }
}

/** The calibrated trait weight of a decision row (`traitWeightParameter`), else the general `traitWeight`. */
export function decisionTraitWeight(
  core: Pick<CoreState, "data">,
  decisionId: string,
): number {
  return parameter(
    WEIGHT_KEYS.get(decisionId) ?? "traitWeight",
    core.data.parameters,
  );
}

const WEIGHT_KEYS = new Map(
  (
    table.decisions as readonly { id: string; traitWeightParameter?: string }[]
  ).flatMap((row) =>
    row.traitWeightParameter
      ? [[row.id, row.traitWeightParameter] as const]
      : [],
  ),
);

/**
 * A two-way decision settled by a sum of reasons: yes when the case for it
 * (`bare`, every reason but personality) plus the person's calibrated trait
 * lean toward `yesOptionId` over `noOptionId` is above zero. The one formula
 * every two-way trait decision uses, so the audit sees each call and whether
 * personality turned it.
 */
export function leanedYes(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): boolean {
  return (
    leanedScore(core, person, decisionId, yesOptionId, noOptionId, bare) >
    parameter("zero", core.data.parameters)
  );
}

/**
 * A decision's score with the person's calibrated trait term added: `bare`
 * (every reason but personality) plus the lean toward `yesOptionId` over
 * `noOptionId` times the decision's weight. For a decision whose size, not
 * only its direction, depends on the score (a gift, a readiness to answer).
 * Reports to the probe like `leanedYes`.
 */
export function leanedScore(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): number {
  return reportLeaned(
    core,
    person,
    decisionId,
    leanBetween(
      core,
      person,
      decisionKinds(decisionId, yesOptionId),
      decisionKinds(decisionId, noOptionId),
      (key) => parameter(key, core.data.parameters),
    ),
    bare,
  );
}

/**
 * A counted person's two-way decision on exactly the chooser's arithmetic: the
 * case for it (`bare`, every reason but personality) plus the decision's
 * calibrated weight times the person's trait lean toward the yes option's
 * act kinds less the no option's, unscaled, as `scoreOffers` adds it for a full
 * person. The same weight therefore moves a counted person and a full person
 * the same amount. For options whose act kinds live in their module's data.
 */
export function leanedByKinds(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesKinds: readonly string[],
  noKinds: readonly string[],
  bare: number,
): boolean {
  return (
    reportLeaned(
      core,
      person,
      decisionId,
      traitLean(core, person, yesKinds) - traitLean(core, person, noKinds),
      bare,
    ) > parameter("zero", core.data.parameters)
  );
}

/** `bare` plus the weighted lean, reported to the audit probe with whether personality turned it. */
function reportLeaned(
  core: Pick<CoreState, "data">,
  person: { id?: string },
  decisionId: string,
  lean: number,
  bare: number,
): number {
  const term = lean * decisionTraitWeight(core, decisionId);
  const score = bare + term;
  const recordId = keepWeighing(core, person, decisionId, bare, term);
  const probe = traitProbe();
  if (probe?.formula) {
    const zero = parameter("zero", core.data.parameters);
    probe.formula({
      decisionId,
      actorId: person.id,
      lean,
      bare,
      yes: score > zero,
      turned: score > zero !== bare > zero,
      ...(recordId ? { recordId } : {}),
    });
  }
  return score;
}

/**
 * For a decision whose trait term joins a sum or scales a size with no
 * yes-or-no of its own: reports to the audit's probe what the decision came
 * to with the term and with it left out, so the matrix can show how far the
 * term moves the outcome between the people leaning most and least toward the
 * option. A debug switch: with the probe off nothing is computed and play
 * reads nothing new (`result` runs only when the probe is on).
 */
export function reportOutcome(
  decisionId: string,
  actorId: string | undefined,
  lean: number,
  unit: "probability" | "size",
  result: (withTerm: boolean) => number,
): void {
  const probe = traitProbe();
  if (!probe?.outcome) return;
  probe.outcome({
    decisionId,
    ...(actorId === undefined ? {} : { actorId }),
    lean,
    unit,
    value: result(true),
    flat: result(false),
  });
}

/**
 * The player and the people in focus keep a record of every two-way decision
 * they weigh, yes or no (why-kept: the player and the people they deal with),
 * as their acts do: the case without personality as the module reason and
 * the trait term as the trait reason, on a `person.weighed` log record. Yes
 * carries the case and the term as they are, no carries them turned around
 * (the case against, the pull away), so a decline condensed to its chosen
 * option's reasons still says why. A decline leaves no other trace. The
 * audit's probe (off in play) can ask for every full person's. Returns the
 * record's id, where one is kept.
 */
function keepWeighing(
  core: Pick<CoreState, "data">,
  person: { id?: string },
  decisionId: string,
  bare: number,
  term: number,
): string | undefined {
  const id = person.id;
  if (!id || !("focusPersonIds" in core)) return undefined;
  const c = core as CoreState;
  if (
    !c.focusPersonIds.has(id) &&
    id !== c.playerId &&
    !traitProbe()?.keepWeighed
  )
    return undefined;
  const actor = c.people.get(id);
  if (!actor) return undefined;
  const keepAll = traitProbe()?.keepWeighed === true;
  const zero = parameter("zero", c.data.parameters);
  const reasons = (trait: number, module: number) => ({
    need: zero,
    goal: zero,
    drive: zero,
    trait,
    emotion: zero,
    effort: zero,
    module,
  });
  const yes = bare + term > zero;
  const base = `weighed:${c.date}:${decisionId}:${id}`;
  // The first free of base, base:2, base:3...: start past the last one this
  // day found taken, since the log never drops a record the day it is made.
  const taken = takenToday(c);
  const known = taken.get(base);
  let n = known && c.durableLog.has(weighedId(base, known)) ? known + 1 : 1;
  while (c.durableLog.has(weighedId(base, n))) n++;
  const recordId = weighedId(base, n);
  retainLog(
    c,
    {
      id: recordId,
      date: c.date,
      kind: "person.weighed",
      personIds: [id],
      placeId: actor.placeId,
      source: {
        tag: "SOURCED",
        asOf: c.date,
        citation: `A two-way decision weighed by its shared formula (${decisionId}).`,
      },
      actorId: id,
      actionId: `${decisionId}:${yes ? "yes" : "no"}`,
      reasonKey: decisionId,
      decision: {
        actorId: id,
        date: c.date,
        reasonKey: decisionId,
        selectedReasons: yes
          ? reasons(term, bare)
          : reasons(zero - term, zero - bare),
        scores: [
          {
            actionId: `${decisionId}:yes`,
            targetId: id,
            score: bare + term,
            reasons: reasons(term, bare),
          },
          {
            actionId: `${decisionId}:no`,
            targetId: id,
            score: zero - bare - term,
            reasons: reasons(zero - term, zero - bare),
          },
        ],
      },
    },
    keepAll,
  );
  if (!c.durableLog.has(recordId)) return undefined;
  taken.set(base, n);
  return recordId;
}

const weighedId = (base: string, n: number) =>
  n === 1 ? base : `${base}:${n}`;
// The last weighed id each base took today, by world, reset each day.
const weighedToday = new WeakMap<
  CoreState,
  { date: string; taken: Map<string, number> }
>();
function takenToday(core: CoreState): Map<string, number> {
  let today = weighedToday.get(core);
  if (today?.date !== core.date)
    weighedToday.set(core, (today = { date: core.date, taken: new Map() }));
  return today.taken;
}

/**
 * The trait term of a counted person's summed pull: the decision's calibrated
 * weight times the lean toward the first act kinds less the second's, unscaled,
 * as the chooser adds it for a full person.
 */
export function decisionTraitTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  decisionId: string,
  toward: readonly string[],
  over: readonly string[],
): number {
  const lean = traitLean(core, person, toward) - traitLean(core, person, over);
  traitProbe()?.formula?.({ decisionId, lean });
  return lean * decisionTraitWeight(core, decisionId);
}

/**
 * The trait term of a decision settled by a sum of reasons (`bare` is every
 * reason but personality): the person's lean toward `yesOptionId` over
 * `noOptionId`, read through `shape` where the site bends it (a taste for
 * change read against how settled a law is), times the decision's calibrated
 * weight. Reports the call, the sum's outcome and whether personality turned
 * it to the audit's probe, as `leanedYes` does.
 */
export function leanedTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
  shape: (lean: number) => number = (lean) => lean,
): number {
  return termOfLean(
    core,
    person,
    decisionId,
    shape(
      leanBetween(
        core,
        person,
        decisionKinds(decisionId, yesOptionId),
        decisionKinds(decisionId, noOptionId),
        (key) => parameter(key, core.data.parameters),
      ),
    ),
    bare,
  );
}

/**
 * The trait term for a lean already read (and bent, if the site bends it):
 * the lean times the decision's calibrated weight, reported to the audit's
 * probe with the sum it joins. For a site that reads a person's lean once
 * and weighs it against many cases.
 */
export function termOfLean(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  lean: number,
  bare: number,
): number {
  return reportLeaned(core, person, decisionId, lean, bare) - bare;
}

/**
 * `leanedYes` that also returns the trait term it added (the lean times the
 * decision's calibrated weight), for a site that keeps its reasons on a record.
 */
export function leanedYesWithTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): { readonly yes: boolean; readonly term: number } {
  const score = leanedScore(
    core,
    person,
    decisionId,
    yesOptionId,
    noOptionId,
    bare,
  );
  return {
    yes: score > parameter("zero", core.data.parameters),
    term: score - bare,
  };
}

/**
 * The stress a hardship (a layoff, an eviction, a missed payment) has put on a
 * person and not yet let go: the part of their stress those events raised
 * (`Affect.hardship`, decayed to today at the stress half-life by `affectAt`,
 * so a day-old layoff reads its full size and a month-old one almost none),
 * and never more than the stress they carry above rest, so a rest or a visit
 * that eased them eases the read. Slides with the event's appraised size,
 * which is the person's own (emotion.ts scales it by their traits). Stress
 * from anywhere else (a cause shared, an illness) is not read. A person still
 * in the counted population has no stored stress and reads none until filled
 * in (registered stopgap).
 */
export function hardshipStress(
  core: Pick<CoreState, "data" | "date">,
  person: { affect?: Affect },
): number {
  const zero = parameter("zero", core.data.parameters);
  if (!person.affect) {
    stopgap(COUNTED_HARDSHIP_STOPGAP);
    return zero;
  }
  const now = affectAt(
    person.affect,
    core.date,
    parameterValues(core.data.parameters),
  );
  return Math.min(
    now.hardship ?? zero,
    Math.max(zero, now.stress - now.stressBaseline),
  );
}

/**
 * What a coping decision reads of the person's hardship stress: the stress
 * itself and the term it adds to the case for the decision's coping option,
 * the stress times the decision's weight (`hardshipWeightParameter` on its
 * row in the shared table, sized from a study in
 * `data/research/trait-effect-sizes.json`). A reason in the case, never a
 * roll: it grows smoothly with the stress and is nothing without it.
 */
export function hardshipReason(
  core: Pick<CoreState, "data" | "date">,
  person: { affect?: Affect },
  decisionId: string,
): { stress: number; term: number } {
  const key = HARDSHIP_KEYS.get(decisionId);
  if (!key)
    throw new Error(`Trait decision ${decisionId} reads no hardship stress.`);
  const stress = hardshipStress(core, person);
  return { stress, term: stress * parameter(key, core.data.parameters) };
}

const HARDSHIP_KEYS = new Map(
  (
    table.decisions as readonly {
      id: string;
      hardshipWeightParameter?: string;
    }[]
  ).flatMap((row) =>
    row.hardshipWeightParameter
      ? [[row.id, row.hardshipWeightParameter] as const]
      : [],
  ),
);
