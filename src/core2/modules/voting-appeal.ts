/**
 * One named voter's appeal for each candidate, on the one appeal function every voter uses: what reached them, their party tie, their tie to a candidate, the incumbent's record and a scandal they know; the contest as the voter sees it; who may vote; and the electorate's sides.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import {
  countedAppeal,
  countedChoice,
  countedResidents,
  liftHeldPledges,
  partyStrength,
  type CountedAppeal,
  countedEndorsed,
  type CountedFieldEntry,
  type EndorsedBy,
  type CountedVoter,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import { feelingBetween } from "../closeness";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "../types";
import { groupStance, personLean, type StanceProfile } from "../campaign-views";
import { campaignParameter, type Stance } from "../campaign-data";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  townLean,
  endorsementsOf,
  impressionOf,
  parsePlatform,
  pledgesOf,
  type DoorVisit,
  type PledgeRow,
} from "./campaigns";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { ballotCuesOf, ballotForms, ballotOrderRule } from "../ballot-order";
import {
  agreementWith,
  countedStanceProfile,
  VIEWS_DATA,
  VIEWS_MODULE_ID,
  viewOf,
  viewOn,
} from "./views";
import { appealOfShare, electorateParameter } from "../electorate-inputs";
import { residentsRuntime } from "./residents";
import { convictionsOf } from "./justice";
import { newsKey, trustWeight } from "./news";
import {
  ageOn,
  barredFromVoting,
  caseWarmthsOf,
  electionsParameter,
  holds,
  partySide,
  promisesOf,
  recordAppeal,
  scandalsOf,
  seatHolder,
  slug,
  town,
  votesCast,
} from "./voting-base";
import type { RecordReason } from "./voting-base";
import { countedScale, countedVoters } from "./voting-count";
import { precinctIndexOf } from "./voting-polling-day";
import { publicReasons } from "./voting-returns";

/**
 * What a candidate stands for, as the voter can know it: the stated platform
 * of a filing, their party, and whether they hold the seat now.
 */
export function candidateFacts(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
) {
  const campaign = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .get(filing.id);
  const platform: readonly Stance[] = campaign
    ? (campaign as unknown as { platform: Stance[] }).platform
    : parsePlatform(filing.platform);
  // The holder of the seat the filing is for (in an at-large race, each
  // candidate's own seat's contest).
  const own =
    filing.contestId === contest.id
      ? contest
      : ((api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(filing.contestId) as unknown as ContestRow | undefined) ??
        contest);
  const isIncumbent = holds(seatHolder(api, own), filing.personId);
  return { platform, party: filing.party ?? null, isIncumbent };
}

/**
 * A full person's own left-right position, -1 to 1: their recorded views
 * (the views engine's lean, -2 very liberal to +2 very conservative, scaled);
 * someone the views engine doesn't hold yet stands where their record ranks
 * them in town (`personLean`).
 */
export function voterLean(api: CoreAPI, voter: Readonly<PersonState>): number {
  if (api.state.modules.has(VIEWS_MODULE_ID)) {
    const view = viewOf(api, voter.id);
    if (view) return view.lean / VIEWS_DATA.parameters.leanMax!.value;
  }
  return personLean(api.state.people, voter, townLean(api));
}

/**
 * The candidates a named voter told at the door they would vote for in this
 * contest, each with how far that word still holds: 1 as given, less by
 * what heavy they learned since (`pledgeDoubt`). Nothing is rolled.
 */
function namedPledges(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  lean: number,
  contestId: string,
  field: readonly CountedFieldEntry[],
): Readonly<Record<string, number>> | undefined {
  // Only a "yes" to a candidate on this ballot counts.
  const pledges = pledgesOf(api, voter.id).filter(
    (p) =>
      p.contestId === contestId && field.some((f) => f.id === p.candidateId),
  );
  if (!pledges.length) return undefined;
  const held: Record<string, number> = {};
  for (const pledge of pledges)
    held[pledge.candidateId] = 1 - pledgeDoubt(api, voter, lean, pledge, field);
  return held;
}

/**
 * How far something heavy the voter learned since their "yes" at the door
 * undoes it, 0 to 1, read from their own records (owner, Oct 29: near-binding
 * unless something heavy changes their mind): a scandal story about the
 * candidate that reached them after they said it, by how far they trust the
 * press; a rival in the race they are closer to than the candidate; and the
 * candidate's promises they heard made that the candidate's votes have broken
 * since. Each slides; none flips.
 */
