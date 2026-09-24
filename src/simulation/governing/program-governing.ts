import { addDays } from "../dates";
import {
  draftLineageComponents,
  draftLineageForMeasure,
} from "../legislation-draft-lineage";
import { currentMeasureProvisions } from "../legislative-politics";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_FAMILY_KEY,
  TRANSIT_FAMILY_VERSION,
  TRANSIT_PROGRAM_KEY,
} from "../legislation-transit-families";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { localFiscalGameAuthorityForRulePackId } from "../local-ordinance-game-profile";
import { admitLocalFiscalMeasure } from "../local-fiscal-authority";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { createOrganization } from "../life";
import { stableHash } from "../ids";
import { programFamilyTitle } from "./program-families";
import { programVariant } from "../legislation-program-families";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForIdentity,
} from "../tax-policy";
import { createResourcePosition, money } from "../resources";
import { canonicalJson } from "../canonical-json";
import { stateTaxServiceProfileForJurisdictionId } from "../world-setup/state-tax-service-profiles";
import {
  assertPublicGovernmentIdentity,
  publicGovernmentIdentityForRecord,
  samePublicGovernmentIdentity,
} from "../public-government-identity";
import type {
  EntityId,
  IsoDate,
  PublicGovernmentIdentity,
  PublicProgramBasis,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import {
  PUBLIC_PROGRAM_VERSION,
  programCapacity,
  programPosition,
  recordProgramAppropriation,
  declareProgramCapacity,
  type PublicProgramAlternative,
} from "./public-program";

/**
 * How a public program reaches a player through ordinary governing.
 *
 * A program used to exist only where a test declared one. Now an adopted
 * budget or an enacted appropriation writes the appropriation record itself,
 * against the jurisdiction's existing public account, and the office is asked
 * what to commit it to. The alternatives are arithmetic over that recorded
 * amount and whatever capacity has been declared: a schedule of operating
 * payments, a maintenance purchase where a restoration cost is on file, and
 * committing nothing. No option promises an outcome.
 */

export const PROGRAM_GOVERNING_VERSION = "program-governing/v1";
const PROGRAM_SERVICE_CAPACITY_PROFILE_VERSION = "program-service-capacity/v1";

interface ProgramServiceCapacityProfile {
  readonly ref: {
    readonly profileId: string;
    readonly version: string;
    readonly digest: string;
  };
  readonly programKey: string;
  readonly capacity: {
    readonly serviceLabel: string;
    readonly unitLabel: string;
    readonly unitsTotal: number;
    readonly unitsOperational: number;
    readonly monthlyOperatingNeedMinorUnits: number;
    readonly completedPermille: null;
    readonly restorationCostPerUnitMinorUnits: number | null;
    readonly basis: PublicProgramBasis;
  };
}

/** `family:state`, so one state's program is distinct from another's. */
export function governingProgramKey(
  familyKey: string,
  stateUsps: string,
): string {
  return `${familyKey}:${stateUsps.toLowerCase()}`;
}

export interface AdoptedAppropriationInput {
  readonly familyKey: string;
  readonly stateUsps?: string;
  readonly jurisdictionId: EntityId;
  readonly publicGovernmentIdentity?: PublicGovernmentIdentity;
  /** Required for a non-state identity; state keys retain their saved shape. */
  readonly programKey?: string;
  readonly amountMinorUnits: number;
  readonly adoptedOn: IsoDate;
  /** Inclusive availability period; defaults to the existing 365-day route. */
  readonly availableDays?: number;
  readonly edition: string;
  readonly basisNote: string;
  readonly sourceMeasureId?: EntityId | null;
}

/**
 * Records spending authority the government has actually adopted. The public
 * account is created if this jurisdiction has none; it holds whatever cash it
 * has already collected, and no money is invented here.
 */
export function recordAdoptedAppropriation(
  world: World,
  input: AdoptedAppropriationInput,
): { world: World; appropriationId: EntityId } | null {
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0 ||
    (input.availableDays !== undefined &&
      (!Number.isSafeInteger(input.availableDays) || input.availableDays < 1))
  )
    return null;
  const identity =
    input.publicGovernmentIdentity ??
    ({
      kind: "jurisdiction",
      jurisdictionId: input.jurisdictionId,
    } as const);
  const programKey =
    input.programKey ??
    (input.stateUsps
      ? governingProgramKey(input.familyKey, input.stateUsps)
      : null);
  if (
    identity.jurisdictionId !== input.jurisdictionId ||
    !programKey ||
    !/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/.test(programKey)
  )
    return null;
  const edition = input.edition;
  const next = ensurePublicGovernmentAccount(world, identity);
  const account = publicTaxAccountForIdentity(next, identity);
  if (!account) return null;
  const already = (next.history.publicProgramRecords ?? []).find(
    (record) =>
      record.kind === "appropriation" &&
      record.programKey === programKey &&
      record.stableKey.endsWith(`:appropriation:${edition}`),
  );
  if (already) return { world, appropriationId: already.id };
  const written = recordProgramAppropriation(next, {
    edition,
    programKey,
    jurisdictionId: input.jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(input.amountMinorUnits, "USD"),
    availableFrom: input.adoptedOn,
    availableThrough: addDays(
      input.adoptedOn,
      (input.availableDays ?? 365) - 1,
    ),
    basis: { kind: "game-profile", note: input.basisNote },
    sourceMeasureId: input.sourceMeasureId ?? null,
    ...(identity.kind === "local-government"
      ? { publicGovernmentIdentity: identity }
      : {}),
  });
  return { world: written.world, appropriationId: written.id };
}

