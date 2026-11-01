/**
 * Where a candidate stands on a policy question, from their own views and
 * their party's (audit 2026-10-14, defects 6 and 7).
 *
 * A party's position comes from the parties data: the mean lean of the
 * party's tied members in town (each tie row carries the member's lean),
 * weighed against the party's position in the state (its national side,
 * shifted toward how the state votes) as so many members' worth of evidence,
 * so a town with few members leans on the state and a party with no members
 * here stands where its side and its state put it. Along a question, a
 * party's position is that lean times the question's measured left-right
 * direction (`questionAxis`, from the 2024 vote).
 *
 * A candidate's stance is a sliding blend of their own view (an official's
 * recorded ideal point, else PEOPLE's views engine with the stances it has
 * recorded, else their ranked lean in town) and their party's position,
 * weighted by how firmly they hold their party: their tie's firmness, their
 * traits and, for a seated official, their recorded party loyalty. Answers
 * are positions in [-1, 1]; a candidate has no answer only when they have
 * neither a view nor a party.
 */
import { townLean } from "./modules/campaigns";
import { votesOf, type VoteRecordRow } from "./modules/record";
import { partyName, partySide } from "./appointments";
import { leanedScore, weighingKept } from "./trait-decisions";
import type { CoreAPI } from "./types";
import { PARTIES_MODULE_ID, partiesHere, type TieRow } from "./modules/parties";
import {
  officialLean,
  officialOf,
  officialStance,
  type OfficialRow,
} from "./modules/officials";
import {
  stanceRow,
  viewOf,
  VIEWS_DATA,
  VIEWS_MODULE_ID,
} from "./modules/views";
import {
  campaignParameter,
  personLean,
  questionAxis,
  type Stance,
} from "./campaign-views";

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const sameLabel = (a: string, b: string) =>
  (partyName(a) ?? a).trim().toLowerCase() ===
  (partyName(b) ?? b).trim().toLowerCase();

/** How the state votes, right positive: its parties' 2024 shares by side. */
function stateLean(api: CoreAPI): number {
  if (!api.state.modules.has(PARTIES_MODULE_ID)) return townLean(api);
  const parties = partiesHere(api).filter((p) => p.side !== 0);
  const total = parties.reduce((s, p) => s + p.share, 0);
  return total
    ? parties.reduce((s, p) => s + p.share * p.side, 0) / total
    : townLean(api);
}

export interface PartyLean {
  /** The party's lean in [-1, 1], right positive. */
  readonly lean: number;
  /** Its tied members in town whose leans it averages. */
  readonly members: number;
  /** Where the lean came from: the town's members, the state, or both. */
  readonly basis: "town" | "state" | "town-and-state";
}

const leanCache = new WeakMap<object, Map<string, PartyLean>>();

/**
 * A party's lean, by its ballot label: its town members' mean lean weighed
 * against its state position (`partyPositionPriorMembers` members' worth).
 * Null for no party (an independent or a nonpartisan race).
 */
export function partyLean(
  api: CoreAPI,
  party: string | null | undefined,
): PartyLean | null {
  if (!party) return null;
  const parties = api.state.modules.has(PARTIES_MODULE_ID)
    ? partiesHere(api)
    : [];
  const row = parties.find((p) => sameLabel(p.name, party));
  const side = row?.side ?? partySide(party);
  // A label no state party carries and no side places is no party position.
  if (!row && side === 0) return null;
  const key = `${api.state.date}|${row?.id ?? party}`;
  const cache = leanCache.get(api.state) ?? new Map<string, PartyLean>();
  leanCache.set(api.state, cache);
  const hit = cache.get(key);
  if (hit) return hit;
  const prior = clamp(
    side * campaignParameter("partyIdentifierLean") +
      campaignParameter("partyStateLeanWeight") * stateLean(api),
  );
  const members = row
    ? (api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .query("byParty", [row.id]) as unknown as TieRow[])
    : [];
  const n = members.length;
  const weight = campaignParameter("partyPositionPriorMembers");
  const sum = members.reduce((s, t) => s + t.lean, 0);
  const result: PartyLean = {
    lean: clamp((sum + weight * prior) / (n + weight)),
    members: n,
    basis: n === 0 ? "state" : "town-and-state",
  };
  cache.set(key, result);
  return result;
}

