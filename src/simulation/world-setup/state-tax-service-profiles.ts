import { canonicalJson } from "../canonical-json";
import { stableHash } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import type { TaxGameProfileRef } from "../tax-types";
import type { CurrencyCode, World } from "../types";
import {
  STATE_TAX_SERVICE_GAME_PROFILE_VERSION,
  STATE_TAX_SERVICE_STARTING_CONDITIONS_VERSION,
} from "./types";
import type {
  StateTaxServiceProfileRef,
  StateTaxServiceStartingConditionsRecord,
  StateTaxServiceStartingProfile,
} from "./types";

const WORLD_SETUP_PROFILE_STREAM = "world-setup:crunch46-v1";
const STARTING_CONDITIONS_KEY =
  WORLD_SETUP_PROFILE_STREAM + ":state-tax-service-starting-conditions";
const PROFILE_NOTICE =
  "Fictional game-profile mechanics for a modeled school-facilities service. These values do not describe current state tax, appropriation, or service law, and they are not source evidence.";
const RATE_CHOICES = [
  { numerator: 4, denominator: 100, label: "4%" },
  { numerator: 9, denominator: 200, label: "4.5%" },
  { numerator: 5, denominator: 100, label: "5%" },
] as const;

const stateKeys = [...US_STATE_USPS]
  .sort()
  .map((stateUsps) => "US-" + stateUsps);

type ProfileDefinition = Omit<
  StateTaxServiceStartingProfile,
  "version" | "digest" | "ref"
>;

function definitionOf(
  profile: StateTaxServiceStartingProfile,
): ProfileDefinition {
  return {
    profileId: profile.profileId,
    jurisdictionKey: profile.jurisdictionKey,
    jurisdictionId: profile.jurisdictionId,
    note: profile.note,
    taxTerms: profile.taxTerms,
    appropriation: profile.appropriation,
    capacity: profile.capacity,
  };
}

function digestFor(definition: ProfileDefinition): string {
  return stableHash(
    canonicalJson({
      version: STATE_TAX_SERVICE_GAME_PROFILE_VERSION,
      profile: definition,
    }),
  );
}

function buildProfile(
  seed: string,
  jurisdictionKey: string,
): StateTaxServiceStartingProfile {
  const jurisdiction = stateJurisdictionForKey(jurisdictionKey);
  if (!jurisdiction)
    throw new Error(
      "No canonical state jurisdiction for " + jurisdictionKey + ".",
    );
  const stateUsps = jurisdictionKey.slice(3);
  const stateName = jurisdiction.name;
  const rateIndex = new SeededRng(seed)
    .fork(
      WORLD_SETUP_PROFILE_STREAM +
        ":state-tax-service:" +
        jurisdictionKey +
        ":rate",
    )
    .integer(0, RATE_CHOICES.length);
  const selectedRate = RATE_CHOICES[rateIndex]!;
  const profileId = "state-funded-service:" + jurisdictionKey.toLowerCase();
  const definition: ProfileDefinition = {
    profileId,
    jurisdictionKey,
    jurisdictionId: jurisdiction.id,
    note: PROFILE_NOTICE,
    taxTerms: {
      seriesKey: "state-personal-occurrence:" + stateUsps.toLowerCase(),
      baseKey: "tax-base:declared-personal-occurrence",
      baseLabel: "declared personal occurrence",
      rateNumerator: selectedRate.numerator,
      rateDenominator: selectedRate.denominator,
      exemptBaseKeys: [],
      allowanceMinorUnits: 0,
      currency: "USD" as CurrencyCode,
      effectiveDelayDays: 90,
      collectionLagDays: 30,
      publicPurpose: "modeled school-facilities maintenance service",
      assumptionNote:
        "The " +
        selectedRate.label +
        " rate, declared occurrence base, timing, and purpose are fictional " +
        stateName +
        " game-profile assumptions generated for this save; they are not state law or sourced tax authority.",
      legalBaselineAssumption: "authored-state-game-profile",
    },
    appropriation: {
      basis: {
        kind: "game-profile",
        note:
          "Fictional " +
          stateName +
          " game-profile spending authority for a modeled school-facilities service; it is not a claim about state appropriation law or cash.",
      },
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
      amountMinorUnits: 100_000_000,
      availabilityDays: 365,
      programKey: "appropriations:" + stateUsps.toLowerCase(),
    },
    capacity: {
      basis: {
        kind: "game-profile",
        note:
          "Fictional " +
          stateName +
          " opening condition for the modeled service. The generic unit is not a named school, measured facility, or resident outcome.",
      },
      serviceLabel: "modeled school-facilities service",
      unitLabel: "facility repair unit",
      unitsTotal: 1,
      unitsOperational: 0,
      monthlyOperatingNeedMinorUnits: 1,
      completedPermille: null,
      restorationCostPerUnitMinorUnits: 2_500,
      currency: "USD",
    },
  };
  const version = STATE_TAX_SERVICE_GAME_PROFILE_VERSION;
  const digest = digestFor(definition);
  const ref: StateTaxServiceProfileRef = { profileId, version, digest };
  return { ...definition, version, digest, ref };
}