/**
 * An enacted appropriation becomes spending authority the office can commit.
 * The amount is the measure's own recorded clause, never a figure invented
 * here, and a measure without one creates nothing.
 */
export function appropriationFromEnactedMeasure(
  world: World,
  measureId: EntityId,
): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  if (!measure || !enactment) return world;
  const governmentScope = publicProgramGovernmentScope(world, measure);
  if (!governmentScope) return world;
  const stateUsps = governmentScope.stateUsps;
  const provisions = currentMeasureProvisions(world, measureId);
  if (governmentScope.kind === "local") {
    const admission = admitLocalFiscalMeasure(
      world,
      governmentScope.localGovernmentKey,
      measureId,
    );
    if (
      !admission.ok ||
      admission.effectKind !== "public-program-appropriation"
    )
      return world;
  }
  const existingComponents = draftLineageComponents(world, measureId).filter(
    (lineage) => lineage.componentKey !== undefined,
  );
  if (
    governmentScope.kind === "federal" &&
    (existingComponents.length > 0 ||
      !federalPassengerRailMeasureMatches(
        world,
        measure,
        draftLineageForMeasure(world, measureId),
        provisions,
      ))
  )
    return world;
  const adoptedOn =
    enactment.effectiveAt && enactment.effectiveAt > world.currentDate
      ? enactment.effectiveAt
      : world.currentDate;
  const editionBase = `measure-${measure.designation.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  // A measure that carries parts is applied part by part. Each component's
  // own appropriation clause becomes its own spending authority, under its own
  // family and its own edition key, so two appropriating components of one
  // measure do not collapse into one record and neither is applied twice —
  // the edition is what `recordAdoptedAppropriation` already dedupes on, so a
  // measure enacted, saved and reloaded writes the same authority once.
  const components = existingComponents;
  if (components.length > 0) {
    let next = world;
    for (const lineage of components) {
      const amountProvision = provisions.find(
        (provision) =>
          provision.provisionKey === `${lineage.componentKey}:amount-provided`,
      );
      const transitProfile =
        lineage.variantKey === STATE_TRANSIT_VARIANT_KEY
          ? stateTransitProfileForLineage(world, measure, enactment, lineage)
          : null;
      if (lineage.variantKey === STATE_TRANSIT_VARIANT_KEY && !transitProfile)
        continue;
      if (
        amountProvision?.operativeEffect !== undefined &&
        amountProvision.operativeEffect.kind !== "public-program-appropriation"
      )
        continue;
      if (!lineageAuthorizesAppropriation(lineage)) continue;
      const amount = amountProvision?.fiscalExposureMinorUnits;
      if (amount === null || amount === undefined || amount <= 0) continue;
      const serviceProfile = programServiceCapacityProfileForEnactment({
        world: next,
        measure,
        governmentScope,
        lineage,
        provisions,
        transitProfile,
      });
      const programKey =
        serviceProfile?.programKey ??
        transitProfile?.programKey ??
        programKeyForGovernment(lineage.familyKey, governmentScope);
      const written = recordAdoptedAppropriation(next, {
        familyKey: lineage.familyKey,
        ...(stateUsps ? { stateUsps } : {}),
        jurisdictionId: measure.jurisdictionId,
        publicGovernmentIdentity: governmentScope.identity,
        programKey,
        amountMinorUnits: amount,
        adoptedOn: transitProfile ? enactment.effectiveAt! : adoptedOn,
        ...(transitProfile
          ? { availableDays: transitProfile.availabilityDays }
          : {}),
        edition: `${editionBase}-${lineage.componentKey}`,
        basisNote: transitProfile
          ? `${PROGRAM_GOVERNING_VERSION}: adopted by the '${lineage.componentKey}' part of ${measure.designation}, ${measure.shortTitle}. The amount is that part's own enacted clause. Profile ${transitProfile.ref.profileId} version ${transitProfile.ref.version} digest ${transitProfile.ref.digest} supplies the state transit program key and availability window; the saved enactment effective date starts availability. ${serviceProfile ? serviceCapacityBasisNote(serviceProfile) : ""}This is spending authority, not cash.`
          : `${PROGRAM_GOVERNING_VERSION}: adopted by the '${lineage.componentKey}' part of ${measure.designation}, ${measure.shortTitle}. The amount is that part's own enacted clause.`,
        sourceMeasureId: measureId,
      });
      next = written?.world ?? next;
      if (written && serviceProfile)
        next = ensureProgramCapacityFromProfile(next, {
          profile: serviceProfile,
          identity: governmentScope.identity,
          jurisdictionId: measure.jurisdictionId,
        });
    }
    return next;
  }

  const amountProvision = provisions.find(
    (provision) => provision.provisionKey === "amount-provided",
  );
  if (
    amountProvision?.operativeEffect !== undefined &&
    amountProvision.operativeEffect.kind !== "public-program-appropriation"
  )
    return world;
  const amount = amountProvision?.fiscalExposureMinorUnits;
  if (amount === null || amount === undefined || amount <= 0) return world;
  const lineage = draftLineageForMeasure(world, measureId);
  const transitProfile =
    lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY
      ? stateTransitProfileForLineage(world, measure, enactment, lineage)
      : null;
  if (lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY && !transitProfile)
    return world;
  if (lineage && !lineageAuthorizesAppropriation(lineage)) return world;
  if (
    amountProvision?.operativeEffect !== undefined &&
    (!lineage || !lineageAuthorizesAppropriation(lineage))
  )
    return world;
  const familyKey = lineage?.familyKey ?? "appropriations";
  const gameProfile = stateUsps
    ? stateTaxServiceProfileForJurisdictionId(world, measure.jurisdictionId)
    : null;
  const profileAuthorityMatches = Boolean(
    gameProfile &&
    stateUsps &&
    lineage &&
    lineage.componentKey === undefined &&
    lineage.familyKey === gameProfile.appropriation.familyKey &&
    lineage.variantKey === gameProfile.appropriation.variantKey &&
    lineage.authorityKey === gameProfile.appropriation.authorityKey &&
    amount === gameProfile.appropriation.amountMinorUnits &&
    familyKey === gameProfile.appropriation.familyKey &&
    governingProgramKey(familyKey, stateUsps) ===
      gameProfile.appropriation.programKey,
  );
  const serviceProfile = programServiceCapacityProfileForEnactment({
    world,
    measure,
    governmentScope,
    lineage,
    provisions,
    transitProfile,
    ...(profileAuthorityMatches && gameProfile ? { gameProfile } : {}),
  });
  const programKey =
    serviceProfile?.programKey ??
    transitProfile?.programKey ??
    programKeyForGovernment(familyKey, governmentScope);
  const written = recordAdoptedAppropriation(world, {
    familyKey,
    ...(stateUsps ? { stateUsps } : {}),
    jurisdictionId: measure.jurisdictionId,
    publicGovernmentIdentity: governmentScope.identity,
    programKey,
    amountMinorUnits: amount,
    adoptedOn: transitProfile ? enactment.effectiveAt! : adoptedOn,
    ...(transitProfile
      ? { availableDays: transitProfile.availabilityDays }
      : {}),
    ...(profileAuthorityMatches && gameProfile
      ? { availableDays: gameProfile.appropriation.availabilityDays }
      : {}),
    edition: editionBase,
    basisNote: transitProfile
      ? `${PROGRAM_GOVERNING_VERSION}: adopted by ${measure.designation}, ${measure.shortTitle}. The amount is the enacted clause's own figure. Profile ${transitProfile.ref.profileId} version ${transitProfile.ref.version} digest ${transitProfile.ref.digest} supplies the state transit program key and availability window; the saved enactment effective date starts availability. ${serviceProfile ? serviceCapacityBasisNote(serviceProfile) : ""}This is spending authority, not cash.`
      : serviceProfile
        ? `${PROGRAM_GOVERNING_VERSION}: adopted by ${measure.designation}, ${measure.shortTitle}. The amount is the enacted clause's own figure. ${serviceCapacityBasisNote(serviceProfile)}This is spending authority, not cash.`
        : `${PROGRAM_GOVERNING_VERSION}: adopted by ${measure.designation}, ${measure.shortTitle}. The amount is the enacted clause's own figure.`,
    sourceMeasureId: measureId,
  });
  const next = written?.world ?? world;
  if (!written || !serviceProfile) return next;
  return ensureProgramCapacityFromProfile(next, {
    profile: serviceProfile,
    identity: governmentScope.identity,
    jurisdictionId: measure.jurisdictionId,
  });
}

