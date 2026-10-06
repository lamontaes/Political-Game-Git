import { ensurePeopleTraitCatalog, ensurePeopleTraits } from "../people-traits";
import { nationalMoodDemocraticShift } from "../national-mood";
import { candidacyPackById } from "../candidacy-packs";
import { addDays, makeIsoDate } from "../dates";
import { decideAnotherTerm } from "../careers/another-term";
import { legislativeTermDates } from "../legislative-office-terms";
import {
  createOrganizationParticipations,
  createWorkRelationships,
  recordWorkStatus,
} from "../life";
import type {
  CreateOrganizationParticipationInput,
  CreateWorkRelationshipInput,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { workStatusAt } from "../life-queries";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { createStableId } from "../ids";
import { bindingFromIdentity } from "../../districts/query";
import {
  legislativeTermLimitBar,
  LEGISLATIVE_TERM_LIMIT_QUESTION,
} from "./state-legislative-term-limits";
import { lawInForce } from "../governing/law-in-force";
import { lawEffectStamp } from "../law-effect-stamp";
import { applyStateElectionLawLandings } from "../law-consequences/modules/election-state-landings";
import { clampShare, logit, logistic } from "../world-setup/deterministic-math";
import {
  isStateLegislativeSeatDue,
  stateLegislativeElectionRule,
} from "./state-legislative-election-calendar";
import {
  generalElectionDay,
  isElectionYear,
} from "./state-executive-term-rules";
import {
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
  planStateChambers,
  campaignSeatHolders,
  seatTenureMatch,
  stateLegislativeSeats,
  stateSeatsInDistrict,
} from "./state-legislature-opening";
import {
  electionContestResult,
  resolveElectionContest,
  scheduleElectionContest,
} from "../election-contests";
import { fieldIntakeDay, filingWindowOpens } from "../nominations/field-entry";
import { nominationPlan } from "../nominations/nomination-rules";
import { holdFiledNominations } from "../nominations/party-nominations";
import {
  prepareStateCandidateSlates,
  stateCandidateIntakeDay,
  stateCandidateSeatKey,
  stateCandidateSlate,
  stateGeneralCandidates,
  stateSeatDemocraticShare,
  stateSlateKey,
  STATE_LEGISLATURE_CANDIDATE_PROFILE,
  type StateCandidateSeatPlan,
} from "./state-legislature-candidates";
import {
  hasStableKey,
  recordByStableKey,
  recordsByKey,
  recordsWithFieldValue,
  withHistoryAppendTransaction,
} from "../history-index";

/**
 * STATE LEGISLATIVE CONTINUITY: the regular elections for the chambers an
 * opening seated.
 *
 * Before this, the members seated when a life began served until they died,
 * and nothing filled their seats. After sixteen years a 151-seat House listed
 * 103 members. Time now carries each seat forward:
 *
 * - On the state's regular legislative election day, only the seats due under
 *   `state-legislative-election-calendar.ts` are decided,
 *   and one public results record names the winners.
 * - When the new term begins (`legislativeTermDates`: the sourced date where
 *   there is one, otherwise January 1 after the election) a member leaving
 *   the seat stops serving and the new member starts.
 *
 * Only dates the clock actually crosses act: reading or reopening a save
 * writes nothing, and a save that already passed an election keeps its
 * record.
 *
 * Fictional prospects and incumbent decisions are recorded before the
 * election. The result names a living candidate from that saved slate. A
 * slate with no living candidate leaves a dated vacancy at term start.
 * The intake timing, retirement preferences and bounded swing around the
 * opening's saved generated seat view are explicit game profiles, not
 * research or a forecast. Primaries and vote counts are not modeled.
 *
 * A seat with a campaign on the ballot (the player's own, filed for their
 * district) is left to that campaign: it is not drawn here, and when the term
 * begins its winner holds the seat and the member they replace stops serving.
 * A campaign's winner serves out their own term, and the seat is not drawn
 * while it runs; when it ends, a member who did not file again leaves it.
 */

export const STATE_LEGISLATURE_TURNOVER_VERSION =
  "state-legislature-turnover/v1" as const;
const V = STATE_LEGISLATURE_TURNOVER_VERSION;

export const STATE_LEGISLATURE_TURNOVER_PROFILE = {
  id: "ocd-state-legislature-turnover-game-profile/v3",
  // ESTIMATED FROM COMPARABLE LEGISLATURES: 0.18 logit is a modest incumbency
  // adjustment, bounded against lower-chamber contests in California,
  // Illinois, New York, Ohio, and Texas. A seat's recorded count still decides.
  incumbencyBonusLogit: 0.18,
} as const;

export const STATE_LEGISLATIVE_RESULTS_EVENT =
  "election.state-legislative-general-results";

const OPENING_EVENT = "world.state-legislature-opening";

const resultsKey = (packId: string, electionDay: IsoDate) =>
  `${V}:${packId}:results:${electionDay}`;

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** The candidacy packs whose legislatures an opening seated in this save. */
function seatedPacks(world: World): string[] {
  const packs: string[] = [];
  for (const event of recordsWithFieldValue(
    world.history.events,
    "type",
    OPENING_EVENT,
  )) {
    if (!event.tags.includes(STATE_LEGISLATURE_OPENING_VERSION)) continue;
    const packId = tagValue(event, "pack:");
    if (packId && !packs.includes(packId)) packs.push(packId);
  }
  return packs;
}

interface SeatOutcome {
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  readonly party: string | null;
  /** The sitting member who keeps the seat, or null for a new member. */
  readonly returningPersonId: EntityId | null;
  /** The member leaving the seat, if one is sitting. */
  readonly leavingPersonId: EntityId | null;
  readonly electedPersonId: EntityId;
}

const termStartOf = (officeKey: string, electionDay: IsoDate) =>
  legislativeTermDates(officeKey, electionDay)?.startsAt ??
  makeIsoDate(`${Number(electionDay.slice(0, 4)) + 1}-01-01`);

/** One regular ballot boundary for intake, result and future-seat queries. */
function regularSeatsDue(world: World, packId: string, year: number) {
  const pack = candidacyPackById(packId);
  if (!pack) return [];
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  return stateLegislativeSeats(world, packId).filter((seat) =>
    isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year),
  );
}

