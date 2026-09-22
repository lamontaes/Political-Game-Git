import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  currentMeasureProvisions,
  createStableId,
  createWorkItem,
  drawCanonicalNameForGender,
  catalogPropositionIds,
  introduceMeasure,
  legislativeBlueprint,
  makeIsoDate,
  recordFiledProvision,
  SeededRng,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  BillConfigurationError,
  designationPrefix,
  draftingSupportsScenario,
} from "../simulation/legislation-drafting";
import {
  draftLineageComponents,
  draftParameterValues,
  isBundleMeasure,
  recordDraftLineage,
} from "../simulation/legislation-draft-lineage";
import {
  compileMeasureBundle,
  MeasureBundleError,
  type CompiledMeasureBundle,
  type MeasureComponentInput,
  type MeasureCrossReference,
  type MeasureOperation,
  type SubjectRule,
} from "../simulation/legislation-bundle";
import {
  programFamily,
  type PredicateAuthority,
  type ProgramParameterValue,
} from "../simulation/legislation-program-families";
import {
  docketBill,
  docketKeyOf,
  docketMeasureStableKey,
  nextDocketSequence,
  resolveAuthority,
  type DocketBill,
} from "./legislation-docket";
import {
  activeMemberSeats,
  resolveActiveMemberSeat,
} from "./legislative-member-seat";

/**
 * Filing and re-reading a measure that carries more than one part.
 *
 * `compileMeasureBundle` next door says what a multi-component measure would
 * read; this module is the one place that writes one, and the one place that
 * reads a filed one back. It writes through exactly the records the
 * single-family route already writes — a measure, append-only provisions, a
 * work item, and draft lineage — with no store of its own. The only change to
 * those records is that lineage is now written once per component instead of
 * once per bill, which is what lets a filed bundle be recompiled months later
 * with each part still knowing which configuration, which authority and which
 * version produced it.
 *
 * What that buys, and the reason it is not a second database: every existing
 * reader of a measure keeps working. `currentMeasureProvisions` returns the
 * whole measure's sections in section order, amendment authority and history
 * behave exactly as they do for a single-family bill, and a bundle's sections
 * are told apart by the component namespace their keys already carry rather
 * than by a parallel index that could disagree with the provisions.
 *
 * Nothing here decides whether a combination is lawful. The subject rule comes
 * from the caller, which reads it from the jurisdiction's saved profile, and a
 * jurisdiction that has not declared one is not thereby unrestricted — it is a
 * jurisdiction whose profile has not said, which the caller must resolve before
 * filing rather than have guessed at here.
 */

/* -------------------------------------------------------------------------- */
/* Filing                                                                      */
/* -------------------------------------------------------------------------- */

/** One part of a measure as the player configured it, before any authority is resolved. */
export interface FileBundleComponentInput {
  readonly componentKey: string;
  readonly familyKey: string;
  readonly variantKey: string;
  readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
  readonly subject: string;
  readonly dependsOn?: readonly string[];
  /** What this component does to existing law. An insertion where omitted. */
  readonly operation?: MeasureOperation;
  /** References this component declares, checked when the measure compiles. */
  readonly crossReferences?: readonly MeasureCrossReference[];
  /**
   * The authority key this component acts upon, where its instrument takes one.
   *
   * A key rather than a resolved authority, on the same ground as the
   * single-bill route: resolving it here would let a component be filed
   * against a docket measure that had moved, or vanished, between the player
   * choosing it and the measure being written.
   */
  readonly authorityKey?: string;
}

export interface FileBundleDraftInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly memberSeatStableKey?: string;
  readonly jurisdictionId: EntityId;
  readonly components: readonly FileBundleComponentInput[];
  /** What the jurisdiction's saved profile allows. Never inferred here. */
  readonly subjectRule: SubjectRule;
}

export interface FileBundleDraftResult {
  readonly world: World;
  readonly bill: DocketBill;
  readonly bundle: CompiledMeasureBundle;
}

