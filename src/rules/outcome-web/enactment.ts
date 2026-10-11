export interface EnactmentFact {
  readonly id: string;
  readonly measureId: string;
  readonly outcome: string;
}
export interface EffectiveContext {
  readonly onDate: string;
  readonly activity: "effective";
  readonly activityId: string;
  readonly subjectIds: readonly string[];
  readonly governingLawId: string;
}
/** Callbacks bind the old fan-out to a port's existing readers and writers; this shelf schedules nothing. */
export interface EnactmentBindings<State> {
  readonly enactments: (state: State) => readonly EnactmentFact[];
  readonly taxProposal: (
    state: State,
    measureId: string,
  ) => { readonly id: string } | undefined;
  readonly taxReady: (state: State, proposalId: string) => boolean;
  readonly adoptTax: (state: State, proposalId: string) => State;
  readonly appropriationIds: (state: State) => readonly string[];
  readonly appropriate: (state: State, measureId: string) => State;
  readonly familyAppropriations: (state: State, measureId: string) => State;
  readonly openProgramMatters: (
    state: State,
    ids: ReadonlySet<string>,
  ) => State;
  readonly duties: (state: State, measureId: string) => State;
  readonly eligibility: (state: State, measureId: string) => State;
  readonly currentDate: (state: State) => string;
  readonly people: (state: State) => readonly string[];
  readonly consequences: (state: State, context: EffectiveContext) => State;
}
/** Preserve tax readiness, writer order, new-appropriation diff and effective dispatch. */
export function applyEnactedLawEffectsFromReaders<State>(
  world: State,
  measureId: string,
  bindings: EnactmentBindings<State>,
): State {
  const enactment = bindings
    .enactments(world)
    .find((row) => row.measureId === measureId && row.outcome === "enacted");
  if (!enactment) return world;
  let next = world;
  const proposal = bindings.taxProposal(next, measureId);
  if (proposal && bindings.taxReady(next, proposal.id))
    next = bindings.adoptTax(next, proposal.id);
  const previous = new Set(bindings.appropriationIds(next));
  next = bindings.appropriate(next, measureId);
  next = bindings.familyAppropriations(next, measureId);
  const added = new Set(
    bindings.appropriationIds(next).filter((id) => !previous.has(id)),
  );
  if (added.size > 0) next = bindings.openProgramMatters(next, added);
  next = bindings.duties(next, measureId);
  next = bindings.eligibility(next, measureId);
  // STOPGAP RULES4-OW-005: preserve enactment-day dispatch, not the act's effective date.
  return bindings.consequences(next, {
    onDate: bindings.currentDate(next),
    activity: "effective",
    activityId: enactment.id,
    subjectIds: [...bindings.people(next)],
    governingLawId: measureId,
  });
}
export function applyNewlyEnactedLawEffectsFromReaders<State>(
  before: State,
  after: State,
  bindings: EnactmentBindings<State>,
): State {
  if (before === after) return after;
  const previous = new Set(bindings.enactments(before).map((row) => row.id));
  let next = after;
  for (const row of bindings.enactments(after)) {
    if (previous.has(row.id) || row.outcome !== "enacted") continue;
    next = applyEnactedLawEffectsFromReaders(next, row.measureId, bindings);
  }
  return next;
}
export interface ConsequenceContextFacts {
  readonly activity: string;
  readonly activityId: string;
  readonly onDate: string;
  readonly questionKey?: string;
  readonly standingAppropriationId?: string;
  readonly governingLawId?: string;
}
export function consequenceRowsForActivity<
  Row extends { readonly when: string },
>(
  questionKey: string,
  rows: readonly Row[],
  context: ConsequenceContextFacts,
): readonly Row[] {
  if (
    context.standingAppropriationId ||
    (context.questionKey && questionKey !== context.questionKey)
  )
    return [];
  return rows.filter((row) => row.when === context.activity);
}
export function resolvedConsequenceApplies(
  input: {
    readonly rowId: string;
    readonly questionKey: string;
    readonly activityId: string;
    readonly measureId: string;
    readonly effectiveAt: string;
    readonly operativeAt: string;
  },
  rowId: string,
  questionKey: string,
  context: ConsequenceContextFacts,
): boolean {
  if (
    input.rowId !== rowId ||
    input.questionKey !== questionKey ||
    input.activityId !== context.activityId
  )
    throw new Error(
      `Consequence ${rowId}: resolver returned inconsistent cause identity`,
    );
  if (context.governingLawId && input.measureId !== context.governingLawId)
    return false;
  return !(
    input.effectiveAt > context.onDate || input.operativeAt > context.onDate
  );
}
