/**
 * Whom a law that changes pay reached, recorded where an engine raises a
 * job: a full worker is a person row, and the counted workers of one employer
 * are one group row with the people it stands for as its count, so a counted
 * worker is held to the same rule as a full one (times the count). Call
 * `add` for each job the engine raised, then `flush` once.
 */
import { lawApplied } from "./applied";
import { residentsRuntime } from "../modules/residents";
import type { CoreAPI, CoreState, JobInput } from "../types";

/**
 * The people a counted resident stands for: the count of the household they
 * belong to (1 for anyone who is not counted), as the counted payroll reads it.
 */
export function countedWeight(core: CoreState, personId: string): number {
  const rt = residentsRuntime(core);
  const m = rt?.store.countedMember(personId);
  if (!rt || m === undefined) return 1;
  return rt.store.weightOf(rt.store.households[rt.store.household[m]!]!);
}

export interface PayReach {
  /** `amountMinor`: the daily pay the raise adds for this worker. */
  add(
    job: Pick<JobInput, "id" | "personId" | "organizationId">,
    amountMinor: number,
  ): void;
  flush(): void;
}

export function payReach(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly engine: string;
    readonly what: string;
  },
): PayReach {
  const core = api.state as CoreState;
  const groups = new Map<string, { count: number; amountMinor: number }>();
  return {
    add(job, amountMinor) {
      if (core.jobs.has(job.id))
        lawApplied(api, {
          ...input,
          targetId: job.personId,
          target: "person",
          amountMinor,
        });
      else {
        const weight = countedWeight(core, job.personId);
        const held = groups.get(job.organizationId) ?? {
          count: 0,
          amountMinor: 0,
        };
        groups.set(job.organizationId, {
          count: held.count + weight,
          amountMinor: held.amountMinor + amountMinor * weight,
        });
      }
    },
    flush() {
      for (const [organizationId, g] of groups)
        lawApplied(api, {
          ...input,
          targetId: `counted-workers:${organizationId}`,
          target: "group",
          count: g.count,
          amountMinor: g.amountMinor,
        });
      groups.clear();
    },
  };
}
