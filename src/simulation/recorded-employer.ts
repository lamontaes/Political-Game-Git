import { historicalWorldInputs } from "./historical-world-inputs";
import { minimumHourlyAt } from "./minimum-wage";
import {
  stateMedianAnnualWage,
  townMinimumHourly,
} from "./living-world/town-pay";
import {
  recordedOccupationWeeklyHours,
  recordedWorkAnnualPay,
} from "./recorded-work-pay";
import type { EntityId, OccupationClassification, World } from "./types";

export const LOCAL_BUSINESS_PLACEHOLDER = {
  researchQuestionId: "businesses-owners-and-wealth",
  currency: "USD",
  /** PLACEHOLDER: a worker's monthly pay where no published wage covers. */
  monthlyWageMinor: 280_000,
} as const;

/**
 * What one of a business's workers is paid a month in `jurisdictionId`: the
 * average comparable active saved pay, otherwise the existing state/national
 * BLS occupational median, never below the minimum wage. The marked
 * placeholder pay where no wage is published for that occupation and area.
 */
export function localBusinessWageMinor(
  kind: {
    readonly workerOccupation: OccupationClassification;
    readonly workerRelationshipId?: EntityId;
  },
  jurisdictionId: EntityId | null,
  world?: World,
  workRelationshipId = kind.workerRelationshipId,
): { readonly monthlyMinor: number; readonly sourced: boolean } {
  const weeklyHours = world
    ? recordedOccupationWeeklyHours(
        world,
        kind.workerOccupation,
        jurisdictionId,
        workRelationshipId,
      )
    : null;
  const recorded =
    world && weeklyHours !== null
      ? recordedWorkAnnualPay(world, {
          occupation: kind.workerOccupation,
          jurisdictionId,
          weeklyHours,
        })
      : null;
  if (recorded)
    return {
      monthlyMinor: Math.round(recorded.annualMinor / 12),
      sourced: true,
    };
  const annual = stateMedianAnnualWage(kind.workerOccupation, jurisdictionId);
  const context = world ? historicalWorldInputs(world.currentDate) : null;
  const datedAnnual =
    annual === null
      ? null
      : annual * (context?.historical ? context.nominalFactor : 1);
  const minimum =
    world && jurisdictionId
      ? minimumHourlyAt(world, jurisdictionId, world.currentDate)
      : townMinimumHourly(jurisdictionId);
  const minimumAnnual =
    minimum !== null && weeklyHours !== null
      ? minimum * weeklyHours * 52
      : null;
  return annual !== null
    ? {
        monthlyMinor: Math.round(
          (Math.max(datedAnnual!, minimumAnnual ?? datedAnnual!) * 100) / 12,
        ),
        sourced: true,
      }
    : {
        monthlyMinor: LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor,
        sourced: false,
      };
}
