import { addDays } from "../dates";
import {
  draftLineageComponents,
  draftLineageForMeasure,
  draftParameterValues,
} from "../legislation-draft-lineage";
import { addYears } from "../legislation-drafting";
import { currentMeasureProvisions } from "../legislative-politics";
import { operativeDateInWorld } from "./law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../life-places";
import { organizationProfileAt } from "../life-queries";
import { standingServiceProgram } from "../law-consequences/service-delivered-data";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_FAMILY_KEY,
  TRANSIT_FAMILY_VERSION,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
  LEGACY_TRANSIT_COMPILED_STATE,
} from "../legislation-transit-families";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { packMayEnactVariant } from "../legislation-drafting";
import { rulePackById } from "../legislature-rule-packs";
import type { LegislativeRulePack } from "../legislature-rules";
import { localFiscalAuthorityScopeForRulePackId } from "../municipal-government";
import { admitLocalFiscalMeasure } from "../local-fiscal-authority";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { createOrganization } from "../life";
import { stableHash } from "../ids";
import { programFamilyTitle } from "./program-families";
import {
  programVariant,
  standingAuthority,
  type ProgramVariant,
} from "../legislation-program-families";
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
  LegislativeEnactmentRecord,
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

interface NpcProgramServiceProfileMetadata {
  readonly profileId: string;
  readonly profileIdScope: "fixed" | "local-government";
  readonly serviceLabel: string;
  readonly unitLabel: string;
  readonly unitsTotal: number;
  readonly unitsOperational: number;
  readonly monthlyOperatingNeedMinorUnits: number;
  readonly restorationCostPerUnitMinorUnits: number | null;
  readonly maintenanceLeadDays: number;
  readonly basisNote: string;
}

interface NpcProgramEligibilityMetadata {
  readonly propositionKey: string;
  readonly answer: "yes" | "no";
  readonly governmentLevel: "federal" | "state" | "county" | "municipality";
  readonly authorityKind: "standing-statute" | "game-profile";
  readonly authorityKey: string | null;
  readonly operativeEffectKind: string;
  readonly effectProvisionKey: string;
  readonly effectParameterKey: string;
}

