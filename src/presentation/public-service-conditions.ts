import { proseDate } from "./prose-dates";
import {
  programCapacity,
  programInstallments,
  programOutturns,
  programPosition,
  publicProgramKeys,
} from "../simulation/governing/public-program";
import { publicProgramRecords } from "../simulation/public-program-integrity";
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  PublicProgramBasis,
  World,
} from "../simulation/types";

/**
 * CHANGE's public-service projection (CRUNCH46 00B): how each public
 * service in a place is actually doing, read only from GOVERNING's program
 * records. Nothing here forecasts service quality, fills a gap or moves
 * money; a capacity point exists only where a record put it.
 */

export interface ServiceCapacityPoint {
  readonly date: IsoDate;
  readonly unitsOperational: number;
  readonly unitsTotal: number;
  /** Units out of service: the service's backlog, in its own units. */
  readonly outOfService: number;
  readonly source: "declared" | "after-delivered-work";
  readonly restoredUnits: number | null;
  readonly eventId: EntityId;
}

export interface ServiceFundingFailure {
  readonly date: IsoDate;
  readonly reason: string;
  readonly eventId: EntityId;
}

export interface PublicServiceView {
  readonly programKey: string;
  readonly serviceLabel: string;
  readonly unitLabel: string;
  readonly basis: PublicProgramBasis;
  readonly basisLabel: string;
  readonly capacity: readonly ServiceCapacityPoint[];
  readonly backlog: {
    readonly declared: number;
    readonly now: number;
    readonly change: "reduced" | "unchanged" | "grew";
  };
  /** Declared or observed share of trips completed; never projected. */
  readonly completedPermille: number | null;
  readonly funding: {
    readonly appropriated: MoneyAmount;
    readonly committed: MoneyAmount;
    readonly uncommitted: MoneyAmount;
    readonly posted: MoneyAmount;
    readonly pendingInstallments: number;
    readonly operatingMonthsPosted: string | null;
  };
  readonly failures: readonly ServiceFundingFailure[];
  /** One plain sentence built from the records above. */
  readonly summary: string;
}

const BASIS_LABEL: Readonly<Record<PublicProgramBasis["kind"], string>> = {
  sourced: "From a published source",
  "game-profile": "Set by this world's starting profile",
  "authored-fixture": "Illustrative figures",
};

function programJurisdiction(world: World, programKey: string) {
  return publicProgramRecords(world).find(
    (record) => record.programKey === programKey,
  )?.jurisdictionId;
}

export function projectPublicServiceConditions(
  world: World,
  jurisdictionId: EntityId,
): readonly PublicServiceView[] {
  return publicProgramKeys(world)
    .filter((key) => programJurisdiction(world, key) === jurisdictionId)
    .flatMap((programKey) => {
      const declared = programCapacity(world, programKey);
      if (!declared) return [];
      const capacity: ServiceCapacityPoint[] = [
        {
          date: declared.recordedAt,
          unitsOperational: declared.unitsOperational,
          unitsTotal: declared.unitsTotal,
          outOfService: declared.unitsTotal - declared.unitsOperational,
          source: "declared",
          restoredUnits: null,
          eventId: declared.eventId,
        },
        ...programOutturns(world, programKey)
          .filter((outturn) => outturn.recordedAt >= declared.recordedAt)
          .map((outturn) => ({
            date: outturn.recordedAt,
            unitsOperational: outturn.unitsOperational,
            unitsTotal: declared.unitsTotal,
            outOfService: Math.max(
              0,
              declared.unitsTotal - outturn.unitsOperational,
            ),
            source: "after-delivered-work" as const,
            restoredUnits: outturn.restoredUnits,
            eventId: outturn.eventId,
          })),
      ];
      const first = capacity[0]!;
      const latest = capacity.at(-1)!;
      const change =
        latest.outOfService < first.outOfService
          ? "reduced"
          : latest.outOfService > first.outOfService
            ? "grew"
            : "unchanged";
      const position = programPosition(world, programKey);
      const failures = programInstallments(world, programKey)
        .filter((record) => record.status === "failed")
        .map((record) => ({
          date: record.recordedAt,
          reason: record.reason ?? "The payment could not be made.",
          eventId: record.eventId,
        }));
      const unit = declared.unitLabel;
      const summary =
        latest.outOfService === 0
          ? `All ${latest.unitsTotal} ${unit} were in service as of ${proseDate(latest.date)}.`
          : `${latest.unitsOperational} of ${latest.unitsTotal} ${unit} were in service as of ${proseDate(latest.date)}${
              change === "reduced"
                ? `, up from ${first.unitsOperational} when first recorded`
                : ""
            }.`;
      return [
        {
          programKey,
          serviceLabel: declared.serviceLabel,
          unitLabel: unit,
          basis: declared.basis,
          basisLabel: BASIS_LABEL[declared.basis.kind],
          capacity,
          backlog: {
            declared: first.outOfService,
            now: latest.outOfService,
            change,
          },
          completedPermille: declared.completedPermille,
          funding: {
            appropriated: position.appropriated,
            committed: position.committed,
            uncommitted: position.uncommitted,
            posted: position.posted,
            pendingInstallments: position.pendingInstallments,
            operatingMonthsPosted: position.operatingMonthsPosted,
          },
          failures,
          summary,
        },
      ];
    });
}
