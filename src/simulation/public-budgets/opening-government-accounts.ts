import { makeIsoDate } from "../dates";
import { spreadOf } from "../sample-spread";
import { readMonthFlows } from "./month";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
  governmentUnitsForPlace,
  governmentUnitsForState,
} from "../government-units";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceByKey } from "../life-places";
import {
  municipalGovernmentByKey,
  municipalGovernmentForPlaceGeoid,
  municipalGovernments,
} from "../municipal-government";
import {
  assertPublicGovernmentIdentity,
  publicGovernmentOrganizationKey,
} from "../public-government-identity";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountEvidenceForIdentity,
} from "../tax-policy";
import type {
  EntityId,
  HistoricalCutoff,
  PublicGovernmentIdentity,
  World,
} from "../types";
import { worldOpeningRecord } from "../world-setup/conditions";
import { PUBLIC_CASH_OPENING_PROFILE_VERSION } from "../world-setup/types";
import {
  budgetCandidates,
  openGovernmentBudget,
  type BudgetCandidate,
} from "./opening";

export type LocalOpeningAccountSelection =
  | {
      readonly status: "saved" | "unique-compiled";
      readonly identity: PublicGovernmentIdentity;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status: "absent" | "ambiguous" | "unsupported";
      readonly reason: string;
    };

/** Account ownership selection only; neither geography nor opening cash grants authority. */
export function selectLocalOpeningAccount(
  world: World,
  candidate: BudgetCandidate,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): LocalOpeningAccountSelection {
  if (
    !candidate.geoid ||
    !["county", "city"].includes(candidate.level) ||
    candidate.key !==
      `${candidate.level === "county" ? "county" : "place"}:${candidate.geoid}`
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
  // A saved but cutoff-invisible account also blocks replacement; the dated
  // evidence reader below decides whether its actual ownership is usable.
  for (const organization of world.history.organizations) {
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
            : municipal?.placeGeoid
              ? `place:${municipal.placeGeoid}`
              : null;
      const jurisdictionId = unit
        ? governmentUnitJurisdictionId(unit)
        : municipal?.placeGeoid
          ? lifePlaceByKey(municipal.placeGeoid)?.context.jurisdiction.id
          : null;
      if (key === candidate.key && jurisdictionId === candidate.jurisdictionId)
        identity = {
          kind: "local-government",
          governmentKey,
          jurisdictionId: candidate.jurisdictionId,
        };
    }
    if (!identity) continue;
    matchingSavedAccounts += 1;
    const evidence = publicTaxAccountEvidenceForIdentity(
      world,
      identity,
      cutoff,
    );
    if (!evidence || evidence.organizationId !== organization.id)
      unsupportedSaved = true;
    else matches.push({ identity, sourceRecordIds: evidence.sourceRecordIds });
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
    candidate.level === "county"
      ? governmentUnitsForState(candidate.stateKey.replace(/^US-/, ""))
      : governmentUnitsForPlace(candidate.geoid)
  ).filter(
    (unit) =>
      unit.functionalActive &&
      unit.unitType ===
        (candidate.level === "county" ? "county" : "municipality") &&
      (candidate.level === "county" ? unit.countyGeoid : unit.placeGeoid) ===
        candidate.geoid &&
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
      municipalGovernments().filter((row) => row.placeGeoid === candidate.geoid)
        .length > 1
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
    assertPublicGovernmentIdentity(world, identity, cutoff);
  } catch {
    return {
      status: "unsupported",
      reason:
        "The compiled identity is not valid in this saved world at the requested cutoff.",
    };
  }
  return { status: "unique-compiled", identity, sourceRecordIds: [] };
}

export interface InGameOpeningCashEstimate {
  readonly amountMinorUnits: number;
  readonly spreadMinorUnits: number;
  readonly sourceNote: string;
  readonly peerGovernmentKeys: readonly string[];
  readonly peerRecordIds: readonly EntityId[];
}

/** Current account cash, normalized by the populations already saved in this game.
 * Nearest populated governments below and above the target form the peer group.
 * No draw, outside figure, forecast revenue or new payment supplies the result.
 */
