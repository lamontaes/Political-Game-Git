import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createStableId,
  createWorkItem,
  drawCanonicalName,
  introduceMeasure,
  legislativeBlueprint,
  makeIsoDate,
  measurePosition,
  recordFiledProvision,
  SeededRng,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  compileBillDraft,
  BillConfigurationError,
  designationPrefix,
  draftingSupportsScenario,
  type CompiledBillDraft,
} from "../simulation/legislation-drafting";
import {
  draftLineageForMeasure,
  draftParameterValues,
  recordDraftLineage,
} from "../simulation/legislation-draft-lineage";
import {
  programConfigurations,
  programFamily,
  programVariant,
  type ProgramParameterValue,
} from "../simulation/legislation-program-families";

/**
 * More than one bill, in one life.
 *
 * The legislative route reached exactly one measure. Its stable key was
 * `legislative-work:<scenario>:measure` — one per legislature, forever — so a
 * player who finished a bill had nowhere to go, and a player who wanted a
 * second one had nowhere to put it. Everything else about the route was right:
 * the measure lives in the player's own world, moves through the accepted rule
 * packs, and is saved and reloaded like the rest of their life.
 *
 * The docket is that route, keyed properly. A bill is identified by the
 * legislature it belongs to and its own sequence within the player's docket, so
 * three bills coexist without overwriting, cross-wiring or duplicating each
 * other. Each one is a canonical measure with canonical provisions and a
 * canonical work item; none of them is presentation state.
 *
 * A new bill is created only by an explicit act — `fileDraft`, reached from a
 * player action. Reading the docket, rendering it, reloading a save and opening
 * a bill are all pure. Nothing here mints a bill because a day passed or a
 * component rendered.
 */

/* -------------------------------------------------------------------------- */
/* Reading the docket                                                          */
/* -------------------------------------------------------------------------- */

export type DocketBillStage =
  | "filed"
  | "in-committee"
  | "on-floor"
  | "in-second-chamber"
  | "with-the-governor"
  | "concluded";

export interface DocketBill {
  /** Stable across saves. The docket's own identity for this bill. */
  readonly docketKey: string;
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  /** Which library configuration wrote it, pinned at the version it used. */
  readonly familyKey: string;
  readonly familyTitle: string;
  readonly familyVersion: string;
  readonly variantKey: string;
  readonly variantLabel: string;
  readonly parameterValues: Readonly<Record<string, ProgramParameterValue>>;
  readonly sponsorPersonId: EntityId;
  /** Whose bill this is, said exactly. */
  readonly playerRole: DocketPlayerRole;
  readonly filedOn: IsoDate;
  readonly stage: DocketBillStage;
  readonly chamberName: string | null;
  readonly concluded: boolean;
}

/**
 * The player's actual relationship to a bill.
 *
 * Recorded rather than assumed, because "your bill" is a claim. A measure the
 * player's own office filed is theirs; one they are carrying for the member
 * they work for is not the same thing, and a colleague's proposal is neither.
 */
export type DocketPlayerRole =
  | { readonly kind: "sponsor-of-record" }
  | { readonly kind: "office-of-the-sponsor"; readonly memberPersonId: EntityId };

const DOCKET_KEY_PREFIX = "legislative-docket";

/** The stable key of the measure a docket entry owns. */
export function docketMeasureStableKey(
  scenarioKey: string,
  sequence: number,
): string {
  return `${DOCKET_KEY_PREFIX}:${scenarioKey}:bill-${String(sequence).padStart(3, "0")}:measure`;
}

function docketKeyOf(scenarioKey: string, sequence: number): string {
  return `${DOCKET_KEY_PREFIX}:${scenarioKey}:bill-${String(sequence).padStart(3, "0")}`;
}

