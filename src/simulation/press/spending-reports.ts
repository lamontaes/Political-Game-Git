import {
  operatingCategoryOfClassification,
  type OperatingCategory,
} from "../campaign-operating-costs";
import { campaignOpponentRecords, campaigns } from "../campaign-queries";
import { addDays } from "../dates";
import { organizationNameAt } from "../living-world/party-registry";
import { personName } from "../people";
import type { CurrencyCode, EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { PRESS_CONTRACT_VERSION } from "./records";
import { sortedUnique } from "./shared";

/**
 * UNRESEARCHED. When a committee files its spending report and what each line
 * says. A game schedule, not any jurisdiction's filing calendar or line-item
 * rules; filed with the research queue as `campaign-expenditure-reports`. A
 * researched schedule replaces this one under a new version.
 */
export const UNRESEARCHED_SPENDING_REPORTS = {
  version: "campaign-spending-reports-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /** A committee files a report covering its new spending once a month. */
  intervalDays: 30,
} as const;

export const CAMPAIGN_SPENDING_REPORTED_EVENT =
  "campaign-finance.spending-reported";

export type SpendingPurpose =
  "advertising" | "paid-to-candidate" | OperatingCategory | "other";

/** What a payee is paid for, read from its latest profile. */
function vendorCategory(
  world: World,
  organizationId: EntityId,
): OperatingCategory | null {
  let classification: string | null = null;
  for (const record of world.history.organizationProfiles) {
    if (record.organizationId === organizationId)
      classification = record.classification;
  }
  return operatingCategoryOfClassification(classification);
}

export interface SpendingReportLine {
  readonly flowId: EntityId;
  readonly date: IsoDate;
  readonly payee: string;
  readonly purpose: SpendingPurpose;
  readonly amountMinorUnits: number;
  readonly currency: CurrencyCode;
}

export interface SpendingReport {
  readonly eventId: EntityId;
  readonly filedAt: IsoDate;
  readonly committeeName: string;
  readonly candidatePersonId: EntityId;
  readonly lines: readonly SpendingReportLine[];
  readonly totalMinorUnits: number;
}

interface Committee {
  readonly organizationId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly vendorOrganizationId: EntityId;
  readonly jurisdictionId: EntityId | null;
}

function committees(world: World): readonly Committee[] {
  const own = campaigns(world).map((campaign) => ({
    organizationId: campaign.organizationId,
    candidatePersonId: campaign.candidatePersonId,
    vendorOrganizationId: campaign.advertisingVendorOrganizationId,
    jurisdictionId: campaign.jurisdictionId,
  }));
  const rivals = campaignOpponentRecords(world).map((opponent) => ({
    organizationId: opponent.committeeOrganizationId,
    candidatePersonId: opponent.candidatePersonId,
    vendorOrganizationId: opponent.vendorOrganizationId,
    jurisdictionId:
      campaigns(world).find(
        (campaign) => campaign.id === opponent.rivalCampaignId,
      )?.jurisdictionId ?? null,
  }));
  return [...own, ...rivals];
}

/** Every completed payment out of each committee, by committee, oldest first. */
function completedSpending(
  world: World,
  organizationIds: ReadonlySet<EntityId>,
): ReadonlyMap<EntityId, readonly SpendingReportLine[]> {
  const flows = new Map(world.history.resourceFlows.map((f) => [f.id, f]));
  const byCommittee = new Map<EntityId, SpendingReportLine[]>();
  const all = committees(world);
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (outcome.status !== "completed") continue;
    const flow = flows.get(outcome.resourceFlowId);
    if (flow?.source.kind !== "organization") continue;
    const organizationId = flow.source.organizationId;
    if (!organizationIds.has(organizationId)) continue;
    const committee = all.find((row) => row.organizationId === organizationId)!;
    const recipient = flow.recipient;
    const purpose: SpendingPurpose =
      recipient.kind === "person" &&
      recipient.personId === committee.candidatePersonId
        ? "paid-to-candidate"
        : recipient.kind === "organization" &&
            recipient.organizationId === committee.vendorOrganizationId
          ? "advertising"
          : recipient.kind === "organization"
            ? (vendorCategory(world, recipient.organizationId) ?? "other")
            : "other";
    const payee =
      recipient.kind === "person"
        ? world.people[recipient.personId]
          ? personName(world.people[recipient.personId]!)
          : "A person no longer on record"
        : recipient.kind === "organization"
          ? (organizationNameAt(world, recipient.organizationId) ??
            "An unnamed organization")
          : "An unnamed payee";
    const lines = byCommittee.get(organizationId) ?? [];
    lines.push({
      flowId: flow.id,
      date: outcome.occurredAt,
      payee,
      purpose,
      amountMinorUnits: outcome.transferredAmount.minorUnits,
      currency: outcome.transferredAmount.currency,
    });
    byCommittee.set(organizationId, lines);
  }
  return byCommittee;
}

