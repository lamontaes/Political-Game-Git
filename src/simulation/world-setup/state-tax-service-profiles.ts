import { canonicalJson } from "../canonical-json";
import { stableHash } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import type { TaxGameProfileRef } from "../tax-types";
import type { TaxTerms } from "../tax-types";
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
  "Fictional game-profile mechanics: each state's legislature holds ordinary tax authority by default, and its opening law taxes the wages the game pays at a seeded rate. The rate is calibrated against real states and then drifts; it is not current state law or source evidence.";

/**
 * Calibration only (owner rule: real data calibrates, the game generates).
 * A representative flat or middle-bracket state wage income tax rate in basis
 * points; zero where the real state taxes no wages. The save's own opening
 * rate is drawn from this with seeded drift, so no save quotes a real rate.
 */
const WAGE_TAX_CALIBRATION_BASIS_POINTS: Readonly<Record<string, number>> = {
  "US-AK": 0,
  "US-AL": 500,
  "US-AR": 390,
  "US-AZ": 250,
  "US-CA": 600,
  "US-CO": 440,
  "US-CT": 500,
  "US-DE": 520,
  "US-FL": 0,
  "US-GA": 540,
  "US-HI": 720,
  "US-IA": 380,
  "US-ID": 570,
  "US-IL": 495,
  "US-IN": 300,
  "US-KS": 520,
  "US-KY": 400,
  "US-LA": 300,
  "US-MA": 500,
  "US-MD": 475,
  "US-ME": 675,
  "US-MI": 425,
  "US-MN": 680,
  "US-MO": 470,
  "US-MS": 440,
  "US-MT": 590,
  "US-NC": 425,
  "US-ND": 195,
  "US-NE": 520,
  "US-NH": 0,
  "US-NJ": 550,
  "US-NM": 490,
  "US-NV": 0,
  "US-NY": 550,
  "US-OH": 275,
  "US-OK": 475,
  "US-OR": 875,
  "US-PA": 307,
  "US-RI": 475,
  "US-SC": 620,
  "US-SD": 0,
  "US-TN": 0,
  "US-TX": 0,
  "US-UT": 455,
  "US-VA": 575,
  "US-VT": 660,
  "US-WA": 0,
  "US-WI": 530,
  "US-WV": 480,
  "US-WY": 0,
};

/** The highest opening rate the drift can reach, in basis points. */
export const STATE_WAGE_TAX_OPENING_CEILING_BASIS_POINTS = 1_000;
/** The highest rate a state tax bill may set, in basis points. */
export const STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS = 1_500;

/**
 * Drift from the calibration. A state that taxes no wages usually opens at
 * zero (nine saves in ten); otherwise the rate moves up to half a point
 * either way in quarter-point steps.
 */
function openingWageTaxBasisPoints(seed: string, jurisdictionKey: string) {
  const rng = new SeededRng(seed).fork(
    WORLD_SETUP_PROFILE_STREAM + ":state-wage-tax:" + jurisdictionKey,
  );
  const calibrated = WAGE_TAX_CALIBRATION_BASIS_POINTS[jurisdictionKey];
  if (calibrated === undefined)
    throw new Error("No wage-tax calibration for " + jurisdictionKey + ".");
  if (calibrated === 0)
    return rng.fork("zero").integer(0, 10) === 0
      ? 100 + 50 * rng.fork("small").integer(0, 5)
      : 0;
  const step = rng.fork("drift").integer(-2, 3) * 25;
  return Math.min(
    STATE_WAGE_TAX_OPENING_CEILING_BASIS_POINTS,
    Math.max(0, calibrated + step),
  );
}

/** The wage tax a state's law carries: its terms at a given rate. */
export function stateWageTaxTerms(
  jurisdictionKey: string,
  stateName: string,
  rateBasisPoints: number,
): TaxTerms & { readonly effectiveDelayDays: number } {
  const stateUsps = jurisdictionKey.slice(3);
  return {
    seriesKey: "state-wage-income:" + stateUsps.toLowerCase(),
    baseKey: "tax-base:wages",
    baseLabel: "wages",
    rateNumerator: rateBasisPoints,
    rateDenominator: 10_000,
    exemptBaseKeys: [],
    allowanceMinorUnits: 0,
    currency: "USD" as CurrencyCode,
    // One law has one start: the tax takes effect on the law's own
    // effective date (owner decision 2026-09-26), with no extra delay.
    effectiveDelayDays: 0,
    // Withheld from each paycheck the day it is paid; this lag is the dated
    // route's settlement floor and is not used by withholding.
    collectionLagDays: 1,
    publicPurpose: "general " + stateName + " state services",
    assumptionNote:
      "The wage base, rate and payroll withholding are fictional " +
      stateName +
      " game-profile assumptions generated for this save; they are not state law or sourced tax authority.",
    legalBaselineAssumption: "authored-state-game-profile",
  };
}

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
  const profileId = "state-funded-service:" + jurisdictionKey.toLowerCase();
  const definition: ProfileDefinition = {
    profileId,
    jurisdictionKey,
    jurisdictionId: jurisdiction.id,
    note: PROFILE_NOTICE,
    taxTerms: stateWageTaxTerms(
      jurisdictionKey,
      stateName,
      openingWageTaxBasisPoints(seed, jurisdictionKey),
    ),
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
    if (
      !Number.isSafeInteger(rateBasisPoints) ||
      rateBasisPoints < 0 ||
      rateBasisPoints > STATE_WAGE_TAX_OPENING_CEILING_BASIS_POINTS ||
      canonicalJson(profile.taxTerms) !==
        canonicalJson(
          stateWageTaxTerms(
            profile.jurisdictionKey,
            jurisdiction.name,
            rateBasisPoints,
          ),
        )
    )
      throw new Error(
        "State tax/service profile exceeds its authored rate calibration for " +
          stateKeys[index] +
          ".",
      );
  }
}

/**
 * Whether filed tax terms are this state's wage-tax law at some rate a bill
 * may set. A tax bill changes the rate; everything else about the law (the
 * wage base, withholding, the state account) is the same in every state.
 */
export function taxTermsMatchStateWageLaw(
  profile: StateTaxServiceStartingProfile,
  terms: TaxTerms,
): boolean {
  const jurisdiction = stateJurisdictionForKey(profile.jurisdictionKey);
  if (!jurisdiction || terms.rateDenominator !== 10_000) return false;
  const rate = terms.rateNumerator;
  if (
    !Number.isSafeInteger(rate) ||
    rate < 0 ||
    rate > STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS
  )
    return false;
  return (
    canonicalJson(terms) ===
    canonicalJson(
      stateWageTaxTerms(profile.jurisdictionKey, jurisdiction.name, rate),
    )
  );
}
