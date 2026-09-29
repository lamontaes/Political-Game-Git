import { canonicalJson } from "./canonical-json";
import { stableHash } from "./ids";
import type { TaxGameProfileRef, TaxTerms } from "./tax-types";
import type { CurrencyCode, PublicProgramBasis } from "./types";

/** Versioned fictional mechanics for the cross-state funded-service route. */
export const STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION =
  "state-funded-service-game-profile/v1" as const;

export type StateFundedServiceJurisdictionKey = "US-KY" | "US-MN" | "US-NV";

export interface StateFundedServiceGameProfileRef extends TaxGameProfileRef {
  readonly profileId: string;
  readonly version: typeof STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION;
  /** Stable content identity; this is not a cryptographic signature. */
  readonly digest: string;
}

export interface StateFundedServiceGameProfile {
  readonly profileId: string;
  readonly version: typeof STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION;
  /** Stable content identity; this is not a cryptographic signature. */
  readonly digest: string;
  readonly ref: StateFundedServiceGameProfileRef;
  readonly jurisdictionKey: StateFundedServiceJurisdictionKey;
  readonly note: string;
  readonly taxTerms: TaxTerms & { readonly effectiveDelayDays: number };
  readonly appropriation: {
    readonly basis: PublicProgramBasis;
    readonly familyKey: "appropriations";
    readonly variantKey: "single-programme";
    readonly authorityKey: "standing:school-facilities";
    readonly amountMinorUnits: number;
    readonly availabilityDays: number;
    readonly programKey: string;
  };
  readonly capacity: {
    readonly basis: PublicProgramBasis;
    readonly serviceLabel: string;
    readonly unitLabel: string;
    readonly unitsTotal: number;
    readonly unitsOperational: number;
    readonly monthlyOperatingNeedMinorUnits: number;
    readonly completedPermille: null;
    readonly restorationCostPerUnitMinorUnits: number;
    readonly currency: "USD";
  };
  readonly panelSeatsByChamber: Readonly<
    Record<
      string,
      {
        readonly seats: number;
        readonly basis: "compiled-formal-seat-count" | "game-profile-stand-in";
        readonly note: string;
      }
    >
  >;
}

type ProfileDefinition = Omit<
  StateFundedServiceGameProfile,
  "version" | "digest" | "ref"
>;

const GAME_PROFILE_NOTICE =
  "Fictional game-profile mechanics for a modeled school-facilities service. These values do not describe current state tax, appropriation, or service law, and they are not source evidence.";