export function pledgeDoubt(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  lean: number,
  pledge: PledgeRow,
  field: readonly { readonly id: string }[],
): number {
  const scandal = scandalStoriesOf(
    api,
    pledge.candidateId,
    api.state.date,
  ).some(
    (storyId) =>
      (api.knows(voter.id, newsKey(storyId))?.learnedAt ?? "") > pledge.date,
  )
    ? trustWeight(api, lean)
    : 0;
  const own = relationshipWith(api, voter, pledge.candidateId);
  let rival = 0;
  for (const entry of field)
    if (entry.id !== pledge.candidateId)
      rival = Math.max(rival, relationshipWith(api, voter, entry.id) - own);
  const heard = promisesOf(api, pledge.candidateId).filter(
    (status) =>
      status.status !== "open" && api.knows(voter.id, status.promise.id),
  );
  const votes = heard.length
    ? votesCast(api.state as CoreState, pledge.candidateId)
    : [];
  const broken = heard.filter(
    (status) =>
      status.status === "broken" &&
      (votes.find((v) => v.id === status.voteId)?.date ?? "") > pledge.date,
  ).length;
  const brokenShare = heard.length ? broken / heard.length : 0;
  return Math.min(1, Math.max(0, scandal + rival + brokenShare));
}

/**
 * What a counted voter's decided cases left them feeling toward the officials
 * on this ballot (one model, two tiers): the warmth a full person's impression
 * would hold, at the share of the record who brought the case.
 */
export function countedWarmths(
  api: CoreAPI,
  voter: { readonly id: string; readonly weight?: number },
  field: readonly CountedFieldEntry[],
): Readonly<Record<string, number>> | undefined {
  const kept = caseWarmthsOf(api, voter.id);
  const share = 1 / Math.max(1, voter.weight ?? 1);
  let out: Record<string, number> | undefined;
  for (const entry of field) {
    const w = kept[entry.id];
    if (w) (out ??= {})[entry.id] = w * share;
  }
  return out;
}

/**
 * A counted voter's door "yes" in this contest, each held by how far the
 * town's scandal story about the candidate reached the town's people and the
 * voter trusts it: the one heavy reason a counted record can know (it has no
 * ties and hears no promises), times its count like every other term.
 */
export function countedPledges(
  api: CoreAPI,
  voterId: string,
  trust: number,
  contestId: string,
  field: readonly CountedFieldEntry[],
): Readonly<Record<string, number>> | undefined {
  // Only a "yes" to a candidate on this ballot counts.
  const pledges = pledgesOf(api, voterId).filter(
    (p) =>
      p.contestId === contestId && field.some((f) => f.id === p.candidateId),
  );
  if (!pledges.length) return undefined;
  const scandalFull = appealOfShare(electorateParameter("scandalShare"));
  const held: Record<string, number> = {};
  for (const pledge of pledges) {
    const entry = field.find((f) => f.id === pledge.candidateId);
    const reached = scandalFull > 0 ? (entry?.scandal ?? 0) / scandalFull : 0;
    held[pledge.candidateId] = 1 - Math.min(1, Math.max(0, reached * trust));
  }
  return held;
}

/** How a counted record's voters divide among the candidates, before turnout. */
export interface CountedDivision {
  /** The candidate a household that gave its word at a door votes for on it (null where none did, or its word backs no one now). */
  readonly pledged: string | null;
  /** Whether the whole record is that household (it stands for one or fewer). */
  readonly wholePledged: boolean;
  /** Each candidate's voters from the record, pledged household included. */
  readonly votes: Readonly<Record<string, number>>;
}

/**
 * How a counted record's voters divide (one model, two tiers): the record
 * stands for `weight` different residents, so its unpledged voters split by
 * the race's rule (`shares`, from `countedShareRule` once per count; CTO,
 * Nov 1): each candidate's share of their appeal on a ballot without party
 * labels, whole to the first on one with them. A door reaches one household,
 * never the whole record, and its "yes" is near-binding (owner, Oct 29):
 * that household votes whole on its word (first place, `countedChoice`), and
 * where the record stands for several, the others split as they would have
 * without it. A word that something heavy has wholly undone (nothing of it
 * still holds) binds no one: that household divides with the rest.
 */
export function countedDivision(
  appeal: Readonly<Record<string, CountedAppeal>>,
  pledges: Readonly<Record<string, number>> | undefined,
  weight: number,
  without: () => Readonly<Record<string, CountedAppeal>>,
  shares: (
    appeal: Readonly<Record<string, { readonly total: number }>>,
  ) => Readonly<Record<string, number>>,
): CountedDivision {
  const held =
    pledges && Object.values(pledges).some((still) => still > 0)
      ? pledges
      : undefined;
  if (held && weight <= 1) {
    const pledged = countedChoice(appeal);
    return {
      pledged,
      wholePledged: true,
      votes: pledged ? { [pledged]: weight } : {},
    };
  }
  const pledged = held ? countedChoice(appeal) : null;
  const rest = held ? without() : appeal;
  const restWeight = held ? weight - 1 : weight;
  const votes: Record<string, number> = {};
  const parts = shares(rest);
  for (const id of Object.keys(parts)) votes[id] = parts[id]! * restWeight;
  if (pledged) votes[pledged] = (votes[pledged] ?? 0) + 1;
  return { pledged, wholePledged: false, votes };
}