/** Assign recorded district contests to exact seats in multi-seat districts. */
function contestedStateSeats(
  world: World,
  packId: string,
  electionDay: IsoDate,
): Map<string, EntityId> {
  const pack = candidacyPackById(packId);
  const contested = new Map<string, EntityId>();
  if (!pack) return contested;
  const holders = campaignSeatHolders(world, packId);
  const heldThrough = (officeKey: string, ordinal: number) =>
    holders
      .filter((h) => h.officeKey === officeKey && h.ordinal === ordinal)
      .reduce<IsoDate | null>(
        (latest, h) =>
          latest === null || h.endsAt > latest ? h.endsAt : latest,
        null,
      );
  const contests = (world.history.electionContests ?? [])
    .filter(
      (contest) =>
        contest.electionDate === electionDay &&
        contest.office.districtBinding &&
        pack.offices.some(
          (office) => office.officeKey === contest.office.officeKey,
        ),
    )
    .sort((a, b) => a.sequence - b.sequence);
  for (const contest of contests) {
    const officeKey = contest.office.officeKey;
    const open = stateSeatsInDistrict(
      packId,
      officeKey,
      contest.office.districtBinding!.recordId,
    ).filter((seat) => !contested.has(`${officeKey}|${seat.ordinal}`));
    const seat =
      open.find((candidate) =>
        holders.some(
          (holder) =>
            holder.officeKey === officeKey &&
            holder.ordinal === candidate.ordinal &&
            contest.candidatePersonIds.includes(holder.personId),
        ),
      ) ??
      open.find((candidate) => {
        const through = heldThrough(officeKey, candidate.ordinal);
        return (
          through === null || through <= termStartOf(officeKey, electionDay)
        );
      });
    if (seat) contested.set(`${officeKey}|${seat.ordinal}`, contest.id);
  }
  return contested;
}

function stateIntentKey(seatKey: string, year: number): string {
  return `${V}:seeking:${seatKey}:${year}`;
}