/** A party's position on one question, in [-1, 1]; null for no party. */
export function partyPosition(
  api: CoreAPI,
  party: string | null | undefined,
  question: string,
): number | null {
  return positionOf(partyLean(api, party), question);
}

/** A party lean's position on one question; null for no party. */
const positionOf = (lean: PartyLean | null, question: string) =>
  lean === null ? null : clamp(lean.lean * questionAxis(question));

/**
 * A candidate's own lean in [-1, 1]: an official's recorded ideal point,
 * else PEOPLE's views engine, else their ranked lean in town; null for a
 * candidate the world holds no view for.
 */
export function ownLean(api: CoreAPI, personId: string): number | null {
  const official = officialOf(api, personId);
  if (official) return officialLean(official);
  const person = api.state.people.get(personId);
  if (!person) return null;
  if (api.state.modules.has(VIEWS_MODULE_ID)) {
    const view = viewOf(api, personId);
    if (view) return clamp(view.lean / VIEWS_DATA.parameters.leanMax!.value);
  }
  return personLean(api.state.people, person, townLean(api));
}

/**
 * How firmly a candidate holds their party, in [0, 1]: a base every party
 * candidate carries, how firm their own tie is (the tie's lean, or an
 * official's), their traits' lean toward joining over staying out, and a
 * seated official's recorded party loyalty.
 */
export function partyFirmness(api: CoreAPI, personId: string): number {
  const official = officialOf(api, personId);
  const person = api.state.people.get(personId);
  const tie = api.state.modules.has(PARTIES_MODULE_ID)
    ? ((api.moduleState(PARTIES_MODULE_ID).table("ties").get(personId) as
        TieRow | undefined) ?? null)
    : null;
  const tieLean = tie?.partyId
    ? Math.abs(tie.lean)
    : official
      ? Math.abs(ownLean(api, personId) ?? 0)
      : 0;
  const traits =
    person && !official
      ? leanedScore(
          api.state,
          person,
          "campaigns.party-firmness",
          "join",
          "stay-out",
          0,
        )
      : 0;
  return clamp(
    campaignParameter("partyFirmnessBase") * (official?.loyalty ?? 1) +
      campaignParameter("partyFirmnessTieWeight") * tieLean +
      traits,
    0,
    1,
  );
}

const NO_VOTES: readonly VoteRecordRow[] = [];

/**
 * Where one candidate stands on policy questions under one party label, for
 * a caller that asks many (an interview scores every question for each
 * candidate in the race). Each input a stance reads (their official row,
 * their own lean, an official's stance on a question, their recorded votes
 * by question, the party's lean, how firmly they hold the party) is read the
 * first time a question needs it and kept, so it is read once however many
 * questions are asked. A caller keeps a reader only while nothing it reads
 * is written, and never past the call it was made for. Someone whose
 * weighing leaves a trace (`weighingKept`: the player, the people in focus,
 * any audit probe) weighs their party firmness again at every blend, twice,
 * so each of their weighed records is still kept.
 */
export class StanceReader {
  private officialRead = false;
  private official: OfficialRow | undefined;
  private leanRead = false;
  private lean: number | null = null;
  private officialStances: Map<string, number | null> | undefined;
  private partyRead = false;
  private partyLeanRow: PartyLean | null = null;
  private firmness: number | undefined;
  private votesByQuestion: Map<string, VoteRecordRow[]> | undefined;

  constructor(
    private readonly api: CoreAPI,
    private readonly personId: string,
    private readonly party: string | null | undefined,
  ) {}

  /**
   * Where they stand on a question, in [-1, 1]: their own view blended with
   * their party's position by how firmly they hold the party. Null only when
   * they have neither a view nor a party.
   */
  stance(question: string): number | null {
    const own = this.ownStance(question);
    const theirs = positionOf(this.ofParty(), question);
    let held: number | null;
    if (own === null) held = theirs;
    else if (theirs === null) held = own;
    else {
      const kept = weighingKept(this.api.state, this.personId);
      const first = kept
        ? partyFirmness(this.api, this.personId)
        : (this.firmness ??= partyFirmness(this.api, this.personId));
      const second = kept ? partyFirmness(this.api, this.personId) : first;
      held = clamp((1 - first) * own + second * theirs);
    }
    // What they've done on it: an officeholder who has voted on the question
    // answers toward how they voted, the more votes the more firmly.
    const votes = this.votesOn(question);
    if (!votes.length) return held;
    const voted =
      votes.reduce((sum, v) => sum + v.stance.position, 0) / votes.length;
    if (held === null) return clamp(voted);
    const weight =
      votes.length /
      (votes.length + campaignParameter("recordFamiliarityItems"));
    return clamp((1 - weight) * held + weight * voted);
  }