function lineageAuthorizesAppropriation(
  lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
): boolean {
  try {
    const { family, variant } = programVariant(
      lineage.familyKey,
      lineage.variantKey,
    );
    return (
      family.familyVersion === lineage.familyVersion &&
      variant.authorizesAppropriation
    );
  } catch {
    return false;
  }
}

function stateTransitProfileForLineage(
  world: World,
  measure: { readonly jurisdictionId: EntityId; readonly rulePackId: string },
  enactment: { readonly effectiveAt: IsoDate | null },
  lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
) {
  if (
    lineage.familyKey !== TRANSIT_FAMILY_KEY ||
    lineage.familyVersion !== TRANSIT_FAMILY_VERSION ||
    lineage.variantKey !== STATE_TRANSIT_VARIANT_KEY ||
    lineage.authorityKey !== TRANSIT_PROGRAM_KEY ||
    lineage.authorityMeasureId !== undefined ||
    !enactment.effectiveAt
  )
    return null;
  return stateTransitServiceProfileForMeasure(world, measure);
}

function programServiceCapacityProfileForEnactment(input: {
  readonly world: World;
  readonly measure: {
    readonly jurisdictionId: EntityId;
    readonly rulePackId: string;
  };
  readonly governmentScope: PublicProgramGovernmentScope;
  readonly lineage: ReturnType<typeof draftLineageForMeasure>;
  readonly provisions: ReturnType<typeof currentMeasureProvisions>;
  readonly transitProfile: ReturnType<typeof stateTransitProfileForLineage>;
  readonly gameProfile?: NonNullable<
    ReturnType<typeof stateTaxServiceProfileForJurisdictionId>
  >;
}): ProgramServiceCapacityProfile | null {
  const { world, measure, governmentScope, lineage, provisions } = input;
  if (
    input.transitProfile &&
    lineage?.familyKey === TRANSIT_FAMILY_KEY &&
    lineage.familyVersion === TRANSIT_FAMILY_VERSION &&
    lineage.variantKey === STATE_TRANSIT_VARIANT_KEY &&
    lineage.authorityKey === TRANSIT_PROGRAM_KEY
  ) {
    return authoredProgramServiceCapacityProfile({
      profileId: `${input.transitProfile.ref.profileId}:capacity`,
      profileScope: `${input.transitProfile.ref.digest}:${measure.rulePackId}`,
      programKey: input.transitProfile.programKey,
      jurisdictionId: measure.jurisdictionId,
      serviceLabel: "modeled state rural-transit service",
      unitLabel: "transit service unit",
      unitsTotal: 1,
      unitsOperational: 0,
      monthlyOperatingNeedMinorUnits: 1_000_00,
      restorationCostPerUnitMinorUnits: 10_000_00,
      basisNote: `${input.transitProfile.basis.note} The one generic service unit and its authored operating and restoration costs are assumptions for play, not a named route, vehicle, actual service measure, or resident outcome.`,
    });
  }

  if (input.gameProfile && lineage && governmentScope.kind === "state") {
    return {
      ref: input.gameProfile.ref,
      programKey: input.gameProfile.appropriation.programKey,
      capacity: {
        serviceLabel: input.gameProfile.capacity.serviceLabel,
        unitLabel: input.gameProfile.capacity.unitLabel,
        unitsTotal: input.gameProfile.capacity.unitsTotal,
        unitsOperational: input.gameProfile.capacity.unitsOperational,
        monthlyOperatingNeedMinorUnits:
          input.gameProfile.capacity.monthlyOperatingNeedMinorUnits,
        completedPermille: input.gameProfile.capacity.completedPermille,
        restorationCostPerUnitMinorUnits:
          input.gameProfile.capacity.restorationCostPerUnitMinorUnits,
        basis: input.gameProfile.capacity.basis,
      },
    };
  }

  if (
    governmentScope.kind === "federal" &&
    federalPassengerRailMeasureMatches(world, measure, lineage, provisions)
  ) {
    return authoredProgramServiceCapacityProfile({
      profileId: "federal-passenger-rail-service:us",
      profileScope: `${measure.jurisdictionId}:${measure.rulePackId}:${lineage!.authorityKey}`,
      programKey: programKeyForGovernment(lineage!.familyKey, governmentScope),
      jurisdictionId: measure.jurisdictionId,
      serviceLabel: "modeled passenger-rail service",
      unitLabel: "rail service unit",
      unitsTotal: 2,
      unitsOperational: 1,
      monthlyOperatingNeedMinorUnits: 5_000_000_00,
      restorationCostPerUnitMinorUnits: 100_000_000_00,
      basisNote:
        "Fictional federal passenger-rail service capacity for play. The generic unit is not a named route, train, completed project, or measured federal asset; costs are authored assumptions, not federal expenditures or estimates.",
    });
  }

  if (
    governmentScope.kind === "local" &&
    lineage?.familyKey === "appropriations" &&
    lineage.familyVersion === "v3" &&
    lineage.variantKey === "local-fix-it-first-v1" &&
    lineage.componentKey === undefined &&
    lineage.authorityMeasureId === undefined
  ) {
    const localAuthority = localFiscalGameAuthorityForRulePackId(
      measure.rulePackId,
    );
    if (
      localAuthority?.unit.id === governmentScope.localGovernmentKey &&
      localAuthority.jurisdictionId === measure.jurisdictionId &&
      localAuthority.authority.authorityKey === lineage.authorityKey &&
      localAuthority.authority.permittedEffects.includes(
        "public-program-appropriation",
      )
    )
      return authoredProgramServiceCapacityProfile({
        profileId: `local-fix-it-first-capacity:${localAuthority.unit.id}`,
        profileScope: `${localAuthority.authority.authorityKey}:${measure.rulePackId}:${measure.jurisdictionId}`,
        programKey: programKeyForGovernment(lineage.familyKey, governmentScope),
        jurisdictionId: measure.jurisdictionId,
        serviceLabel: "modeled local road-maintenance service",
        unitLabel: "road-maintenance unit",
        unitsTotal: 1,
        unitsOperational: 0,
        monthlyOperatingNeedMinorUnits: 5_000_00,
        restorationCostPerUnitMinorUnits: 100_000_00,
        basisNote: `Fictional ${localAuthority.authority.level} road-maintenance capacity for the exact admitted local game profile. The generic unit is not a named road or measured repair; its costs are authored assumptions, not a local budget or expenditure.`,
      });
  }

  return null;
}