function parseDocketSequence(measureStableKey: string): number | null {
  const match = /^legislative-docket:[^:]+:bill-(\d{3}):measure$/.exec(
    measureStableKey,
  );
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

function stageOf(world: World, measureId: EntityId): {
  readonly stage: DocketBillStage;
  readonly chamberName: string | null;
  readonly concluded: boolean;
} {
  const position = measurePosition(world, measureId);
  const chamberName = position.chamberKey ?? null;
  switch (position.phase) {
    case "drafting":
    case "awaiting-referral":
      return { stage: "filed", chamberName, concluded: false };
    case "in-committee":
      return { stage: "in-committee", chamberName, concluded: false };
    case "awaiting-floor":
    case "on-floor":
      return { stage: "on-floor", chamberName, concluded: false };
    case "awaiting-transmittal":
    case "awaiting-concurrence":
    case "awaiting-enrollment":
      return { stage: "in-second-chamber", chamberName, concluded: false };
    case "awaiting-presentation":
    case "awaiting-executive":
    case "awaiting-override":
    case "awaiting-enactment":
      return { stage: "with-the-governor", chamberName, concluded: false };
    case "enacted":
    case "failed":
      // Enacted and failed both mean the same thing to a docket: the bill is
      // history now, and history stays readable rather than disappearing.
      return { stage: "concluded", chamberName, concluded: true };
  }
}

/**
 * Every bill this life has filed, oldest first.
 *
 * Read entirely from canonical records. A bill with no lineage record is not a
 * docket bill — that is how the legacy single-assignment measure stays out of
 * the docket without being deleted or rewritten.
 */
export function readDocket(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
  },
): readonly DocketBill[] {
  const measures = world.history.legislativeMeasures ?? [];
  const bills: DocketBill[] = [];
  for (const measure of measures) {
    const sequence = parseDocketSequence(measure.stableKey);
    if (sequence === null) continue;
    if (!measure.stableKey.startsWith(`${DOCKET_KEY_PREFIX}:${input.scenarioKey}:`)) {
      continue;
    }
    const lineage = draftLineageForMeasure(world, measure.id);
    if (!lineage) continue;

    let familyTitle = lineage.familyKey;
    let variantLabel = lineage.variantKey;
    try {
      const { family, variant } = programVariant(
        lineage.familyKey,
        lineage.variantKey,
      );
      familyTitle = family.title;
      variantLabel = variant.label;
    } catch {
      // A bill filed from a configuration the bank no longer offers keeps its
      // saved identity and reads by its recorded keys. It is not rewritten and
      // it is not hidden: a retired configuration is still what this bill is.
    }

    const position = stageOf(world, measure.id);
    bills.push({
      docketKey: docketKeyOf(input.scenarioKey, sequence),
      measureId: measure.id,
      measureStableKey: measure.stableKey,
      designation: measure.designation,
      shortTitle: measure.shortTitle,
      summary: measure.summary,
      scenarioKey: input.scenarioKey,
      jurisdictionId: measure.jurisdictionId,
      familyKey: lineage.familyKey,
      familyTitle,
      familyVersion: lineage.familyVersion,
      variantKey: lineage.variantKey,
      variantLabel,
      parameterValues: draftParameterValues(lineage),
      sponsorPersonId: measure.sponsorPersonId,
      playerRole:
        measure.sponsorPersonId === input.playerPersonId
          ? { kind: "sponsor-of-record" }
          : {
              kind: "office-of-the-sponsor",
              memberPersonId: measure.sponsorPersonId,
            },
      filedOn: lineage.compiledAt,
      stage: position.stage,
      chamberName: position.chamberName,
      concluded: position.concluded,
    });
  }
  return bills;
}

export function docketBill(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
    readonly docketKey: string;
  },
): DocketBill | null {
  return (
    readDocket(world, input).find(
      (bill) => bill.docketKey === input.docketKey,
    ) ?? null
  );
}

