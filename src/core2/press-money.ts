/**
 * An outlet's revenue (OPUS-PEOPLE press): what its audience's subscriptions
 * and the advertising they see bring in, a standing flow from the town's
 * outside customers (advertisers, and the readers' spending the town's
 * records send outside), on the cadence the town's other outside sales are
 * paid.
 */
import { residentsRuntime } from "./modules/residents";
import { addResidentFlow } from "./residents-economy";
import type { CoreAPI, CoreState, Source } from "./types";

/** Starts the outlet's revenue flow; returns its yearly amount (0 when the town has no outside customers). */
export function startOutletRevenue(
  api: CoreAPI,
  input: {
    readonly organizationId: string;
    readonly placeId: string;
    readonly annualMinor: number;
    readonly monthsPerYear: number;
    readonly daysPerYear: number;
    readonly source: Source;
  },
): number {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!rt || input.annualMinor <= 0) return 0;
  // The town's own outside customers, the largest first.
  const model = [...rt.flows.values()]
    .filter(
      (flow) =>
        flow.kind === "outside-sales" &&
        !flow.endedAt &&
        flow.placeId === input.placeId,
    )
    .sort(
      (a, b) => b.amountMinor - a.amountMinor || a.id.localeCompare(b.id),
    )[0];
  if (!model) return 0;
  const id = `outside-sales:press:${input.organizationId}`;
  if (rt.flows.has(id)) return input.annualMinor;
  // One period's share of the year, on the model's own cadence.
  const periodsPerYear =
    model.cadence.kind === "months"
      ? input.monthsPerYear / model.cadence.every
      : input.daysPerYear / model.cadence.every;
  const amountMinor = Math.round(input.annualMinor / periodsPerYear);
  addResidentFlow(core, {
    ...model,
    id,
    payeeId: input.organizationId,
    financeKind: "outside.customer.media",
    amountMinor,
    firstAt: model.nextAt,
    source: input.source,
  });
  return Math.round(amountMinor * periodsPerYear);
}