function authoredProgramServiceCapacityProfile(input: {
  readonly profileId: string;
  readonly profileScope: string;
  readonly programKey: string;
  readonly jurisdictionId: EntityId;
  readonly serviceLabel: string;
  readonly unitLabel: string;
  readonly unitsTotal: number;
  readonly unitsOperational: number;
  readonly monthlyOperatingNeedMinorUnits: number;
  readonly restorationCostPerUnitMinorUnits: number | null;
  readonly basisNote: string;
}): ProgramServiceCapacityProfile {
  const definition = {
    profileId: input.profileId,
    profileScope: input.profileScope,
    programKey: input.programKey,
    jurisdictionId: input.jurisdictionId,
    serviceLabel: input.serviceLabel,
    unitLabel: input.unitLabel,
    unitsTotal: input.unitsTotal,
    unitsOperational: input.unitsOperational,
    monthlyOperatingNeedMinorUnits: input.monthlyOperatingNeedMinorUnits,
    completedPermille: null,
    restorationCostPerUnitMinorUnits: input.restorationCostPerUnitMinorUnits,
    basisNote: input.basisNote,
  } as const;
  const digest = stableHash(
    canonicalJson({
      version: PROGRAM_SERVICE_CAPACITY_PROFILE_VERSION,
      profile: definition,
    }),
  );
  return {
    ref: {
      profileId: input.profileId,
      version: PROGRAM_SERVICE_CAPACITY_PROFILE_VERSION,
      digest,
    },
    programKey: input.programKey,
    capacity: {
      serviceLabel: input.serviceLabel,
      unitLabel: input.unitLabel,
      unitsTotal: input.unitsTotal,
      unitsOperational: input.unitsOperational,
      monthlyOperatingNeedMinorUnits: input.monthlyOperatingNeedMinorUnits,
      completedPermille: null,
      restorationCostPerUnitMinorUnits: input.restorationCostPerUnitMinorUnits,
      basis: {
        kind: "game-profile",
        note: `${input.basisNote} Saved profile ${input.profileId} version ${PROGRAM_SERVICE_CAPACITY_PROFILE_VERSION} digest ${digest}.`,
      },
    },
  };
}

