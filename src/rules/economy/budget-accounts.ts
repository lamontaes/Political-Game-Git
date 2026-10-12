// STOPGAP: economy.opening-account-crosswalk Native canonical crosswalk and legacy account migration guards preserve current static geography and dated shared-account evidence.
/** Full retained opening public-account selection and amount/request math. Existing shared jurisdiction/account writers materialize the ordered requests. */
import { makeIsoDate } from "../../simulation/dates";
import { recordsWithFieldValue as recordsByStringField } from "./raw-record-index";
import {
  budgetCandidates as candidatesOf,
  openGovernmentBudget as openingOf,
  servingGovernment as servingOf,
  type OpeningBudgetFacts,
  type BudgetGeographyViews,
} from "./budget-opening";
import { estimateLocalOpeningCash as localCashOf } from "./budget-local-cash";
import type { BudgetFlowFacts } from "./budget-flows";
import { publicGovernmentIdentityKey } from "../laws/public-identity";
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  PublicGovernmentIdentity,
  World,
  Organization,
  OrganizationProfileRecord,
} from "../../simulation/types";
import type {
  WorldOpeningRecord,
  WorldConditionRecord,
} from "../../simulation/world-setup/types";
import type { BudgetCandidate } from "../../simulation/public-budgets/opening";
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type * as units from "../../simulation/government-units";
import type * as municipal from "../../simulation/municipal-government";
import type { ensureStateJurisdictionForKey as nativeState } from "../../simulation/nationwide-world/state-executives";
import type { ensureLocalGovernmentOrganization as nativeLocal } from "../../simulation/nationwide-world/local-governments";
import type {
  ensurePublicGovernmentAccount as nativeAccount,
  publicTaxAccountEvidenceForIdentity as nativeEvidence,
} from "../../simulation/tax-policy";
export interface AccountGeographyViews {
  readonly budgetViews: BudgetGeographyViews;
  readonly governmentUnit: typeof units.governmentUnit;
  readonly governmentUnitJurisdictionId: typeof units.governmentUnitJurisdictionId;
  readonly governmentUnitsForPlace: typeof units.governmentUnitsForPlace;
  readonly governmentUnitsForState: typeof units.governmentUnitsForState;
  readonly allGovernmentUnits: typeof units.allGovernmentUnits;
  readonly municipalGovernmentByKey: typeof municipal.municipalGovernmentByKey;
  readonly municipalGovernmentForPlaceGeoid: typeof municipal.municipalGovernmentForPlaceGeoid;
  readonly municipalGovernments: typeof municipal.municipalGovernments;
  readonly lifePlaceByKey: BudgetGeographyViews["lifePlaceByKey"];
  readonly lifePlaceByJurisdictionId: BudgetGeographyViews["lifePlaceByJurisdictionId"];
}
export interface OpeningAccountFacts {
  readonly onDate: IsoDate;
  readonly jurisdictions: World["jurisdictions"];
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "organizations"
    | "organizationProfiles"
    | "worldConditions"
  >;
  readonly opening: OpeningBudgetFacts;
  readonly flows: BudgetFlowFacts;
  readonly store: World["publicBudgets"];
  readonly evidence: ReadonlyMap<string, ReturnType<typeof nativeEvidence>>;
  readonly views: AccountGeographyViews;
  readonly federalId: EntityId;
  readonly profileVersion: NonNullable<
    WorldOpeningRecord["publicCashOpening"]
  >["contractVersion"];
}
export function accountEvidenceKey(
  identity: PublicGovernmentIdentity,
  cutoff: HistoricalCutoff,
) {
  return JSON.stringify([
    publicGovernmentIdentityKey(identity),
    cutoff.asOfDate,
    cutoff.historySequenceExclusive,
  ]);
}
export interface OpeningAccountWriteInputs {
  ensureStateJurisdictionForKey: [Parameters<typeof nativeState>[1]];
  ensureNationalElectionJurisdiction: [];
  ensureLocalGovernmentOrganization: [Parameters<typeof nativeLocal>[1]];
  ensurePublicGovernmentAccount: [
    Parameters<typeof nativeAccount>[1],
    Parameters<typeof nativeAccount>[2]?,
  ];
}
export type OpeningAccountRequest = {
  [K in keyof OpeningAccountWriteInputs]: {
    readonly op: K;
    readonly args: OpeningAccountWriteInputs[K];
  };
}[keyof OpeningAccountWriteInputs];
export type OpeningAccountProcess = Generator<
  OpeningAccountRequest,
  OpeningAccountFacts,
  OpeningAccountFacts