  /** Their record's last vote on a question, or undefined for none. */
  lastVote(question: string): VoteRecordRow | undefined {
    return this.votesOn(question).at(-1);
  }

  /** Their own view of one question, in [-1, 1], or null for none. */
  private ownStance(question: string): number | null {
    if (!this.officialRead) {
      this.official = officialOf(this.api, this.personId);
      this.officialRead = true;
    }
    if (this.official) {
      const stances = (this.officialStances ??= new Map());
      let stance = stances.get(question);
      if (stance === undefined) {
        stance = officialStance(this.api, this.personId, question);
        stances.set(question, stance);
      }
      return stance === null ? null : clamp(stance);
    }
    if (!this.leanRead) {
      this.lean = ownLean(this.api, this.personId);
      this.leanRead = true;
    }
    if (this.lean === null) return null;
    // What they've come to want on the question itself (speeches, ads and
    // news that reached them), on top of where their lean puts them.
    let moved = 0;
    if (this.api.state.modules.has(VIEWS_MODULE_ID)) {
      const s = stanceRow(this.api, this.personId, question);
      if (s)
        moved +=
          s.desiredChange === "enact"
            ? s.strength
            : s.desiredChange === "repeal"
              ? -s.strength
              : 0;
    }
    return clamp(this.lean * questionAxis(question) + moved);
  }

  /** Their party's lean (`partyLean`), or null for no party. */
  private ofParty(): PartyLean | null {
    if (!this.partyRead) {
      this.partyLeanRow = partyLean(this.api, this.party);
      this.partyRead = true;
    }
    return this.partyLeanRow;
  }

  /** Their recorded votes on a question, in the record's order. */
  private votesOn(question: string): readonly VoteRecordRow[] {
    if (!this.votesByQuestion) {
      this.votesByQuestion = new Map();
      for (const vote of votesOf(this.api, this.personId)) {
        const on = this.votesByQuestion.get(vote.stance.question);
        if (on) on.push(vote);
        else this.votesByQuestion.set(vote.stance.question, [vote]);
      }
    }
    return this.votesByQuestion.get(question) ?? NO_VOTES;
  }
}

/** A reader of one candidate's stances under one party label (`StanceReader`). */
export function stanceReader(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
): StanceReader {
  return new StanceReader(api, personId, party);
}

/**
 * Where a candidate stands on a question, in [-1, 1]: their own view blended
 * with their party's position by how firmly they hold the party. Null only
 * when they have neither a view nor a party. A reader asked once.
 */
export function candidateStance(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
  question: string,
): number | null {
  return new StanceReader(api, personId, party).stance(question);
}

/** A candidate's overall lean, blended with their party's the same way. */
export function candidateLean(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
): number | null {
  const own = ownLean(api, personId);
  const theirs = partyLean(api, party)?.lean ?? null;
  if (own === null) return theirs;
  if (theirs === null) return own;
  const firm = partyFirmness(api, personId);
  return clamp((1 - firm) * own + firm * theirs);
}

/**
 * A candidate's platform: of the questions the contest's seat takes up (its
 * positions, `contestPositions`), the ones they feel most strongly about, each
 * at its own position. Empty for a candidate with neither a view nor a party,
 * and for a seat that takes up no question.
 */
export function candidatePlatform(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
  positions: readonly string[],
  count = campaignParameter("candidatePlatformQuestions"),
): readonly Stance[] {
  return positions
    .map((question) => ({
      question,
      position: candidateStance(api, personId, party, question),
    }))
    .filter((s): s is Stance => s.position !== null && s.position !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.position) - Math.abs(a.position) ||
        a.question.localeCompare(b.question),
    )
    .slice(0, count)
    .map((s) => ({
      question: s.question,
      position: Math.round(s.position * 1000) / 1000,
    }));
}