function serviceCapacityBasisNote(
  profile: ProgramServiceCapacityProfile,
): string {
  return `Service profile ${profile.ref.profileId} version ${profile.ref.version} digest ${profile.ref.digest} supplies the saved fictional capacity and cost assumptions. `;
}

function ensureProgramCapacityFromProfile(
  world: World,
  input: {
    readonly profile: ProgramServiceCapacityProfile;
    readonly identity: PublicGovernmentIdentity;
    readonly jurisdictionId: EntityId;
  },
): World {
  const { profile, identity, jurisdictionId } = input;
  const expected = {
    jurisdictionId,
    programKey: profile.programKey,
    serviceLabel: profile.capacity.serviceLabel,
    unitLabel: profile.capacity.unitLabel,
    unitsTotal: profile.capacity.unitsTotal,
    unitsOperational: profile.capacity.unitsOperational,
    monthlyOperatingNeed: money(
      profile.capacity.monthlyOperatingNeedMinorUnits,
      "USD",
    ),
    completedPermille: profile.capacity.completedPermille,
    restorationCostPerUnit:
      profile.capacity.restorationCostPerUnitMinorUnits === null
        ? null
        : money(profile.capacity.restorationCostPerUnitMinorUnits, "USD"),
    basis: profile.capacity.basis,
  };
  const existing = programCapacity(world, profile.programKey, identity);
  if (existing) {
    const actual = {
      jurisdictionId: existing.jurisdictionId,
      programKey: existing.programKey,
      serviceLabel: existing.serviceLabel,
      unitLabel: existing.unitLabel,
      unitsTotal: existing.unitsTotal,
      unitsOperational: existing.unitsOperational,
      monthlyOperatingNeed: existing.monthlyOperatingNeed,
      completedPermille: existing.completedPermille,
      restorationCostPerUnit: existing.restorationCostPerUnit,
      basis: existing.basis,
    };
    if (canonicalJson(actual) !== canonicalJson(expected))
      throw new Error(
        "An existing public-program capacity conflicts with the enacted game's exact profile.",
      );
    return world;
  }
  return declareProgramCapacity(world, {
    ...expected,
    ...(identity.kind === "local-government"
      ? { publicGovernmentIdentity: identity }
      : {}),
    edition: `${profile.ref.profileId}:${profile.ref.digest}`,
  }).world;
}

