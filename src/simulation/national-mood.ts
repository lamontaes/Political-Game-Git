import { campaigns, campaignState } from "./campaign-queries";
import {
  latestSupportState,
  quantityBasisPoints,
  SUPPORT_DENOMINATOR,
} from "./campaign-support";
import { isElectionContestPending } from "./election-contests";
import { currentPresidentOf } from "./crisis/offices";
import { ageOnDate, daysBetween } from "./dates";
import { currentFederalTenure } from "./federal-tenures";
import { nationalOfficeHolder } from "./national-election-consumer";
import { viewOfOfficial } from "./official-view-reads";
import { majorPartyOf } from "./statewide-electorate";
import type { EntityId, IsoDate, World } from "./types";

// Each immutable World counts its people once, rather than once per seat.
const shifts = new WeakMap<World, number>();

export interface PresidentialSupportPeer {
  readonly officialId: EntityId;
  readonly campaignId?: EntityId;
  readonly supportStateId?: EntityId;
  readonly supportMetricId?: EntityId;
  readonly beliefIds: readonly EntityId[];
  readonly voterIds: readonly EntityId[];
  readonly entryRecordId: EntityId | null;
  readonly daysInOffice: number | null;
  readonly favorableShare: number;
}

export interface PresidentialSupportEstimate {
  readonly label:
    | "ESTIMATED: averaged from this game's current official support"
    | "ESTIMATED: averaged from this game's current same-party campaign support";
  readonly adultIds: readonly EntityId[];
  readonly mean: number;
  readonly spread: number;
  readonly peers: readonly PresidentialSupportPeer[];
  readonly comparison:
    | "nearest-recorded-term-stage"
    | "current-official-support"
    | "current-campaign-support";
}

/**
 * Current official support is the comparable measurement already in this
 * World. Prefer the nearest recorded term stage; broaden to current official
 * views when those officials have no entry record. Current same-party campaign shares are used when no other official has a
 * saved view; their contest scope is labeled explicitly. Held presidential views
 * are a last in-game donor, never an outside curve or a made-up spread.
 * Null is an internal empty-pool signal, not a player estimate.
 */
