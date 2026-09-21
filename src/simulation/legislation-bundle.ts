import {
  BillConfigurationError,
  compileBillDraft,
  type CompiledBillDraft,
  type CompiledClause,
} from "./legislation-drafting";
import type {
  PredicateAuthority,
  ProgramParameterValue,
} from "./legislation-program-families";
import type { EntityId, IsoDate } from "./types";

/**
 * A measure that carries more than one thing.
 *
 * The existing compiler writes one bill from one family and one variant. That
 * is the right shape for what it does, and nothing here replaces it: every
 * component below is compiled by `compileBillDraft`, unchanged, and this module
 * is the envelope around an ordered list of them. Editing parameters inside a
 * single family was never an omnibus builder, and adding more named variants
 * would not have made one — a measure that combines subjects needs components
 * that each carry their own target and their own authority, which is what the
 * input type here is for.
 *
 * What this module does NOT do, deliberately, for the same reasons the
 * single-bill compiler does not:
 *   - it does not write to the World, and it does not file anything;
 *   - it does not decide whether a combination is lawful. A jurisdiction that
 *     restricts a measure to one subject says so through `subjectRule`, which
 *     its saved profile supplies. Nothing here infers a constitutional rule
 *     from a jurisdiction's name, and a bundle that names no rule is not
 *     thereby unrestricted-by-law — it is a bundle whose profile has not said,
 *     which is a different fact;
 *   - it does not net one component's money against another's. Ceilings,
 *     appropriations and charges are carried apart and grouped by currency,
 *     because adding them together is an argument somebody makes rather than
 *     arithmetic this module owns.
 *
 * The refusals are the substance, as they are next door. A conflict names the
 * two components and the provision they both claim; a cycle names its members
 * in order. None of it resolves silently, and in particular there is no
 * last-component-wins: two components writing the same provision of the same
 * authority is a compile error, because picking one of them would mean the
 * bundle said something neither component's author wrote.
 */

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

/** One typed part of a measure, with its own target and its own authority. */
export interface MeasureComponentInput {
  /**
   * This component's name inside the bundle. Stable, and unique here.
   *
   * Every provision the component compiles is namespaced under it, so two
   * components of the same family do not collide on a shared provision key.
   */
  readonly componentKey: string;
  readonly familyKey: string;
  readonly variantKey: string;
  readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
  /**
   * The jurisdiction this component acts on.
   *
   * Per component, not per bundle: a measure may reach more than one
   * government, and which one a clause binds is a property of the clause's own
   * authority rather than of the envelope that carries it.
   */
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  /** The authority this component acts upon, where its instrument takes one. */
  readonly predicateAuthority?: PredicateAuthority;
  /**
   * The subject this component is declared to belong to.
   *
   * A declared label the caller supplies, not a classification computed here.
   * It exists so a profile that restricts a measure to one subject has
   * something to check; it is not a judicial determination, and two components
   * carrying different labels are not thereby unconstitutional anywhere.
   */
  readonly subject: string;
  /**
   * Components that must take effect before this one, by component key.
   *
   * Ordering within the compiled measure follows these, not the order the
   * caller happened to list them in.
   */
  readonly dependsOn?: readonly string[];
}

/**
 * Whether this measure's jurisdiction restricts what one measure may carry.
 *
 * `unrestricted` is the ordinary case. `single-subject` is declared by a saved
 * profile whose jurisdiction imposes one — California's Article IV is the
 * worked example — and it is never assumed for a jurisdiction that has not
 * declared it.
 */
export type SubjectRule = "unrestricted" | "single-subject";

export interface CompileMeasureBundleInput {
  readonly scenarioKey: string;
  /** The designation the docket assigned to the measure as a whole. */
  readonly designation: string;
  readonly filedOn: IsoDate;
  readonly components: readonly MeasureComponentInput[];
  /** What the saved profile says this jurisdiction allows. Never inferred. */
  readonly subjectRule: SubjectRule;
}

/* -------------------------------------------------------------------------- */
/* Outputs                                                                     */
/* -------------------------------------------------------------------------- */

/** A compiled component, and the draft it was compiled from. */
export interface CompiledMeasureComponent {
  readonly componentKey: string;
  readonly subject: string;
  readonly jurisdictionId: EntityId;
  readonly draft: CompiledBillDraft;
  /** This component's clauses, renumbered and namespaced within the measure. */
  readonly clauses: readonly CompiledClause[];
  readonly dependsOn: readonly string[];
}

/**
 * Money a measure states, held apart by what kind of statement it is.
 *
 * Grouped by currency because adding two currencies is not arithmetic, and
 * kept in three separate maps because an authorized ceiling, an appropriation
 * and a charge are three different claims. Nothing here produces a net figure.
 */
export interface BundleFinancialTotals {
  readonly authorizedCeilingMinorUnits: Readonly<Record<string, number>>;
  readonly appropriatedMinorUnits: Readonly<Record<string, number>>;
  readonly revenueMinorUnits: Readonly<Record<string, number>>;
}

