import {
  activeCampaignForCandidate,
  campaignActionResult,
  campaignActions,
  personName,
  requireElectionContest,
  workStatusAt,
} from "../simulation";
import type {
  CampaignActionKind,
  CampaignActionStrategyRecord,
  CampaignRecord,
  CurrencyCode,
  EntityId,
  MoneyAmount,
  World,
} from "../simulation";
import {
  projectCampaign,
  spendPlannedCampaignAction,
} from "./campaign-projection";

/**
 * Feature-local campaign conversation contract.
 *
 * It is deliberately data rather than a second dialogue component: the player
 * surface can render these exact structured choices now, and the shared
 * conversation surface can adopt the same subject later without this feature
 * owning its presentation.
 */

export interface CampaignStrategySpendingChoice {
  readonly key: string;
  readonly label: string;
  readonly explanation: string;
  readonly amount: MoneyAmount;
}

export interface CampaignStrategyPriorityChoice {
  readonly key: CampaignActionKind;
  readonly label: string;
  readonly explanation: string;
  readonly unavailable: string | null;
  readonly spendingChoices: readonly CampaignStrategySpendingChoice[];
}

export interface CampaignStrategyGeographyChoice {
  readonly key: string;
  readonly label: string;
  readonly kind: "jurisdiction" | "district";
  readonly explanation: string;
}

export interface CampaignStrategyProposal {
  readonly subjectKey: string;
  readonly campaignId: EntityId;
  readonly proposerPersonId: EntityId | null;
  readonly proposerName: string;
  readonly attribution: string;
  readonly prompt: string;
  readonly knownSituation: readonly string[];
  readonly caveat: string;
  readonly proposedPriorityKey: CampaignActionKind;
  readonly priorityChoices: readonly CampaignStrategyPriorityChoice[];
  readonly geographyChoices: readonly CampaignStrategyGeographyChoice[];
}

export interface CommitCampaignStrategyInput {
  readonly campaignId: EntityId;
  readonly proposerPersonId: EntityId | null;
  readonly priorityKey: CampaignActionKind;
  readonly geographyKey: string;
  readonly spendingKey: string;
}

export interface CampaignStrategyReport {
  readonly actionId: EntityId;
  readonly attribution: string;
  readonly agreement: "accepted-proposal" | "changed-plan";
  readonly chosenPriorityLabel: string;
  readonly geographyLabel: string;
  readonly approvedSpendCeiling: MoneyAmount;
  readonly actualSpend: MoneyAmount | null;
  readonly outcome: string;
  readonly observedResult: string | null;
}

function money(amount: MoneyAmount): string {
  return `${amount.currency} ${(amount.minorUnits / 100).toFixed(2)}`;
}

function zero(currency: CurrencyCode): MoneyAmount {
  return { minorUnits: 0, currency };
}

function currentStaff(
  world: World,
  campaign: CampaignRecord,
): readonly EntityId[] {
  return campaign.staffWorkRelationshipIds.flatMap((workRelationshipId) => {
    const work = world.history.workRelationships.find(
      (candidate) => candidate.id === workRelationshipId,
    );
    return work && workStatusAt(world, work.id)?.status === "active"
      ? [work.personId]
      : [];
  });
}

function geographyFor(
  world: World,
  campaign: CampaignRecord,
): CampaignStrategyGeographyChoice {
  const contest = requireElectionContest(world, campaign.contestId);
  const binding = contest.office.districtBinding ?? null;
  if (binding) {
    const chamber = binding.chamber.replaceAll("-", " ");
    return {
      key: `district:${binding.vintage}:${binding.chamber}:${binding.geoid}`,
      label: `${binding.stateUsps} ${chamber} district ${binding.geoid}`,
      kind: "district",
      explanation:
        "This is the district identity selected for the contest. The game does not infer precinct detail from it.",
    };
  }
  const label =
    world.jurisdictions[campaign.jurisdictionId]?.name ??
    "the campaign jurisdiction";
  return {
    key: `jurisdiction:${campaign.jurisdictionId}`,
    label,
    kind: "jurisdiction",
    explanation:
      "This is the campaign's represented jurisdiction. No finer campaign geography is established in this save.",
  };
}

function advertisingSpendingChoices(
  treasury: MoneyAmount,
): readonly CampaignStrategySpendingChoice[] {
  if (treasury.minorUnits <= 0) return [];
  const ceilings = [...new Set([10_000, 25_000, treasury.minorUnits])]
    .filter((minorUnits) => minorUnits > 0 && minorUnits <= treasury.minorUnits)
    .sort((left, right) => left - right)
    .slice(0, 3);
  return ceilings.map((minorUnits) => {
    const amount = { minorUnits, currency: treasury.currency };
    return {
      key: `advertising:${minorUnits}`,
      label: money(amount),
      explanation: `Approve a ceiling of ${money(amount)}. The buy spends exactly this amount, if the money is still available at commitment.`,
      amount,
    };
  });
}

function proposedPriority(
  view: ReturnType<typeof projectCampaign>,
): CampaignActionKind {
  if (view.treasury.minorUnits <= 0) return "fundraising";
  return view.reading === null ? "outreach" : "advertising";
}

