/**
 * The minimum wage as an engine: the day a wage takes effect (or a body finds
 * a job under it), every job in the town paid under the wage now in force is
 * raised to it through the core's own pay seam (`rerateJob`), full workers
 * one by one and the counted workers of each employer together, and each
 * raise is recorded on the law that set the wage and on the act that enacted
 * it (`lawApplied`). The jobs engine reads the same wage when it posts an
 * opening (modules/jobs.ts `wageFloor`), so a later hire is never paid under
 * it either. A repeal writes the old wage back; pay already raised stays.
 */
import { lawApplied } from "./law-reach/applied";
import { countedWeight } from "./law-reach/pay-reach";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { rerateCountedJobs } from "./residents-economy";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState, Source } from "./types";

/**
 * Raise every job in the town paying under the minimum wage now in force.
 * Jobs at an employer outside the town's chain keep their own law.
 */
export function raiseToFloor(
  api: CoreAPI,
  source: Source,
  cause?: WageCause,
): void {
  const core = api.state as CoreState;
  // The act that set the wage taking effect is read once, here: every raise
  // below is credited to it while it stands.
  const governing = lawInForce(api, "minimum-wage").governing;
  const act = cause ?? (governing ? actOf(api, governing) : undefined);
  for (const commitment of [...core.work.commitments.values()])
    raiseOne(api, commitment.id, source, act);
  // The counted residents' jobs in town rise too (two-level population).
  const floor = lawInForce(api, "minimum-wage").value;
  const rt = residentsRuntime(core);
  if (floor === null || !rt) return;
  // Each employer's wage flow is recomputed once; a counted job no wage flow
  // pays (its worker filled in, its flow ended) has no pay here to raise.
  const raised = new Map<string, number>();
  const groups = new Map<string, { count: number; amountMinor: number }>();
  for (const job of rt.jobs.values()) {
    if (job.endsAt !== undefined || (job.hourlyMinor ?? floor) >= floor)
      continue;
    const employer = core.organizations.get(job.organizationId);
    if (
      !employer ||
      (core.visiblePlaceIds.size && !core.visiblePlaceIds.has(employer.placeId))
    )
      continue;
    raised.set(job.id, floor);
    const held = groups.get(employer.id) ?? { count: 0, amountMinor: 0 };
    const weight = countedWeight(core, job.personId);
    // The daily pay the raise adds for this worker.
    groups.set(employer.id, {
      count: held.count + weight,
      amountMinor:
        held.amountMinor +
        (weight * job.wageDailyMinor * (floor - (job.hourlyMinor ?? floor))) /
          (job.hourlyMinor || floor),
    });
  }
  rerateCountedJobs(core, raised);
  // The counted workers a raise reached, by employer: one group each, the
  // people it stands for as its count (the same rule as a full worker's).
  for (const [employerId, g] of groups)
    recordWageReach(
      api,
      {
        targetId: `counted-workers:${employerId}`,
        target: "group",
        count: g.count,
        amountMinor: g.amountMinor,
      },
      act,
    );
}

/** The law whose act set the wage that raised pay, when it is not the wage row alone. */
export interface WageCause {
  readonly key: string;
  readonly lawId: string;
}

/**
 * Record whom the minimum wage in force reached: the wage law itself and,
 * where a policy question's act set that wage (the row it enacted names it),
 * that question too.
 */
function recordWageReach(
  api: CoreAPI,
  who: {
    readonly targetId: string;
    readonly target: "person" | "group";
    readonly count?: number;
    /** The daily pay the raise adds, in minor units. */
    readonly amountMinor: number;
  },
  cause?: WageCause,
): void {
  const governing = lawInForce(api, "minimum-wage").governing;
  if (!governing) return;
  const common = {
    ...who,
    engine: LAWS_MODULE_ID,
    what: "pay-raised-to-minimum-wage",
  };
  lawApplied(api, { ...common, key: "minimum-wage", lawId: governing.id });
  const act = cause ?? actOf(api, governing);
  if (act) lawApplied(api, { ...common, key: act.key, lawId: act.lawId });
}

/**
 * The policy question whose act set the wage in force (the wage row names the
 * act that enacted it), while that act stands: read from the laws engine at
 * the moment the pay is raised, so a repealed act is not credited.
 */
function actOf(api: CoreAPI, governing: LawRowInput): WageCause | undefined {
  const enactedBy = governing.terms?.enactedBy;
  if (typeof enactedBy !== "string") return undefined;
  const row = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(enactedBy) as unknown as LawRowInput | undefined;
  if (!row || row.series === "minimum-wage") return undefined;
  const standing = lawInForce(api, row.series).levels.some(
    (level) => level.row?.value === 1,
  );
  return standing ? { key: row.series, lawId: row.id } : undefined;
}

/**
 * Raise one job to the minimum wage in force where it's paid under it (an
 * enforcement finding, or the law taking effect). Returns whether it rose.
 * Jobs at an employer outside the town's chain keep their own law.
 */
export function raiseOne(
  api: CoreAPI,
  commitmentId: string,
  source: Source,
  cause?: WageCause,
): boolean {
  const answer = lawInForce(api, "minimum-wage");
  const floor = answer.value;
  if (floor === null || !answer.governing) return false;
  const core = api.state as CoreState;
  const town = core.visiblePlaceIds;
  const raises = api.moduleState(LAWS_MODULE_ID).table("raises");
  const commitment = core.work.commitments.get(commitmentId);
  if (!commitment || commitment.hourlyMinor >= floor) return false;
  if (commitment.endsAt !== undefined && commitment.endsAt <= core.date)
    return false;
  const employer = core.organizations.get(commitment.organizationId);
  if (!employer || (town.size && !town.has(employer.placeId))) return false;
  const from = commitment.hourlyMinor;
  const dailyBefore = core.jobs.get(commitment.jobId)?.wageDailyMinor ?? 0;
  // The pay change through the core's own job record.
  api.rerateJob(commitment.jobId, floor, { ...source, asOf: core.date });
  raises.put({
    id: `raise:${commitment.id}:${core.date}`,
    personId: commitment.personId,
    jobId: commitment.jobId,
    date: core.date,
    fromMinor: from,
    toMinor: floor,
    lawId: answer.governing.id,
  });
  recordWageReach(
    api,
    {
      targetId: commitment.personId,
      target: "person",
      amountMinor: from > 0 ? (dailyBefore * (floor - from)) / from : 0,
    },
    cause,
  );
  api.emit({
    id: `minimum-wage-raise:${commitment.id}:${core.date}`,
    date: core.date,
    kind: "pay-raised-to-minimum-wage",
    personIds: [commitment.personId],
    placeId: employer.placeId,
    source,
    facts: {
      jobId: commitment.jobId,
      fromMinor: String(from),
      toMinor: String(floor),
      lawId: answer.governing.id,
    },
  });
  return true;
}