/** An adult old enough to be seated. No other claim is made about them. */
function memberBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 47}${currentDate.slice(4)}`,
  );
}

/**
 * Files a multi-component measure in the player's own world.
 *
 * Refuses before it writes: an unsupported legislature, a jurisdiction this
 * world does not contain, a seat in another legislature, an authority that no
 * longer resolves, a component the bank will not compile, two components
 * writing the same provision of the same authority, a cycle, or a subject rule
 * the measure breaks all fail with the world untouched — because the whole
 * bundle is compiled before the first record is written.
 */
export function fileBundleDraft(
  world: World,
  input: FileBundleDraftInput,
): FileBundleDraftResult {
  if (!draftingSupportsScenario(input.scenarioKey)) {
    throw new BillConfigurationError(
      `No drafting authority is supported for the '${input.scenarioKey}' legislature.`,
    );
  }
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new BillConfigurationError(
      "This world has no record of the jurisdiction the job sits in.",
    );
  }
  const blueprint = legislativeBlueprint(input.scenarioKey);
  if (blueprint.context.jurisdiction.id !== input.jurisdictionId) {
    throw new BillConfigurationError(
      `The ${input.scenarioKey} legislature does not belong to this character's job.`,
    );
  }

  const membership = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: input.jurisdictionId,
    legislativeRulePackId: blueprint.pack.packId,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  if (
    membership.kind !== "seated" &&
    (input.memberSeatStableKey !== undefined ||
      activeMemberSeats(world, input.playerPersonId).length > 0)
  ) {
    throw new BillConfigurationError(membership.reason);
  }
  const actualSeat = membership.kind === "seated" ? membership.seat : null;
  if (
    actualSeat &&
    (actualSeat.governingJurisdictionId !== input.jurisdictionId ||
      actualSeat.legislativeRulePackId !== blueprint.pack.packId)
  ) {
    throw new BillConfigurationError(
      "This member's seat belongs to a different legislature.",
    );
  }

  // Resolved against the world about to be written to, one component at a
  // time, and named in the refusal so a drafter knows which part of their
  // measure is the one that no longer has something to act on.
  const authorities = new Map<string, PredicateAuthority>();
  for (const component of input.components) {
    if (component.authorityKey === undefined) continue;
    const authority = resolveAuthority(
      world,
      {
        scenarioKey: input.scenarioKey,
        playerPersonId: input.playerPersonId,
      },
      component.authorityKey,
    );
    if (authority === null) {
      throw new BillConfigurationError(
        `Component '${component.componentKey}' is written against '${component.authorityKey}', which nothing on this docket or in the statute book answers to.`,
      );
    }
    authorities.set(component.componentKey, authority);
  }

  // The exact target revision, checked against the text actually in force.
  //
  // This is the one check the compiler cannot make, because it is pure and
  // holds no World. A component that amends or repeals names the provision
  // record its author was reading; if that provision has since been amended by
  // somebody else, or repealed, or never existed, the measure is refused with
  // the provision named. Applying it to whatever is there now would silently
  // rewrite text its author never saw.
  for (const component of input.components) {
    const operation = component.operation;
    if (operation === undefined || operation.kind === "insert") continue;
    const verb = operation.kind === "replace" ? "amend" : "repeal";
    const authority = authorities.get(component.componentKey);
    if (authority === undefined) {
      throw new BillConfigurationError(
        `Component '${component.componentKey}' sets out to ${verb} existing law but names no authority to ${verb}.`,
      );
    }
    if (authority.kind !== "docket-measure") {
      // A standing statute in the content bank has no provision records in
      // this world, so there is no revision to check a draft against. Saying
      // so is the honest answer; pretending to have verified one would be the
      // dishonest one.
      throw new BillConfigurationError(
        `Component '${component.componentKey}' sets out to ${verb} ${authority.citationLabel}, whose text this world does not record as provisions, so the version it was written against cannot be checked.`,
      );
    }
    const inForce = currentMeasureProvisions(
      world,
      authority.measureId as EntityId,
    );
    for (const target of operation.targets) {
      const current = inForce.find(
        (provision) => provision.provisionKey === target.provisionKey,
      );
      if (!current) {
        throw new BillConfigurationError(
          `Component '${component.componentKey}' sets out to ${verb} the '${target.provisionKey}' provision of ${authority.citationLabel}, which that measure does not currently carry.`,
        );
      }
      if (current.id !== target.expectedRevisionId) {
        throw new BillConfigurationError(
          `Component '${component.componentKey}' was written against an earlier version of the '${target.provisionKey}' provision of ${authority.citationLabel}. That text has been amended since, so this component must be rewritten against the version now in force.`,
        );
      }
    }
  }

  const sequence = nextDocketSequence(world, input.scenarioKey);
  const docketKey = docketKeyOf(input.scenarioKey, sequence);
  const measureStableKey = docketMeasureStableKey(input.scenarioKey, sequence);
  const chamberKey =
    actualSeat?.chamberKey ?? blueprint.pack.chambers[0]?.chamberKey ?? "house";
  const designation = `${designationPrefix(chamberKey)} ${400 + sequence}`;

  const bundle = compileMeasureBundle({
    scenarioKey: input.scenarioKey,
    designation,
    filedOn: world.currentDate,
    subjectRule: input.subjectRule,
    components: input.components.map((component): MeasureComponentInput => ({
      componentKey: component.componentKey,
      familyKey: component.familyKey,
      variantKey: component.variantKey,
      jurisdictionId: input.jurisdictionId,
      rulePackId: blueprint.pack.packId,
      subject: component.subject,
      ...(component.parameterValues !== undefined
        ? { parameterValues: component.parameterValues }
        : {}),
      ...(component.dependsOn !== undefined
        ? { dependsOn: component.dependsOn }
        : {}),
      ...(component.operation !== undefined
        ? { operation: component.operation }
        : {}),
      ...(component.crossReferences !== undefined
        ? { crossReferences: component.crossReferences }
        : {}),
      ...(authorities.has(component.componentKey)
        ? { predicateAuthority: authorities.get(component.componentKey)! }
        : {}),
    })),
  });

  // The measure's own headline. A bundle has no single family to take a short
  // title from, so it says what it carries rather than borrowing the first
  // component's title and quietly hiding the rest.
  const lead = bundle.components[0]!.draft;
  const shortTitle =
    bundle.components.length === 1
      ? lead.shortTitle
      : `${lead.shortTitle} and ${bundle.components.length - 1} further ${bundle.components.length === 2 ? "part" : "parts"}`;
  const summary = bundle.components
    .map((component) => `${component.draft.shortTitle}.`)
    .join(" ");

  // An appropriation measure is one that actually provides money. A bundle
  // qualifies when any admitted component does, and the classification is read
  // off the compiled components rather than declared by the caller.
  const subjectClass = bundle.components.some(
    (component) => component.draft.appropriatedMinorUnits !== null,
  )
    ? ("appropriation" as const)
    : ("general-policy" as const);

  const sponsorKey = `legislative-work:${input.scenarioKey}:member`;
  const sponsorPersonId = actualSeat
    ? input.playerPersonId
    : characterHistoryContextPersonId(world, sponsorKey);
  let next = world;
  if (!next.people[sponsorPersonId]) {
    const rng = new SeededRng(next.seed).fork(
      `legislative-member:${input.scenarioKey}`,
    );
    const name = drawCanonicalNameForGender(rng, "unstated");
    next = applyCharacterHistoryPlan(next, {
      stableKey: sponsorKey,
      mode: "quick-generated",
      personId: input.playerPersonId,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey: sponsorKey,
            givenName: name.givenName,
            familyName: name.familyName,
            birthDate: memberBirthDate(next.currentDate),
            homeJurisdictionId: input.jurisdictionId,
          },
        },
      ],
    }).world;
  }

  next = introduceMeasure(next, {
    stableKey: measureStableKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation,
    shortTitle,
    summary,
    origin: "member-introduction",
    subjectClass,
    sponsorPersonId,
    originChamberKey: chamberKey,
    // A bill of several parts is about every question any part is about.
    propositionIds: catalogPropositionIds(next, [
      ...new Set(
        bundle.components.flatMap(
          (component) => component.draft.propositionKeys,
        ),
      ),
    ]),
  });

  const measureId = createStableId(
    "legislative-measure",
    `${next.id}:${input.jurisdictionId}:${measureStableKey}`,
  );

  // Every section goes in through the same append-only writer the single-bill
  // route uses, already numbered across the whole measure and already carrying
  // its component namespace, so nothing downstream has to know which part of
  // the measure it is reading unless it wants to.
  for (const component of bundle.components) {
    for (const clause of component.clauses) {
      next = recordFiledProvision(next, {
        stableKey: `${docketKey}:${clause.provisionKey}`,
        measureId,
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        ...(clause.fiscalPeriod !== undefined
          ? { fiscalPeriod: clause.fiscalPeriod }
          : {}),
        beneficiary: clause.beneficiary,
        applicationScope: {
          jurisdictionId: component.jurisdictionId,
          segmentKey: null,
        },
        ...(clause.fiscalExposureLabel !== null
          ? {
              fiscalExposureLabel: clause.fiscalExposureLabel,
              fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
            }
          : {}),
      });
    }
  }

  for (const component of bundle.components) {
    const authority = component.draft.predicateAuthority;
    next = recordDraftLineage(next, {
      stableKey: `${docketKey}:lineage:${component.componentKey}`,
      measureId,
      componentKey: component.componentKey,
      componentSubject: component.subject,
      componentDependsOn: component.dependsOn,
      ...(component.operation.kind !== "insert"
        ? {
            componentOperation: {
              kind: component.operation.kind,
              targets: component.operation.targets.map((target) => ({
                provisionKey: target.provisionKey,
                expectedRevisionId: target.expectedRevisionId,
              })),
            },
          }
        : {}),
      ...(component.crossReferences.length > 0
        ? {
            componentCrossReferences: component.crossReferences.map(
              (reference) => ({
                fromProvisionKey: reference.fromProvisionKey,
                toProvisionKey: reference.toProvisionKey,
                ...(reference.toComponentKey !== null
                  ? { toComponentKey: reference.toComponentKey }
                  : {}),
                ...(reference.toAuthorityKey !== null
                  ? { toAuthorityKey: reference.toAuthorityKey }
                  : {}),
              }),
            ),
          }
        : {}),
      bundleSubjectRule: bundle.subjectRule,
      familyKey: component.draft.familyKey,
      familyVersion: component.draft.familyVersion,
      variantKey: component.draft.variantKey,
      compiledAt: component.draft.filedOn,
      parameterValues: component.draft.parameterValues,
      ...(authority !== null ? { authorityKey: authority.authorityKey } : {}),
      ...(authority !== null && authority.kind === "docket-measure"
        ? { authorityMeasureId: authority.measureId as EntityId }
        : {}),
      provenanceNote:
        "Authored program parameters chosen in play. Not a statute, not a measurement, and not a claim about any real program.",
    });
  }

  next = createWorkItem(next, {
    stableKey: `${docketKey}:work`,
    title: `${designation} — ${shortTitle}`,
    summary,
    jurisdictionId: input.jurisdictionId,
    sourceEntityIds: [measureId, input.jurisdictionId],
    focus: {
      kind: "legislative-material",
      targetKey: docketKey,
      sourceEntityId: measureId,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [input.playerPersonId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });

  const bill = docketBill(next, {
    scenarioKey: input.scenarioKey,
    playerPersonId: input.playerPersonId,
    docketKey,
  });
  if (!bill) {
    throw new Error("The filed measure did not appear on the docket.");
  }
  return { world: next, bill, bundle };
}

/* -------------------------------------------------------------------------- */
/* Reading one back                                                            */
/* -------------------------------------------------------------------------- */

/** Why a saved measure cannot be re-read as a bundle. Its filed text is unaffected. */
export interface BundleUnavailable {
  readonly unavailable: string;
}

/**
 * Recompiles a filed measure from the configurations it was filed at.
 *
 * The same discipline the single-bill reader holds itself to, extended to
 * parts: a component whose family has moved in the bank, or whose authority is
 * no longer readable, makes the *measure* unavailable to re-read rather than
 * being dropped or recompiled against something else, because a bundle missing
 * one of its parts is a different measure from the one that was filed. The
 * filed text stands either way — it lives in provisions, not here.
 */
export function recompileSavedBundle(
  world: World,
  bill: DocketBill,
  playerPersonId?: EntityId,
): CompiledMeasureBundle | BundleUnavailable {
  if (!isBundleMeasure(world, bill.measureId)) {
    return {
      unavailable:
        "This measure was filed from a single configuration, so it has no components to re-read.",
    };
  }
  const lineages = draftLineageComponents(world, bill.measureId);
  const blueprint = legislativeBlueprint(bill.scenarioKey);
  const components: MeasureComponentInput[] = [];
  for (const lineage of lineages) {
    let authority: PredicateAuthority | null = null;
    if (lineage.authorityKey !== undefined) {
      authority = resolveAuthority(
        world,
        {
          scenarioKey: bill.scenarioKey,
          playerPersonId:
            playerPersonId ?? bill.sponsorPersonId ?? bill.measureId,
        },
        lineage.authorityKey,
      );
      if (authority === null) {
        return {
          unavailable: `Component '${lineage.componentKey}' was written against ${lineage.authorityKey}, which is no longer available to read. The measure's filed text stands as filed.`,
        };
      }
    }
    components.push({
      componentKey: lineage.componentKey!,
      familyKey: lineage.familyKey,
      variantKey: lineage.variantKey,
      parameterValues: draftParameterValues(lineage),
      jurisdictionId: bill.jurisdictionId,
      rulePackId: blueprint.pack.packId,
      subject: lineage.componentSubject ?? lineage.familyKey,
      ...(lineage.componentDependsOn !== undefined
        ? { dependsOn: lineage.componentDependsOn }
        : {}),
      ...(lineage.componentOperation !== undefined
        ? { operation: lineage.componentOperation }
        : {}),
      ...(lineage.componentCrossReferences !== undefined
        ? { crossReferences: lineage.componentCrossReferences }
        : {}),
      ...(authority !== null ? { predicateAuthority: authority } : {}),
    });
  }

  // Pinned versions are checked by compiling: the compiler reads the bank at
  // the version it now carries, and a component filed at another version is
  // reported rather than silently re-read at the new one.
  for (const lineage of lineages) {
    const compiledVersion = componentFamilyVersion(lineage.familyKey);
    if (compiledVersion === null) {
      return {
        unavailable: `The '${lineage.familyKey}' family is no longer in the content bank, so component '${lineage.componentKey}' cannot be re-read. The measure's filed text is unaffected.`,
      };
    }
    if (compiledVersion !== lineage.familyVersion) {
      return {
        unavailable: `Component '${lineage.componentKey}' was drafted at ${lineage.familyKey} ${lineage.familyVersion} and the bank now carries ${compiledVersion}. The measure's filed text stands as filed.`,
      };
    }
  }

  try {
    return compileMeasureBundle({
      scenarioKey: bill.scenarioKey,
      designation: bill.designation,
      filedOn: lineages[0]!.compiledAt,
      subjectRule: lineages[0]!.bundleSubjectRule ?? "unrestricted",
      components,
    });
  } catch (caught) {
    if (
      caught instanceof MeasureBundleError ||
      caught instanceof BillConfigurationError
    ) {
      return { unavailable: caught.message };
    }
    throw caught;
  }
}

/**
 * The version the bank now carries for a family, or null if it carries none.
 *
 * A retired family is a null rather than a thrown read, because "the bank no
 * longer has this" is an answer the reader above turns into a sentence a
 * player can act on, and an exception here would be an error somewhere else.
 */
function componentFamilyVersion(familyKey: string): string | null {
  try {
    return programFamily(familyKey).familyVersion;
  } catch {
    return null;
  }
}