export interface CompiledMeasureBundle {
  readonly designation: string;
  readonly scenarioKey: string;
  readonly filedOn: IsoDate;
  readonly subjectRule: SubjectRule;
  /** The declared subjects this measure carries, in first-appearance order. */
  readonly subjects: readonly string[];
  /** Every jurisdiction some component acts on, in first-appearance order. */
  readonly jurisdictionIds: readonly EntityId[];
  /** Components in dependency order, which is the order they take effect in. */
  readonly components: readonly CompiledMeasureComponent[];
  readonly totals: BundleFinancialTotals;
}

/** Why a set of components is not a measure. Thrown at the boundary. */
export class MeasureBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeasureBundleError";
  }
}

/* -------------------------------------------------------------------------- */
/* Compiling                                                                   */
/* -------------------------------------------------------------------------- */

/** The namespaced key a component's provision carries inside the measure. */
export function bundleProvisionKey(
  componentKey: string,
  provisionKey: string,
): string {
  return `${componentKey}:${provisionKey}`;
}

/**
 * Dependency order, or a named cycle.
 *
 * Reports the members of a cycle in the order they close it rather than the
 * fact that one exists, because "these three components wait on each other" is
 * something a drafter can act on and "cycle detected" is not.
 */
function orderByDependency(
  components: readonly MeasureComponentInput[],
): readonly MeasureComponentInput[] {
  const byKey = new Map(
    components.map((component) => [component.componentKey, component]),
  );
  const ordered: MeasureComponentInput[] = [];
  const settled = new Set<string>();
  const open: string[] = [];

  const visit = (key: string): void => {
    if (settled.has(key)) return;
    const cycleAt = open.indexOf(key);
    if (cycleAt !== -1) {
      const members = [...open.slice(cycleAt), key].join(" -> ");
      throw new MeasureBundleError(
        `These components wait on each other and so none of them can take effect first: ${members}.`,
      );
    }
    const component = byKey.get(key);
    if (!component) return;
    open.push(key);
    for (const dependency of component.dependsOn ?? []) visit(dependency);
    open.pop();
    settled.add(key);
    ordered.push(component);
  };

  for (const component of components) visit(component.componentKey);
  return ordered;
}

/**
 * The currency a component's money is denominated in.
 *
 * Read from the typed parameter values, never parsed back out of a formatted
 * label: a label is an output of these values and reading it as an input is the
 * move the single-bill compiler refuses next door, for the same reason. Null
 * when the component carries no money parameter at all, which is a different
 * fact from zero, and a refusal when one component somehow mixes two.
 */
function componentCurrency(draft: CompiledBillDraft): string | null {
  const currencies = new Set<string>();
  for (const value of Object.values(draft.parameterValues)) {
    if (value.kind === "money") currencies.add(value.currency);
  }
  if (currencies.size === 0) return null;
  if (currencies.size > 1) {
    throw new MeasureBundleError(
      `The ${draft.variantLabel} configuration states money in more than one currency (${[...currencies].sort().join(", ")}), so its figures cannot be grouped.`,
    );
  }
  return [...currencies][0]!;
}

function addMoney(
  into: Record<string, number>,
  currency: string | null,
  minorUnits: number | null,
  componentKey: string,
): void {
  if (minorUnits === null) return;
  if (currency === null) {
    throw new MeasureBundleError(
      `Component '${componentKey}' states a money figure but carries no money parameter to say what currency it is in, so it cannot be grouped with the rest.`,
    );
  }
  into[currency] = (into[currency] ?? 0) + minorUnits;
}

/**
 * Compiles an ordered, multi-part measure from already-supported components.
 *
 * Pure: it reads the content bank and nothing else, and a caller holding the
 * result has filed nothing. Every component goes through `compileBillDraft`,
 * so a component that is not a bill on its own is not a bill here either, and
 * its refusal arrives with the component named.
 */
