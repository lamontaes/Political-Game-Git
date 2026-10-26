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
import { votesOf } from "./modules/record";
import { partyName, partySide } from "./appointments";
import { leanedScore } from "./trait-decisions";
import type { CoreAPI } from "./types";
import { PARTIES_MODULE_ID, partiesHere, type TieRow } from "./modules/parties";
import { officialLean, officialOf, officialStance } from "./modules/officials";
import {
  stancesOf,
  viewOf,
  VIEWS_DATA,
  VIEWS_MODULE_ID,
} from "./modules/views";
import {
  campaignParameter,
  personLean,
  PLATFORM_QUESTIONS,
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

function townLean(api: CoreAPI): number {
  if (!api.state.modules.has("core2-campaigns-v1")) return 0;
  return (
    (
      api.moduleState("core2-campaigns-v1").table("town").get("town") as
        { lean?: number } | undefined
    )?.lean ?? 0
  );
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
  const lean = partyLean(api, party);
  return lean === null ? null : clamp(lean.lean * questionAxis(question));
}

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

/** A candidate's own view of one question, in [-1, 1], or null for none. */
function ownStance(
  api: CoreAPI,
  personId: string,
  question: string,
): number | null {
  if (officialOf(api, personId)) {
    const stance = officialStance(api, personId, question);
    return stance === null ? null : clamp(stance);
  }
  const lean = ownLean(api, personId);
  if (lean === null) return null;
  // What they've come to want on the question itself (speeches, ads and
  // news that reached them), on top of where their lean puts them.
  let moved = 0;
  if (api.state.modules.has(VIEWS_MODULE_ID))
    for (const s of stancesOf(api, personId))
      if (s.topic === question)
        moved +=
          s.desiredChange === "enact"
            ? s.strength
            : s.desiredChange === "repeal"
              ? -s.strength
              : 0;
  return clamp(lean * questionAxis(question) + moved);
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

/**
 * Where a candidate stands on a question, in [-1, 1]: their own view blended
 * with their party's position by how firmly they hold the party. Null only
 * when they have neither a view nor a party.
 */
export function candidateStance(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
  question: string,
): number | null {
  const own = ownStance(api, personId, question);
  const theirs = partyPosition(api, party, question);
  const held =
    own === null
      ? theirs
      : theirs === null
        ? own
        : clamp(
            (1 - partyFirmness(api, personId)) * own +
              partyFirmness(api, personId) * theirs,
          );
  // What they've done on it: an officeholder who has voted on the question
  // answers toward how they voted, the more votes the more firmly.
  const votes = votesOf(api, personId).filter(
    (v) => v.stance.question === question,
  );
  if (!votes.length) return held;
  const voted =
    votes.reduce((sum, v) => sum + v.stance.position, 0) / votes.length;
  if (held === null) return clamp(voted);
  const weight =
    votes.length / (votes.length + campaignParameter("recordFamiliarityItems"));
  return clamp((1 - weight) * held + weight * voted);
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
 * A candidate's platform: the questions they feel most strongly about, each
 * at its own position. Empty for a candidate with neither a view nor a party.
 */
export function candidatePlatform(
  api: CoreAPI,
  personId: string,
  party: string | null | undefined,
  count = campaignParameter("candidatePlatformQuestions"),
): readonly Stance[] {
  return PLATFORM_QUESTIONS.map((question) => ({
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