/** How a voter stands with a candidate they know personally, -1 to 1. */
function relationshipWith(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  candidateId: string,
): number {
  if (!voter.knownIds.has(candidateId)) return 0;
  return feelingBetween(api.state, voter.id, candidateId);
}

/** One candidate's appeal to a named voter: the parts every voter weighs, and what only they know. */
export interface NamedAppeal extends CountedAppeal {
  /** Warmth from what reached them (campaign contacts, retellings). */
  readonly warmth: number;
  /** Their agreement with the platform, where a campaign told it to them. */
  readonly agreement: number | null;
  /** The pull of their own party tie, by its strength. */
  readonly partyTie: number;
  /** How they stand with a candidate they know personally. */
  readonly relationship: number;
  /** The incumbent's record as they weigh it, where they know the officeholder. */
  readonly record: number;
  /** How far their door "yes" to this candidate held on the ballot day, where they gave one. */
  readonly pledgeHeld?: number;
}

/**
 * One named voter's appeal for each candidate, on the one appeal function
 * every voter uses (`countedAppeal`): the candidate's party against their own
 * lean, the candidate's public standing, the incumbent side of their traits
 * and what being known brings. A named voter's knowledge is their own, not
 * the town's share: whether they have heard of the candidate and, where a
 * campaign told them the platform, how they agree with it. Only a named voter
 * adds what they personally know: warmth from what reached them, their party
 * tie by its strength, how they stand with a candidate they know, and the
 * incumbent's record as they weigh it in place of the record as the town
 * knows it.
 */
export function appealFor(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  contest: ContestRow,
  filings: readonly FilingRow[],
) {
  const lean = voterLean(api, voter);
  const view = contestView(api, contest, filings);
  const pledgesHeld = namedPledges(api, voter, lean, contest.id, view.field);
  const base = countedAppeal(lean, view.field, {
    inTown: true,
    local: true,
    incumbentLean: incumbentLeanOf(api, voter),
    // The form of the ballot their own precinct prints.
    ballotForm: precinctIndexOf(api, voter),
    // Their faith and degree, where the views engine runs in this world.
    profile: api.state.modules.has(VIEWS_MODULE_ID)
      ? viewOf(api, voter.id)
      : undefined,
    pledges: pledgesHeld,
  });
  const tie = partyTie(api, voter.id);
  let heardPlatform = false;
  const recordReasons: Record<string, readonly RecordReason[]> = {};
  const appeal: Record<string, NamedAppeal> = {};
  for (const entry of view.field) {
    const parts = base[entry.id]!;
    const filing = filings.find((f) => f.personId === entry.id)!;
    const impression = impressionOf(api, voter.id, entry.id);
    const heard =
      entry.id === voter.id ||
      voter.knownIds.has(entry.id) ||
      (impression?.heardOf ?? false);
    const agreement = impression?.knowsPlatform
      ? agreementWith(api, voter.id, lean, entry.platform)
      : null;
    if (agreement !== null) heardPlatform = true;
    // Their own knowledge in place of the town's share of it.
    const recognition = heard
      ? campaignParameter("countedRecognitionWeight") + (agreement ?? 0)
      : 0;
    const warmth = impression?.warmth ?? 0;
    // A party tie pulls toward its own candidate by how firmly it is held.
    const partyTieTerm =
      tie?.tie === "party" &&
      tie.partyId &&
      filing.party &&
      tie.partyId.endsWith(slug(filing.party))
        ? campaignParameter("partyLoyaltyWeight") *
          Math.min(1, Math.abs(tie.lean))
        : 0;
    // The incumbent's record (votes, promises kept or broken), weighed by a
    // voter who knows the officeholder (golden path step 11), in place of
    // the record as the town knows it.
    const weighed =
      entry.isIncumbent && heard
        ? recordAppeal(api, voter, entry.id, lean, true)
        : null;
    recordReasons[entry.id] = weighed?.reasons ?? [];
    const record = weighed ? weighed.total : 0;
    const standing = weighed
      ? parts.standing - (view.publicRecord[entry.id] ?? 0)
      : parts.standing;
    const relationship =
      campaignParameter("ballotRelationshipWeight") *
      relationshipWith(api, voter, entry.id);
    // Their own knowledge of a scandal in place of the town's share of it,
    // weighed by how far they trust the press.
    const scandal = scandalTerm(api, voter.id, entry.id, lean);
    appeal[entry.id] = {
      total:
        parts.party +
        standing +
        parts.incumbent +
        recognition +
        warmth +
        partyTieTerm +
        relationship +
        record +
        parts.ballot +
        scandal +
        parts.pledge,
      party: parts.party,
      standing,
      incumbent: parts.incumbent,
      recognition,
      warmth,
      agreement,
      partyTie: partyTieTerm,
      relationship,
      record,
      ballot: parts.ballot,
      scandal,
      pledge: parts.pledge,
      ...(pledgesHeld?.[entry.id] !== undefined
        ? { pledgeHeld: pledgesHeld[entry.id] }
        : {}),
    };
  }
  // A held door yes keeps its candidate ahead, in proportion to how far it
  // holds: the one rule a counted voter's appeal reads too (`liftHeldPledges`).
  liftHeldPledges(
    appeal as unknown as Record<
      string,
      { total: number; pledge?: number; pledgeLift?: number }
    >,
  );
  const basis: "platform" | "party-name-incumbency" = heardPlatform
    ? "platform"
    : "party-name-incumbency";
  return { appeal, lean, recordReasons, basis };
}