function federalPassengerRailMeasureMatches(
  world: World,
  measure: {
    readonly jurisdictionId: EntityId;
    readonly rulePackId: string;
    readonly propositionIds?: readonly EntityId[];
    readonly propositionAnswers?: readonly {
      readonly propositionId: EntityId;
      readonly answer: "yes" | "no";
    }[];
  },
  lineage: ReturnType<typeof draftLineageForMeasure>,
  provisions: ReturnType<typeof currentMeasureProvisions>,
): boolean {
  if (
    measure.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id ||
    measure.rulePackId !== US_CONGRESS_PACK_ID ||
    lineage?.familyKey !== "appropriations" ||
    lineage.familyVersion !== "v3" ||
    lineage.variantKey !== "federal-passenger-rail-v1" ||
    lineage.authorityKey !== "game-profile:federal-passenger-rail/v1" ||
    lineage.authorityMeasureId !== undefined
  )
    return false;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) =>
      candidate.stableKey ===
      "us-federal-positions:transport-water.expand-passenger-rail",
  );
  if (
    !proposition ||
    measure.propositionIds?.length !== 1 ||
    measure.propositionIds[0] !== proposition.id ||
    measure.propositionAnswers?.length !== 1 ||
    measure.propositionAnswers[0]?.propositionId !== proposition.id ||
    measure.propositionAnswers[0]?.answer !== "yes"
  )
    return false;
  const intentClauses = provisions.filter(
    (provision) => provision.operativeEffect !== undefined,
  );
  const amount = provisions.find(
    (provision) => provision.provisionKey === "amount-provided",
  );
  try {
    const { family, variant } = programVariant(
      lineage.familyKey,
      lineage.variantKey,
    );
    return (
      family.familyVersion === lineage.familyVersion &&
      variant.authorizesAppropriation &&
      intentClauses.length === 1 &&
      amount?.operativeEffect?.kind === "public-program-appropriation" &&
      amount.fiscalExposureMinorUnits !== null &&
      amount.fiscalExposureMinorUnits > 0 &&
      amount.fiscalExposureLabel !== null
    );
  } catch {
    return false;
  }
}

