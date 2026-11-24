/**
 * Opt-in opening option (`generatedOpening(place, { staffToCustomers: true })`):
 * a business is staffed to what its customers buy, not to the county's job
 * mix. Its projected sales follow from its payroll; its customers are the
 * town's households and governments (their purchase contracts) plus its
 * industry's sourced share of buyers outside the town. Where those cover only
 * part of the projection, the business keeps that share of its jobs (at
 * least one). Full people keep their jobs; the workers let go join the
 * workers the opening couldn't place. Opening generation only; built so the
 * CTO and the owner can compare closures with and without it.
 */
import outsideMarket from "./data/outside-market.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import type { CoreInput, PersonId } from "./types";

export interface StaffingReceipt {
  organizationId: string;
  coverage: number;
  jobsBefore: number;
  jobsAfter: number;
}

/** Each business's receipts as a share of its projected sales, from the built economy. */
export function customerCoverage(built: CoreInput): Map<string, number> {
  const local = new Map<string, number>();
  for (const row of built.finance?.contracts ?? []) {
    if (row.kind.startsWith("income.") || row.kind.startsWith("funding."))
      continue;
    if (row.kind === "business.sales-input") continue;
    const annual = (row.amountMinor * 12) / (row.periodMonths ?? 1);
    local.set(row.payeeId, (local.get(row.payeeId) ?? 0) + annual);
  }
  const shares = (
    outsideMarket as { shares: Record<string, { value: number }> }
  ).shares;
  const coverage = new Map<string, number>();
  for (const book of built.finance?.businesses ?? []) {
    if (book.annualDemandMinor <= 0) continue;
    coverage.set(
      book.organizationId,
      (local.get(book.organizationId) ?? 0) / book.annualDemandMinor +
        (shares[book.kindId]?.value ?? 0),
    );
  }
  return coverage;
}

/** The opening before its economy, with each under-covered business's extra jobs removed. */
export function staffToCustomers(
  before: CoreInput,
  built: CoreInput,
  keep: ReadonlySet<PersonId>,
): { input: CoreInput; receipts: StaffingReceipt[] } {
  const coverage = customerCoverage(built);
  const drop = new Set<string>();
  const receipts: StaffingReceipt[] = [];
  const jobsByOrg = new Map<string, typeof before.jobs>();
  for (const job of before.jobs)
    jobsByOrg.set(job.organizationId, [
      ...(jobsByOrg.get(job.organizationId) ?? []),
      job,
    ]);
  for (const [organizationId, share] of coverage) {
    if (share >= 1) continue;
    const jobs = jobsByOrg.get(organizationId) ?? [];
    if (!jobs.length) continue;
    const target = Math.max(1, Math.round(jobs.length * share));
    const removable = jobs
      .filter((job) => !keep.has(job.personId))
      .sort((a, b) =>
        stableHash(`staffing:${before.seed}:${a.id}`).localeCompare(
          stableHash(`staffing:${before.seed}:${b.id}`),
        ),
      );
    const cut = removable.slice(0, Math.max(0, jobs.length - target));
    for (const job of cut) drop.add(job.id);
    receipts.push({
      organizationId,
      coverage: share,
      jobsBefore: jobs.length,
      jobsAfter: jobs.length - cut.length,
    });
  }
  if (!drop.size) return { input: before, receipts };
  const dropped = new Set(
    (before.workCommitments ?? [])
      .filter((row) => drop.has(row.jobId))
      .map((row) => row.id),
  );
  return {
    input: {
      ...before,
      jobs: before.jobs.filter((job) => !drop.has(job.id)),
      people: before.people.map((person) =>
        person.jobId && drop.has(person.jobId)
          ? { ...person, jobId: undefined }
          : person,
      ),
      workCommitments: (before.workCommitments ?? []).filter(
        (row) => !dropped.has(row.id),
      ),
      workPayrollCalendars: (before.workPayrollCalendars ?? [])
        .map((row) => ({
          ...row,
          workCommitmentIds: row.workCommitmentIds.filter(
            (id) => !dropped.has(id),
          ),
        }))
        .filter((row) => row.workCommitmentIds.length),
    },
    receipts,
  };
}