/**
 * What each candidate's place on the printed ballot brings every voter, in
 * appeal units, on each form of the ballot: the first-listed edge, sliding to
 * nothing at the bottom, in the order the place's law sets
 * (`ballot-order.ts`): a primary's ballot on the primary date, the general
 * election's otherwise.
 */
function ballotCues(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): Map<string, number[]> {
  const holder = seatHolder(api, contest);
  const shares = api.state.modules.has(PARTIES_MODULE_ID)
    ? new Map(partiesHere(api).map((p) => [p.name, p.share]))
    : new Map<string, number>();
  const stateKey = town(api).stateKey;
  // Until the race's primary is held, its ballot is the primary's.
  const stage =
    contest.primaryDate && api.state.date <= contest.primaryDate
      ? "primary"
      : "general";
  if (ballotOrderRule(stateKey, stage)?.estimate) {
    // stopgapId: SG-GOV-ballot-order-estimates
    api.stopgap("SG-GOV-ballot-order-estimates");
  }
  const forms = ballotForms({
    stateKey,
    stage,
    contestId: contest.id,
    year: contest.electionDate.slice(0, 4),
    candidates: field.map((f) => ({
      id: f.personId,
      surname: api.state.people.get(f.personId)?.familyName ?? f.personId,
      party: f.party ?? null,
      isIncumbent: holds(holder, f.personId),
      filedOn: f.filedOn,
      filingId: f.id,
    })),
    partyShare: (party) => shares.get(party) ?? 0,
  });
  if (!forms) throw new Error(`No ballot-order law for ${town(api).stateKey}.`);
  return ballotCuesOf(
    forms,
    appealOfShare(electionsParameter("ballotFirstPositionShare")),
  );
}

/**
 * What every voter can know of a contest's ballot, for the day: each
 * candidate as the one appeal function reads them, and the incumbent's record
 * as the town knows it (inside their standing), which a named voter who knows
 * the officeholder replaces with their own weighing.
 */
interface ContestView {
  readonly field: readonly CountedFieldEntry[];
  readonly publicRecord: Readonly<Record<string, number>>;
}

const contestViews = new WeakMap<object, Map<string, ContestView>>();

/** Someone the town's common knowledge of a record is weighed for: no promise heard. */
const TOWN_KNOWLEDGE = { id: "electorate:town" } as unknown as PersonState;

/**
 * What a counted voter can know of each candidate on a contest's ballot: the
 * party label; the candidate's public standing where the race weighs one (a
 * partisan state or federal race), else the incumbent's name and record as
 * the town knows it; and how well known each candidate is in town, for the
 * town's own people.
 */