interface PublicProgramGovernmentScopeBase {
  readonly identity: PublicGovernmentIdentity;
  readonly programKeySuffix: string;
}

type PublicProgramGovernmentScope =
  | (PublicProgramGovernmentScopeBase & {
      readonly kind: "federal";
      readonly stateUsps: null;
    })
  | (PublicProgramGovernmentScopeBase & {
      readonly kind: "state";
      readonly stateUsps: string;
    })
  | (PublicProgramGovernmentScopeBase & {
      readonly kind: "local";
      readonly stateUsps: null;
      readonly localGovernmentKey: string;
    });

function publicProgramGovernmentScope(
  world: World,
  measure: {
    readonly jurisdictionId: EntityId;
    readonly rulePackId: string;
  },
): PublicProgramGovernmentScope | null {
  if (measure.rulePackId === US_CONGRESS_PACK_ID)
    return measure.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
      ? {
          kind: "federal",
          identity: {
            kind: "jurisdiction",
            jurisdictionId: measure.jurisdictionId,
          },
          stateUsps: null,
          programKeySuffix: "us",
        }
      : null;

  const stateUsps = US_STATE_USPS.find(
    (usps) =>
      stateJurisdictionForKey(`US-${usps}`)?.id === measure.jurisdictionId,
  );
  if (stateUsps)
    return {
      kind: "state",
      identity: {
        kind: "jurisdiction",
        jurisdictionId: measure.jurisdictionId,
      },
      stateUsps,
      programKeySuffix: stateUsps.toLowerCase(),
    };

  const localAuthority = localFiscalGameAuthorityForRulePackId(
    measure.rulePackId,
  );
  if (
    !localAuthority ||
    localAuthority.jurisdictionId !== measure.jurisdictionId
  )
    return null;
  const governmentKey = localAuthority.unit.id;
  const identity: PublicGovernmentIdentity = {
    kind: "local-government",
    jurisdictionId: measure.jurisdictionId,
    governmentKey,
  };
  try {
    assertPublicGovernmentIdentity(world, identity);
  } catch {
    return null;
  }
  return {
    kind: "local",
    identity,
    stateUsps: null,
    programKeySuffix: governmentKey.replace(":", "-"),
    localGovernmentKey: governmentKey,
  };
}

function programKeyForGovernment(
  familyKey: string,
  scope: PublicProgramGovernmentScope,
): string {
  return scope.stateUsps
    ? governingProgramKey(familyKey, scope.stateUsps)
    : `${familyKey}:${scope.programKeySuffix}`;
}

/** The organization the money is paid to when an office commits a program. */
export function programOperatorOrganization(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
  identity?: PublicGovernmentIdentity,
): { world: World; organizationId: EntityId } {
  if (identity && identity.jurisdictionId !== jurisdictionId)
    throw new Error("A program operator must match the program jurisdiction.");
  if (identity) assertPublicGovernmentIdentity(world, identity);
  const operatorScope =
    identity?.kind === "local-government"
      ? `local:${encodeURIComponent(identity.governmentKey)}:`
      : "";
  const operatorKey = `operator:${operatorScope}${programKey}`;
  const stableKey = `${PROGRAM_GOVERNING_VERSION}:${operatorKey}`;
  const existing = world.history.organizations.find(
    (row) => row.stableKey === stableKey,
  );
  if (existing) {
    const next = ensureProgramOperatorResourcePosition(
      world,
      operatorKey,
      existing.id,
    );
    return { world: next, organizationId: existing.id };
  }
  const title = programFamilyTitle(programKey.split(":")[0]!) ?? "public work";
  let next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: `${PROGRAM_GOVERNING_VERSION}: fictional provider carrying out ${title.toLowerCase()} under this appropriation. It holds no seeded money.`,
    },
    initialProfile: {
      name:
        identity?.kind === "local-government"
          ? `${title} provider for ${identity.governmentKey}`
          : `${title} provider`,
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = ensureProgramOperatorResourcePosition(
    next,
    operatorKey,
    organizationId,
  );
  return {
    world: next,
    organizationId,
  };
}