function prepareStateIntake(
  world: World,
  packId: string,
  electionDay: IsoDate,
  due: readonly {
    readonly officeKey: string;
    readonly ordinal: number;
    readonly intakeDate: IsoDate;
  }[],
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction || due.length === 0) return world;
  const year = Number(electionDay.slice(0, 4));
  const contested = contestedStateSeats(world, packId, electionDay);
  const chamberPlans = planStateChambers(pack).chambers;
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const seats = new Map(
    stateLegislativeSeats(world, packId).map((seat) => [
      `${seat.officeKey}|${seat.ordinal}`,
      seat,
    ]),
  );
  const campaignHolders = campaignSeatHolders(world, packId);
  const plans: StateCandidateSeatPlan[] = [];
  // Seed once before the decision loop, keeping each actor's original date.
  // Only actors whose original route would ask for a decision are included.
  const seedDates = new Map<EntityId, IsoDate>();
  for (const row of due) {
    const localKey = `${row.officeKey}|${row.ordinal}`;
    const seat = seats.get(localKey);
    if (contested.has(localKey) || !seat) continue;
    const through = campaignHolders
      .filter(
        (holder) =>
          holder.officeKey === row.officeKey && holder.ordinal === row.ordinal,
      )
      .reduce<IsoDate | null>(
        (latest, holder) =>
          latest === null || holder.endsAt > latest ? holder.endsAt : latest,
        null,
      );
    if (through !== null && through > termStartOf(row.officeKey, electionDay))
      continue;
    const seatKey = stateCandidateSeatKey(packId, row.officeKey, row.ordinal);
    if (stateCandidateSlate(world, seatKey, year)) continue;
    const id = seat.member?.personId;
    if (
      !id ||
      !world.people[id] ||
      (world.control.kind === "person" && world.control.personId === id)
    )
      continue;
    if (
      recordsWithFieldValue(world.history.personDeaths, "personId", id).some(
        (death) => death.diedAt <= row.intakeDate,
      )
    )
      continue;
    const term = legislativeTermDates(row.officeKey, electionDay);
    if (
      term &&
      legislativeTermLimitBar(world, {
        stateUsps: pack.jurisdictionKey.replace(/^US-/, ""),
        packId,
        officeKey: row.officeKey,
        personId: id,
        termStartsAt: term.startsAt,
        termEndsAt: term.endsAt,
      }) !== null
    )
      continue;
    if (
      recordByStableKey(
        world.history.decisionTraces,
        `${stateIntentKey(seatKey, year)}:decision:trace`,
      )
    )
      continue;
    if (!seedDates.has(id))
      seedDates.set(
        id,
        row.intakeDate < world.currentDate ? row.intakeDate : world.currentDate,
      );
  }
  let next = seedDates.size
    ? withHistoryAppendTransaction(
        ensurePeopleTraitCatalog(world),
        ["personalityTendencies"],
        (prepared) =>
          ensurePeopleTraits(prepared, [...seedDates.keys()], seedDates),
      )
    : world;
  for (const row of due) {
    const localKey = `${row.officeKey}|${row.ordinal}`;
    if (contested.has(localKey)) continue;
    const seat = seats.get(localKey);
    if (!seat) continue;
    const through = campaignHolders
      .filter(
        (holder) =>
          holder.officeKey === row.officeKey && holder.ordinal === row.ordinal,
      )
      .reduce<IsoDate | null>(
        (latest, holder) =>
          latest === null || holder.endsAt > latest ? holder.endsAt : latest,
        null,
      );
    if (through !== null && through > termStartOf(row.officeKey, electionDay))
      continue;
    const seatKey = stateCandidateSeatKey(packId, row.officeKey, row.ordinal);
    if (stateCandidateSlate(next, seatKey, year)) continue;
    const incumbentId = seat.member?.personId ?? null;
    const incumbent = incumbentId ? next.people[incumbentId] : undefined;
    const alive =
      incumbentId !== null &&
      !recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        incumbentId,
      ).some((death) => death.diedAt <= row.intakeDate);
    const controlled =
      incumbentId !== null &&
      next.control.kind === "person" &&
      next.control.personId === incumbentId;
    let seeking = false;
    let decisionTraceId: EntityId | null = null;
    const nextTerm = legislativeTermDates(row.officeKey, electionDay);
    // Whether the member MAY stand is the state's term limit under the law
    // in force; whether they WANT to is their own decision below.
    const barredByLimit =
      incumbent && alive && nextTerm
        ? legislativeTermLimitBar(next, {
            stateUsps: pack.jurisdictionKey.replace(/^US-/, ""),
            packId,
            officeKey: row.officeKey,
            personId: incumbent.id,
            termStartsAt: nextTerm.startsAt,
            termEndsAt: nextTerm.endsAt,
          })
        : null;
    if (incumbent && alive && !controlled && barredByLimit === null) {
      const key = `${stateIntentKey(seatKey, year)}:decision`;
      const decided = decideAnotherTerm(next, {
        personId: incumbent.id,
        traitsPrepared: seedDates.has(incumbent.id),
        stableKey: key,
        subjectKey: seatKey,
        decisionType: "election.consider-another-state-legislative-term",
        onDate: row.intakeDate,
        termEnds:
          nextTerm?.endsAt ??
          makeIsoDate(`${Number(electionDay.slice(0, 4)) + 3}-01-01`),
        serving: [
          {
            stableKey: `${key}:serving`,
            optionKey: "seek",
            sourceType: "context:current-office",
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation: "They are serving in this seat.",
            sourceRefs: [],
          },
        ],
      });
      next = decided.world;
      decisionTraceId = decided.decisionTraceId;
      seeking = decided.seeks;
    }
    const intentKey = stateIntentKey(seatKey, year);
    if (!hasStableKey(next.history.events, intentKey)) {
      const question = barredByLimit
        ? Object.values(next.policyCatalog.propositions).find(
            (candidate) =>
              candidate.stableKey === LEGISLATIVE_TERM_LIMIT_QUESTION,
          )
        : null;
      const law = question
        ? lawInForce(next, jurisdiction.id, question.id, row.intakeDate)
        : null;
      const stamp =
        law?.answer === "yes"
          ? lawEffectStamp(law, {
              effectKind: "election.state-legislative-candidacy-intent",
              questionKey: LEGISLATIVE_TERM_LIMIT_QUESTION,
              jurisdictionId: jurisdiction.id,
              appliedAt: row.intakeDate,
            })
          : null;
      next = recordWorldEvent(next, {
        ...(stamp ? { lawEffectStamps: [stamp] } : {}),
        stableKey: intentKey,
        type: "election.state-legislative-candidacy-intent",
        occurredAt: row.intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId: jurisdiction.id,
        involvedEntityIds: [bodyId, ...(incumbentId ? [incumbentId] : [])],
        participants: incumbentId
          ? [
              {
                personId: incumbentId,
                role: "focus:subject",
                detail: seeking ? "seeking" : "not-seeking",
              },
            ]
          : [],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          V,
          STATE_LEGISLATURE_TURNOVER_PROFILE.id,
          `seat:${seatKey}`,
          `intent:${seeking ? "seeking" : "not-seeking"}`,
          ...(barredByLimit ? ["barred:term-limit"] : []),
          ...(seeking
            ? ["qualification:incumbent-provisional-game-profile"]
            : []),
          ...(decisionTraceId ? [`decision-trace:${decisionTraceId}`] : []),
        ],
        summary: seeking
          ? `The holder of ${seat.title} is seeking another term.`
          : barredByLimit
            ? `The holder of ${seat.title} may not seek another term: ${barredByLimit}`
            : incumbentId
              ? `The holder of ${seat.title} is not seeking another term.`
              : `No sitting member is seeking ${seat.title}.`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      if (stamp) {
        next = applyStateElectionLawLandings(
          next,
          next.history.events[next.history.events.length - 1]!.id,
        );
      }
    }
    const office = pack.offices.find(
      (candidate) => candidate.officeKey === row.officeKey,
    );
    // ESTIMATED FROM COMPARABLE LOWER CHAMBERS: age 21 is the prospect floor
    // used when no rule has loaded, based on California, Illinois, New York,
    // Ohio, and Texas. It is not a finding of legal eligibility.
    const minimumAge =
      office?.qualification.minimumAge.kind === "known"
        ? office.qualification.minimumAge.value
        : STATE_LEGISLATURE_CANDIDATE_PROFILE.unknownMinimumAge;
    plans.push({
      packId,
      jurisdictionKey: pack.jurisdictionKey,
      officeKey: row.officeKey,
      ordinal: row.ordinal,
      title: seat.title,
      minimumAge,
      usesGeneratedResidencyRule:
        office?.qualification.residency.kind === "known" &&
        office.qualification.residency.source?.authority === "game-profile",
      districtBinding: (() => {
        const district = chamberPlans.find(
          (chamber) => chamber.officeKey === row.officeKey,
        )?.districts[row.ordinal - 1];
        return district ? bindingFromIdentity(district) : null;
      })(),
      democraticShare: stateSeatDemocraticShare(
        next,
        packId,
        row.officeKey,
        row.ordinal,
      ),
      incumbentPersonId: incumbentId,
      incumbentParty: seat.member?.party ?? null,
      incumbentSeeking: seeking,
      intakeDate: row.intakeDate,
      nomination: stateNominationPlan(next, pack.jurisdictionKey, year),
    });
  }
  return prepareStateCandidateSlates(next, year, plans);
}

/** Election day: the regular seats due in these chambers are decided. */
/**
 * The ballot is set when military and overseas ballots go out, 45 days before
 * a federal general election (52 U.S.C. § 20302(a)(8)); a state prints one
 * ballot, so its legislative races are set the same day. GAME ASSUMPTION for
 * a state that elects its legislature in an odd year, where that federal
 * deadline does not bind: the same 45 days.
 */
export const STATE_BALLOT_SET_DAYS = 45;

const stateBallotKey = (seatKey: string, year: number) =>
  `${V}:ballot:${seatKey}:${year}`;

/**
 * Whether any state ballot for this year (in one pack, when named) is already
 * set. Ballots open once, on the day they are set; a game that opens after
 * that day sets them on its first day instead.
 */
function stateBallotsSet(world: World, year: number, packId?: string): boolean {
  const prefix = `${V}:ballot:${packId ? `${packId}|` : ""}`;
  const suffix = `:${year}`;
  return (world.history.electionContests ?? []).some(
    (contest) =>
      contest.stableKey.startsWith(prefix) &&
      contest.stableKey.endsWith(suffix),
  );
}

/**
 * Each seat due this year whose nominees stand under different parties gets a
 * ballot of its own, counted on election day from the seat's voters
 * (`stateSeatElectorate`). A seat a campaign already holds on this ballot, a
 * field with two nominees of one party (a top-two primary's general), or a
 * seat with no recorded lean keeps the legislature's own decision below.
 */