export function stateKeysForTaxServiceProfiles(): readonly string[] {
  return stateKeys;
}

/** Domain-separated from every other opening draw, per save and state. */
export function drawStateTaxServiceStartingConditions(
  world: Pick<World, "seed">,
): Omit<
  StateTaxServiceStartingConditionsRecord,
  | "id"
  | "sequence"
  | "recordedAt"
  | "effectiveDate"
  | "policyVersion"
  | "provenanceClass"
> {
  return {
    kind: "state-tax-service-starting-conditions",
    stableKey: STARTING_CONDITIONS_KEY,
    contractVersion: STATE_TAX_SERVICE_STARTING_CONDITIONS_VERSION,
    profiles: stateKeys.map((key) => buildProfile(world.seed, key)),
  };
}

export function stateTaxServiceStartingConditions(
  world: Pick<World, "history">,
): StateTaxServiceStartingConditionsRecord | null {
  return (
    world.history.worldConditions?.find(
      (record): record is StateTaxServiceStartingConditionsRecord =>
        record.kind === "state-tax-service-starting-conditions",
    ) ?? null
  );
}

function profileHasValidIdentity(
  profile: StateTaxServiceStartingProfile,
): boolean {
  const { version, digest, ref } = profile;
  return (
    version === STATE_TAX_SERVICE_GAME_PROFILE_VERSION &&
    digest === digestFor(definitionOf(profile)) &&
    canonicalJson(ref) ===
      canonicalJson({ profileId: profile.profileId, version, digest })
  );
}

/** Reads only conditions already saved at Begin; this function never writes. */
export function stateTaxServiceProfileForJurisdictionKey(
  world: Pick<World, "history">,
  jurisdictionKey: string,
): StateTaxServiceStartingProfile | null {
  const profile = stateTaxServiceStartingConditions(world)?.profiles.find(
    (candidate) => candidate.jurisdictionKey === jurisdictionKey,
  );
  return profile && profileHasValidIdentity(profile) ? profile : null;
}

export function stateTaxServiceProfileForJurisdictionId(
  world: Pick<World, "history">,
  jurisdictionId: string,
): StateTaxServiceStartingProfile | null {
  const profile = stateTaxServiceStartingConditions(world)?.profiles.find(
    (candidate) => candidate.jurisdictionId === jurisdictionId,
  );
  return profile && profileHasValidIdentity(profile) ? profile : null;
}

/** Exact reference check for saved proposals and their later effects. */
export function stateTaxServiceProfileByRef(
  world: Pick<World, "history">,
  ref: TaxGameProfileRef,
): StateTaxServiceStartingProfile | null {
  const profile = stateTaxServiceStartingConditions(world)?.profiles.find(
    (candidate) => candidate.profileId === ref.profileId,
  );
  return profile &&
    profileHasValidIdentity(profile) &&
    canonicalJson(profile.ref) === canonicalJson(ref)
    ? profile
    : null;
}

/** Full-save integrity hook for the versioned, canonical fifty-state payload. */
export function assertStateTaxServiceStartingConditions(
  record: StateTaxServiceStartingConditionsRecord,
): void {
  if (
    record.stableKey !== STARTING_CONDITIONS_KEY ||
    record.contractVersion !== STATE_TAX_SERVICE_STARTING_CONDITIONS_VERSION ||
    record.profiles.length !== stateKeys.length
  )
    throw new Error(
      "State tax/service starting conditions must contain the current fifty-state contract.",
    );
  for (let index = 0; index < stateKeys.length; index += 1) {
    const profile = record.profiles[index]!;
    const jurisdiction = stateJurisdictionForKey(stateKeys[index]!);
    if (
      profile.jurisdictionKey !== stateKeys[index] ||
      !jurisdiction ||
      profile.jurisdictionId !== jurisdiction.id ||
      !profileHasValidIdentity(profile)
    )
      throw new Error(
        "Invalid saved state tax/service profile for " + stateKeys[index] + ".",
      );
    const rateBasisPoints =
      (profile.taxTerms.rateNumerator * 10_000) /
      profile.taxTerms.rateDenominator;
    if (![400, 450, 500].includes(rateBasisPoints))
      throw new Error(
        "State tax/service profile exceeds its authored rate calibration for " +
          stateKeys[index] +
          ".",
      );
  }
}
