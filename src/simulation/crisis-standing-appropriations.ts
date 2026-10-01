import {
  CRISIS_FUNDING_ROWS,
  CRISIS_FUNDING_STATE_SOURCE,
} from "./crisis-response-funding-rows";
import { makeIsoDate } from "./dates";
import {
  programAppropriations,
  recordProgramAppropriation,
} from "./governing/public-program";
import { stateJurisdictionForKey } from "./life-places";
import type { StandingProgramAuthority } from "./law-consequence-types";
import { publicProgramRecords } from "./public-program-integrity";
import { money } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForIdentity,
} from "./tax-policy";
import type { EntityId, IsoDate, World } from "./types";

/** Authority only: no grant receipt, commitment, staff or service is inferred. */
export function ensureCrisisStandingAppropriations(world: World): World {
  let next = world;
  for (const row of CRISIS_FUNDING_ROWS) {
    const jurisdiction = stateJurisdictionForKey(row.placeKey);
    if (!jurisdiction || !next.jurisdictions[jurisdiction.id]) continue;
    if ("unreported" in row.state) continue;
    const identity = {
      kind: "jurisdiction" as const,
      jurisdictionId: jurisdiction.id,
    };
    const programKey = `behavioral-health-crisis-response:${row.placeKey.toLowerCase()}`;
    for (const authority of row.state.stateAdoptedAppropriations) {
      const availableFrom = makeIsoDate(authority.availableFrom);
      const availableThrough = makeIsoDate(authority.availableThrough);
      if (
        next.currentDate < availableFrom ||
        next.currentDate > availableThrough
      )
        continue;
      const edition = `${CRISIS_FUNDING_STATE_SOURCE.sha256}:${authority.fiscalYear}:${availableFrom}:${availableThrough}`;
      if (
        programAppropriations(next, programKey, identity).some((record) =>
          record.stableKey.endsWith(`:appropriation:${edition}`),
        )
      )
        continue;
      next = ensurePublicGovernmentAccount(next, identity);
      const account = publicTaxAccountForIdentity(next, identity);
      if (!account) continue;
      next = recordProgramAppropriation(next, {
        programKey,
        edition,
        jurisdictionId: jurisdiction.id,
        accountOrganizationId: account.organizationId,
        publicGovernmentIdentity: identity,
        amount: money(authority.amountMinorUnits, "USD"),
        availableFrom,
        availableThrough,
        sourceMeasureId: null,
        basis: {
          kind: "sourced",
          note: `${CRISIS_FUNDING_STATE_SOURCE.publisher}; ${CRISIS_FUNDING_STATE_SOURCE.title}; ${CRISIS_FUNDING_STATE_SOURCE.url}; SHA-256 ${CRISIS_FUNDING_STATE_SOURCE.sha256}; ${authority.fiscalYear}: ${authority.sourceQuote}`,
        },
      }).world;
    }
  }
  return next;
}

/**
 * Read the actual saved authority for the existing service handler. This does
 * not resolve attendance, create a service row, or stamp an operating payment
 * as delivery. The shared dispatcher validates this authority against the same
 * saved record and requires its actual appropriation/event source IDs.
 */
export function standingCrisisAuthority(
  world: World,
  appropriationId: EntityId,
  onDate: IsoDate,
): StandingProgramAuthority | null {
  const record = publicProgramRecords(world).find(
    (candidate) => candidate.id === appropriationId,
  );
  if (
    record?.kind !== "appropriation" ||
    !record.programKey.startsWith("behavioral-health-crisis-response:") ||
    record.sourceMeasureId != null ||
    record.basis.kind !== "sourced" ||
    !record.basis.note.trim() ||
    record.recordedAt > onDate ||
    record.availableFrom > onDate ||
    record.availableThrough < onDate
  )
    return null;
  return {
    kind: "standing-program-appropriation",
    appropriationId: record.id,
    programKey: record.programKey,
    jurisdictionId: record.jurisdictionId,
    accountOrganizationId: record.accountOrganizationId,
    publicGovernmentIdentity: record.publicGovernmentIdentity
      ? { ...record.publicGovernmentIdentity }
      : undefined,
    availableFrom: record.availableFrom,
    availableThrough: record.availableThrough,
    sourceBasis: { ...record.basis },
  };
}