function openStateBallots(
  world: World,
  packId: string,
  electionDay: IsoDate,
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const year = Number(electionDay.slice(0, 4));
  const contested = contestedStateSeats(world, packId, electionDay);
  let next = world;
  for (const seat of regularSeatsDue(world, packId, year)) {
    if (contested.has(`${seat.officeKey}|${seat.ordinal}`)) continue;
    const seatKey = stateCandidateSeatKey(packId, seat.officeKey, seat.ordinal);
    const stableKey = stateBallotKey(seatKey, year);
    if (hasStableKey(next.history.electionContests ?? [], stableKey)) continue;
    const nominees = stateGeneralCandidates(next, seatKey, year).filter(
      (candidate) =>
        !recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          candidate.personId,
        ).some((death) => death.diedAt <= next.currentDate),
    );
    const parties = nominees.map((candidate) => candidate.party);
    if (
      nominees.length === 0 ||
      parties.some((party) => party === null) ||
      new Set(parties).size !== parties.length ||
      stateSeatDemocraticShare(next, packId, seat.officeKey, seat.ordinal) ===
        null
    )
      continue;
    next = scheduleElectionContest(next, {
      stableKey,
      jurisdictionId: jurisdiction.id,
      office: {
        officeKey: seat.officeKey,
        title: seat.title,
        seatKey,
        occupationClassification: null,
      },
      electionDate: electionDay,
      candidatePersonIds: nominees.map((candidate) => candidate.personId),
      provenance: {
        method: "simulated",
        sourceEntityIds: [],
        note: "The seat's nominees, set on the ballot 45 days before election day.",
      },
    });
  }
  return next;
}

/** The winner a seat's own counted ballot chose, counting it if it is not yet. */
function countedStateBallot(
  world: World,
  seatKey: string,
  year: number,
  electionDay: IsoDate,
): { readonly world: World; readonly winnerPersonId: EntityId | null } {
  const contest = recordByStableKey(
    world.history.electionContests ?? [],
    stateBallotKey(seatKey, year),
  );
  if (!contest) return { world, winnerPersonId: null };
  let next = world;
  if (!electionContestResult(next, contest.id))
    next = resolveElectionContest(next, {
      stableKey: `${contest.stableKey}:count`,
      contestId: contest.id,
      resolvedAt: electionDay,
      provenance: {
        method: "simulated",
        sourceEntityIds: [contest.id],
        note: "Counted on election day from the seat's own voters.",
      },
    });
  return {
    world: next,
    winnerPersonId:
      electionContestResult(next, contest.id)?.winnerPersonId ?? null,
  };
}

function holdStateLegislativeElection(
  world: World,
  packId: string,
  electionDay: IsoDate,
): World {
  const key = resultsKey(packId, electionDay);
  if (hasStableKey(world.history.events, key)) return world;
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const year = Number(electionDay.slice(0, 4));
  const dueSeats = regularSeatsDue(world, packId, year);
  if (dueSeats.length === 0) return world;
  // An older save that missed the fictional intake window gets an honest
  // election-day slate; its record is dated today, not backdated to January.
  let next = prepareStateIntake(
    world,
    packId,
    electionDay,
    dueSeats.map((seat) => ({
      officeKey: seat.officeKey,
      ordinal: seat.ordinal,
      intakeDate: electionDay,
    })),
  );
  const holders = campaignSeatHolders(next, packId);
  const heldThrough = (officeKey: string, ordinal: number) =>
    holders
      .filter((h) => h.officeKey === officeKey && h.ordinal === ordinal)
      .reduce<IsoDate | null>(
        (latest, h) =>
          latest === null || h.endsAt > latest ? h.endsAt : latest,
        null,
      );
  const contested = contestedStateSeats(next, packId, electionDay);
  const campaignSeats: string[] = [];
  const outcomes: SeatOutcome[] = [];
  const unfilled: string[] = [];
  for (const seat of regularSeatsDue(next, packId, year)) {
    const seatKey = `${seat.officeKey}|${seat.ordinal}`;
    const contestId = contested.get(seatKey);
    if (contestId) {
      campaignSeats.push(
        `campaign-seat:${seatKey}|${contestId}|${termStartOf(seat.officeKey, electionDay)}`,
      );
      continue;
    }
    // A campaign's winner still serving their term is not on this ballot.
    const through = heldThrough(seat.officeKey, seat.ordinal);
    if (through !== null && through > termStartOf(seat.officeKey, electionDay))
      continue;
    const sitting = seat.member;
    const canonicalKey = stateCandidateSeatKey(
      packId,
      seat.officeKey,
      seat.ordinal,
    );
    const candidates = stateGeneralCandidates(next, canonicalKey, year).filter(
      (candidate) =>
        !recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          candidate.personId,
        ).some((death) => death.diedAt <= electionDay),
    );
    if (candidates.length === 0) {
      unfilled.push(`${seatKey}|${termStartOf(seat.officeKey, electionDay)}`);
      continue;
    }
    const counted = countedStateBallot(next, canonicalKey, year, electionDay);
    next = counted.world;
    const ballotWinner = candidates.find(
      (candidate) => candidate.personId === counted.winnerPersonId,
    );
    const share = stateSeatDemocraticShare(
      next,
      packId,
      seat.officeKey,
      seat.ordinal,
    );
    const incumbentBonus =
      sitting?.party === "democratic"
        ? STATE_LEGISLATURE_TURNOVER_PROFILE.incumbencyBonusLogit
        : sitting?.party === "republican"
          ? -STATE_LEGISLATURE_TURNOVER_PROFILE.incumbencyBonusLogit
          : 0;
    const electionShare =
      share === null
        ? null
        : logistic(
            logit(
              clampShare(
                share + nationalMoodDemocraticShift(world, electionDay),
                1e-6,
              ),
            ) + incumbentBonus,
          );
    // RECORDED VALUE: the saved generated seat lean chooses between living
    // candidates. A missing lean keeps the incumbent if they filed, then uses
    // stable candidate order; it is not a fabricated vote margin.
    const preferredParty =
      electionShare === null
        ? (sitting?.party ?? null)
        : electionShare >= 0.5
          ? "democratic"
          : "republican";
    // The seat's own count decides where there was one.
    const winner =
      ballotWinner ??
      candidates.find((candidate) => candidate.party === preferredParty) ??
      [...candidates].sort((left, right) =>
        left.personId.localeCompare(right.personId),
      )[0]!;
    const returns = winner.personId === sitting?.personId;
    outcomes.push({
      officeKey: seat.officeKey,
      ordinal: seat.ordinal,
      title: seat.title,
      party: winner.party,
      returningPersonId: returns ? winner.personId : null,
      leavingPersonId: returns ? null : (sitting?.personId ?? null),
      electedPersonId: winner.personId,
    });
  }
  if (
    outcomes.length === 0 &&
    campaignSeats.length === 0 &&
    unfilled.length === 0
  )
    return next;
  const winnerIds = outcomes.map((outcome) => outcome.electedPersonId);
  const returning = outcomes.filter((o) => o.returningPersonId).length;
  const termStarts = [
    ...new Set([
      ...outcomes.map((outcome) => termStartOf(outcome.officeKey, electionDay)),
      ...campaignSeats.map((tag) => tag.split("|").at(-1)!),
      ...unfilled.map((tag) => tag.split("|").at(-1)!),
    ]),
  ];
  const bodyId = createStableId(
    "organization",
    `${next.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  next = recordWorldEvent(next, {
    stableKey: key,
    type: STATE_LEGISLATIVE_RESULTS_EVENT,
    occurredAt: electionDay,
    recordedAt: next.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [bodyId, ...new Set(winnerIds)],
    participants: outcomes.map((outcome, index) => ({
      personId: winnerIds[index]!,
      role: "focus:winner" as const,
      detail: [
        outcome.officeKey,
        outcome.ordinal,
        outcome.party ?? "none",
        outcome.returningPersonId ? "returning" : "new",
        outcome.leavingPersonId ?? "",
        termStartOf(outcome.officeKey, electionDay),
      ].join("|"),
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      STATE_LEGISLATURE_TURNOVER_PROFILE.id,
      `pack:${packId}`,
      ...termStarts.map((date) => `term-start:${date}`),
      ...campaignSeats,
      ...unfilled.map((seat) => `unfilled:${seat}`),
    ],
    summary: `Voters chose ${outcomes.length + campaignSeats.length} members of the ${pack.displayName} in the ${electionDay.slice(0, 4)} general election: ${returning} return and ${outcomes.length - returning} seats get new members.${unfilled.length ? ` ${unfilled.length} seats have no living candidate.` : ""}${campaignSeats.length === 0 ? "" : campaignSeats.length === 1 ? " The race for one more seat is counted on its own." : ` The races for ${campaignSeats.length} more seats are counted on their own.`}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return next;
}