>;
function writeRequest<K extends keyof OpeningAccountWriteInputs>(
  op: K,
  args: OpeningAccountWriteInputs[K],
): OpeningAccountRequest {
  return { op, args } as OpeningAccountRequest;
}
const compiled = new WeakMap<
  AccountGeographyViews,
  ReturnType<typeof compile>
>();
function reader(views: AccountGeographyViews) {
  let value = compiled.get(views);
  if (!value) {
    value = compile(views);
    compiled.set(views, value);
  }
  return value;
}
export function selectLocalOpeningAccount(
  facts: OpeningAccountFacts,
  candidate: BudgetCandidate,
  cutoff?: HistoricalCutoff,
) {
  return reader(facts.views).select(facts, candidate, cutoff);
}
export function ensureOpeningGovernmentAccounts(facts: OpeningAccountFacts) {
  return reader(facts.views).prepare(facts);
}
function compile(views: AccountGeographyViews) {
  const {
    governmentUnit,
    governmentUnitJurisdictionId,
    governmentUnitsForPlace,
    governmentUnitsForState,
    allGovernmentUnits,
    municipalGovernmentByKey,
    municipalGovernmentForPlaceGeoid,
    municipalGovernments,
    lifePlaceByKey,
    lifePlaceByJurisdictionId,
  } = views;
  const budgetCandidates = (facts: OpeningAccountFacts) =>
    candidatesOf(facts.opening);
  const openGovernmentBudget = (
    facts: OpeningAccountFacts,
    candidate: BudgetCandidate,
    today: IsoDate,
  ) => openingOf(facts.opening, candidate, today);
  const estimateLocalOpeningCash = (
    facts: OpeningAccountFacts,
    candidate: BudgetCandidate,
  ) => localCashOf({ store: facts.store, flows: facts.flows }, candidate);
  const servingGovernment = (geoid: string, stateKey: string, id: EntityId) =>
    servingOf({ views: views.budgetViews }, geoid, stateKey, id);
  function publicTaxAccountEvidenceForIdentity(
    facts: OpeningAccountFacts,
    identity: PublicGovernmentIdentity,
    cutoff: HistoricalCutoff,
  ) {
    const key = accountEvidenceKey(identity, cutoff);
    if (!facts.evidence.has(key))
      throw Error("Missing shared account ownership receipt: " + key);
    return facts.evidence.get(key)!;
  }
  type LocalOpeningAccountSelection =
    | {
        readonly status: "saved" | "unique-compiled";
        readonly identity: PublicGovernmentIdentity;
        readonly sourceRecordIds: readonly EntityId[];
      }
    | {
        readonly status: "absent" | "ambiguous" | "unsupported";
        readonly reason: string;
      };
  function townshipForOpeningCandidate(
    candidate: BudgetCandidate,
  ): GovernmentUnitIdentity | null {
    if (
      candidate.level !== "city" ||
      !candidate.geoid ||
      candidate.key !== `town:${candidate.geoid}`
    )
      return null;
    const servedPlace = lifePlaceByJurisdictionId(candidate.lawJurisdictionId);
    if (
      !servedPlace?.sourceGeoid ||
      servedPlace.stateJurisdictionKey !== candidate.stateKey
    )
      return null;
    const serving = servingGovernment(
      servedPlace.sourceGeoid,
      candidate.stateKey,
      candidate.lawJurisdictionId,
    );
    if (
      typeof serving === "string" ||
      serving.key !== candidate.key ||
      serving.geoid !== candidate.geoid
    )
      return null;
    const units = governmentUnitsForState(
      candidate.stateKey.replace(/^US-/, ""),
    ).filter(
      (unit) =>
        unit.functionalActive &&
        unit.unitType === "township" &&
        unit.countyGeoid === candidate.geoid!.slice(0, 5) &&
        unit.publisherPlaceCode === candidate.geoid!.slice(5),
    );
    const unit = units.length === 1 ? units[0]! : null;
    if (
      !unit ||
      (candidate.jurisdictionId !== candidate.lawJurisdictionId &&
        candidate.jurisdictionId !== governmentUnitJurisdictionId(unit))
    )
      return null;
    return unit;
  }
  function selectLocalOpeningAccount(
    facts: OpeningAccountFacts,
    inputCandidate: BudgetCandidate,
    cutoff: HistoricalCutoff = currentLifeCutoff(facts),
  ): LocalOpeningAccountSelection {
    const township = townshipForOpeningCandidate(inputCandidate);
    if (inputCandidate.key.startsWith("town:") && !township)
      return {
        status: "unsupported",
        reason:
          "No unique compiled township matches the existing serving-government route.",
      };
    if (
      township &&
      facts.records.organizations.some((row) => {
        if (
          !row.stableKey.startsWith("public-government:") ||
          row.stableKey.startsWith("public-government:local:")
        )
          return false;
        const jurisdictionId = row.stableKey.slice(
          "public-government:".length,
        ) as EntityId;
        return (
          townshipForOpeningCandidate({
            ...inputCandidate,
            jurisdictionId,
            lawJurisdictionId: jurisdictionId,
          })?.id === township.id
        );
      })
    )
      return {
        status: "unsupported",
        reason:
          "A served-place account already exists; township ownership requires recorded migration, not relabeling or a second account.",
      };
    const candidate = township
      ? {
          ...inputCandidate,
          jurisdictionId: governmentUnitJurisdictionId(township),
        }
      : inputCandidate;
    if (
      !candidate.geoid ||
      !["county", "city"].includes(candidate.level) ||
      candidate.key !==
        `${candidate.level === "county" ? "county" : township ? "town" : "place"}:${candidate.geoid}`
    )
      return {
        status: "unsupported",
        reason: "No existing county/place account relation for this budget.",
      };
    const legacy: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: candidate.jurisdictionId,
    };
    const matches: {
      identity: PublicGovernmentIdentity;
      sourceRecordIds: readonly EntityId[];
    }[] = [];
    let unsupportedSaved = false;
    let matchingSavedAccounts = 0;
    const prefix = "public-government:local:";
    for (const organization of facts.records.organizations) {
      let identity: PublicGovernmentIdentity | null = null;
      if (organization.stableKey === publicGovernmentOrganizationKey(legacy))
        identity = legacy;
      else if (organization.stableKey.startsWith(prefix)) {
        let governmentKey: string;
        try {
          governmentKey = decodeURIComponent(
            organization.stableKey.slice(prefix.length),
          );
        } catch {
          continue;
        }
        const unit = governmentUnit(governmentKey);
        const municipal = unit ? null : municipalGovernmentByKey(governmentKey);
        const key =
          unit?.unitType === "county" && unit.countyGeoid
            ? `county:${unit.countyGeoid}`
            : unit?.unitType === "municipality" && unit.placeGeoid
              ? `place:${unit.placeGeoid}`
              : unit?.unitType === "township" &&
                  unit.countyGeoid &&
                  unit.publisherPlaceCode
                ? `town:${unit.countyGeoid}${unit.publisherPlaceCode}`
                : municipal?.placeGeoid
                  ? `place:${municipal.placeGeoid}`
                  : null;
        const jurisdictionId = unit
          ? governmentUnitJurisdictionId(unit)
          : municipal?.placeGeoid
            ? lifePlaceByKey(municipal.placeGeoid)?.context.jurisdiction.id
            : null;
        if (
          key === candidate.key &&
          jurisdictionId === candidate.jurisdictionId
        )
          identity = {
            kind: "local-government",
            governmentKey,
            jurisdictionId: candidate.jurisdictionId,
          };
      }
      if (!identity) continue;
      matchingSavedAccounts += 1;
      const evidence = publicTaxAccountEvidenceForIdentity(
        facts,
        identity,
        cutoff,
      );
      if (
        !evidence ||
        evidence.organizationId !== organization.id ||
        canonicalSavedPublicGovernmentAccountKey(organization.stableKey) !==
          canonicalPublicGovernmentAccountKey(identity)
      )
        unsupportedSaved = true;
      else
        matches.push({ identity, sourceRecordIds: evidence.sourceRecordIds });
    }
    if (matchingSavedAccounts > 1)
      return {
        status: "ambiguous",
        reason:
          "Multiple saved accounts match this government; consolidation requires recorded migration.",
      };
    if (unsupportedSaved)
      return {
        status: "unsupported",
        reason:
          "A matching saved account lacks valid dated ownership evidence; do not open a replacement.",
      };
    if (matches.length === 1) return { status: "saved", ...matches[0]! };
    const units = (
      township
        ? [township]
        : candidate.level === "county"
          ? governmentUnitsForState(candidate.stateKey.replace(/^US-/, ""))
          : governmentUnitsForPlace(candidate.geoid)
    ).filter(
      (unit) =>
        unit.functionalActive &&
        unit.unitType ===
          (candidate.level === "county"
            ? "county"
            : township
              ? "township"
              : "municipality") &&
        (township
          ? `${unit.countyGeoid}${unit.publisherPlaceCode}`
          : candidate.level === "county"
            ? unit.countyGeoid
            : unit.placeGeoid) === candidate.geoid &&
        governmentUnitJurisdictionId(unit) === candidate.jurisdictionId,
    );
    if (units.length > 1)
      return {
        status: "ambiguous",
        reason: "Multiple compiled units match this budget.",
      };
    let governmentKey = units[0]?.id;
    if (!governmentKey && candidate.level === "county") {
      const municipio = governmentUnit(`municipio:${candidate.geoid}`);
      if (
        municipio?.functionalActive &&
        municipio.unitType === "county" &&
        municipio.countyGeoid === candidate.geoid &&
        governmentUnitJurisdictionId(municipio) === candidate.jurisdictionId
      )
        governmentKey = municipio.id;
    }
    if (!governmentKey && candidate.level === "city") {
      if (
        municipalGovernments().filter(
          (row) => row.placeGeoid === candidate.geoid,
        ).length > 1
      )
        return {
          status: "ambiguous",
          reason: "Multiple declared municipal profiles match this place.",
        };
      const municipal = municipalGovernmentForPlaceGeoid(candidate.geoid);
      if (
        municipal?.placeGeoid === candidate.geoid &&
        lifePlaceByKey(candidate.geoid)?.context.jurisdiction.id ===
          candidate.jurisdictionId
      )
        governmentKey = municipal.key;
    }
    if (!governmentKey)
      return {
        status: "absent",
        reason: "No unique compiled government identity matches this budget.",
      };
    const identity: PublicGovernmentIdentity = {
      kind: "local-government",
      governmentKey,
      jurisdictionId: candidate.jurisdictionId,
    };
    try {
      assertPublicGovernmentIdentity(facts, identity, cutoff);
    } catch {
      return {
        status: "unsupported",
        reason:
          "The compiled identity is not valid in this saved world at the requested cutoff.",
      };
    }
    return { status: "unique-compiled", identity, sourceRecordIds: [] };
  }
  function* ensureOpeningGovernmentAccounts(
    facts: OpeningAccountFacts,
  ): OpeningAccountProcess {
    let next = facts;
    for (const candidate of budgetCandidates(facts).candidates) {
      if (candidate.level !== "state") continue;
      const opening = openGovernmentBudget(
        facts,
        candidate,
        makeIsoDate(facts.onDate),
      );
      if (typeof opening === "string") continue;
      const minorUnits = Math.round((opening.balance + opening.reserve) * 100);
      if (!Number.isSafeInteger(minorUnits) || minorUnits < 0)
        throw new Error(
          `Invalid researched opening cash for ${candidate.key}.`,
        );
      next = yield writeRequest("ensureStateJurisdictionForKey", [
        candidate.key,
      ]);
      next = yield writeRequest("ensurePublicGovernmentAccount", [
        {
          kind: "jurisdiction",
          jurisdictionId: candidate.jurisdictionId,
        },
        {
          amountMinorUnits: minorUnits,
          sourceNote: `ESTIMATED FROM RESEARCH: opening modeled public cash equals the existing general-fund balance plus rainy-day reserve estimate (${candidate.key}); not an observed treasury cash balance or tax receipt. Source: data/research/money/public-budget-bases.json, derived from government-budgets-2026.json (NASBO fiscal 2026). ${opening.openingNotes.filter((note) => /balance|reserve|island areas/i.test(note)).join(" ")}`,
        },
      ]);
    }
    if (
      worldOpeningRecord(facts)?.publicCashOpening?.contractVersion ===
      facts.profileVersion
    ) {
      next = yield writeRequest("ensureNationalElectionJurisdiction", []);
      next = yield writeRequest("ensurePublicGovernmentAccount", [
        {
          kind: "jurisdiction",
          jurisdictionId: facts.federalId,
        },
      ]);
    }
    const peersAtOpening = next;
    const hasSavedLocalOpening =
      worldOpeningRecord(facts)?.publicCashOpening?.contractVersion ===
      facts.profileVersion;
    for (const candidate of budgetCandidates(next).candidates) {
      if (candidate.level !== "county" && candidate.level !== "city") continue;
      const township = townshipForOpeningCandidate(candidate);
      if (township)
        next = yield writeRequest("ensureLocalGovernmentOrganization", [
          township,
        ]);
      const selection = selectLocalOpeningAccount(next, candidate);
      if (
        selection.status !== "unique-compiled" &&
        selection.status !== "saved"
      )
        continue;
      const estimate = estimateLocalOpeningCash(peersAtOpening, candidate);
      if (!hasSavedLocalOpening && !estimate) continue;
      next = yield writeRequest("ensurePublicGovernmentAccount", [
        selection.identity,
        estimate
          ? {
              amountMinorUnits: estimate.amountMinorUnits,
              sourceNote: estimate.sourceNote,
            }
          : undefined,
      ]);
    }
    return next;
  }
  function publicGovernmentOrganizationKey(
    identity: PublicGovernmentIdentity,
  ): string {
    return identity.kind === "jurisdiction"
      ? `public-government:${identity.jurisdictionId}`
      : `public-government:local:${encodeURIComponent(identity.governmentKey)}`;
  }
  let accountKeys: Map<EntityId, Set<string>> | undefined;
  function compiledAccountKeys(): Map<EntityId, Set<string>> {
    if (accountKeys) return accountKeys;
    const keys = new Map<EntityId, Set<string>>();
    const add = (jurisdictionId: EntityId, governmentKey: string) => {
      const entries = keys.get(jurisdictionId) ?? new Set<string>();
      entries.add(
        `public-government:local:${encodeURIComponent(governmentKey)}`,
      );
      keys.set(jurisdictionId, entries);
    };
    for (const unit of allGovernmentUnits()) {
      if (
        !unit.functionalActive ||
        !["county", "municipality", "township"].includes(unit.unitType)
      )
        continue;
      const municipal =
        unit.unitType === "municipality"
          ? municipalGovernmentByKey(unit.id)
          : null;
      add(governmentUnitJurisdictionId(unit), municipal?.key ?? unit.id);
    }
    for (const municipal of municipalGovernments()) {
      const place = municipal.placeGeoid
        ? lifePlaceByKey(municipal.placeGeoid)
        : null;
      if (place) add(place.context.jurisdiction.id, municipal.key);
    }
    accountKeys = keys;
    return keys;
  }
  function canonicalPublicGovernmentAccountKey(
    identity: PublicGovernmentIdentity,
  ): string {
    if (identity.kind === "local-government") {
      const unit = governmentUnit(identity.governmentKey);
      const municipal =
        unit?.unitType === "municipality"
          ? municipalGovernmentByKey(unit.id)
          : null;
      return publicGovernmentOrganizationKey({
        ...identity,
        governmentKey: municipal?.key ?? identity.governmentKey,
      });
    }
    const keys = compiledAccountKeys().get(identity.jurisdictionId);
    return keys?.size === 1
      ? [...keys][0]!
      : publicGovernmentOrganizationKey(identity);
  }
  function canonicalSavedPublicGovernmentAccountKey(
    stableKey: string,
  ): string | null {
    const prefix = "public-government:";
    if (!stableKey.startsWith(prefix)) return null;
    const local = `${prefix}local:`;
    if (stableKey.startsWith(local)) {
      try {
        const governmentKey = decodeURIComponent(stableKey.slice(local.length));
        const unit = governmentUnit(governmentKey);
        const municipal = municipalGovernmentByKey(governmentKey);
        const jurisdictionId = unit
          ? governmentUnitJurisdictionId(unit)
          : municipal?.placeGeoid
            ? lifePlaceByKey(municipal.placeGeoid)?.context.jurisdiction.id
            : null;
        return jurisdictionId
          ? canonicalPublicGovernmentAccountKey({
              kind: "local-government",
              governmentKey,
              jurisdictionId,
            })
          : stableKey;
      } catch {
        return null;
      }
    }
    return canonicalPublicGovernmentAccountKey({
      kind: "jurisdiction",
      jurisdictionId: stableKey.slice(prefix.length) as EntityId,
    });
  }
  function assertPublicGovernmentIdentity(
    facts: OpeningAccountFacts,
    identity: PublicGovernmentIdentity,
    cutoff: HistoricalCutoff = currentLifeCutoff(facts),
  ): void {
    if (!facts.jurisdictions[identity.jurisdictionId])
      throw new Error(
        "A public-government identity names a missing jurisdiction.",
      );
    if (identity.kind === "jurisdiction") return;
    const unit = governmentUnit(identity.governmentKey);
    if (
      unit?.functionalActive &&
      (unit.unitType === "municipality" ||
        unit.unitType === "county" ||
        unit.unitType === "township") &&
      governmentUnitJurisdictionId(unit) === identity.jurisdictionId
    )
      return;
    const government = municipalGovernmentByKey(identity.governmentKey);
    const place = government?.placeGeoid
      ? lifePlaceByKey(government.placeGeoid)
      : null;
    if (
      !government ||
      place?.context.jurisdiction.id !== identity.jurisdictionId
    )
      throw new Error(
        "A local public-government identity must match a compiled government's canonical place.",
      );
    const organization = organizationsAt(facts, cutoff).find(
      (row) =>
        row.stableKey === `municipal-government:${identity.governmentKey}`,
    );
    if (!organization) return;
    const profile = organizationProfileAt(facts, organization.id, cutoff);
    if (profile && profile.locationJurisdictionId !== identity.jurisdictionId)
      throw new Error(
        "A local public-government account cannot move away from its canonical government place.",
      );
  }
  function currentLifeCutoff(facts: OpeningAccountFacts): HistoricalCutoff {
    return {
      asOfDate: facts.onDate,
      historySequenceExclusive: facts.records.nextSequence,
    };
  }
  function organizationsAt(
    facts: OpeningAccountFacts,
    cutoff: HistoricalCutoff = currentLifeCutoff(facts),
    organizations: readonly Organization[] = facts.records.organizations,
  ): readonly Organization[] {
    validateCutoff(facts, cutoff);
    return organizations.filter((organization) =>
      available(organization.sequence, organization.formedAt, cutoff),
    );
  }
  function organizationProfileHistory(
    facts: OpeningAccountFacts,
    organizationId: EntityId,
    cutoff: HistoricalCutoff = currentLifeCutoff(facts),
  ): readonly OrganizationProfileRecord[] {
    validateCutoff(facts, cutoff);
    return recordsByStringField(
      facts.records.organizationProfiles,
      "organizationId",
      organizationId,
    )
      .filter((record) =>
        available(record.sequence, record.effectiveAt, cutoff),
      )
      .sort(byEffectiveDateThenSequence);
  }
  function organizationProfileAt(
    facts: OpeningAccountFacts,
    organizationId: EntityId,
    cutoff: HistoricalCutoff = currentLifeCutoff(facts),
  ): OrganizationProfileRecord | undefined {
    return organizationProfileHistory(facts, organizationId, cutoff).at(-1);
  }
  function validateCutoff(
    facts: OpeningAccountFacts,
    cutoff: HistoricalCutoff,
  ): void {
    const asOfDate = makeIsoDate(cutoff.asOfDate);
    if (asOfDate > facts.onDate) {
      throw new Error("Historical cutoff is after the current world date.");
    }
    if (
      !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
      cutoff.historySequenceExclusive < 0 ||
      cutoff.historySequenceExclusive > facts.records.nextSequence
    ) {
      throw new Error("Historical cutoff sequence is outside world history.");
    }
  }
  function available(
    sequence: number,
    effectiveAt: string,
    cutoff: HistoricalCutoff,
  ): boolean {
    return (
      sequence < cutoff.historySequenceExclusive &&
      effectiveAt <= cutoff.asOfDate
    );
  }
  function byEffectiveDateThenSequence<
    T extends {
      readonly effectiveAt: string;
      readonly sequence: number;
    },
  >(left: T, right: T): number {
    return (
      left.effectiveAt.localeCompare(right.effectiveAt) ||
      left.sequence - right.sequence
    );
  }
  function worldOpeningRecord(
    facts: OpeningAccountFacts,
  ): WorldOpeningRecord | null {
    return (
      worldConditionRecords(facts).find(
        (record): record is WorldOpeningRecord =>
          record.kind === "world-opening",
      ) ?? null
    );
  }
  function worldConditionRecords(
    facts: OpeningAccountFacts,
  ): readonly WorldConditionRecord[] {
    return facts.records.worldConditions ?? [];
  }

  return {
    select(
      facts: OpeningAccountFacts,
      candidate: BudgetCandidate,
      cutoff?: HistoricalCutoff,
    ) {
      return selectLocalOpeningAccount(facts, candidate, cutoff);
    },
    prepare(facts: OpeningAccountFacts) {
      return ensureOpeningGovernmentAccounts(facts);
    },
  };
}
