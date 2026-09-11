import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  applyCharacterHistoryPlan,
  currentMeasureProvisions,
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
import type {
  EntityId,
  IsoDate,
  LegislativeDraftLineageRecord,
  World,
} from "../simulation";
import {
  compileBillDraft,
  BillConfigurationError,
  designationPrefix,
  draftingSupportsScenario,
  type CompiledBillDraft,
} from "../simulation/legislation-drafting";
import { formatMinorUnits } from "../simulation/legislation-program-families";
import {
  draftLineageForMeasure,
  draftParameterValues,
  recordDraftLineage,
} from "../simulation/legislation-draft-lineage";
import {
  legalInstrumentRule,
  programConfigurations,
  programFamily,
  programVariant,
  standingAuthorities,
  type LegalInstrument,
  type PredicateAuthority,
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
  /**
   * What kind of legal act this bill is.
   *
   * Read from the configuration it was filed at, so a bill drafted from a
   * configuration the bank has since retired still says what it is. Null only
   * where the bank no longer carries that configuration at all.
   */
  readonly instrument: LegalInstrument | null;
  readonly instrumentLabel: string | null;
  /** The authority it was written against, where its instrument took one. */
  readonly authorityKey: string | null;
  readonly authorityMeasureId: EntityId | null;
  readonly parameterValues: Readonly<Record<string, ProgramParameterValue>>;
  readonly sponsorPersonId: EntityId | null;
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
  | {
      readonly kind: "office-of-the-sponsor";
      readonly memberPersonId: EntityId;
    }
  /** The measure records no sponsor. Said, rather than guessed at. */
  | { readonly kind: "no-sponsor-recorded" };

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
  const match = /^legislative-docket:[^:]+:bill-(\d{3,}):measure$/.exec(
    measureStableKey,
  );
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

/**
 * What the chamber is called, rather than what it is keyed as.
 *
 * `measurePosition` reports a chamber key, which is an identifier; putting it
 * on screen shows a player the word "house". The rule pack holds the name the
 * chamber actually goes by, and an unknown key stays null rather than being
 * title-cased into a guess.
 */
function chamberDisplayName(
  scenarioKey: string,
  chamberKey: string | null,
): string | null {
  if (chamberKey === null) return null;
  try {
    const blueprint = legislativeBlueprint(scenarioKey);
    return (
      blueprint.pack.chambers.find(
        (chamber) => chamber.chamberKey === chamberKey,
      )?.name ?? null
    );
  } catch {
    return null;
  }
}

function stageOf(
  world: World,
  measureId: EntityId,
): {
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
  // Indexed once rather than scanned per measure. A docket of forty bills over
  // forty lineages is sixteen hundred comparisons the other way round, and the
  // docket is read on every render.
  const lineagesByMeasure = new Map<EntityId, LegislativeDraftLineageRecord>();
  for (const lineage of world.history.legislativeDraftLineages ?? []) {
    if (!lineagesByMeasure.has(lineage.measureId)) {
      lineagesByMeasure.set(lineage.measureId, lineage);
    }
  }
  const bills: DocketBill[] = [];
  for (const measure of measures) {
    const sequence = parseDocketSequence(measure.stableKey);
    if (sequence === null) continue;
    if (
      !measure.stableKey.startsWith(
        `${DOCKET_KEY_PREFIX}:${input.scenarioKey}:`,
      )
    ) {
      continue;
    }
    const lineage = lineagesByMeasure.get(measure.id);
    if (!lineage) continue;

    let familyTitle = lineage.familyKey;
    let variantLabel = lineage.variantKey;
    let instrument: LegalInstrument | null = null;
    let instrumentLabel: string | null = null;
    try {
      const { family, variant } = programVariant(
        lineage.familyKey,
        lineage.variantKey,
      );
      if (family.familyVersion !== lineage.familyVersion) {
        throw new Error("The saved family version is unavailable.");
      }
      familyTitle = family.title;
      variantLabel = variant.label;
      instrument = variant.instrument;
      instrumentLabel = legalInstrumentRule(variant.instrument).label;
    } catch {
      // A bill filed from a configuration the bank no longer offers keeps its
      // saved identity and reads by its recorded keys. It is not rewritten and
      // it is not hidden: a retired configuration is still what this bill is.
    }

    const position = stageOf(world, measure.id);
    const chamberName = chamberDisplayName(
      input.scenarioKey,
      position.chamberName,
    );
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
      instrument,
      instrumentLabel,
      authorityKey: lineage.authorityKey ?? null,
      authorityMeasureId: lineage.authorityMeasureId ?? null,
      parameterValues: draftParameterValues(lineage),
      sponsorPersonId: measure.sponsorPersonId,
      playerRole:
        measure.sponsorPersonId === null
          ? { kind: "no-sponsor-recorded" }
          : measure.sponsorPersonId === input.playerPersonId
            ? { kind: "sponsor-of-record" }
            : {
                kind: "office-of-the-sponsor",
                memberPersonId: measure.sponsorPersonId,
              },
      filedOn: lineage.compiledAt,
      stage: position.stage,
      chamberName,
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
/* Filtering a docket that has grown                                           */
/* -------------------------------------------------------------------------- */

export interface DocketQuery {
  /** Restrict to one programme family. */
  readonly familyKey?: string;
  /** Restrict to one kind of legal act. */
  readonly instrument?: LegalInstrument;
  /** Open bills, concluded ones, or both. Defaults to both. */
  readonly status?: "open" | "concluded" | "all";
  /** Matched against designation and short title, case-insensitively. */
  readonly search?: string;
  readonly offset?: number;
  readonly limit?: number;
}

export interface DocketFacetCount {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

export interface DocketPage {
  readonly bills: readonly DocketBill[];
  /** How many bills matched before the page was taken. */
  readonly matching: number;
  /** How many bills are on the docket in total, matched or not. */
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
  /**
   * What is actually on this docket to filter by.
   *
   * Counted from the docket rather than listed from the bank, so a filter is
   * never offered for a family the player has no bill in — and the counts are
   * of the whole docket, not of the page.
   */
  readonly families: readonly DocketFacetCount[];
  readonly instruments: readonly DocketFacetCount[];
  readonly openCount: number;
  readonly concludedCount: number;
}

const DEFAULT_PAGE_SIZE = 12;

/**
 * A page of the docket, filtered.
 *
 * Pure: it reads the docket and takes a slice of it. Paging exists because a
 * member with thirty bills on the docket should not be handed thirty bills,
 * and filtering exists because "the appropriations" and "the ones that are
 * finished" are the two questions somebody actually asks of a list like this.
 * Newest first, because the bill you filed this morning is the one you came
 * back for.
 */
export function queryDocket(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
  },
  query: DocketQuery = {},
): DocketPage {
  const all = readDocket(world, input);
  const newestFirst = [...all].reverse();

  const families = countFacets(
    newestFirst.map((bill) => ({
      key: bill.familyKey,
      label: bill.familyTitle,
    })),
  );
  const instruments = countFacets(
    newestFirst
      .filter((bill) => bill.instrument !== null)
      .map((bill) => ({
        key: bill.instrument as string,
        label: bill.instrumentLabel ?? (bill.instrument as string),
      })),
  );

  const needle = query.search?.trim().toLowerCase() ?? "";
  const status = query.status ?? "all";
  const matched = newestFirst.filter((bill) => {
    if (query.familyKey !== undefined && bill.familyKey !== query.familyKey) {
      return false;
    }
    if (
      query.instrument !== undefined &&
      bill.instrument !== query.instrument
    ) {
      return false;
    }
    if (status === "open" && bill.concluded) return false;
    if (status === "concluded" && !bill.concluded) return false;
    if (needle.length > 0) {
      const haystack = `${bill.designation} ${bill.shortTitle}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const limit =
    query.limit !== undefined && query.limit > 0
      ? query.limit
      : DEFAULT_PAGE_SIZE;
  const offset =
    query.offset !== undefined && query.offset > 0 ? query.offset : 0;
  const page = matched.slice(offset, offset + limit);

  return {
    bills: page,
    matching: matched.length,
    total: all.length,
    offset,
    limit,
    hasMore: offset + page.length < matched.length,
    families,
    instruments,
    openCount: newestFirst.filter((bill) => !bill.concluded).length,
    concludedCount: newestFirst.filter((bill) => bill.concluded).length,
  };
}

function countFacets(
  entries: readonly { readonly key: string; readonly label: string }[],
): readonly DocketFacetCount[] {
  const counts = new Map<string, DocketFacetCount>();
  for (const entry of entries) {
    const existing = counts.get(entry.key);
    counts.set(entry.key, {
      key: entry.key,
      label: entry.label,
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...counts.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

/* -------------------------------------------------------------------------- */
/* What a bill can be written against                                          */
/* -------------------------------------------------------------------------- */

export interface DraftAuthorityOption {
  /** Stable across saves. A standing key, or `docket:<docketKey>`. */
  readonly authorityKey: string;
  readonly kind: "standing-statute" | "docket-measure";
  readonly citationLabel: string;
  readonly programmeLabel: string;
  /** Whether an appropriation can be written against it at all. */
  readonly authorizesSpending: boolean;
  readonly authorizedCeilingMinorUnits: number | null;
  readonly authorizedCeilingLabel: string | null;
  /** Where this authority came from, said rather than implied. */
  readonly note: string;
}

const DOCKET_AUTHORITY_PREFIX = "docket:";

/**
 * Everything a bill in this legislature could be written against.
 *
 * Two sources, kept visibly apart. The standing statutes are authored
 * background — the programmes this state is assumed already to run — and they
 * exist so an appropriation is playable before the player has authorized
 * anything. The docket measures are the player's own earlier bills, and they
 * are the point of the whole arrangement: a second bill that funds, narrows or
 * repeals the first one is continuation rather than another item on a list.
 *
 * A docket bill's ceiling is read from its *current* provisions, so a bill
 * whose ceiling was raised by an adopted amendment can be appropriated against
 * up to the amended figure. That is not a special case; it is what reading the
 * text instead of the configuration means.
 */
export function availableAuthorities(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
  },
): readonly DraftAuthorityOption[] {
  const standing = standingAuthorities().map((authority) => ({
    authorityKey: authority.authorityKey,
    kind: "standing-statute" as const,
    citationLabel: authority.citationLabel,
    programmeLabel: authority.programmeLabel,
    authorizesSpending: authority.authorizesSpending,
    authorizedCeilingMinorUnits: authority.authorizedCeilingMinorUnits,
    authorizedCeilingLabel:
      authority.authorizedCeilingMinorUnits === null
        ? null
        : formatMinorUnits(authority.authorizedCeilingMinorUnits, "USD"),
    note: "An explicitly fictional standing program in this content bank.",
  }));

  const fromDocket: DraftAuthorityOption[] = [];
  for (const bill of readDocket(world, input)) {
    if (
      bill.instrument === null ||
      measurePosition(world, bill.measureId).phase === "failed"
    )
      continue;
    const rule = legalInstrumentRule(bill.instrument);
    // A bill that itself acts on something else is not an authority. An
    // appropriation against an appropriation, or a repeal of a repeal, is a
    // sentence that does not resolve.
    if (rule.requiresPredicateAuthority) continue;
    const reading = measureStatedCeiling(world, bill.measureId);
    fromDocket.push({
      authorityKey: `${DOCKET_AUTHORITY_PREFIX}${bill.docketKey}`,
      kind: "docket-measure",
      citationLabel: `${bill.designation} (${bill.shortTitle})`,
      programmeLabel: `the program described in ${bill.designation}`,
      authorizesSpending:
        rule.mayAuthorizeAppropriation && reading !== null && reading > 0,
      authorizedCeilingMinorUnits: reading,
      authorizedCeilingLabel:
        reading === null ? null : formatMinorUnits(reading, "USD"),
      note:
        measurePosition(world, bill.measureId).phase === "enacted"
          ? `Enactment recorded for ${bill.designation}.`
          : `${bill.designation} is a proposal, not law. Any linked bill is conditional on its enactment.`,
    });
  }
  return [...standing, ...fromDocket];
}

/**
 * What the bill's current sections add up to.
 *
 * Read from provisions rather than recompiled from the configuration, so an
 * adopted amendment that changes a ceiling changes what can be appropriated
 * against it. Revenue sections are not included: a charge is not a ceiling.
 */
function measureStatedCeiling(
  world: World,
  measureId: EntityId,
): number | null {
  const provisions = currentMeasureProvisions(world, measureId);
  // An annual cap cannot be compared with a whole-programme appropriation.
  if (provisions.some((record) => record.fiscalPeriod === "annual"))
    return null;
  const amounts = provisions
    .map((record) => record.fiscalExposureMinorUnits)
    .filter((amount): amount is number => amount !== null);
  if (amounts.length === 0) return null;
  return amounts.reduce((total, amount) => total + amount, 0);
}

/**
 * Turns a chosen authority key into the typed fact the compiler requires.
 *
 * Returns null rather than throwing when the key names nothing, because the
 * caller's next move is a refusal with a sentence in it, and the compiler
 * writes a better one than this function could.
 */
export function resolveAuthority(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
  },
  authorityKey: string,
): PredicateAuthority | null {
  if (!authorityKey.startsWith(DOCKET_AUTHORITY_PREFIX)) {
    return (
      standingAuthorities().find(
        (authority) => authority.authorityKey === authorityKey,
      ) ?? null
    );
  }
  const docketKey = authorityKey.slice(DOCKET_AUTHORITY_PREFIX.length);
  const bill = docketBill(world, { ...input, docketKey });
  if (
    !bill ||
    bill.instrument === null ||
    measurePosition(world, bill.measureId).phase === "failed"
  )
    return null;
  const rule = legalInstrumentRule(bill.instrument);
  if (rule.requiresPredicateAuthority) return null;
  const ceiling = measureStatedCeiling(world, bill.measureId);
  return {
    kind: "docket-measure",
    legalStatus:
      measurePosition(world, bill.measureId).phase === "enacted"
        ? "enacted"
        : "proposed",
    authorityKey,
    citationLabel: `${bill.designation} (${bill.shortTitle})`,
    programmeLabel: `the program described in ${bill.designation}`,
    authorizesSpending:
      rule.mayAuthorizeAppropriation && ceiling !== null && ceiling > 0,
    authorizedCeilingMinorUnits: ceiling,
    currency: "USD",
    measureId: bill.measureId,
    docketKey: bill.docketKey,
  };
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
  /**
   * The authority the draft is written against.
   *
   * Resolved by the caller, because resolving it needs a World and this
   * function deliberately has none. A preview of an instrument that requires
   * one and is given none is refused by the compiler, which is the correct
   * answer rather than a defaulted bill.
   */
  readonly predicateAuthority?: PredicateAuthority;
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
    ...(input.predicateAuthority !== undefined
      ? { predicateAuthority: input.predicateAuthority }
      : {}),
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
  /** What kind of legal act choosing this would write. */
  readonly instrument: LegalInstrument;
  readonly instrumentLabel: string;
  readonly instrumentDescription: string;
  /**
   * Whether choosing this requires naming something that already exists.
   *
   * The surface reads it to know whether to ask, and the compiler enforces it
   * either way. A configuration is not hidden when nothing is available to act
   * on; it is offered and refused with a reason, because "there is nothing to
   * appropriate for yet" is a thing worth telling somebody.
   */
  readonly requiresAuthority: boolean;
  readonly requiresSpendingAuthority: boolean;
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
    const rule = legalInstrumentRule(variant.instrument);
    return {
      familyKey: family.familyKey,
      familyTitle: family.title,
      mechanism: family.mechanism,
      variantKey: variant.variantKey,
      variantLabel: variant.label,
      synopsis: variant.synopsis,
      declaredLimits: variant.declaredLimits,
      instrument: variant.instrument,
      instrumentLabel: rule.label,
      instrumentDescription: rule.description,
      requiresAuthority: rule.requiresPredicateAuthority,
      requiresSpendingAuthority: rule.predicateMustAuthorizeSpending,
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
  /**
   * The authority key the player chose, where the configuration takes one.
   *
   * A key rather than a resolved authority, so filing resolves it against the
   * world it is about to write to. Resolving it earlier would let a bill be
   * filed against a docket measure that had moved, or vanished, in between.
   */
  readonly authorityKey?: string;
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

  // Resolved here, against the world being written to. An instrument that
  // needs one and cannot get one is refused before anything is written.
  let authority: PredicateAuthority | null = null;
  if (input.authorityKey !== undefined) {
    authority = resolveAuthority(
      world,
      {
        scenarioKey: input.scenarioKey,
        playerPersonId: input.playerPersonId,
      },
      input.authorityKey,
    );
    if (authority === null) {
      throw new BillConfigurationError(
        `Nothing on this docket or in the statute book answers to '${input.authorityKey}', so a bill cannot be written against it.`,
      );
    }
  }

  const membership = resolveActiveMemberSeat(world, input.playerPersonId);
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
  const sequence = nextDocketSequence(world, input.scenarioKey);
  const measureStableKey = docketMeasureStableKey(input.scenarioKey, sequence);
  const chamberKey =
    actualSeat?.chamberKey ?? blueprint.pack.chambers[0]?.chamberKey ?? "house";
  const draft = compileBillDraft({
    familyKey: input.familyKey,
    variantKey: input.variantKey,
    parameterValues: input.parameterValues,
    scenarioKey: input.scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation: `${designationPrefix(chamberKey)} ${400 + sequence}`,
    filedOn: world.currentDate,
    ...(authority !== null ? { predicateAuthority: authority } : {}),
  });

  // The member the office serves. Reused from the accepted route rather than
  // invented here. An actual member sponsors their own new bill; trusted
  // staff fixtures retain the colleague established by the assignment route.
  const sponsorKey = `legislative-work:${input.scenarioKey}:member`;
  const sponsorPersonId = actualSeat
    ? input.playerPersonId
    : characterHistoryContextPersonId(world, sponsorKey);
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
    originChamberKey: chamberKey,
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
      ...(clause.fiscalPeriod !== undefined
        ? { fiscalPeriod: clause.fiscalPeriod }
        : {}),
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
    ...(authority !== null ? { authorityKey: authority.authorityKey } : {}),
    ...(authority !== null && authority.kind === "docket-measure"
      ? { authorityMeasureId: authority.measureId as EntityId }
      : {}),
    provenanceNote:
      "Authored program parameters chosen in play. Not a statute, not a measurement, and not a claim about any real program.",
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

/** Player-facing filing gate; trusted content fixtures retain the lower-level writer. */
export function fileDraftFromOffice(
  world: World,
  input: FileDraftInput,
): FileDraftResult {
  const entry = resolveLegislativeFilingEntry(world, input.playerPersonId);
  if (entry.kind === "unavailable")
    throw new BillConfigurationError(entry.reason);
  if (
    entry.scenarioKey !== input.scenarioKey ||
    entry.jurisdictionId !== input.jurisdictionId
  ) {
    throw new BillConfigurationError(
      "This character has no active office for filing in this legislature.",
    );
  }
  return fileDraft(world, input);
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
  playerPersonId?: EntityId,
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
  // A saved bill written against an authority is re-read against the same
  // authority. Where that authority has since gone — a retired standing
  // statute — the reading is reported unavailable rather than recompiled
  // against something else, on the same ground as a moved family version.
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
        unavailable: `This bill was written against ${lineage.authorityKey}, which is no longer available to read. Its filed text stands as filed.`,
      };
    }
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
      ...(authority !== null ? { predicateAuthority: authority } : {}),
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
