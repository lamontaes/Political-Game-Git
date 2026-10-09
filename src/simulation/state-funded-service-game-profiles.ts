import { researchRuleTable } from "./research-rule-tables";
import { canonicalJson } from "./canonical-json";
import { stableHash } from "./ids";
import { makeCurrencyCode } from "./resources";
import type { TaxGameProfileRef, TaxTerms } from "./tax-types";
import type { PublicProgramBasis } from "./types";

/** Versioned fictional mechanics for the cross-state funded-service route. */
export const STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION =
  "state-funded-service-game-profile/v1" as const;

export type StateFundedServiceJurisdictionKey = string;

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

function literal<T extends string>(value: string, expected: T): T {
  if (value !== expected)
    throw new Error(`Invalid profile discriminator: ${value}`);
  return expected;
}

const definitions: readonly ProfileDefinition[] = researchRuleTable(
  "stateFundedServices",
).definitions.map((row) => ({
  ...row,
  taxTerms: {
    ...row.taxTerms,
    currency: makeCurrencyCode(literal(row.taxTerms.currency, "USD")),
    legalBaselineAssumption: literal(
      row.taxTerms.legalBaselineAssumption,
      "authored-state-game-profile",
    ),
  },
  appropriation: {
    ...row.appropriation,
    basis: {
      ...row.appropriation.basis,
      kind: literal(row.appropriation.basis.kind, "game-profile"),
    },
    familyKey: literal(row.appropriation.familyKey, "appropriations"),
    variantKey: literal(row.appropriation.variantKey, "single-programme"),
    authorityKey: literal(
      row.appropriation.authorityKey,
      "standing:school-facilities",
    ),
  },
  capacity: {
    ...row.capacity,
    currency: literal(row.capacity.currency, "USD"),
    basis: {
      ...row.capacity.basis,
      kind: literal(row.capacity.basis.kind, "game-profile"),
    },
    completedPermille: null,
  },
  panelSeatsByChamber: Object.fromEntries(
    Object.entries(row.panelSeatsByChamber)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, panel]) => {
        if (!panel) throw new Error(`Missing profile panel: ${key}`);
        const basis =
          panel.basis === "compiled-formal-seat-count"
            ? panel.basis
            : literal(panel.basis, "game-profile-stand-in");
        return [key, { ...panel, basis }];
      }),
  ),
}));

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