/** The next free sequence, so a new bill never lands on an existing one. */
function nextDocketSequence(world: World, scenarioKey: string): number {
  const used = (world.history.legislativeMeasures ?? [])
    .filter((measure) =>
      measure.stableKey.startsWith(`${DOCKET_KEY_PREFIX}:${scenarioKey}:`),
    )
    .map((measure) => parseDocketSequence(measure.stableKey))
    .filter((sequence): sequence is number => sequence !== null);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

/* -------------------------------------------------------------------------- */
/* Previewing a draft — pure, writes nothing                                   */
/* -------------------------------------------------------------------------- */

export interface DraftPreviewInput {
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly familyKey: string;
  readonly variantKey: string;
  readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
  readonly filedOn: IsoDate;
  /** Supplied by the caller so a preview is not numbered by writing anything. */
  readonly provisionalSequence: number;
}

/**
 * What the bill would say, without filing it.
 *
 * Read-only by construction: the compiler is pure and this function does not
 * receive a World at all, so a preview cannot write legislative history even by
 * mistake. That is the packet's rule enforced by the shape of the code rather
 * than by remembering to obey it.
 */
export function previewDraft(input: DraftPreviewInput): CompiledBillDraft {
  const blueprint = legislativeBlueprint(input.scenarioKey);
  const chamberKey = blueprint.pack.chambers[0]?.chamberKey ?? "house";
  return compileBillDraft({
    familyKey: input.familyKey,
    variantKey: input.variantKey,
    parameterValues: input.parameterValues,
    scenarioKey: input.scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation: `${designationPrefix(chamberKey)} ${400 + input.provisionalSequence}`,
    filedOn: input.filedOn,
  });
}

/** The configurations a player may choose between in this legislature. */
export interface DraftOption {
  readonly familyKey: string;
  readonly familyTitle: string;
  readonly mechanism: string;
  readonly variantKey: string;
  readonly variantLabel: string;
  readonly synopsis: string;
  readonly declaredLimits: readonly string[];
}

export function availableDraftOptions(
  scenarioKey: string,
): readonly DraftOption[] {
  if (!draftingSupportsScenario(scenarioKey)) return [];
  return programConfigurations().map((configuration) => {
    const { family, variant } = programVariant(
      configuration.familyKey,
      configuration.variantKey,
    );
    return {
      familyKey: family.familyKey,
      familyTitle: family.title,
      mechanism: family.mechanism,
      variantKey: variant.variantKey,
      variantLabel: variant.label,
      synopsis: variant.synopsis,
      declaredLimits: variant.declaredLimits,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Filing a draft — the one write                                              */
/* -------------------------------------------------------------------------- */

export interface FileDraftInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly familyKey: string;
  readonly variantKey: string;
  readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
}

export interface FileDraftResult {
  readonly world: World;
  readonly bill: DocketBill;
  readonly draft: CompiledBillDraft;
}

/**
 * Files a configured draft as a real measure in the player's own world.
 *
 * This is the only function in the feature that writes a bill, and it is
 * reached from an explicit player action. It refuses before it writes anything:
 * a jurisdiction the world does not contain, a legislature with no drafting
 * authority, a scenario that does not belong to this character's legislature,
 * or a configuration the family will not carry all fail with the world
 * untouched.
 */
export function fileDraft(
  world: World,
  input: FileDraftInput,
): FileDraftResult {
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

  const sequence = nextDocketSequence(world, input.scenarioKey);
  const measureStableKey = docketMeasureStableKey(input.scenarioKey, sequence);
  const chamberKey = blueprint.pack.chambers[0]?.chamberKey ?? "house";
  const draft = compileBillDraft({
    familyKey: input.familyKey,
    variantKey: input.variantKey,
    parameterValues: input.parameterValues,
    scenarioKey: input.scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation: `${designationPrefix(chamberKey)} ${400 + sequence}`,
    filedOn: world.currentDate,
  });

  // The member the office serves. Reused from the accepted route rather than
  // invented here, so a docket bill is sponsored by the same colleague the
  // single-assignment route already established for this legislature.
  const sponsorKey = `legislative-work:${input.scenarioKey}:member`;
  const sponsorPersonId = characterHistoryContextPersonId(world, sponsorKey);
  let next = world;
  if (!next.people[sponsorPersonId]) {
    const rng = new SeededRng(next.seed).fork(
      `legislative-member:${input.scenarioKey}`,
    );
    const name = drawCanonicalName(rng);
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
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId,
  });

  const measureId = createStableId(
    "legislative-measure",
    `${next.id}:${input.jurisdictionId}:${measureStableKey}`,
  );

  // The compiled clauses become the bill's filed text through the accepted
  // append-only provision writer. Nothing here writes a provision record
  // directly, so amendment authority, versioning and history all behave
  // exactly as they already do.
  for (const clause of draft.clauses) {
    next = recordFiledProvision(next, {
      stableKey: `${docketKeyOf(input.scenarioKey, sequence)}:${clause.provisionKey}`,
      measureId,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: {
        jurisdictionId: input.jurisdictionId,
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

  next = recordDraftLineage(next, {
    stableKey: `${docketKeyOf(input.scenarioKey, sequence)}:lineage`,
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    provenanceNote:
      "Authored programme parameters chosen in play. Not a statute, not a measurement, and not a claim about any real programme.",
  });

  // The docket entry the Work surface reads. A work item focused on
  // legislative material is the existing seam for exactly this, so the bill
  // appears in Work without a second work system being invented for it.
  next = createWorkItem(next, {
    stableKey: `${docketKeyOf(input.scenarioKey, sequence)}:work`,
    title: `${draft.designation} — ${draft.shortTitle}`,
    summary: draft.synopsis,
    jurisdictionId: input.jurisdictionId,
    sourceEntityIds: [measureId, input.jurisdictionId],
    focus: {
      kind: "legislative-material",
      targetKey: docketKeyOf(input.scenarioKey, sequence),
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
    docketKey: docketKeyOf(input.scenarioKey, sequence),
  });
  if (!bill) {
    throw new Error("The filed bill did not appear on the docket.");
  }
  return { world: next, bill, draft };
}

/**
 * Recompiles a saved bill's configuration, for reading rather than for filing.
 *
 * Used to show a filed bill's parameters beside a proposed change. The result
 * is a reading of the saved configuration at the family version it was filed
 * at; where the bank no longer offers that configuration, the caller is told so
 * rather than shown a recompilation of something else.
 */
export function recompileSavedBill(
  world: World,
  bill: DocketBill,
): CompiledBillDraft | { readonly unavailable: string } {
  const lineage = draftLineageForMeasure(world, bill.measureId);
  if (!lineage) {
    return { unavailable: "This bill records no drafting configuration." };
  }
  let family;
  try {
    family = programFamily(lineage.familyKey);
  } catch {
    return {
      unavailable: `The '${lineage.familyKey}' family is no longer in the content bank, so this bill's configuration cannot be re-read. Its filed text is unaffected.`,
    };
  }
  if (family.familyVersion !== lineage.familyVersion) {
    return {
      unavailable: `This bill was drafted at ${lineage.familyKey} ${lineage.familyVersion} and the bank now carries ${family.familyVersion}. Its filed text stands as filed.`,
    };
  }
  try {
    const blueprint = legislativeBlueprint(bill.scenarioKey);
    return compileBillDraft({
      familyKey: lineage.familyKey,
      variantKey: lineage.variantKey,
      parameterValues: draftParameterValues(lineage),
      scenarioKey: bill.scenarioKey,
      jurisdictionId: bill.jurisdictionId,
      rulePackId: blueprint.pack.packId,
      designation: bill.designation,
      filedOn: lineage.compiledAt,
    });
  } catch (caught) {
    return { unavailable: (caught as Error).message };
  }
}

/** An adult old enough to be seated. No other claim is made about them. */
function memberBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 47}${currentDate.slice(4)}`,
  );
}