/** The term begins: departing members stop serving and new members start. */
function seatStateLegislativeWinners(
  world: World,
  packId: string,
  results: HistoricalEvent,
  termStart: IsoDate,
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  let next = world;
  const seats: CreateWorkRelationshipInput[] = [];
  const affiliations: CreateOrganizationParticipationInput[] = [];
  const current = new Map(
    stateLegislativeSeats(world, packId).map((seat) => [
      `${seat.officeKey}|${seat.ordinal}`,
      seat,
    ]),
  );
  const vacate = (
    officeKey: string,
    ordinal: number,
    cause: "no-living-candidate" | "member-elect-died",
  ) => {
    const vacancyKey = `${V}:${packId}:${officeKey}:${ordinal}:vacancy:${termStart}`;
    if (hasStableKey(next.history.events, vacancyKey)) return;
    const incumbent = current.get(`${officeKey}|${ordinal}`)?.member;
    if (incumbent) {
      const status = workStatusAt(next, incumbent.workRelationshipId);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${vacancyKey}:predecessor-ended`,
          workRelationshipId: incumbent.workRelationshipId,
          effectiveAt: addDays(termStart, -1),
          status: "ended",
          reason: "The term ended without a living member-elect.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: results.id },
        });
    }
    next = recordWorldEvent(next, {
      stableKey: vacancyKey,
      type: "election.state-legislative-seat-vacancy",
      occurredAt: termStart,
      recordedAt: next.currentDate,
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [bodyId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        V,
        `pack:${packId}`,
        `seat:${officeKey}|${ordinal}`,
        `vacancy-cause:${cause}`,
      ],
      summary: `The seat for ${current.get(`${officeKey}|${ordinal}`)?.title ?? "the legislature"} is vacant because ${cause === "member-elect-died" ? "the member-elect died before taking office" : "no living candidate remained at the election"}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  };
  for (const participant of results.participants) {
    const [officeKey, ordinalText, party, kind, , startsOn] = (
      participant.detail ?? ""
    ).split("|");
    if (!officeKey || !ordinalText) continue;
    if (startsOn && startsOn !== termStart) continue;
    const ordinal = Number(ordinalText);
    if (
      recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        participant.personId,
      ).some((death) => death.diedAt <= termStart)
    ) {
      vacate(officeKey, ordinal, "member-elect-died");
      continue;
    }
    if (kind !== "new") continue;
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    if (hasStableKey(next.history.workRelationships, tenureKey)) continue;
    const seat = current.get(`${officeKey}|${ordinal}`);
    // The member leaving the seat stops serving the day the new term begins.
    const leaving = seat?.member ?? null;
    const leftBeforeTerm =
      leaving !== null &&
      recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        leaving.personId,
      ).some((death) => death.diedAt <= addDays(termStart, -1));
    // A campaign's winner leaves when their own term expires.
    if (seat?.member && !seat.member.byCampaign && !leftBeforeTerm) {
      const status = workStatusAt(next, seat.member.workRelationshipId);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${tenureKey}:predecessor-ended`,
          workRelationshipId: seat.member.workRelationshipId,
          effectiveAt: addDays(termStart, -1),
          status: "ended",
          reason: "Their term ended and someone else won the seat.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: results.id },
        });
    }
    seats.push({
      stableKey: tenureKey,
      personId: participant.personId,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title: seat?.title ?? "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
    if (party && party !== "none")
      affiliations.push({
        stableKey: `${tenureKey}:affiliation`,
        personId: participant.personId,
        organizationId: livingWorldOrganizationId(
          next,
          LIVING_WORLD_KEYS.nationalParty(party),
        ),
        startedAt: termStart,
        initialStatus: "active",
        kind: PARTY_AFFILIATION_KIND,
        roleKind: "member:public-affiliation",
        context: "Public party affiliation",
        provenance: { kind: "simulated-event", eventId: results.id },
      });
  }
  // A campaign winner seated before this was kept (an older save) can share
  // their seat with the member they replaced; that member stops serving now.
  for (const holder of campaignSeatHolders(next, packId)) {
    if (holder.status !== "active") continue;
    for (const work of next.history.workRelationships) {
      if (work.organizationId !== bodyId) continue;
      const match = seatTenureMatch(work.stableKey);
      if (
        !match ||
        match[1] !== holder.officeKey ||
        Number(match[2]) !== holder.ordinal ||
        work.personId === holder.personId ||
        work.startedAt > holder.startsAt
      )
        continue;
      const status = workStatusAt(next, work.id);
      if (!status || status.status === "ended") continue;
      if (
        recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          work.personId,
        ).length > 0
      )
        continue;
      next = recordWorkStatus(next, {
        stableKey: `${V}:${packId}:${work.id}:replaced-by-campaign-winner`,
        workRelationshipId: work.id,
        effectiveAt: addDays(termStart, -1),
        status: "ended",
        reason: "Someone else won the seat.",
        supersedesStatusId: status.id,
        provenance: { kind: "simulated-event", eventId: results.id },
      });
    }
  }
  // A seat a campaign decided: its winner holds it from the term start, and
  // the member there before them stops serving the day before.
  for (const tag of results.tags) {
    if (tag.startsWith("unfilled:")) {
      const [officeKey, ordinalText, startsOn] = tag
        .slice("unfilled:".length)
        .split("|");
      if (officeKey && ordinalText && startsOn === termStart)
        vacate(officeKey, Number(ordinalText), "no-living-candidate");
    }
    if (!tag.startsWith("campaign-seat:")) continue;
    const [officeKey, ordinalText, contestId, startsOn] = tag
      .slice("campaign-seat:".length)
      .split("|");
    if (!officeKey || !ordinalText || !contestId || startsOn !== termStart)
      continue;
    const ordinal = Number(ordinalText);
    const result = electionContestResult(next, contestId as EntityId);
    // No winner on record: the sitting member stays.
    if (!result) continue;
    const winner = result.winnerPersonId;
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    for (const work of next.history.workRelationships) {
      if (work.organizationId !== bodyId) continue;
      const match = seatTenureMatch(work.stableKey);
      if (!match || match[1] !== officeKey || Number(match[2]) !== ordinal)
        continue;
      if (work.personId === winner || work.startedAt >= termStart) continue;
      if (
        recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          work.personId,
        ).some((death) => death.diedAt <= addDays(termStart, -1))
      )
        continue;
      const status = workStatusAt(next, work.id);
      if (!status || status.status === "ended") continue;
      next = recordWorkStatus(next, {
        stableKey: `${tenureKey}:predecessor-ended`,
        workRelationshipId: work.id,
        effectiveAt: addDays(termStart, -1),
        status: "ended",
        reason: "Their term ended and someone else won the seat.",
        supersedesStatusId: status.id,
        provenance: { kind: "simulated-event", eventId: results.id },
      });
    }
    // The campaign seats its own winner where the term's law is on record;
    // elsewhere the winner takes the seat here.
    const seatedByCampaign = next.history.workRelationships.some(
      (work) =>
        work.organizationId === bodyId &&
        work.personId === winner &&
        work.kind === "employment:legislative-member" &&
        (work.startedAt === termStart ||
          (seatTenureMatch(work.stableKey) !== null &&
            workStatusAt(next, work.id)?.status === "active")),
    );
    if (
      seatedByCampaign ||
      hasStableKey(next.history.workRelationships, tenureKey) ||
      recordsWithFieldValue(next.history.personDeaths, "personId", winner)
        .length > 0
    )
      continue;
    seats.push({
      stableKey: tenureKey,
      personId: winner,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title:
          current.get(`${officeKey}|${ordinal}`)?.title ??
          "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
  }
  if (seats.length) next = createWorkRelationships(next, seats);
  if (affiliations.length)
    next = createOrganizationParticipations(next, affiliations);
  return next;
}

/**
 * When an empty seat in this chamber is next filled: by a member already
 * elected who has not yet taken office, or at the next regular election.
 * Reads only; null where the pack is unknown.
 */
export function nextStateSeatFilling(
  world: World,
  packId: string,
  officeKey: string,
  ordinal: number,
): {
  readonly electedOn: IsoDate;
  readonly takesOfficeOn: IsoDate | null;
} | null {
  const pack = candidacyPackById(packId);
  if (!pack) return null;
  const today = world.currentDate;
  const rule = stateLegislativeElectionRule(
    pack.jurisdictionKey.replace(/^US-/, ""),
  );
  for (
    let year = Number(today.slice(0, 4)) - 1;
    year < Number(today.slice(0, 4)) + 8;
    year += 1
  ) {
    if (
      !isStateLegislativeSeatDue(
        pack.jurisdictionKey.replace(/^US-/, ""),
        officeKey,
        ordinal,
        year,
      )
    )
      continue;
    const electionDay = generalElectionDay(rule, year);
    const termStart =
      legislativeTermDates(officeKey, electionDay)?.startsAt ??
      makeIsoDate(`${year + 1}-01-01`);
    const results = recordByStableKey(
      world.history.events,
      resultsKey(packId, electionDay),
    );
    if (results && electionDay <= today && today < termStart) {
      // Only a living winner who has not yet taken this seat fills it.
      const alive = (personId: EntityId) =>
        !(
          recordsWithFieldValue(
            world.history.personDeaths,
            "personId",
            personId,
          ).length > 0
        );
      const drawn = results.participants.some((participant) => {
        const [key, seat, , kind] = (participant.detail ?? "").split("|");
        return (
          key === officeKey &&
          Number(seat) === ordinal &&
          kind === "new" &&
          alive(participant.personId)
        );
      });
      const campaign = results.tags.some((tag) => {
        const [key, seat, contestId] = tag
          .slice("campaign-seat:".length)
          .split("|");
        if (!tag.startsWith("campaign-seat:")) return false;
        if (key !== officeKey || Number(seat) !== ordinal || !contestId)
          return false;
        const result = electionContestResult(world, contestId as EntityId);
        return result !== null && alive(result.winnerPersonId);
      });
      if (drawn || campaign)
        return { electedOn: electionDay, takesOfficeOn: termStart };
    }
    if (electionDay > today)
      return { electedOn: electionDay, takesOfficeOn: null };
  }
  return null;
}

/**
 * Called whenever the canonical clock moves forward a day or more: holds each
 * seated legislature's regular election and seats its winners when the term
 * begins. Only dates actually crossed act.
 */
/** The nomination plan for a state's legislative seats in one year. */
function stateNominationPlan(
  world: World,
  jurisdictionKey: string,
  year: number,
) {
  const usps = jurisdictionKey.replace(/^US-/, "");
  const rule = stateLegislativeElectionRule(usps);
  return nominationPlan(world, {
    stateUsps: usps,
    family: "state-legislature",
    year,
    // The law in force when the cycle's filing opens governs the whole cycle.
    onDate: filingWindowOpens(year),
    generalDay: generalElectionDay(rule, year),
  });
}

const STATE_SLATE_EVENT = "election.state-legislative-candidate-slate";

/**
 * The nomination stage for the legislative fields filed this year: each
 * state's primary on its own date, and any runoff it leaves open.
 */
function holdStateLegislativeNominations(
  before: IsoDate,
  world: World,
  onlyPackId?: string,
): World {
  const after = world.currentDate;
  let next = world;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4));
    year += 1
  ) {
    // Primaries and runoffs fall between the first filing and November.
    if (after < `${year}-02-01` || before >= `${year}-11-30`) continue;
    const titles = new Map<string, Map<string, string>>();
    const titleOf = (packId: string, officeKey: string, ordinal: number) => {
      let byPack = titles.get(packId);
      if (!byPack) {
        byPack = new Map(
          stateLegislativeSeats(world, packId).map((seat) => [
            `${seat.officeKey}|${seat.ordinal}`,
            seat.title,
          ]),
        );
        titles.set(packId, byPack);
      }
      return byPack.get(`${officeKey}|${ordinal}`) ?? null;
    };
    next = holdFiledNominations(before, next, {
      fieldType: STATE_SLATE_EVENT,
      stableKeySuffix: `:${year}`,
      seatFor: (field) => {
        const seatKey = tagValue(field, "seat:");
        if (!seatKey || field.stableKey !== stateSlateKey(seatKey, year))
          return null;
        const [packId, officeKey, ordinalText] = seatKey.split("|");
        if (onlyPackId !== undefined && packId !== onlyPackId) return null;
        const pack = packId ? candidacyPackById(packId) : null;
        const ordinal = Number(ordinalText);
        const title = pack ? titleOf(packId!, officeKey!, ordinal) : null;
        const jurisdiction = pack
          ? stateJurisdictionForKey(pack.jurisdictionKey)
          : null;
        if (!pack || !title || !jurisdiction) return null;
        return {
          seatKey,
          title,
          jurisdictionId: jurisdiction.id,
          involvedEntityIds: [
            createStableId(
              "organization",
              `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId!)}`,
            ),
          ],
          plan: () => stateNominationPlan(world, pack.jurisdictionKey, year),
          partyShare: (party) => {
            const share = stateSeatDemocraticShare(
              world,
              packId!,
              officeKey!,
              ordinal,
            );
            if (share === null) return null;
            return party === "democratic"
              ? share
              : party === "republican"
                ? 1 - share
                : null;
          },
          aliveOn: (personId, date) =>
            Boolean(world.people[personId]) &&
            !world.history.personDeaths.some(
              (death) => death.personId === personId && death.diedAt <= date,
            ),
        };
      },
    });
  }
  return next;
}

export function applyStateLegislatureTurnover(
  before: IsoDate,
  start: World,
): World {
  const after = start.currentDate;
  if (after <= before) return start;
  const world = holdStateLegislativeNominations(before, start);
  // Cheap window test before any history scan: the game-profile prospect
  // window, a regular election, or a term beginning is due.
  // A field can file from its filing window in the year before (decision
  // D-9), so next year's window counts too.
  let crossesAny = false;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4)) + 1 && !crossesAny;
    year += 1
  ) {
    const january = `${year}-01-01`;
    crossesAny =
      (before < january && january <= after) ||
      (before < `${year}-03-07` && filingWindowOpens(year) <= after) ||
      (before < `${year}-11-08` && `${year}-11-02` <= after) ||
      // The ballot is set 45 days before an early-November election day,
      // or on a game's first day when it opens after that.
      (before < addDays(makeIsoDate(`${year}-11-08`), -STATE_BALLOT_SET_DAYS) &&
        addDays(makeIsoDate(`${year}-11-02`), -STATE_BALLOT_SET_DAYS) <=
          after) ||
      (addDays(makeIsoDate(`${year}-11-02`), -STATE_BALLOT_SET_DAYS) <=
        before &&
        after < `${year}-11-02` &&
        !stateBallotsSet(start, year));
  }
  if (!crossesAny) return world;
  const packs = seatedPacks(world);
  if (packs.length === 0) return world;
  let next = world;
  for (const packId of packs) {
    const pack = candidacyPackById(packId);
    if (!pack) continue;
    const usps = pack.jurisdictionKey.replace(/^US-/, "");
    const rule = stateLegislativeElectionRule(usps);
    const firstYear = Number(before.slice(0, 4)) - 4;
    const lastYear =
      Number(after.slice(0, 4)) +
      (after >= filingWindowOpens(Number(after.slice(0, 4)) + 1) ? 1 : 0);
    for (let year = firstYear; year <= lastYear; year += 1) {
      // Every reviewed seat cycle is a subset of the state's regular general
      // election years; this cheap check avoids a national seat scan each day.
      if (!isElectionYear(rule, year)) continue;
      const electionDay = generalElectionDay(rule, year);
      let plan: ReturnType<typeof stateNominationPlan> | null = null;
      const due = stateLegislativeSeats(next, packId).flatMap((seat, index) => {
        if (
          !isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year)
        )
          return [];
        const base = stateCandidateIntakeDay(year, index);
        // The field never files later than the game's own intake day.
        if (base <= before) return [];
        plan ??= stateNominationPlan(next, pack.jurisdictionKey, year);
        const intakeDate = fieldIntakeDay(base, plan, year);
        const entry = {
          officeKey: seat.officeKey,
          ordinal: seat.ordinal,
          intakeDate,
        };
        if (before < intakeDate && intakeDate <= after) return [entry];
        // Decision D-9: a game that opens after the state's real deadline
        // starts with the field already filed, dated on the deadline.
        return intakeDate <= before &&
          !stateCandidateSlate(
            next,
            stateCandidateSeatKey(packId, seat.officeKey, seat.ordinal),
            year,
          )
          ? [entry]
          : [];
      });
      next = prepareStateIntake(next, packId, electionDay, due);
      const ballotDay = addDays(electionDay, -STATE_BALLOT_SET_DAYS);
      if (
        ballotDay <= after &&
        after < electionDay &&
        (before < ballotDay || !stateBallotsSet(next, year, packId))
      )
        next = openStateBallots(next, packId, electionDay);
      if (before < electionDay && electionDay <= after)
        next = holdStateLegislativeElection(next, packId, electionDay);
      const results = recordByStableKey(
        next.history.events,
        resultsKey(packId, electionDay),
      );
      if (!results) continue;
      for (const tag of results.tags) {
        if (!tag.startsWith("term-start:")) continue;
        const termStart = tag.slice("term-start:".length);
        if (before < termStart && termStart <= after)
          next = seatStateLegislativeWinners(
            next,
            packId,
            results,
            makeIsoDate(termStart),
          );
      }
    }
  }
  return next;
}

/** Producer contract; consumers register its queue before advancing the clock. */
export interface StateLegislatureWake {
  readonly packId: string;
  readonly electionDay: IsoDate;
  readonly stage: "intake" | "nomination" | "ballot" | "election" | "term";
  readonly dueAt: IsoDate;
}

/** All prefixes preserve the original startsWith(`${packId}|`) test exactly. */
function stateWakeEventPackKeys(event: HistoricalEvent): readonly string[] {
  const seatKey = tagValue(event, "seat:");
  if (!seatKey) return [];
  const keys: string[] = [];
  for (
    let at = seatKey.indexOf("|");
    at >= 0;
    at = seatKey.indexOf("|", at + 1)
  )
    keys.push(seatKey.slice(0, at));
  return keys;
}

/** Exact calendar boundaries, not a substitute for any election decision. */
export function stateLegislatureWakePlan(
  world: World,
  packId: string,
  throughYear: number,
  includeCurrentDate = false,
): readonly StateLegislatureWake[] {
  const pack = candidacyPackById(packId);
  if (!pack || !seatedPacks(world).includes(packId)) return [];
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  const rule = stateLegislativeElectionRule(usps);
  const seats = stateLegislativeSeats(world, packId);
  const filedEvents = recordsByKey(
    world.history.events,
    "state-legislature:wake-events-by-pack:v1",
    stateWakeEventPackKeys,
    packId,
  );
  const wakes = new Map<string, StateLegislatureWake>();
  const add = (
    electionDay: IsoDate,
    stage: StateLegislatureWake["stage"],
    dueAt: IsoDate,
  ) => {
    if (
      dueAt > world.currentDate ||
      (includeCurrentDate && dueAt === world.currentDate)
    )
      wakes.set(`${electionDay}|${stage}|${dueAt}`, {
        packId,
        electionDay,
        stage,
        dueAt,
      });
  };
  for (
    let year = Number(world.currentDate.slice(0, 4)) - 4;
    year <= throughYear;
    year++
  ) {
    if (!isElectionYear(rule, year)) continue;
    const electionDay = generalElectionDay(rule, year);
    const plan = stateNominationPlan(world, pack.jurisdictionKey, year);
    seats.forEach((seat, index) => {
      if (isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year))
        add(
          electionDay,
          "intake",
          fieldIntakeDay(stateCandidateIntakeDay(year, index), plan, year),
        );
    });
    if (plan.known && plan.primaryDate < electionDay)
      add(electionDay, "nomination", plan.primaryDate);
    // Actual filed fields and primary results may pin a date different from a later law.
    for (const event of filedEvents) {
      const seatKey = tagValue(event, "seat:");
      if (
        !seatKey?.startsWith(`${packId}|`) ||
        ![
          stateSlateKey(seatKey, year),
          `${stateSlateKey(seatKey, year)}:primary`,
          `${stateSlateKey(seatKey, year)}:runoff`,
        ].includes(event.stableKey)
      )
        continue;
      for (const prefix of ["primary-date:", "runoff-date:"]) {
        const date = tagValue(event, prefix);
        if (date) add(electionDay, "nomination", makeIsoDate(date));
      }
    }
    add(electionDay, "ballot", addDays(electionDay, -STATE_BALLOT_SET_DAYS));
    add(electionDay, "election", electionDay);
    const results = recordByStableKey(
      world.history.events,
      resultsKey(packId, electionDay),
    );
    for (const tag of results?.tags ?? [])
      if (tag.startsWith("term-start:"))
        add(electionDay, "term", makeIsoDate(tag.slice("term-start:".length)));
  }
  return [...wakes.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** Runs one affected pack through the same canonical writers on its due date. */
export function dispatchStateLegislatureWake(
  world: World,
  wake: StateLegislatureWake,
): World {
  if (world.currentDate !== wake.dueAt)
    throw new Error(
      "State legislature wake requires its exact canonical due date.",
    );
  const pack = candidacyPackById(wake.packId);
  if (!pack || !seatedPacks(world).includes(wake.packId)) return world;
  const year = Number(wake.electionDay.slice(0, 4));
  if (wake.stage === "nomination")
    return holdStateLegislativeNominations(
      addDays(wake.dueAt, -1),
      world,
      wake.packId,
    );
  if (wake.stage === "ballot")
    return openStateBallots(world, wake.packId, wake.electionDay);
  if (wake.stage === "election")
    return holdStateLegislativeElection(world, wake.packId, wake.electionDay);
  if (wake.stage === "term") {
    const results = recordByStableKey(
      world.history.events,
      resultsKey(wake.packId, wake.electionDay),
    );
    return results
      ? seatStateLegislativeWinners(world, wake.packId, results, wake.dueAt)
      : world;
  }
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  const plan = stateNominationPlan(world, pack.jurisdictionKey, year);
  const due = stateLegislativeSeats(world, wake.packId).flatMap(
    (seat, index) => {
      if (!isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year))
        return [];
      const intakeDate = fieldIntakeDay(
        stateCandidateIntakeDay(year, index),
        plan,
        year,
      );
      return intakeDate === wake.dueAt
        ? [{ officeKey: seat.officeKey, ordinal: seat.ordinal, intakeDate }]
        : [];
    },
  );
  return prepareStateIntake(world, wake.packId, wake.electionDay, due);
}
