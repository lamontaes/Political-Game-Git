import { addDays } from "../dates";
import {
  draftLineageComponents,
  draftLineageForMeasure,
} from "../legislation-draft-lineage";
import { currentMeasureProvisions } from "../legislative-politics";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { createOrganization } from "../life";
import { programFamilyTitle } from "./program-families";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { money } from "../resources";
import type {
  EntityId,
  IsoDate,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import {
  PUBLIC_PROGRAM_VERSION,
  programCapacity,
  programPosition,
  recordProgramAppropriation,
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

/** `family:state`, so one state's program is distinct from another's. */
export function governingProgramKey(
  familyKey: string,
  stateUsps: string,
): string {
  return `${familyKey}:${stateUsps.toLowerCase()}`;
}

export interface AdoptedAppropriationInput {
  readonly familyKey: string;
  readonly stateUsps: string;
  readonly jurisdictionId: EntityId;
  readonly amountMinorUnits: number;
  readonly adoptedOn: IsoDate;
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
    input.amountMinorUnits <= 0
  )
    return null;
  const programKey = governingProgramKey(input.familyKey, input.stateUsps);
  const edition = input.edition;
  const next = ensureTaxPublicAccount(world, input.jurisdictionId);
  const account = publicTaxAccountForJurisdiction(next, input.jurisdictionId);
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
    availableThrough: addDays(input.adoptedOn, 364),
    basis: { kind: "game-profile", note: input.basisNote },
    sourceMeasureId: input.sourceMeasureId ?? null,
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
  const state = US_STATE_USPS.find(
    (usps) =>
      stateJurisdictionForKey(`US-${usps}`)?.id === measure.jurisdictionId,
  );
  if (!state) return world;
  const provisions = currentMeasureProvisions(world, measureId);
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
  const components = draftLineageComponents(world, measureId).filter(
    (lineage) => lineage.componentKey !== undefined,
  );
  if (components.length > 0) {
    let next = world;
    for (const lineage of components) {
      const amount = provisions.find(
        (provision) =>
          provision.provisionKey === `${lineage.componentKey}:amount-provided`,
      )?.fiscalExposureMinorUnits;
      if (amount === null || amount === undefined || amount <= 0) continue;
      const written = recordAdoptedAppropriation(next, {
        familyKey: lineage.familyKey,
        stateUsps: state,
        jurisdictionId: measure.jurisdictionId,
        amountMinorUnits: amount,
        adoptedOn,
        edition: `${editionBase}-${lineage.componentKey}`,
        basisNote: `${PROGRAM_GOVERNING_VERSION}: adopted by the '${lineage.componentKey}' part of ${measure.designation}, ${measure.shortTitle}. The amount is that part's own enacted clause.`,
        sourceMeasureId: measureId,
      });
      next = written?.world ?? next;
    }
    return next;
  }

  const amount = provisions.find(
    (provision) => provision.provisionKey === "amount-provided",
  )?.fiscalExposureMinorUnits;
  if (amount === null || amount === undefined || amount <= 0) return world;
  const lineage = draftLineageForMeasure(world, measureId);
  const familyKey = lineage?.familyKey ?? "appropriations";
  const written = recordAdoptedAppropriation(world, {
    familyKey,
    stateUsps: state,
    jurisdictionId: measure.jurisdictionId,
    amountMinorUnits: amount,
    adoptedOn,
    edition: editionBase,
    basisNote: `${PROGRAM_GOVERNING_VERSION}: adopted by ${measure.designation}, ${measure.shortTitle}. The amount is the enacted clause's own figure.`,
    sourceMeasureId: measureId,
  });
  return written?.world ?? world;
}

/** The organization the money is paid to when an office commits a program. */
export function programOperatorOrganization(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
): { world: World; organizationId: EntityId } {
  const stableKey = `${PROGRAM_GOVERNING_VERSION}:operator:${programKey}`;
  const existing = world.history.organizations.find(
    (row) => row.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  const title = programFamilyTitle(programKey.split(":")[0]!) ?? "public work";
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: `${PROGRAM_GOVERNING_VERSION}: fictional provider carrying out ${title.toLowerCase()} under this appropriation. It holds no seeded money.`,
    },
    initialProfile: {
      name: `${title} provider`,
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return {
    world: next,
    organizationId: next.history.organizations.at(-1)!.id,
  };
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
  const capacity = programCapacity(world, appropriation.programKey);
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
): readonly PublicProgramAppropriationRecord[] {
  return (world.history.publicProgramRecords ?? []).filter(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" &&
      record.jurisdictionId === jurisdictionId &&
      record.availableThrough >= world.currentDate &&
      programPosition(world, record.programKey, record.id).uncommitted
        .minorUnits > 0,
  );
}

export { PUBLIC_PROGRAM_VERSION };