/**
 * Each committee that has spent money not yet on one of its reports files a
 * public spending report once a month: every payment, to whom, for what, and
 * how much. Before this the only public filing was a one-line total of
 * payments to the candidate, so nobody could tell what the rest of the money
 * went to (Maine playtest, 2026-09-22: $38,380.77 left over and no record of
 * where the rest went).
 */
export function produceCampaignSpendingReports(world: World): World {
  const all = committees(world);
  if (all.length === 0) return world;
  const reports = world.history.events.filter(
    (event) => event.type === CAMPAIGN_SPENDING_REPORTED_EVENT,
  );
  const spending = completedSpending(
    world,
    new Set(all.map((committee) => committee.organizationId)),
  );
  let next = world;
  for (const committee of all) {
    const own = reports.filter((event) =>
      event.involvedEntityIds.includes(committee.organizationId),
    );
    const last = own.at(-1);
    if (
      last &&
      addDays(last.occurredAt, UNRESEARCHED_SPENDING_REPORTS.intervalDays) >
        world.currentDate
    )
      continue;
    const reported = new Set(own.flatMap((event) => event.involvedEntityIds));
    const lines = (spending.get(committee.organizationId) ?? []).filter(
      (line) => !reported.has(line.flowId) && line.date <= world.currentDate,
    );
    if (lines.length === 0) continue;
    const total = lines.reduce((sum, line) => sum + line.amountMinorUnits, 0);
    const name =
      organizationNameAt(next, committee.organizationId) ??
      "A campaign committee";
    const count =
      lines.length === 1 ? "one payment" : `${lines.length} payments`;
    next = recordWorldEvent(next, {
      stableKey: `campaign-spending-report:${committee.organizationId}:${world.currentDate}`,
      type: CAMPAIGN_SPENDING_REPORTED_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: committee.jurisdictionId,
      involvedEntityIds: sortedUnique([
        committee.organizationId,
        committee.candidatePersonId,
        ...lines.map((line) => line.flowId),
      ]),
      participants: [
        {
          personId: committee.candidatePersonId,
          role: "focus:candidate",
          detail: "The candidate whose committee filed the report",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        PRESS_CONTRACT_VERSION,
        UNRESEARCHED_SPENDING_REPORTS.version,
        "campaign-finance:spending-report",
        // A routine filing is a record to read, not news by itself: what a
        // reader finds in it reaches the paper through the scrutiny routes.
        "time-neutral",
      ],
      summary: `${name} reported spending ${dollars(total)} in ${count}.`,
      context: {
        location: null,
        socialContext: "Campaign spending report",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return next;
}

function dollars(minorUnits: number): string {
  return `$${(minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The spending reports a committee has filed, oldest first, each with its
 * lines. Public records: anybody can read them. Read-only.
 */
export function campaignSpendingReports(
  world: World,
  committeeOrganizationId: EntityId,
): readonly SpendingReport[] {
  const committee = committees(world).find(
    (row) => row.organizationId === committeeOrganizationId,
  );
  if (!committee) return [];
  const lines = new Map(
    (
      completedSpending(world, new Set([committeeOrganizationId])).get(
        committeeOrganizationId,
      ) ?? []
    ).map((line) => [line.flowId, line]),
  );
  return world.history.events
    .filter(
      (event) =>
        event.type === CAMPAIGN_SPENDING_REPORTED_EVENT &&
        event.involvedEntityIds.includes(committeeOrganizationId),
    )
    .map((event) => {
      const filed = event.involvedEntityIds
        .map((id) => lines.get(id))
        .filter((line): line is SpendingReportLine => line !== undefined)
        .sort((a, b) =>
          a.date === b.date
            ? a.flowId.localeCompare(b.flowId)
            : a.date.localeCompare(b.date),
        );
      return {
        eventId: event.id,
        filedAt: event.occurredAt,
        committeeName:
          organizationNameAt(
            world,
            committeeOrganizationId,
            event.occurredAt,
          ) ?? "A campaign committee",
        candidatePersonId: committee.candidatePersonId,
        lines: filed,
        totalMinorUnits: filed.reduce(
          (sum, line) => sum + line.amountMinorUnits,
          0,
        ),
      };
    });
}