type ProgramVariantWithNpcEffects = ProgramVariant & {
  readonly npcEligibility?: readonly NpcProgramEligibilityMetadata[];
  readonly npcServiceProfile?: NpcProgramServiceProfileMetadata;
};

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
  /** The enacted section's stated last day, when one is compiled. */
  readonly availableThrough?: IsoDate;
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
    (input.availableThrough !== undefined &&
      input.availableThrough < input.adoptedOn) ||
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
    availableThrough:
      input.availableThrough ??
      addDays(input.adoptedOn, (input.availableDays ?? 365) - 1),
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
      !programServiceCapacityProfileForEnactment({
        world,
        measure,
        governmentScope,
        lineage: draftLineageForMeasure(world, measureId),
        provisions,
        transitProfile: null,
      }))
  )
    return world;
  const adoptedOn =
    enactment.effectiveAt && enactment.effectiveAt > world.currentDate
      ? enactment.effectiveAt
      : world.currentDate;
  const editionBase = `measure-${measure.designation.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  const statedAvailability = (
    lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
    componentKey?: string,
  ): IsoDate | null | undefined => {
    // Only these two variants have a compiled generic availability adapter.
    // An adopted amendment to that date needs its own typed adapter; applying
    // the filed date anyway would silently disregard the changed law.
    if (lineage.familyKey !== "appropriations") return undefined;
    const provisionKey =
      lineage.variantKey === "single-programme"
        ? "availability"
        : lineage.variantKey === "supplemental"
          ? "lapse"
          : null;
    if (provisionKey === null) return undefined;
    const fullKey = componentKey
      ? `${componentKey}:${provisionKey}`
      : provisionKey;
    const current = provisions.find(
      (provision) => provision.provisionKey === fullKey,
    );
    if (!current || current.originAmendmentId !== null) return null;
    const term = draftParameterValues(lineage)["availability-term"];
    if (
      term?.kind !== "duration-years" ||
      term.years === null ||
      !Number.isSafeInteger(term.years) ||
      term.years <= 0
    )
      return null;
    // The term runs from the day the appropriation opens (the law's effective
    // date, or today when it is already in force), the same as one that states
    // no term, and not from the day the bill was filed.
    const through = addDays(addYears(adoptedOn, term.years), -1);
    return through >= adoptedOn ? through : null;
  };

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
      // The enacted section's own last day, when it states one.
      const availableThrough = statedAvailability(
        lineage,
        lineage.componentKey,
      );
      if (availableThrough === null) continue;
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
      if (!measureMayEnact(measure.rulePackId, lineage)) continue;
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
        programKeyForEnactedAppropriation(lineage, governmentScope);
      if (!programKey) continue;
      const written = recordAdoptedAppropriation(next, {
        familyKey: lineage.familyKey,
        ...(stateUsps ? { stateUsps } : {}),
        jurisdictionId: measure.jurisdictionId,
        publicGovernmentIdentity: governmentScope.identity,
        programKey,
        amountMinorUnits: amount,
        adoptedOn: transitProfile
          ? operativeDateInWorld(world, enactment)!.date
          : adoptedOn,
        ...(availableThrough !== undefined
          ? { availableThrough }
          : transitProfile
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
  const availableThrough = lineage ? statedAvailability(lineage) : undefined;
  if (availableThrough === null) return world;
  const pinnedLegacyTransit =
    lineage?.familyKey === TRANSIT_FAMILY_KEY &&
    lineage.familyVersion === TRANSIT_FAMILY_VERSION &&
    lineage.variantKey === TRANSIT_VARIANT_KEY &&
    lineage.authorityKey === TRANSIT_PROGRAM_KEY &&
    lineage.authorityMeasureId === undefined;
  if (
    pinnedLegacyTransit &&
    measure.jurisdictionId !==
      stateJurisdictionForKey(LEGACY_TRANSIT_COMPILED_STATE)?.id
  )
    return world;
  const pinnedOperativeDate = pinnedLegacyTransit
    ? operativeDateInWorld(world, enactment)?.date
    : null;
  if (pinnedLegacyTransit && !pinnedOperativeDate) return world;
  const transitProfile =
    lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY
      ? stateTransitProfileForLineage(world, measure, enactment, lineage)
      : null;
  if (lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY && !transitProfile)
    return world;
  if (lineage && !lineageAuthorizesAppropriation(lineage)) return world;
  if (lineage && !measureMayEnact(measure.rulePackId, lineage)) return world;
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
    (lineage
      ? programKeyForEnactedAppropriation(lineage, governmentScope)
      : programKeyForGovernment(familyKey, governmentScope));
  if (!programKey) return world;
  const written = recordAdoptedAppropriation(world, {
    familyKey,
    ...(stateUsps ? { stateUsps } : {}),
    jurisdictionId: measure.jurisdictionId,
    publicGovernmentIdentity: governmentScope.identity,
    programKey,
    amountMinorUnits: amount,
    adoptedOn: transitProfile
      ? operativeDateInWorld(world, enactment)!.date
      : (pinnedOperativeDate ?? adoptedOn),
    ...(availableThrough !== undefined
      ? { availableThrough }
      : transitProfile
        ? { availableDays: transitProfile.availabilityDays }
        : pinnedLegacyTransit
          ? { availableDays: 366 }
          : profileAuthorityMatches && gameProfile
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

/**
 * The one authority rule, applied where money is written: a variant the
 * enacting legislature could not pass writes no spending authority, whatever
 * route filed it.
 */
function measureMayEnact(
  rulePackId: string,
  lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
): boolean {
  let pack: LegislativeRulePack;
  try {
    pack = rulePackById(rulePackId);
  } catch {
    return false;
  }
  return packMayEnactVariant(pack, lineage.familyKey, lineage.variantKey).ok;
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
  enactment: LegislativeEnactmentRecord,
  lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
) {
  if (
    lineage.familyKey !== TRANSIT_FAMILY_KEY ||
    lineage.familyVersion !== TRANSIT_FAMILY_VERSION ||
    lineage.variantKey !== STATE_TRANSIT_VARIANT_KEY ||
    lineage.authorityKey !== TRANSIT_PROGRAM_KEY ||
    lineage.authorityMeasureId !== undefined ||
    !operativeDateInWorld(world, enactment)
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
  const { measure, governmentScope, lineage } = input;
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

  return npcProgramServiceCapacityProfileForEnactment(input);
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

function npcProgramServiceCapacityProfileForEnactment(input: {
  readonly world: World;
  readonly measure: {
    readonly jurisdictionId: EntityId;
    readonly rulePackId: string;
    readonly propositionIds?: readonly EntityId[];
    readonly propositionAnswers?: readonly {
      readonly propositionId: EntityId;
      readonly answer: "yes" | "no";
    }[];
  };
  readonly governmentScope: PublicProgramGovernmentScope;
  readonly lineage: ReturnType<typeof draftLineageForMeasure>;
  readonly provisions: ReturnType<typeof currentMeasureProvisions>;
  readonly transitProfile: ReturnType<typeof stateTransitProfileForLineage>;
}): ProgramServiceCapacityProfile | null {
  const { world, measure, governmentScope, lineage, provisions } = input;
  if (
    !lineage ||
    lineage.authorityMeasureId !== undefined ||
    governmentScope.kind === "state"
  )
    return null;

  let bankConfiguration: ReturnType<typeof programVariant>;
  try {
    bankConfiguration = programVariant(lineage.familyKey, lineage.variantKey);
  } catch {
    return null;
  }
  const { family, variant: rawVariant } = bankConfiguration;
  const variant = rawVariant as ProgramVariantWithNpcEffects;
  if (
    family.familyVersion !== lineage.familyVersion ||
    !rawVariant.authorizesAppropriation
  )
    return null;

  const propositionIds = measure.propositionIds ?? [];
  const propositionAnswers = measure.propositionAnswers ?? [];
  if (
    propositionIds.length !== 1 ||
    propositionAnswers.length !== 1 ||
    propositionAnswers[0]?.propositionId !== propositionIds[0]
  )
    return null;
  const proposition = world.policyCatalog.propositions[propositionIds[0]!];
  if (!proposition) return null;

  let governmentLevel: NpcProgramEligibilityMetadata["governmentLevel"];
  let localAuthority: ReturnType<
    typeof localFiscalAuthorityScopeForRulePackId
  > = null;
  if (governmentScope.kind === "local") {
    localAuthority = localFiscalAuthorityScopeForRulePackId(measure.rulePackId);
    if (
      !localAuthority ||
      localAuthority.jurisdictionId !== measure.jurisdictionId ||
      localAuthority.unit.id !== governmentScope.localGovernmentKey ||
      !localAuthority.authority.permittedEffects.includes(
        "public-program-appropriation",
      )
    )
      return null;
    governmentLevel = localAuthority.authority.level;
  } else {
    if (
      measure.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id ||
      measure.rulePackId !== US_CONGRESS_PACK_ID
    )
      return null;
    governmentLevel = governmentScope.kind;
  }

  const eligibility = variant.npcEligibility?.find(
    (entry) =>
      entry.propositionKey === proposition.stableKey &&
      entry.answer === propositionAnswers[0]!.answer &&
      entry.governmentLevel === governmentLevel,
  );
  if (
    !eligibility ||
    eligibility.authorityKind !== "game-profile" ||
    !lineage.authorityKey ||
    (eligibility.authorityKey !== null &&
      eligibility.authorityKey !== lineage.authorityKey)
  )
    return null;

  if (eligibility.authorityKey === null) {
    const authorityMatchesLocal =
      governmentScope.kind === "local" &&
      localAuthority?.authority.authorityKey === lineage.authorityKey;
    if (!authorityMatchesLocal) return null;
  }

  const effectClause = variant.clauses.find(
    (clause) => clause.provisionKey === eligibility.effectProvisionKey,
  );
  const effectParameter = variant.parameters.find(
    (parameter) => parameter.key === eligibility.effectParameterKey,
  );
  const parameterValue = lineage.parameters.find(
    (parameter) => parameter.parameterKey === eligibility.effectParameterKey,
  );
  const expectedProvisionKey = lineage.componentKey
    ? `${lineage.componentKey}:${eligibility.effectProvisionKey}`
    : eligibility.effectProvisionKey;
  const operativeProvisions = provisions.filter(
    (provision) =>
      provision.operativeEffect !== undefined &&
      (lineage.componentKey === undefined ||
        provision.provisionKey.startsWith(`${lineage.componentKey}:`)),
  );
  const operativeProvision = operativeProvisions[0];
  if (
    eligibility.operativeEffectKind !== "public-program-appropriation" ||
    effectClause?.parameterKey !== eligibility.effectParameterKey ||
    effectParameter?.kind !== "money" ||
    parameterValue?.kind !== "money" ||
    operativeProvisions.length !== 1 ||
    operativeProvision?.provisionKey !== expectedProvisionKey ||
    operativeProvision.operativeEffect?.kind !==
      eligibility.operativeEffectKind ||
    operativeProvision.fiscalExposureMinorUnits === null ||
    operativeProvision.fiscalExposureMinorUnits <= 0 ||
    operativeProvision.fiscalExposureLabel === null
  )
    return null;

  const authoredProfile = variant.npcServiceProfile;
  if (!authoredProfile) return null;
  const localProfile = governmentScope.kind === "local";
  if (
    (localProfile && authoredProfile.profileIdScope !== "local-government") ||
    (!localProfile && authoredProfile.profileIdScope !== "fixed") ||
    !authoredProfile.profileId.trim() ||
    !authoredProfile.serviceLabel.trim() ||
    !authoredProfile.unitLabel.trim() ||
    !Number.isSafeInteger(authoredProfile.unitsTotal) ||
    authoredProfile.unitsTotal < 1 ||
    !Number.isSafeInteger(authoredProfile.unitsOperational) ||
    authoredProfile.unitsOperational < 0 ||
    authoredProfile.unitsOperational > authoredProfile.unitsTotal ||
    !Number.isSafeInteger(authoredProfile.monthlyOperatingNeedMinorUnits) ||
    authoredProfile.monthlyOperatingNeedMinorUnits <= 0 ||
    (authoredProfile.restorationCostPerUnitMinorUnits !== null &&
      (!Number.isSafeInteger(
        authoredProfile.restorationCostPerUnitMinorUnits,
      ) ||
        authoredProfile.restorationCostPerUnitMinorUnits <= 0)) ||
    !authoredProfile.basisNote.trim()
  )
    return null;

  const profileId = localProfile
    ? `${authoredProfile.profileId}:${governmentScope.localGovernmentKey}`
    : authoredProfile.profileId;
  const profileScope = localProfile
    ? `${lineage.authorityKey}:${measure.rulePackId}:${measure.jurisdictionId}`
    : `${measure.jurisdictionId}:${measure.rulePackId}:${lineage.authorityKey}`;
  return authoredProgramServiceCapacityProfile({
    profileId,
    profileScope,
    programKey: programKeyForGovernment(lineage.familyKey, governmentScope),
    jurisdictionId: measure.jurisdictionId,
    serviceLabel: authoredProfile.serviceLabel,
    unitLabel: authoredProfile.unitLabel,
    unitsTotal: authoredProfile.unitsTotal,
    unitsOperational: authoredProfile.unitsOperational,
    monthlyOperatingNeedMinorUnits:
      authoredProfile.monthlyOperatingNeedMinorUnits,
    restorationCostPerUnitMinorUnits:
      authoredProfile.restorationCostPerUnitMinorUnits,
    basisNote: authoredProfile.basisNote.replaceAll(
      "{governmentLevel}",
      governmentLevel,
    ),
  });
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

  const localAuthority = localFiscalAuthorityScopeForRulePackId(
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

/**
 * A spending authority belongs to one program, not to every appropriation in
 * its state. A standing key names one authored program, so later bills against
 * that same key keep its identity. A docket measure may contain several
 * programs; its bill ID and aggregate ceiling are not a target program.
 */
function programKeyForEnactedAppropriation(
  lineage: NonNullable<ReturnType<typeof draftLineageForMeasure>>,
  scope: PublicProgramGovernmentScope,
): string | null {
  if (lineage.authorityMeasureId !== undefined || !lineage.authorityKey)
    return null;
  const authority = standingAuthority(lineage.authorityKey);
  if (authority?.kind !== "standing-statute" || !authority.authorizesSpending)
    return null;
  // Existing state transit saves use this key. Other variants against the
  // same named fund must join it rather than create a second transit program.
  if (lineage.authorityKey === TRANSIT_PROGRAM_KEY && scope.stateUsps)
    return governingProgramKey("transit", scope.stateUsps);
  // The other currently authored spending authority is the school fund.
  // Keep its existing state key so saved school appropriations and later
  // supplementals remain in one program without rewriting old records.
  if (lineage.authorityKey === "standing:school-facilities")
    return programKeyForGovernment(lineage.familyKey, scope);
  const target = lineage.authorityKey.slice("standing:".length);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(target)) return null;
  return `${lineage.familyKey}:${scope.programKeySuffix}-${target}`;
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
  // A standing service program is carried out by an organization that can
  // lawfully provide it (a crisis team by a health department, clinic or
  // hospital) already working in the place, never by a provider made up here.
  // With none on record the program stays unsupported: callers check
  // standingProgramUnsupported first, and no substitute is ever created.
  if (standingServiceProgram(programKey)) {
    const clinical = eligibleStandingOperator(
      world,
      programKey,
      jurisdictionId,
    );
    if (!clinical)
      throw new Error(
        "No eligible operator is on record for this standing service program.",
      );
    return { world, organizationId: clinical };
  }
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

/**
 * True when the program is a standing service program and no organization
 * that can lawfully provide it is on record in the place. Its money is then
 * not committed to anyone.
 */
export function standingProgramUnsupported(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
): boolean {
  return (
    !!standingServiceProgram(programKey) &&
    !eligibleStandingOperator(world, programKey, jurisdictionId)
  );
}

/**
 * The existing organization that can operate a standing service program in
 * this place: the program's first listed kind that is present, then the
 * earliest formed, then the lowest organization ID. Only real organizations
 * already on record are chosen.
 */
export function eligibleStandingOperator(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
): EntityId | null {
  const program = standingServiceProgram(programKey);
  if (!program) return null;
  const served = world.jurisdictions[jurisdictionId];
  const servedState = served ? stateKeyForJurisdiction(served) : null;
  const inPlace = (id: EntityId | null) => {
    if (!id) return false;
    if (id === jurisdictionId) return true;
    const place = world.jurisdictions[id];
    const state =
      lifePlaceByJurisdictionId(id)?.stateJurisdictionKey ??
      (place ? stateKeyForJurisdiction(place) : null);
    return !!servedState && state === servedState;
  };
  let best: { rank: number; formedAt: string; id: EntityId } | null = null;
  for (const organization of world.history.organizations) {
    if (organization.formedAt > world.currentDate) continue;
    const profile = organizationProfileAt(world, organization.id);
    const rank = profile
      ? program.operatorClassifications.indexOf(profile.classification)
      : -1;
    if (rank < 0 || !inPlace(profile!.locationJurisdictionId)) continue;
    const candidate = {
      rank,
      formedAt: organization.formedAt,
      id: organization.id,
    };
    if (
      !best ||
      rank < best.rank ||
      (rank === best.rank &&
        (candidate.formedAt < best.formedAt ||
          (candidate.formedAt === best.formedAt && candidate.id < best.id)))
    )
      best = candidate;
  }
  return best?.id ?? null;
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
      record.availableFrom <= world.currentDate &&
      record.availableThrough >= world.currentDate &&
      programPosition(world, record.programKey, record.id).uncommitted
        .minorUnits > 0,
  );
}

export { PUBLIC_PROGRAM_VERSION };