export function estimateLocalOpeningCash(
  world: World,
  candidate: BudgetCandidate,
): InGameOpeningCashEstimate | null {
  const store = world.publicBudgets;
  const target = store?.governments.find((row) => row.key === candidate.key);
  if (!store || !target || target.population <= 0) return null;
  const cash = readMonthFlows(world, store).flows.cash;
  const donors = store.governments.flatMap((government) => {
    const account = cash?.get(government.key);
    if (
      !account ||
      government.key === candidate.key ||
      government.population <= 0
    )
      return [];
    const spendable =
      account.balanceMinorUnits - (account.heldCashBailMinorUnits ?? 0);
    if (spendable < 0) return [];
    return [{ government, account, spendable }];
  });
  // Exact local peers win. At an opening with no local accounts yet, the
  // game's already-open government accounts provide population-normalized peers.
  const sameKind = donors.filter(
    (row) => row.government.level === candidate.level,
  );
  const comparable = sameKind.length ? sameKind : donors;
  const below = comparable.filter(
    (row) => row.government.population <= target.population,
  );
  const above = comparable.filter(
    (row) => row.government.population >= target.population,
  );
  const lowerPopulation = Math.max(
    ...below.map((row) => row.government.population),
  );
  const upperPopulation = Math.min(
    ...above.map((row) => row.government.population),
  );
  const peers = comparable
    .filter(
      (row) =>
        row.government.population === lowerPopulation ||
        row.government.population === upperPopulation,
    )
    .sort((a, b) => a.government.key.localeCompare(b.government.key));
  if (!peers.length) return null;
  const values = peers.map(
    (row) => (row.spendable / row.government.population) * target.population,
  );
  const { mean, standardDeviation: spread } = spreadOf(values);
  const amountMinorUnits = Math.round(mean);
  if (!Number.isSafeInteger(amountMinorUnits))
    throw new Error("In-game peer cash exceeds the exact money range.");
  return {
    amountMinorUnits,
    spreadMinorUnits: spread,
    peerGovernmentKeys: peers.map((row) => row.government.key),
    peerRecordIds: peers.flatMap((row) => [
      row.account.organizationId,
      row.account.positionId,
    ]),
    sourceNote: `ESTIMATED: averaged from this game's similar government accounts now, with their current spread. Target ${candidate.key}, population ${target.population}. ${sameKind.length ? "Same government kind" : "No same-kind cash yet; existing government cash normalized by saved population"}; nearest population brackets. Mean ${mean} USD minor units; population standard deviation ${spread} USD minor units; no roll. Peers: ${peers.map((row) => `${row.government.key}/${row.government.level}: population=${row.government.population}, spendableCash=${row.spendable}, organization=${row.account.organizationId}, position=${row.account.positionId}`).join("; ")}. This is an estimated opening stock, never a tax receipt or payment.`,
  };
}

/** Materializes the existing researched opening stock once, never a receipt. */
export function ensureOpeningGovernmentAccounts(world: World): World {
  let next = world;
  for (const candidate of budgetCandidates(world).candidates) {
    if (candidate.level !== "state") continue;
    const opening = openGovernmentBudget(
      world,
      candidate,
      makeIsoDate(world.currentDate),
    );
    if (typeof opening === "string") continue;
    const minorUnits = Math.round((opening.balance + opening.reserve) * 100);
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0)
      throw new Error(`Invalid researched opening cash for ${candidate.key}.`);
    next = ensureStateJurisdictionForKey(next, candidate.key);
    next = ensurePublicGovernmentAccount(
      next,
      {
        kind: "jurisdiction",
        jurisdictionId: candidate.jurisdictionId,
      },
      {
        amountMinorUnits: minorUnits,
        sourceNote: `ESTIMATED FROM RESEARCH: opening modeled public cash equals the existing general-fund balance plus rainy-day reserve estimate (${candidate.key}); not an observed treasury cash balance or tax receipt. Source: data/research/money/public-budget-bases.json, derived from government-budgets-2026.json (NASBO fiscal 2026). ${opening.openingNotes.filter((note) => /balance|reserve|island areas/i.test(note)).join(" ")}`,
      },
    );
  }
  // The nation's stock is an existing saved game assumption, not a new level.
  // Without that actual source record, a missing treasury remains unsupported.
  if (
    worldOpeningRecord(world)?.publicCashOpening?.contractVersion ===
    PUBLIC_CASH_OPENING_PROFILE_VERSION
  ) {
    next = ensureNationalElectionJurisdiction(next);
    next = ensurePublicGovernmentAccount(next, {
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    });
  }
  const peersAtOpening = next;
  const hasSavedLocalOpening =
    worldOpeningRecord(world)?.publicCashOpening?.contractVersion ===
    PUBLIC_CASH_OPENING_PROFILE_VERSION;
  for (const candidate of budgetCandidates(next).candidates) {
    if (candidate.level !== "county" && candidate.level !== "city") continue;
    const selection = selectLocalOpeningAccount(next, candidate);
    if (selection.status !== "unique-compiled" && selection.status !== "saved")
      continue;
    const estimate = estimateLocalOpeningCash(peersAtOpening, candidate);
    if (!hasSavedLocalOpening && !estimate) continue;
    next = ensurePublicGovernmentAccount(
      next,
      selection.identity,
      estimate
        ? {
            amountMinorUnits: estimate.amountMinorUnits,
            sourceNote: estimate.sourceNote,
          }
        : undefined,
    );
  }
  return next;
}