export function compileMeasureBundle(
  input: CompileMeasureBundleInput,
): CompiledMeasureBundle {
  if (input.components.length === 0) {
    throw new MeasureBundleError(
      "A measure carries at least one component; an empty envelope states nothing.",
    );
  }

  const seen = new Set<string>();
  for (const component of input.components) {
    if (!component.componentKey.trim()) {
      throw new MeasureBundleError(
        "Every component needs a key, because its provisions are numbered under it.",
      );
    }
    if (seen.has(component.componentKey)) {
      throw new MeasureBundleError(
        `Two components are both called '${component.componentKey}', so their provisions could not be told apart.`,
      );
    }
    seen.add(component.componentKey);
  }

  for (const component of input.components) {
    for (const dependency of component.dependsOn ?? []) {
      if (!seen.has(dependency)) {
        throw new MeasureBundleError(
          `Component '${component.componentKey}' waits on '${dependency}', which this measure does not carry.`,
        );
      }
      if (dependency === component.componentKey) {
        throw new MeasureBundleError(
          `Component '${component.componentKey}' waits on itself.`,
        );
      }
    }
  }

  const subjects: string[] = [];
  for (const component of input.components) {
    if (!subjects.includes(component.subject)) subjects.push(component.subject);
  }
  if (input.subjectRule === "single-subject" && subjects.length > 1) {
    // Named rather than counted: a drafter splitting this measure needs to know
    // which parts are pulling apart, and the profile that said so is the
    // jurisdiction's own, not a rule applied everywhere.
    throw new MeasureBundleError(
      `This jurisdiction's profile restricts a measure to one subject, and this one carries ${subjects.length}: ${subjects.join(", ")}. Split it into linked measures, one per subject.`,
    );
  }

  const ordered = orderByDependency(input.components);

  const compiled: CompiledMeasureComponent[] = [];
  const claimedProvisions = new Map<string, string>();
  const authorizedCeilingMinorUnits: Record<string, number> = {};
  const appropriatedMinorUnits: Record<string, number> = {};
  const revenueMinorUnits: Record<string, number> = {};
  let sectionNumber = 0;

  for (const component of ordered) {
    let draft: CompiledBillDraft;
    try {
      draft = compileBillDraft({
        familyKey: component.familyKey,
        variantKey: component.variantKey,
        parameterValues: component.parameterValues,
        scenarioKey: input.scenarioKey,
        jurisdictionId: component.jurisdictionId,
        rulePackId: component.rulePackId,
        designation: input.designation,
        filedOn: input.filedOn,
        predicateAuthority: component.predicateAuthority,
      });
    } catch (error) {
      if (error instanceof BillConfigurationError) {
        throw new MeasureBundleError(
          `Component '${component.componentKey}' is not a bill: ${error.message}`,
        );
      }
      throw error;
    }

    const clauses: CompiledClause[] = [];
    for (const clause of draft.clauses) {
      // A conflict is about a target, not about a shape. Two components may
      // each create a programme and each carry a section called "purpose" —
      // those are two purposes, of two different programmes, and namespacing
      // is exactly what keeps them apart. What cannot stand is two components
      // writing the same provision of the same *existing* authority: one of
      // them would have to lose, and neither author wrote the result of that.
      // So a component that acts on nothing claims nothing.
      const authorityKey = component.predicateAuthority?.authorityKey;
      if (authorityKey !== undefined) {
        const claimKey = `${component.jurisdictionId}:${authorityKey}:${clause.provisionKey}`;
        const claimedBy = claimedProvisions.get(claimKey);
        if (claimedBy !== undefined) {
          throw new MeasureBundleError(
            `Components '${claimedBy}' and '${component.componentKey}' both write the '${clause.provisionKey}' provision of ${component.predicateAuthority!.citationLabel}, so the measure does not say which text stands.`,
          );
        }
        claimedProvisions.set(claimKey, component.componentKey);
      }

      sectionNumber += 1;
      clauses.push({
        ...clause,
        provisionKey: bundleProvisionKey(
          component.componentKey,
          clause.provisionKey,
        ),
        sectionNumber,
      });
    }

    const currency = componentCurrency(draft);
    addMoney(
      authorizedCeilingMinorUnits,
      currency,
      draft.authorizedCeilingMinorUnits,
      component.componentKey,
    );
    addMoney(
      appropriatedMinorUnits,
      currency,
      draft.appropriatedMinorUnits,
      component.componentKey,
    );
    addMoney(
      revenueMinorUnits,
      currency,
      draft.revenueMinorUnits,
      component.componentKey,
    );

    compiled.push({
      componentKey: component.componentKey,
      subject: component.subject,
      jurisdictionId: component.jurisdictionId,
      draft,
      clauses,
      dependsOn: [...(component.dependsOn ?? [])],
    });
  }

  const jurisdictionIds: EntityId[] = [];
  for (const component of compiled) {
    if (!jurisdictionIds.includes(component.jurisdictionId)) {
      jurisdictionIds.push(component.jurisdictionId);
    }
  }

  return {
    designation: input.designation,
    scenarioKey: input.scenarioKey,
    filedOn: input.filedOn,
    subjectRule: input.subjectRule,
    subjects,
    jurisdictionIds,
    components: compiled,
    totals: {
      authorizedCeilingMinorUnits,
      appropriatedMinorUnits,
      revenueMinorUnits,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Reading a compiled measure                                                  */
/* -------------------------------------------------------------------------- */

/** Every clause of the measure, in the order the measure states them. */
export function bundleClauses(
  bundle: CompiledMeasureBundle,
): readonly CompiledClause[] {
  return bundle.components.flatMap((component) => component.clauses);
}

/** The component a namespaced provision key belongs to, or null. */
export function componentForProvision(
  bundle: CompiledMeasureBundle,
  provisionKey: string,
): CompiledMeasureComponent | null {
  return (
    bundle.components.find((component) =>
      component.clauses.some((clause) => clause.provisionKey === provisionKey),
    ) ?? null
  );
}