export function presidentialSupportEstimate(
  world: World,
  presidentId: EntityId,
  inauguration: IsoDate,
): PresidentialSupportEstimate | null {
  const adults = [...new Set(world.personOrder)].filter((id) => {
    const person = world.people[id];
    return person && ageOnDate(person.birthDate, world.currentDate) >= 18;
  });
  if (!adults.length) return null;
  const officials = new Set<EntityId>();
  for (const belief of world.history.privateBeliefs)
    if (
      belief.subject?.kind === "official" &&
      belief.formedAt <= world.currentDate
    )
      officials.add(belief.subject.personId);
  const entries = new Map<EntityId, World["history"]["events"][number]>();
  for (const event of world.history.events) {
    if (
      event.type !== "world.office-tenure" ||
      event.occurredAt > world.currentDate
    )
      continue;
    const id = event.participants.find(
      (row) => row.role === "focus:subject",
    )?.personId;
    if (!id) continue;
    const prior = entries.get(id);
    if (
      !prior ||
      event.occurredAt > prior.occurredAt ||
      (event.occurredAt === prior.occurredAt && event.sequence > prior.sequence)
    )
      entries.set(id, event);
  }
  const peers: PresidentialSupportPeer[] = [];
  for (const officialId of officials) {
    const beliefs = adults.flatMap((id) => {
      const belief = viewOfOfficial(world, id, officialId).belief;
      return belief ? [belief] : [];
    });
    if (!beliefs.length) continue;
    const entry = entries.get(officialId);
    peers.push({
      officialId,
      beliefIds: beliefs.map((belief) => belief.id),
      voterIds: beliefs.map((belief) => belief.personId),
      entryRecordId: entry?.id ?? null,
      daysInOffice: entry
        ? daysBetween(entry.occurredAt, world.currentDate)
        : null,
      favorableShare:
        beliefs.filter((belief) => belief.position === "support").length /
        adults.length,
    });
  }
  const others = peers.filter((peer) => peer.officialId !== presidentId);
  // When no other official has a saved view, current active campaigns are
  // another actual in-game support measurement. Their contest shares are
  // labeled estimates, never counted as national adult-contact records.
  const campaignPeers: PresidentialSupportPeer[] = [];
  const seen = new Set<string>();
  const presidentParty = majorPartyOf(world, presidentId, world.currentDate);
  if (!others.length && presidentParty) {
    for (const campaign of campaigns(world)) {
      if (
        campaign.filedAt > world.currentDate ||
        campaignState(world, campaign.id).status !== "active" ||
        !isElectionContestPending(world, campaign.contestId)
      )
        continue;
      for (const scope of campaign.candidateSupportScopes) {
        if (
          scope.candidatePersonId === presidentId ||
          majorPartyOf(world, scope.candidatePersonId, world.currentDate) !==
            presidentParty
        )
          continue;
        const key = `${campaign.supportMetricId}:${scope.segmentKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const state = latestSupportState(world, campaign, scope);
        const entry = entries.get(scope.candidatePersonId);
        campaignPeers.push({
          officialId: scope.candidatePersonId,
          campaignId: campaign.id,
          supportStateId: state.id,
          supportMetricId: campaign.supportMetricId,
          beliefIds: [],
          voterIds: [],
          entryRecordId: entry?.id ?? null,
          daysInOffice: entry
            ? daysBetween(entry.occurredAt, world.currentDate)
            : null,
          favorableShare: quantityBasisPoints(state) / SUPPORT_DENOMINATOR,
        });
      }
    }
  }
  const available = others.length
    ? others
    : campaignPeers.length
      ? campaignPeers
      : peers;
  if (!available.length) return null;
  const dated = available.filter((peer) => peer.daysInOffice !== null);
  const stage = daysBetween(inauguration, world.currentDate);
  const distance = dated.length
    ? Math.min(...dated.map((peer) => Math.abs(peer.daysInOffice! - stage)))
    : null;
  const selected =
    distance === null
      ? available
      : dated.filter(
          (peer) => Math.abs(peer.daysInOffice! - stage) === distance,
        );
  const mean =
    selected.reduce((sum, peer) => sum + peer.favorableShare, 0) /
    selected.length;
  const spread = Math.sqrt(
    selected.reduce((sum, peer) => sum + (peer.favorableShare - mean) ** 2, 0) /
      selected.length,
  );
  return {
    label: campaignPeers.length
      ? "ESTIMATED: averaged from this game's current same-party campaign support"
      : "ESTIMATED: averaged from this game's current official support",
    adultIds: adults,
    mean,
    spread,
    peers: selected,
    comparison:
      distance === null
        ? campaignPeers.length
          ? "current-campaign-support"
          : "current-official-support"
        : "nearest-recorded-term-stage",
  };
}

/**
 * The president's party gains or loses the change in recorded favorable
 * standing since entry into office. Both snapshots use the same recorded
 * adult cohort and each person counts once. Until the president has a new view
 * record, current comparable official shares supply the estimated standing.
 */
export function nationalMoodDemocraticShift(
  world: World,
  electionDate: IsoDate,
): number {
  const year = Number(electionDate.slice(0, 4));
  if (year % 2 !== 0 || year % 4 === 0) return 0;
  const cached = shifts.get(world);
  if (cached !== undefined) return cached;
  const president = currentPresidentOf(world);
  if (!president) return 0;
  const elected = nationalOfficeHolder(world, "president");
  const tenure = elected ? null : currentFederalTenure(world, "us-president");
  const inauguration =
    elected?.succession?.effectiveAt.date ??
    elected?.state.effectiveAt.date ??
    tenure?.startedAt;
  const entrySequence =
    elected?.succession?.sequence ??
    elected?.state.sequence ??
    tenure?.event.sequence;
  if (!inauguration || entrySequence === undefined) return 0;
  const baselineCutoff = {
    asOfDate: inauguration,
    historySequenceExclusive: entrySequence + 1,
  };
  let adults = 0;
  let baseline = 0;
  let current = 0;
  for (const personId of new Set(world.personOrder)) {
    const person = world.people[personId];
    if (!person || ageOnDate(person.birthDate, world.currentDate) < 18)
      continue;
    adults += 1;
    if (
      viewOfOfficial(world, personId, president.personId, baselineCutoff).belief
        ?.position === "support"
    )
      baseline += 1;
    if (
      viewOfOfficial(world, personId, president.personId).belief?.position ===
      "support"
    )
      current += 1;
  }
  const reRecorded = world.history.privateBeliefs.some(
    (belief) =>
      belief.subject?.kind === "official" &&
      belief.subject.personId === president.personId &&
      belief.formedAt <= world.currentDate &&
      (belief.formedAt > inauguration || belief.sequence > entrySequence) &&
      world.people[belief.personId] &&
      ageOnDate(world.people[belief.personId]!.birthDate, world.currentDate) >=
        18,
  );
  if (!reRecorded) {
    const estimate = presidentialSupportEstimate(
      world,
      president.personId,
      inauguration,
    );
    if (estimate) current = estimate.mean * adults;
    // The existing empty-world boundary is not yet an admitted estimate.
    // Do not invent a donor or publish this partial path as READY.
  }
  const change = adults === 0 ? 0 : (current - baseline) / adults;
  if (change === 0) {
    shifts.set(world, 0);
    return 0;
  }
  const party = majorPartyOf(world, president.personId, world.currentDate);
  const shift =
    party === "democratic" ? change : party === "republican" ? -change : 0;
  shifts.set(world, shift);
  return shift;
}