function ensureProgramOperatorResourcePosition(
  world: World,
  operatorKey: string,
  organizationId: EntityId,
): World {
  const hasUsdPosition = world.history.resourcePositions.some(
    (record) =>
      record.owner.kind === "organization" &&
      record.owner.organizationId === organizationId &&
      record.openingBalance.currency === "USD",
  );
  if (hasUsdPosition) return world;
  return createResourcePosition(world, {
    stableKey: `${PROGRAM_GOVERNING_VERSION}:${operatorKey}:cash:USD`,
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance: {
      kind: "authored",
      note: `${PROGRAM_GOVERNING_VERSION}: opens a zero-balance USD receipt position for the modeled operator; no money is seeded.`,
    },
  });
}

const NO_ACTION: PublicProgramAlternative = {
  key: "no-action",
  title: "Commit nothing for now",
  installments: [],
  deliveryLeadDays: null,
};

/**
 * What this office could do with the money that is still uncommitted. The
 * figures come from the appropriation and any declared capacity; nothing is
 * scaled to a target the game cannot measure.
 */
export function programAlternativesFor(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
): readonly PublicProgramAlternative[] {
  const uncommitted = programPosition(
    world,
    appropriation.programKey,
    appropriation.id,
  ).uncommitted.minorUnits;
  const identity = publicGovernmentIdentityForRecord(appropriation);
  if (uncommitted <= 0) return [NO_ACTION];
  const alternatives: PublicProgramAlternative[] = [];
  const third = Math.floor(uncommitted / 3);
  if (third > 0)
    alternatives.push({
      key: "operate-three-months",
      title: "Pay for three months of operations",
      installments: [0, 30, 60].map((afterDays) => ({
        afterDays,
        amount: money(third, "USD"),
        purpose: "operating" as const,
      })),
      deliveryLeadDays: null,
    });
  const capacity = programCapacity(world, appropriation.programKey, identity);
  if (capacity?.restorationCostPerUnit) {
    const idle = capacity.unitsTotal - capacity.unitsOperational;
    const affordable = Math.min(
      uncommitted,
      idle * capacity.restorationCostPerUnit.minorUnits,
    );
    if (idle > 0 && affordable >= capacity.restorationCostPerUnit.minorUnits)
      alternatives.push({
        key: "restore-units",
        title: `Repair ${capacity.unitLabel} that are out of service`,
        installments: [
          {
            afterDays: 0,
            amount: money(affordable, "USD"),
            purpose: "maintenance" as const,
          },
        ],
        deliveryLeadDays: 90,
      });
  }
  if (alternatives.length === 0)
    alternatives.push({
      key: "spend-once",
      title: "Spend it in one payment",
      installments: [
        {
          afterDays: 0,
          amount: money(uncommitted, "USD"),
          purpose: "operating" as const,
        },
      ],
      deliveryLeadDays: null,
    });
  alternatives.push(NO_ACTION);
  return alternatives;
}

/** The uncommitted appropriations this office could still act on. */
export function openAppropriationsFor(
  world: World,
  jurisdictionId: EntityId,
  identity?: PublicGovernmentIdentity,
): readonly PublicProgramAppropriationRecord[] {
  if (identity && identity.jurisdictionId !== jurisdictionId) return [];
  return (world.history.publicProgramRecords ?? []).filter(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" &&
      record.jurisdictionId === jurisdictionId &&
      (!identity ||
        samePublicGovernmentIdentity(
          publicGovernmentIdentityForRecord(record),
          identity,
        )) &&
      record.availableThrough >= world.currentDate &&
      programPosition(world, record.programKey, record.id).uncommitted
        .minorUnits > 0,
  );
}

export { PUBLIC_PROGRAM_VERSION };
