import {
  campaignForCandidate,
  campaignOpponentRecords,
  personName,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  campaignSpendingReports,
  type SpendingPurpose,
} from "../simulation/press";
import { displayMoney } from "./money-display";

const PURPOSE_LABELS: Readonly<Record<SpendingPurpose, string>> = {
  advertising: "Advertising",
  "paid-to-candidate": "Paid to the candidate",
  office: "Office rent and utilities",
  printing: "Signs and printing",
  postage: "Postage",
  travel: "Travel",
  events: "Events",
  "phones-and-software": "Phones and software",
  food: "Food",
  "bank-fees": "Bank fees",
  other: "Other spending",
};

export interface SpendingReportLineView {
  readonly key: string;
  readonly date: string;
  readonly payee: string;
  readonly purpose: string;
  readonly amount: string;
  /** Everything the committee has reported spending, through this line. */
  readonly runningTotal: string;
}

export interface SpendingReportView {
  readonly key: string;
  readonly filedOn: string;
  readonly total: string;
  readonly lines: readonly SpendingReportLineView[];
}

export interface CommitteeSpendingView {
  readonly key: string;
  readonly heading: string;
  readonly yours: boolean;
  readonly reports: readonly SpendingReportView[];
}

/**
 * The spending reports filed by the person's own campaign committee and by
 * every committee running against it, newest report first. Public filings,
 * so reading them spends no time and learns nothing private. Read-only.
 */
export function projectCampaignSpendingReports(
  world: World,
  personId: EntityId,
): readonly CommitteeSpendingView[] {
  const campaign = campaignForCandidate(world, personId);
  if (!campaign) return [];
  const committees = [
    { organizationId: campaign.organizationId, candidateId: personId },
    ...campaignOpponentRecords(world)
      .filter((opponent) => opponent.rivalCampaignId === campaign.id)
      .map((opponent) => ({
        organizationId: opponent.committeeOrganizationId,
        candidateId: opponent.candidatePersonId,
      })),
  ];
  return committees.map(({ organizationId, candidateId }) => {
    const reports = campaignSpendingReports(world, organizationId);
    const yours = candidateId === personId;
    const candidate = world.people[candidateId];
    const name = reports.at(-1)?.committeeName;
    return {
      key: organizationId,
      yours,
      heading: yours
        ? "Your committee's spending reports"
        : `${candidate ? personName(candidate) : "A rival"}'s committee${name ? ` (${name})` : ""}`,
      reports: withRunningTotals(reports).reverse(),
    };
  });
}

/**
 * Each report as a reader sees it, oldest first, with every line carrying the
 * committee's total reported spending through that payment.
 */
function withRunningTotals(
  reports: ReturnType<typeof campaignSpendingReports>,
): SpendingReportView[] {
  let running = 0;
  return reports.map((report) => ({
    key: report.eventId,
    filedOn: report.filedAt,
    total: report.lines[0]
      ? displayMoney({
          minorUnits: report.totalMinorUnits,
          currency: report.lines[0].currency,
        })
      : "$0",
    lines: report.lines.map((line) => {
      running += line.amountMinorUnits;
      return {
        key: line.flowId,
        date: line.date,
        payee: line.payee,
        purpose: PURPOSE_LABELS[line.purpose],
        amount: displayMoney({
          minorUnits: line.amountMinorUnits,
          currency: line.currency,
        }),
        runningTotal: displayMoney({
          minorUnits: running,
          currency: line.currency,
        }),
      };
    }),
  }));
}