const definitions: readonly ProfileDefinition[] = [
  {
    profileId: "state-funded-service:us-ky",
    jurisdictionKey: "US-KY",
    note: GAME_PROFILE_NOTICE,
    taxTerms: {
      seriesKey: "state-personal-occurrence:us-ky",
      baseKey: "tax-base:declared-personal-occurrence",
      baseLabel: "declared personal occurrence",
      rateNumerator: 5,
      rateDenominator: 100,
      exemptBaseKeys: [],
      allowanceMinorUnits: 0,
      currency: "USD" as CurrencyCode,
      collectionLagDays: 30,
      effectiveDelayDays: 90,
      publicPurpose: "modeled school-facilities maintenance service",
      assumptionNote:
        "The 5% rate, declared occurrence base, timing, and purpose are fictional KY game-profile assumptions, not Kentucky law or sourced tax authority.",
      legalBaselineAssumption: "authored-state-game-profile",
    },
    appropriation: {
      basis: {
        kind: "game-profile",
        note: "Fictional KY game-profile spending authority for the modeled school-facilities service; this is not a claim about Kentucky's appropriation law or cash.",
      },
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
      amountMinorUnits: 100_000_000,
      availabilityDays: 365,
      programKey: "appropriations:ky",
    },
    capacity: {
      basis: {
        kind: "game-profile",
        note: "Fictional KY starting service capacity used by the modeled route; restoration cost and units are not observed state facts.",
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
    panelSeatsByChamber: {
      house: {
        seats: 24,
        basis: "game-profile-stand-in",
        note: "A 24-member authored voting panel is a game-profile stand-in, not the formal Kentucky House seat count.",
      },
      senate: {
        seats: 12,
        basis: "game-profile-stand-in",
        note: "A 12-member authored voting panel is a game-profile stand-in, not the formal Kentucky Senate seat count.",
      },
    },
  },
  {
    profileId: "state-funded-service:us-mn",
    jurisdictionKey: "US-MN",
    note: GAME_PROFILE_NOTICE,
    taxTerms: {
      seriesKey: "state-personal-occurrence:us-mn",
      baseKey: "tax-base:declared-personal-occurrence",
      baseLabel: "declared personal occurrence",
      rateNumerator: 9,
      rateDenominator: 200,
      exemptBaseKeys: [],
      allowanceMinorUnits: 0,
      currency: "USD" as CurrencyCode,
      collectionLagDays: 30,
      effectiveDelayDays: 90,
      publicPurpose: "modeled school-facilities maintenance service",
      assumptionNote:
        "The 4.5% rate, declared occurrence base, timing, and purpose are fictional MN game-profile assumptions, not Minnesota law or sourced tax authority.",
      legalBaselineAssumption: "authored-state-game-profile",
    },
    appropriation: {
      basis: {
        kind: "game-profile",
        note: "Fictional MN game-profile spending authority for the modeled school-facilities service; this is not a claim about Minnesota's appropriation law or cash.",
      },
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
      amountMinorUnits: 100_000_000,
      availabilityDays: 365,
      programKey: "appropriations:mn",
    },
    capacity: {
      basis: {
        kind: "game-profile",
        note: "Fictional MN starting service capacity used by the modeled route; restoration cost and units are not observed state facts.",
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
    panelSeatsByChamber: {
      house: {
        seats: 134,
        basis: "compiled-formal-seat-count",
        note: "The 134-member panel size matches this repository's compiled Minnesota formal seat count (Minn. Stat. § 2.021); the recorded votes remain authored game outcomes.",
      },
      senate: {
        seats: 67,
        basis: "compiled-formal-seat-count",
        note: "The 67-member panel size matches this repository's compiled Minnesota formal seat count (Minn. Stat. § 2.021); the recorded votes remain authored game outcomes.",
      },
    },
  },
  {
    profileId: "state-funded-service:us-nv",
    jurisdictionKey: "US-NV",
    note: GAME_PROFILE_NOTICE,
    taxTerms: {
      seriesKey: "state-personal-occurrence:us-nv",
      baseKey: "tax-base:declared-personal-occurrence",
      baseLabel: "declared personal occurrence",
      rateNumerator: 4,
      rateDenominator: 100,
      exemptBaseKeys: [],
      allowanceMinorUnits: 0,
      currency: "USD" as CurrencyCode,
      collectionLagDays: 30,
      effectiveDelayDays: 90,
      publicPurpose: "modeled school-facilities maintenance service",
      assumptionNote:
        "The 4% rate, declared occurrence base, timing, and purpose are fictional NV game-profile assumptions, not Nevada law or sourced tax authority.",
      legalBaselineAssumption: "authored-state-game-profile",
    },
    appropriation: {
      basis: {
        kind: "game-profile",
        note: "Fictional NV game-profile spending authority for the modeled school-facilities service; this is not a claim about Nevada's appropriation law or cash.",
      },
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
      amountMinorUnits: 100_000_000,
      availabilityDays: 365,
      programKey: "appropriations:nv",
    },
    capacity: {
      basis: {
        kind: "game-profile",
        note: "Fictional NV starting service capacity used by the modeled route; restoration cost and units are not observed state facts.",
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
    panelSeatsByChamber: {
      assembly: {
        seats: 24,
        basis: "game-profile-stand-in",
        note: "A 24-member authored voting panel is a game-profile stand-in, not the formal Nevada Assembly seat count.",
      },
      senate: {
        seats: 12,
        basis: "game-profile-stand-in",
        note: "A 12-member authored voting panel is a game-profile stand-in, not the formal Nevada Senate seat count.",
      },
    },
  },
];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

function withIdentity(
  definition: ProfileDefinition,
): StateFundedServiceGameProfile {
  const version = STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION;
  const digest = stableHash(canonicalJson({ version, profile: definition }));
  return deepFreeze({
    ...definition,
    version,
    digest,
    ref: { profileId: definition.profileId, version, digest },
  }) as StateFundedServiceGameProfile;
}

const profiles: readonly StateFundedServiceGameProfile[] = deepFreeze(
  definitions.map(withIdentity),
);

const profileByJurisdiction = new Map(
  profiles.map((profile) => [profile.jurisdictionKey, profile] as const),
);
const profileById = new Map(
  profiles.map((profile) => [profile.profileId, profile] as const),
);

/** Returns the exact fictional profile registered for a state, if any. */
export function stateFundedServiceGameProfileForJurisdictionKey(
  jurisdictionKey: string,
): StateFundedServiceGameProfile | null {
  return (
    profileByJurisdiction.get(
      jurisdictionKey as StateFundedServiceJurisdictionKey,
    ) ?? null
  );
}

/** Returns the immutable content reference for the jurisdiction's profile. */
export function stateFundedServiceGameProfileRefForJurisdictionKey(
  jurisdictionKey: string,
): StateFundedServiceGameProfileRef | null {
  return (
    stateFundedServiceGameProfileForJurisdictionKey(jurisdictionKey)?.ref ??
    null
  );
}

/** Returns the immutable registry entry only for an exact content reference. */
export function stateFundedServiceGameProfileByRef(
  ref: TaxGameProfileRef,
): StateFundedServiceGameProfile | null {
  const profile = profileById.get(ref.profileId);
  return profile &&
    profile.version === ref.version &&
    profile.digest === ref.digest
    ? profile
    : null;
}

/** Returns the stable profile reference, without accepting caller-built refs. */
export function stateFundedServiceGameProfileRef(
  profile: StateFundedServiceGameProfile,
): StateFundedServiceGameProfileRef {
  return profile.ref;
}
