import { campaigns, campaignOpponentRecords } from "./campaign-queries";
import { electionContestById } from "./election-contests";
import { eventById } from "./event-index";
import type { EntityId, IsoDate, World } from "./types";

export interface RecordedOfficeFiler {
  readonly candidatePersonId: EntityId;
  readonly officeKey: string;
  readonly contestId: EntityId;
  readonly filedAt: IsoDate;
  readonly filingEventId: EntityId;
  readonly campaignIds: readonly EntityId[];
  readonly opponentCampaignIds: readonly EntityId[];
  readonly sourceRecordIds: readonly EntityId[];
}

/** Actual dated filings, joined to rival committees through the same person,
 * contest and office. Committee creation is never substituted for filing.
 */
export function filersForOffice(
  world: World,
  officeKey: string,
  asOf: IsoDate,
): readonly RecordedOfficeFiler[] {
  const cutoff = asOf < world.currentDate ? asOf : world.currentDate;
  const rivals = campaignOpponentRecords(world).filter(
    (rival) =>
      rival.createdAt <= cutoff &&
      rival.sequence < world.history.nextSequence &&
      electionContestById(world, rival.contestId)?.office.officeKey ===
        officeKey,
  );
  const rows = new Map<string, RecordedOfficeFiler>();
  for (const campaign of campaigns(world)) {
    const contest = electionContestById(world, campaign.contestId);
    const event = eventById(world, campaign.filingEventId);
    if (
      campaign.officeKey !== officeKey ||
      campaign.filedAt > cutoff ||
      campaign.sequence >= world.history.nextSequence ||
      !contest ||
      contest.office.officeKey !== officeKey ||
      contest.scheduledAt > cutoff ||
      contest.sequence >= world.history.nextSequence ||
      !event ||
      event.occurredAt > cutoff ||
      event.recordedAt > cutoff ||
      event.sequence >= world.history.nextSequence ||
      !world.people[campaign.candidatePersonId]
    )
      continue;
    const key = `${campaign.contestId}:${campaign.candidatePersonId}`;
    const peers = rivals.filter(
      (rival) =>
        rival.contestId === campaign.contestId &&
        rival.candidatePersonId === campaign.candidatePersonId,
    );
    const prior = rows.get(key);
    const earliest =
      prior && prior.filedAt <= campaign.filedAt ? prior : campaign;
    const campaignIds = [
      ...new Set([...(prior?.campaignIds ?? []), campaign.id]),
    ];
    const opponentCampaignIds = [
      ...new Set([
        ...(prior?.opponentCampaignIds ?? []),
        ...peers.map((peer) => peer.id),
      ]),
    ];
    rows.set(key, {
      candidatePersonId: campaign.candidatePersonId,
      officeKey,
      contestId: campaign.contestId,
      filedAt: earliest.filedAt,
      filingEventId: earliest.filingEventId,
      campaignIds,
      opponentCampaignIds,
      sourceRecordIds: [
        ...new Set([
          ...(prior?.sourceRecordIds ?? []),
          campaign.id,
          campaign.filingEventId,
          contest.id,
          ...peers.map((peer) => peer.id),
        ]),
      ],
    });
  }
  return [...rows.values()].sort(
    (left, right) =>
      left.filedAt.localeCompare(right.filedAt) ||
      left.candidatePersonId.localeCompare(right.candidatePersonId),
  );
}

/** Saved rival candidates whose filing date was never recorded. They may be
 * described as recorded candidates, never as people who filed on createdAt.
 */
export function undatedRivalsForOffice(
  world: World,
  officeKey: string,
  asOf: IsoDate,
) {
  const cutoff = asOf < world.currentDate ? asOf : world.currentDate;
  const dated = new Set(
    filersForOffice(world, officeKey, cutoff).map(
      (row) => `${row.contestId}:${row.candidatePersonId}`,
    ),
  );
  return campaignOpponentRecords(world)
    .filter((rival) => {
      const contest = electionContestById(world, rival.contestId);
      return (
        rival.createdAt <= cutoff &&
        rival.sequence < world.history.nextSequence &&
        contest?.office.officeKey === officeKey &&
        contest.scheduledAt <= cutoff &&
        contest.sequence < world.history.nextSequence &&
        world.people[rival.candidatePersonId] !== undefined &&
        !dated.has(`${rival.contestId}:${rival.candidatePersonId}`)
      );
    })
    .map((rival) => ({
      candidatePersonId: rival.candidatePersonId,
      officeKey,
      contestId: rival.contestId,
      filedAt: null,
      sourceRecordIds: [rival.id, rival.contestId],
    }));
}