export function projectCampaignStrategy(
  world: World,
  personId: EntityId,
): CampaignStrategyProposal | null {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) return null;
  const view = projectCampaign(world, personId);
  const staffPersonId = currentStaff(world, campaign).at(0) ?? null;
  const proposerName = staffPersonId
    ? personName(world.people[staffPersonId]!)
    : view.candidateName;
  const proposal = proposedPriority(view);
  const priorityChoices: CampaignStrategyPriorityChoice[] = view.offers.map(
    (offer) => ({
      key: offer.kind,
      label: offer.label,
      explanation: offer.cost,
      unavailable: offer.unavailable,
      spendingChoices:
        offer.kind === "advertising"
          ? advertisingSpendingChoices(view.treasury)
          : [
              {
                key: `${offer.kind}:0`,
                label: "No committee spending",
                explanation:
                  "This choice uses the scheduled time but approves no committee expenditure.",
                amount: zero(view.treasury.currency),
              },
            ],
    }),
  );
  const proposedLabel =
    priorityChoices.find((choice) => choice.key === proposal)?.label ??
    "review the available work";
  const knownSituation = [
    `The committee currently has ${money(view.treasury)}.`,
    view.daysLeft === null
      ? "The campaign has no open work period."
      : `${view.daysLeft} ${view.daysLeft === 1 ? "day remains" : "days remain"} before the recorded election date.`,
    view.reading
      ? `The latest campaign memo is dated ${view.reading.on}.`
      : "The campaign has no field memo yet.",
  ];
  return {
    subjectKey: `campaign-strategy:${campaign.id}`,
    campaignId: campaign.id,
    proposerPersonId: staffPersonId,
    proposerName,
    attribution: staffPersonId
      ? `${proposerName}, an active campaign staff member`
      : `${proposerName}, planning without campaign staff`,
    prompt: `${proposerName} proposes: ${proposedLabel}. Choose the priority, represented geography, and spending ceiling before committing it.`,
    knownSituation,
    caveat:
      "This proposal uses only the committee's records and schedule. It is attributed advice, not hidden electorate truth or a guaranteed result.",
    proposedPriorityKey: proposal,
    priorityChoices,
    geographyChoices: [geographyFor(world, campaign)],
  };
}

export function commitCampaignStrategy(
  world: World,
  personId: EntityId,
  input: CommitCampaignStrategyInput,
): World {
  const proposal = projectCampaignStrategy(world, personId);
  if (!proposal || proposal.campaignId !== input.campaignId) {
    throw new Error("That campaign strategy is no longer available.");
  }
  if (proposal.proposerPersonId !== input.proposerPersonId) {
    throw new Error(
      "The campaign staff situation changed. Review the proposal again.",
    );
  }
  const priority = proposal.priorityChoices.find(
    (choice) => choice.key === input.priorityKey,
  );
  if (!priority || priority.unavailable) {
    throw new Error(priority?.unavailable ?? "That priority is unavailable.");
  }
  const geography = proposal.geographyChoices.find(
    (choice) => choice.key === input.geographyKey,
  );
  if (!geography) {
    throw new Error("That campaign geography is no longer available.");
  }
  const spending = priority.spendingChoices.find(
    (choice) => choice.key === input.spendingKey,
  );
  if (!spending) {
    throw new Error(
      "The committee's funds changed. Choose a current spending ceiling.",
    );
  }
  const strategy: CampaignActionStrategyRecord = {
    proposerPersonId: proposal.proposerPersonId,
    proposedActionKind: proposal.proposedPriorityKey,
    geographyKey: geography.key,
    geographyLabel: geography.label,
    geographyKind: geography.kind,
    approvedSpendCeiling: { ...spending.amount },
  };
  return spendPlannedCampaignAction(world, personId, {
    kind: priority.key,
    spend: priority.key === "advertising" ? { ...spending.amount } : null,
    strategy,
  });
}

function actionLabel(kind: CampaignActionKind): string {
  return kind === "fundraising"
    ? "Fundraising session"
    : kind === "outreach"
      ? "Direct outreach"
      : "Advertising buy";
}

export function projectLatestCampaignStrategyReport(
  world: World,
  personId: EntityId,
): CampaignStrategyReport | null {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) return null;
  const action = [...campaignActions(world, campaign.id)]
    .reverse()
    .find(
      (candidate) =>
        candidate.strategy && campaignActionResult(world, candidate.id),
    );
  if (!action?.strategy) return null;
  const result = campaignActionResult(world, action.id)!;
  const outcome = world.history.events.find(
    (event) => event.id === result.outcomeEventId,
  );
  const feedback = world.history.events.find(
    (event) => event.id === result.feedbackEventId,
  );
  const attribution = action.strategy.proposerPersonId
    ? `${personName(world.people[action.strategy.proposerPersonId]!)} proposed the starting priority.`
    : "The candidate made this plan without campaign staff.";
  return {
    actionId: action.id,
    attribution,
    agreement:
      action.kind === action.strategy.proposedActionKind
        ? "accepted-proposal"
        : "changed-plan",
    chosenPriorityLabel: actionLabel(action.kind),
    geographyLabel: action.strategy.geographyLabel,
    approvedSpendCeiling: { ...action.strategy.approvedSpendCeiling },
    actualSpend: result.spentAmount ? { ...result.spentAmount } : null,
    outcome: outcome?.summary ?? "The campaign action completed.",
    observedResult: feedback?.summary ?? null,
  };
}