function contestView(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): ContestView {
  const byKey = contestViews.get(api.state) ?? new Map<string, ContestView>();
  contestViews.set(api.state, byKey);
  const key = `${api.state.date}|${contest.id}|${field.map((f) => f.id).join(",")}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const named = townAdults(api);
  const reasons = publicReasons(api, contest, field);
  const holder = seatHolder(api, contest);
  const publicRecord: Record<string, number> = {};
  const cues = ballotCues(api, contest, field);
  const rows = field.map((f) => {
    const facts = candidateFacts(api, f, contest);
    const heard = named.filter(
      (p) => p.id === f.personId || hasHeardOf(api, p, f.personId),
    ).length;
    const standing = reasons?.find((r) => r.id === f.personId);
    // The record as the town knows it: in a partisan race, the part of the
    // candidate's public standing the record makes; in a local race, the
    // incumbent's votes as a voter at the town's own lean weighs them.
    publicRecord[f.personId] = standing
      ? appealOfShare(standing.record)
      : facts.isIncumbent && holder?.personId
        ? recordAppeal(
            api,
            TOWN_KNOWLEDGE,
            holder.personId,
            townLean(api),
            true,
          ).total
        : 0;
    return {
      id: f.personId,
      // A custom world's party strength scales how hard the label pulls.
      side: partySide(facts.party) * partyStrength(api.state, facts.party),
      isIncumbent: facts.isIncumbent,
      standing: standing
        ? appealOfShare(standing.total)
        : facts.isIncumbent
          ? campaignParameter("incumbentRecognition") +
            publicRecord[f.personId]!
          : 0,
      localStanding: standing ? appealOfShare(standing.local) : 0,
      // The town's share who know the candidate: the named adults who have
      // heard of them and the counted adults the campaign's doors and mail
      // reached, over all the town's adults.
      recognition: townShareKnowing(api, named.length, heard, f.id),
      platform: facts.platform,
      ballotCues: cues.get(f.personId) ?? [],
      // The race's standing carries the average incumbency advantage: the
      // town's average incumbent lean is what each voter's own is read against.
      ...(standing && facts.isIncumbent
        ? { incumbentLeanCenter: townIncumbentLean(api) }
        : {}),
      // A reported scandal as far as its story reached the town's people.
      scandal: scandalAppeal(api, f.personId, named),
      // The groups that backed them, as far as each reached those who share its cause.
      endorsed: endorsedOn(api, f.id),
    };
  });
  const view = { field: rows, publicRecord };
  byKey.set(key, view);
  return view;
}

/**
 * The groups that backed a candidate, each by the stance it stood on and the
 * warmth its word brings a counted voter who holds that stance fully: what it
 * brought each member it reached (`endorsementHeard`: the endorsement weight
 * toward the group's backing), times the share of the town's holders of the
 * stance it reached (its members, among everyone who holds it, by how firmly).
 * A counted voter reads it by how firmly they hold the stance themselves
 * (`countedAppeal`), so the counted share of a cause's people hears it by the
 * same rule as its members, times their count (one model, two tiers).
 */
export function endorsedOn(
  api: CoreAPI,
  filingId: string,
): readonly EndorsedBy[] {
  const out: EndorsedBy[] = [];
  for (const row of endorsementsOf(api, filingId)) {
    if (
      row.answer !== "yes" ||
      !row.organizationId ||
      !row.stance ||
      !row.reached ||
      // A paper's word reaches its readers, not the holders of a cause.
      api.state.organizations.get(row.organizationId as never)?.kind === "media"
    )
      continue;
    const sides = electorateSides(api, row.stance.question);
    const holders = row.stance.position > 0 ? sides.heldYes : sides.heldNo;
    if (holders <= 0) continue;
    out.push({
      question: row.stance.question,
      position: Math.sign(row.stance.position),
      warmth:
        campaignParameter("endorsementWeight") *
        Math.max(-1, Math.min(1, row.score)) *
        Math.min(1, row.reached / holders),
    });
  }
  return out;
}

/**
 * A reported scandal in appeal units, times the share of the town's named
 * adults whose news reached them (the counted adults are read at the same
 * share; a named voter reads their own knowledge). Zero where none was
 * reported or none of it reached anyone.
 */
function scandalAppeal(
  api: CoreAPI,
  candidateId: string,
  named: readonly Readonly<PersonState>[],
): number {
  const stories = scandalStoriesOf(api, candidateId, api.state.date);
  if (!stories.length || !named.length) return 0;
  const reached = named.filter((p) => heardScandal(api, p.id, stories)).length;
  return (
    appealOfShare(electorateParameter("scandalShare")) *
    (reached / named.length)
  );
}

/**
 * The news stories that make a candidate's scandal, by the date: a taken
 * bribe someone reported to the press, and a conviction the court made
 * public. Voters read only the ones that reached them.
 */
export function scandalStoriesOf(
  api: CoreAPI,
  candidateId: string,
  date: string,
): readonly string[] {
  return [
    ...scandalsOf(api, candidateId, date),
    ...convictionsOf(api, candidateId, date).map(
      (row) => `justice.convicted:${row.id}`,
    ),
  ];
}

/**
 * What a voter's own knowledge of a candidate's scandal does to the candidate's
 * appeal with them: negative, weighed by how far they trust the press, only
 * when a story about it reached them (never a flag); zero for everyone else.
 */
export function scandalTerm(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
  lean: number,
): number {
  return heardScandal(
    api,
    voterId,
    scandalStoriesOf(api, candidateId, api.state.date),
  )
    ? -appealOfShare(electorateParameter("scandalShare")) *
        trustWeight(api, lean)
    : 0;
}

/** Whether a scandal story about the candidate reached this person. */
function heardScandal(
  api: CoreAPI,
  personId: string,
  stories: readonly string[],
): boolean {
  return stories.some((storyId) => api.knows(personId, newsKey(storyId)));
}

export function countedField(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): readonly CountedFieldEntry[] {
  return contestView(api, contest, field).field;
}

/** A candidate's recognition in town: the share of the named adults who heard of them, or of all adults counting those the campaign reached, whichever is wider. */
function townShareKnowing(
  api: CoreAPI,
  namedAdults: number,
  namedHeard: number,
  filingId: string,
): number {
  const counted = countedAdultsToday(api);
  const reached = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? ((
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(filingId) as unknown as { countedReached?: number } | undefined
      )?.countedReached ?? 0)
    : 0;
  // The named adults stand for the town as its sample; the counted adults a
  // campaign's doors and mail reached raise that where they reach further.
  const sample = namedAdults ? namedHeard / namedAdults : 0;
  const all = namedAdults + counted;
  const reach = all ? (namedHeard + Math.min(counted, reached)) / all : 0;
  return Math.min(1, Math.max(sample, reach));
}

/** The town's counted adults today. */
export function countedAdultsToday(api: CoreAPI): number {
  const held = countedByDay.get(api.state);
  if (held?.date === api.state.date) return held.n;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  let n = 0;
  for (const v of countedVoters(api))
    if (v.placeId === townPlaceId && ageOn(v, date) >= adultAge) n += v.weight;
  countedByDay.set(api.state, { date, n });
  return n;
}
const countedByDay = new WeakMap<object, { date: string; n: number }>();

/** The town's named adults today, from the place index. */
/**
 * Whether a named person votes in the town's contests on a date, by the
 * count's own rule (the one rule every reader of it uses: the count, the
 * director's polling place, the household who go along): alive, living in
 * the town, of voting age that day, and not barred by the law in force.
 */
export function mayVoteOn(
  api: CoreAPI,
  personId: string,
  date: string,
): boolean {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return false;
  const person = api.state.people.get(personId);
  return Boolean(
    person?.alive &&
    person.placeId === town(api).townPlaceId &&
    ageOn(person, date) >= api.parameter("votingAge") &&
    !barredFromVoting(api, person.id),
  );
}

/** Whether a voter knows a candidate or has heard of them: the town's recognition reads it. */
function hasHeardOf(
  api: CoreAPI,
  voter: PersonState,
  candidateId: string,
): boolean {
  return (
    voter.knownIds.has(candidateId) ||
    (impressionOf(api, voter.id, candidateId)?.heardOf ?? false)
  );
}

/**
 * How many of the town's voters other than the candidate know them or have
 * heard of them, by the same record the town's recognition reads (playtest
 * sitting P34: a race's standing said no one had heard of a player whom
 * people in town knew).
 */
export function votersWhoHeardOf(api: CoreAPI, candidateId: string): number {
  return townAdults(api).filter(
    (voter) => voter.id !== candidateId && hasHeardOf(api, voter, candidateId),
  ).length;
}

export function townAdults(api: CoreAPI): readonly PersonState[] {
  const held = adultsByDay.get(api.state);
  if (held?.date === api.state.date && held.size === api.state.people.size)
    return held.rows;
  const { townPlaceId } = town(api);
  const date = api.state.date;
  const rows = [...(api.state.peopleByPlace.get(townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p && mayVoteOn(api, p.id, date))
    .sort((a, b) => a.id.localeCompare(b.id));
  adultsByDay.set(api.state, {
    date,
    size: api.state.people.size,
    rows,
  });
  return rows;
}
const adultsByDay = new WeakMap<
  object,
  { date: string; size: number; rows: readonly PersonState[] }
>();

const incumbentLeanByDay = new WeakMap<
  object,
  { readonly date: string; readonly mean: number }
>();

/** The town's adults' average incumbent side of their traits, each counted record weighed by the people it stands for. */
export function townIncumbentLean(api: CoreAPI): number {
  const held = incumbentLeanByDay.get(api.state);
  if (held?.date === api.state.date) return held.mean;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  let sum = 0,
    weight = 0;
  for (const voter of countedVoters(api)) {
    if (
      voter.placeId !== townPlaceId ||
      ageOn(voter, api.state.date) < adultAge
    )
      continue;
    sum += incumbentLeanOf(api, voter) * voter.weight;
    weight += voter.weight;
  }
  const mean = weight > 0 ? sum / weight : 0;
  incumbentLeanByDay.set(api.state, { date: api.state.date, mean });
  return mean;
}

/** Each day's counted residents by id, for a door's answer (one map a day). */
const countedById = new WeakMap<
  object,
  { key: string; byId: Map<string, CountedVoter> }
>();

/**
 * Each candidate's appeal to a voter in this contest today, by the same rule
 * the ballot uses (their earlier word at a door included), for a campaign's
 * door to read as the resident's answer (`campaigns.ts` answerAtDoor): a full
 * person's own appeal; a counted resident's by their record, with a door
 * visit just now read as a full person's knowledge is (`appealFor`): they
 * know the candidate and the platform in person, in place of the town's share
 * of it, and the visit's warmth. Null where they are not of voting age or the
 * contest is not on a ballot; undefined where the world counts no ballots.
 */
export function doorAppealOf(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  visit?: DoorVisit,
): Readonly<Record<string, CountedAppeal>> | null | undefined {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return undefined;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow | undefined;
  if (!contest) return null;
  const filings = ballot(api, contestId);
  if (!filings.length) return null;
  const adultAge = api.parameter("votingAge");
  const named = api.state.people.get(voterId);
  if (named) {
    if (!named.alive || ageOn(named, api.state.date) < adultAge) return null;
    return appealFor(api, named, contest, filings).appeal;
  }
  const core = api.state as CoreState;
  const all = countedResidents(core);
  const key = `${core.date}|${all.length}`;
  let held = countedById.get(core);
  if (held?.key !== key) {
    held = { key, byId: new Map(all.map((v) => [v.id, v])) };
    countedById.set(core, held);
  }
  const voter = held.byId.get(voterId);
  if (!voter || ageOn(voter, api.state.date) < adultAge) return null;
  const lean = personLean(api.state.people, voter, townLean(api));
  const field = countedField(api, contest, filings);
  const appeal: Record<string, CountedAppeal> = countedAppeal(lean, field, {
    inTown: true,
    local: true,
    incumbentLean: incumbentLeanOf(api, voter),
    trust: trustWeight(api, lean),
    profile: countedStanceProfile(api, voter),
    pledges: countedPledges(
      api,
      voter.id,
      trustWeight(api, lean),
      contestId,
      field,
    ),
    warmths: countedWarmths(api, voter, field),
    endorsed: countedEndorsed(lean, field, countedStanceProfile(api, voter)),
  });
  const met = visit ? appeal[visit.candidateId] : undefined;
  if (visit && met) {
    const recognition =
      campaignParameter("countedRecognitionWeight") + visit.agreement;
    appeal[visit.candidateId] = {
      ...met,
      recognition,
      total: met.total - met.recognition + recognition + visit.warmth,
    };
  }
  return appeal;
}

/** Who a voter would vote for in this contest today (`doorAppealOf`'s first choice), or null for nobody; undefined where the world counts no ballots. */
export function doorChoiceOf(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  visit?: DoorVisit,
): string | null | undefined {
  const appeal = doorAppealOf(api, voterId, contestId, visit);
  return appeal ? countedChoice(appeal) : appeal;
}

/** The incumbent's side of a voter's traits: stay with the known or try someone new. */
export function incumbentLeanOf(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
): number {
  return (
    decisionTraitWeight(api.state, "voting.back-incumbent") *
    decisionLean(
      api.state,
      voter,
      "voting.back-incumbent",
      "incumbent",
      "challenger",
    )
  );
}

/** A named person's scheduled weekly work, from their commitments. */
export function weeklyWorkOf(state: CoreState, personId: string): number {
  return [...(state.work.commitmentsByPerson.get(personId) ?? [])].reduce(
    (sum, id) =>
      sum + (state.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0),
    0,
  );
}

/** One voter on the roll the election laws are applied to: a named person, or a counted group. */
export interface RollVoter {
  readonly id: string;
  readonly target: "person" | "group";
  /** The people it stands for (a counted group's weight times its citizen scale). */
  readonly count: number;
  readonly birthDate: string;
  readonly traits: Readonly<Record<string, number>>;
  readonly weeklyMinutes: number;
}

/**
 * The town's adults the election laws apply to today: its named adults the
 * state does not bar, and its counted adults, each standing for the people
 * like them who are citizens and not barred.
 */
export function electorateRoll(api: CoreAPI): readonly RollVoter[] {
  const state = api.state as CoreState;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const date = state.date;
  const rows: RollVoter[] = townAdults(api).map((p) => ({
    id: p.id,
    target: "person",
    count: 1,
    birthDate: p.birthDate,
    traits: p.traits,
    weeklyMinutes: weeklyWorkOf(state, p.id),
  }));
  const scale = countedScale(api);
  for (const v of countedVoters(api))
    if (v.placeId === townPlaceId && ageOn(v, date) >= adultAge)
      rows.push({
        id: v.id,
        target: "group",
        count: v.weight * scale,
        birthDate: v.birthDate,
        traits: v.traits,
        weeklyMinutes: v.weeklyMinutes,
      });
  return rows;
}

/** Where the town's electorate stands on a policy question. */
export interface ElectorateSides {
  /** The share whose own stance favors the question's "yes". */
  readonly yes: number;
  /** The share whose own stance opposes it. */
  readonly no: number;
  /** The mean of their stances, -1 to 1, each counted record by the people it stands for. */
  readonly mean: number;
  /**
   * How firmly the electorate holds each side, in people: each voter's
   * stance toward it (0 to 1) times the people they stand for, so the
   * reach of a group's word among those who share its cause reads as a
   * share of them (`endorsedOn`).
   */
  readonly heldYes: number;
  readonly heldNo: number;
}

interface SideVoter {
  readonly id: string;
  readonly named: boolean;
  readonly lean: number;
  readonly profile: StanceProfile | null;
  readonly count: number;
}

const sidesByDay = new WeakMap<
  object,
  {
    /** The day, the people's count and the counted store's members version it was read at. */
    readonly key: string;
    readonly voters: readonly SideVoter[];
    readonly total: number;
    readonly byQuestion: Map<string, ElectorateSides>;
  }
>();

/**
 * Where the town's electorate (`electorateRoll`) stands on a policy question,
 * by the stance the ballot reads a voter's agreement with a platform from: a
 * named adult at their own current view of it (`viewOn`, from `voterLean`,
 * as `appealFor` passes it to `agreementWith`), a counted record at the
 * stance its record gives (`groupStance` from its place in the town's lean
 * order, `personLean`, and its faith and degree, `countedStanceProfile`, as
 * the counted ballot reads it), as many times as the people it stands for
 * (one model, two tiers). The shares on each side and the mean. The policy's
 * national popularity is not added: a voter weighs a platform by their own
 * view alone. The one reader of where the town stands on a question: a
 * candidate's platform weighs the shares (`platformScores`) and an interview
 * answer is shaded toward the mean (`townStand`). Read once a day, until
 * someone is filled in or the people change (as `countedResidents` is kept),
 * and each question once.
 */
export function electorateSides(
  api: CoreAPI,
  question: string,
): ElectorateSides {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID))
    return { yes: 0, no: 0, mean: 0, heldYes: 0, heldNo: 0 };
  const core = api.state as CoreState;
  const key = `${core.date}|${core.people.size}|${residentsRuntime(core)?.store.membersVersion ?? 0}`;
  let held = sidesByDay.get(core);
  if (!held || held.key !== key) {
    const records = new Map(countedResidents(core).map((row) => [row.id, row]));
    const lean0 = townLean(api);
    const voters: SideVoter[] = [];
    let total = 0;
    for (const row of electorateRoll(api)) {
      if (row.target === "person") {
        const person = core.people.get(row.id);
        if (!person) continue;
        voters.push({
          id: row.id,
          named: true,
          lean: voterLean(api, person),
          profile: null,
          count: row.count,
        });
      } else {
        const record = records.get(row.id);
        if (!record) continue;
        voters.push({
          id: row.id,
          named: false,
          lean: personLean(core.people, record, lean0),
          profile: countedStanceProfile(api, record),
          count: row.count,
        });
      }
      total += row.count;
    }
    held = { key, voters, total, byQuestion: new Map() };
    sidesByDay.set(core, held);
  }
  const kept = held.byQuestion.get(question);
  if (kept) return kept;
  let yes = 0,
    no = 0,
    sum = 0,
    heldYes = 0,
    heldNo = 0;
  for (const voter of held.voters) {
    const stance = voter.named
      ? viewOn(api, voter.id, question, voter.lean)
      : groupStance(voter.lean, question, voter.profile);
    if (stance > 0) {
      yes += voter.count;
      heldYes += stance * voter.count;
    } else if (stance < 0) {
      no += voter.count;
      heldNo -= stance * voter.count;
    }
    sum += stance * voter.count;
  }
  const sides: ElectorateSides = held.total
    ? {
        yes: yes / held.total,
        no: no / held.total,
        mean: sum / held.total,
        heldYes,
        heldNo,
      }
    : { yes: 0, no: 0, mean: 0, heldYes: 0, heldNo: 0 };
  held.byQuestion.set(question, sides);
  return sides;
}
