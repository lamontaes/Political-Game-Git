/**
 * Chamber leadership and committee assignments (BOARD "features the old
 * engine had": leadership races, committee assignments). Each body organizes
 * the way its kind of chamber does (`data/research/legislature/chamber-
 * leadership.json`): the floor elects its presiding officer, each party
 * caucus its leaders, and the body's assigning authority (a speaker, a senate
 * president, a committee on committees, a council president) seats members
 * on committees by the party ratio, choosing the members it rates highest;
 * the chair is the authority's pick or the committee's vote.
 *
 * Every vote is a member's own: they back the colleague they rate highest by
 * party, how close their views are, their relationship, and (slightly) years
 * served. Nothing is drawn. A body reorganizes whenever its membership has
 * changed (after an election seats new members), read the first time it's
 * needed, so no day scans every chamber.
 */
import leadershipData from "../../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { feelingBetween } from "../closeness";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { councilChosenMayor, OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  bodyReach,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  leanOf,
  memberKey,
  members,
  registerCommitteeRosterProvider,
} from "./legislature";
import { partySide } from "../appointments";
import {
  COMMITTEES,
  committeeTopics,
  topicOf,
} from "../legislature-committees";
import { OFFICIALS_MODULE_ID, officialOf } from "./officials";
import { bookkeeping } from "../bookkeeping";
import { tableTraceOn } from "../module-state";
import { concerns } from "./meetings";
import { campaignParameter } from "../campaign-data";

export const LEADERSHIP_MODULE_ID = "core2-leadership-v1";

type Template =
  | "federal-house"
  | "federal-senate"
  | "state-house"
  | "state-senate"
  | "unicameral"
  | "council-manager"
  | "mayor-council"
  | "county-board";

interface Post {
  readonly key: string;
  readonly title: string;
  readonly selection: string;
}

const DATA = leadershipData as unknown as {
  tables: Record<string, { id: string; value: unknown }[]>;
};
function field<T>(template: Template, name: string): T {
  const row = DATA.tables[name]?.find((r) => r.id === `${template}:${name}`);
  if (!row) throw new Error(`No ${name} for ${template}`);
  return row.value as T;
}

/** The subject committees a body refers bills to (data, `committees.json`). */
export { COMMITTEES };

/**
 * How much a committee's subject touches a member: an official's signature
 * issues, or for a town member, whether it touches their own life (work,
 * children at home, age; the meetings rule). Members ask for the committees
 * their interests run to, and the assigning authority weighs it.
 */
function interestIn(api: CoreAPI, t: TermRow, committee: string): number {
  const topics = committeeTopics(committee);
  const official = officialOf(api, memberKey(t));
  if (official)
    return official.signature.some((s) => topics.includes(topicOf(s.question)))
      ? 1
      : 0;
  const person = t.personId ? api.state.people.get(t.personId) : undefined;
  if (!person) return 0;
  const touches = concerns(api, person);
  return topics.some((topic) => touches(`us-policy-positions:${topic}.any`))
    ? 1
    : 0;
}

export interface PostRow {
  readonly id: string;
  readonly chamber: string;
  readonly post: string;
  readonly holderId: string | null;
  readonly since: string;
  readonly votes: Readonly<Record<string, number>>;
  /** For a post the floor fills between caucus nominees: who put its holder there. */
  readonly heldBy?: "majority-caucus" | "coalition";
}

export interface CommitteeRow {
  readonly id: string;
  readonly chamber: string;
  readonly committee: string;
  readonly memberIds: readonly string[];
  readonly chairId: string;
  readonly assignedBy: string;
  readonly since: string;
}

/**
 * What a body's last organizing left behind: who sat, the term they sat in
 * (the nearest term end among them) and which side held the majority, so a
 * later change can tell a vacancy filled mid-term from a new term.
 */
interface OrganizedRow {
  readonly id: string;
  readonly signature: string;
  readonly date: string;
  readonly members?: readonly string[];
  readonly term?: string;
  readonly side?: number;
}

export const LEADERSHIP_MODULE: CoreModule = {
  id: LEADERSHIP_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      organized: {},
      posts: { indexes: { byChamber: { fields: ["chamber"] } } },
      committees: { indexes: { byChamber: { fields: ["chamber"] } } },
      /** Members standing for a post (the player), and the player's own votes. */
      choices: {},
    },
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(LEADERSHIP_MODULE_ID).table(name);

export function openLeadership(core: CoreState): void {
  registerCommitteeRosterProvider((api, chamber, committee) =>
    api.state.modules.has(LEADERSHIP_MODULE_ID)
      ? committeeRoster(api, chamber, committee)
      : null,
  );
  if (!core.modules.has(LEADERSHIP_MODULE_ID))
    registerModule(core, LEADERSHIP_MODULE);
  void coreAPI(core);
}

/**
 * The body a seat's chamber really is: a seat in the U.S. House or Senate is
 * organized with the whole chamber (its speaker, its leaders and whips), not
 * as a body of the one seat or the home delegation that holds it.
 */
function chamberOf(api: CoreAPI, chamber: string): string {
  if (chamber === FEDERAL_HOUSE || chamber === FEDERAL_SENATE) return chamber;
  const kind = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").get(chamber) as
      { kind: string } | undefined
  )?.kind;
  if (kind?.startsWith("us-house")) return FEDERAL_HOUSE;
  return kind === "us-senate" ? FEDERAL_SENATE : chamber;
}

/** Which kind of chamber a body is, for its rules of organization. */
function templateOf(api: CoreAPI, chamber: string): Template {
  if (chamber === FEDERAL_HOUSE) return "federal-house";
  if (chamber === FEDERAL_SENATE) return "federal-senate";
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(chamber) as unknown as { kind: string; jurisdiction: string };
  if (office?.kind === "legislature-unicameral") return "unicameral";
  if (office?.kind === "legislature-upper") return "state-senate";
  if (office?.kind?.startsWith("legislature-")) return "state-house";
  // A county or township board elects its own chair (A.R.S. § 11-216, read
  // for every state until each state's statute is read). Where the county's
  // executive chairs the body (a county judge, a county mayor), the board
  // still elects one (stopgap SG-GOV-board-chair-beside-presiding-executive).
  if (office?.kind === "county-board" || office?.kind === "township-board")
    return "county-board";
  // A council beside an elected mayor organizes under its mayor; otherwise
  // as a council-manager body elects its own president.
  const mayor = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [office?.jurisdiction ?? ""]) as unknown as {
      kind: string;
      elected: boolean;
    }[]
  ).some((o) => o.kind === "mayor" && o.elected);
  return office?.kind === "council" && mayor
    ? "mayor-council"
    : "council-manager";
}

/** The term a body sits in: the nearest end among its members' terms (a special election's winner serves out the seat's term, so it does not move). */
const termOf = (all: readonly TermRow[]): string =>
  all.reduce(
    (nearest, t) =>
      t.endDate && (!nearest || t.endDate < nearest) ? t.endDate : nearest,
    "",
  );

const yearsServed = (t: TermRow, date: string) =>
  Math.max(
    0,
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${t.serviceStart ?? t.startDate}T00:00:00Z`)) /
      (365.25 * 86_400_000),
  );

/** Each member's lean, worked out once per organization (a body can be all of Congress). */
let leans: Map<string, number> | null = null;
/** How one member rates another, worked out once per organization: every post's vote reads the same pair again. */
let ratings: Map<string, number> | null = null;
function leanFor(api: CoreAPI, t: TermRow): number {
  const key = memberKey(t);
  const known = leans?.get(key);
  if (known !== undefined) return known;
  // Every member leans by the one rule (`leanOf`: a person's, an official's own); no party line stands in.
  const lean = leanOf(api, key);
  leans?.set(key, lean);
  return lean;
}

/**
 * How highly one member rates another for a post: their party (same side +1,
 * other side −1, none 0), how close their views are, their relationship, and
 * slightly, years served.
 */
function rating(
  api: CoreAPI,
  voter: TermRow,
  candidate: TermRow,
  partisan: boolean,
): number {
  if (!ratings) return ratingOf(api, voter, candidate, partisan);
  const key = `${memberKey(voter)}|${memberKey(candidate)}|${partisan ? 1 : 0}`;
  const known = ratings.get(key);
  if (known !== undefined) return known;
  const value = ratingOf(api, voter, candidate, partisan);
  ratings.set(key, value);
  return value;
}

function ratingOf(
  api: CoreAPI,
  voter: TermRow,
  candidate: TermRow,
  partisan: boolean,
): number {
  const a = partySide(voter.party);
  const b = partySide(candidate.party);
  const party = !partisan || a === 0 || b === 0 ? 0 : a === b ? 1 : -1;
  const views = 1 - Math.abs(leanFor(api, voter) - leanFor(api, candidate));
  const tie =
    voter.personId && candidate.personId
      ? feelingBetween(api.state, voter.personId, candidate.personId)
      : 0;
  const seniority =
    campaignParameter("leadershipSeniorityWeight") *
    yearsServed(candidate, api.state.date);
  return party + views + tie + seniority;
}

/** A member's vote among candidates: the player's own recorded choice, else whom they rate highest. */
function voteOf(
  api: CoreAPI,
  chamber: string,
  post: string,
  voter: TermRow,
  candidates: readonly TermRow[],
  partisan: boolean,
): string | null {
  const key = memberKey(voter);
  if (key === (api.state as CoreState).playerId) {
    const chosen = table(api, "choices").get(
      `vote:${chamber}:${post}:${key}`,
    ) as { candidateId: string } | undefined;
    return chosen?.candidateId ?? null;
  }
  const pool = candidates.filter((c) => memberKey(c) !== key);
  // The highest rating, a tie to the smaller member key (what sorting them and taking the first gave).
  let best: TermRow | null = null;
  let bestRating = 0;
  for (const c of pool) {
    const r = rating(api, voter, c, partisan);
    if (
      !best ||
      r > bestRating ||
      (r === bestRating && memberKey(c).localeCompare(memberKey(best)) < 0)
    ) {
      best = c;
      bestRating = r;
    }
  }
  return best ? memberKey(best) : null;
}

/** A plurality among the voters; a tie goes to the longest serving. */
function elect(
  api: CoreAPI,
  chamber: string,
  post: string,
  voters: readonly TermRow[],
  candidates: readonly TermRow[],
  partisan: boolean,
): { winner: TermRow | null; votes: Record<string, number> } {
  const votes: Record<string, number> = {};
  for (const voter of voters) {
    const choice = voteOf(api, chamber, post, voter, candidates, partisan);
    if (choice) votes[choice] = (votes[choice] ?? 0) + 1;
  }
  const date = api.state.date;
  const winner =
    [...candidates].sort(
      (a, b) =>
        (votes[memberKey(b)] ?? 0) - (votes[memberKey(a)] ?? 0) ||
        yearsServed(b, date) - yearsServed(a, date) ||
        memberKey(a).localeCompare(memberKey(b)),
    )[0] ?? null;
  return { winner, votes };
}

/**
 * The floor chooses between the caucuses' nominees. The majority caucus's
 * nominee holds the post unless another nominee wins a majority of the whole
 * body, which only a coalition across caucuses (or with members outside
 * them) can give; that post is recorded as held by a coalition. A tie or a
 * plurality short of a majority is not a coalition, so the largest caucus
 * keeps the post (as when a chamber splits evenly or a seat stands vacant).
 */
function floorVote(
  api: CoreAPI,
  chamber: string,
  post: string,
  all: readonly TermRow[],
  majority: readonly TermRow[],
  nominees: readonly TermRow[],
): {
  winner: TermRow | null;
  votes: Record<string, number>;
  heldBy: "majority-caucus" | "coalition";
} {
  const result = elect(api, chamber, post, all, nominees, true);
  const own = nominees.find((t) => majority.includes(t)) ?? null;
  const winner = result.winner;
  if (!winner || winner === own || !own)
    return { ...result, heldBy: "majority-caucus" };
  if ((result.votes[memberKey(winner)] ?? 0) * 2 > all.length)
    return { ...result, heldBy: "coalition" };
  return { winner: own, votes: result.votes, heldBy: "majority-caucus" };
}

/** Who may stand: members who said they would (the player), else every member. */
function standing(
  api: CoreAPI,
  chamber: string,
  post: string,
  pool: readonly TermRow[],
): readonly TermRow[] {
  const player = (api.state as CoreState).playerId;
  const playerTerm = pool.find((t) => memberKey(t) === player);
  if (
    playerTerm &&
    !table(api, "choices").get(`stand:${chamber}:${post}:${player}`)
  )
    return pool.filter((t) => t !== playerTerm);
  return pool;
}

/**
 * The engines a chamber's member list reads (`members` in legislature.ts), read
 * when called (the modules import each other):
 * the offices engine's seats, terms and vacancies, the officials it seats,
 * and the voting engine's seat results, which count from their date on.
 */
const membershipReadIds = () =>
  [OFFICES_MODULE_ID, OFFICIALS_MODULE_ID, "core2-voting-v1"] as const;
interface KeptMembership {
  readonly date: string;
  readonly stores: readonly unknown[];
  readonly writes: readonly number[];
  readonly signature: string;
}
/** Each chamber's member signature as last read, per world. Derived; never saved. */
const keptMembership = new WeakMap<object, Map<string, KeptMembership>>();
function membershipReads(api: CoreAPI) {
  const stores = membershipReadIds().map((id) =>
    api.state.modules.has(id) ? api.moduleState(id) : null,
  );
  return { stores, writes: stores.map((store) => store?.writes ?? -1) };
}
/** The chamber's signature when nothing its member list reads has changed since it was kept. */
function knownSignature(api: CoreAPI, chamber: string): string | undefined {
  const kept = keptMembership.get(api.state)?.get(chamber);
  if (!kept || kept.date !== api.state.date) return undefined;
  const now = membershipReads(api);
  return now.stores.every((store, i) => store === kept.stores[i]) &&
    now.writes.every((count, i) => count === kept.writes[i])
    ? kept.signature
    : undefined;
}
/** How many times a world's chamber member lists were rebuilt to check their membership. */
const rebuilds = new WeakMap<object, number>();
/** The count of member-list rebuilds in a world: a diagnostic for its speed check. */
export function membershipRebuilds(core: CoreState): number {
  return rebuilds.get(core) ?? 0;
}
function keepSignature(api: CoreAPI, chamber: string, signature: string) {
  let byChamber = keptMembership.get(api.state);
  if (!byChamber) keptMembership.set(api.state, (byChamber = new Map()));
  byChamber.set(chamber, {
    date: api.state.date,
    ...membershipReads(api),
    signature,
  });
}

/**
 * Organize a body if its membership changed since it last did: elect its
 * posts and assign its committees. Returns its posts.
 */
export function organize(api: CoreAPI, body: string): readonly PostRow[] {
  const chamber = chamberOf(api, body);
  const done = table(api, "organized").get(chamber) as unknown as
    OrganizedRow | undefined;
  // Membership has not changed since the chamber was last read: what its
  // member list reads (the date, and the offices, officials and voting
  // engines' records) is as it was, so its signature is too.
  const known = knownSignature(api, chamber);
  if (
    known !== undefined &&
    done?.signature === known &&
    !bookkeeping() &&
    !tableTraceOn()
  )
    return table(api, "posts").query("byChamber", [
      chamber,
    ]) as unknown as PostRow[];
  const all = members(api, chamber);
  rebuilds.set(api.state, (rebuilds.get(api.state) ?? 0) + 1);
  const signature = all.map(memberKey).sort().join("|");
  // Under bookkeeping (tests) the kept signature is checked against the list.
  if (known !== undefined && known !== signature)
    throw new Error(`Kept membership of ${chamber} differs from its members.`);
  keepSignature(api, chamber, signature);
  if (done?.signature === signature)
    return table(api, "posts").query("byChamber", [
      chamber,
    ]) as unknown as PostRow[];
  leans = new Map();
  ratings = new Map();
  try {
    return organizeNow(api, chamber, all, signature, done);
  } finally {
    leans = null;
    ratings = null;
  }
}

function organizeNow(
  api: CoreAPI,
  chamber: string,
  all: readonly TermRow[],
  signature: string,
  prior: OrganizedRow | undefined,
): readonly PostRow[] {
  const template = templateOf(api, chamber);
  const partisan = !/not-applicable|nonpartisan/.test(
    field<string>(template, "partyRatioRule"),
  );
  const date = api.state.date;
  const sides = new Map<number, TermRow[]>();
  for (const t of all) {
    const side = partisan ? partySide(t.party) : 0;
    sides.set(side, [...(sides.get(side) ?? []), t]);
  }
  const ranked = [...sides.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0] - b[0],
  );
  const majority = ranked[0]?.[1] ?? [];
  const minority = ranked[1]?.[1] ?? [];
  const keys = all.map(memberKey);
  const term = termOf(all);
  const side = ranked[0]?.[0] ?? 0;
  // The same term with the same side in the majority: members who left
  // have their posts and seats filled; everything else stands as it was.
  // A new term, a majority that changed hands or a player's stand or vote
  // (which clears the row) organizes the body in full.
  const sitting = new Set(keys);
  const fill =
    prior?.members !== undefined && prior.term === term && prior.side === side
      ? prior
      : undefined;
  const kept = new Map(
    (table(api, "posts").query("byChamber", [chamber]) as unknown as PostRow[])
      .filter(
        (row) =>
          fill !== undefined &&
          row.holderId !== null &&
          sitting.has(row.holderId),
      )
      .map((row) => [row.post, row] as const),
  );
  for (const row of table(api, "posts").query("byChamber", [chamber]))
    if (!kept.has((row as unknown as PostRow).post))
      table(api, "posts").remove(row.id);
  const filled: PostRow[] = [];
  const posts: PostRow[] = [];
  // One post each: a member who wins one doesn't stand for the next.
  const holders = new Set<string>();
  const open = (pool: readonly TermRow[]) =>
    pool.filter((t) => !holders.has(memberKey(t)));
  for (const post of field<Post[]>(template, "posts")) {
    const held = kept.get(post.key);
    if (held) {
      holders.add(held.holderId!);
      posts.push(held);
      continue;
    }
    let result: {
      winner: TermRow | null;
      votes: Record<string, number>;
      heldBy?: "majority-caucus" | "coalition";
    };
    // Where the council chooses the town's mayor from among its members, the
    // mayor is the council's president: the one chair, not a second vote.
    const mayorId =
      post.key === "council-president"
        ? councilChosenMayor(api, chamber)
        : null;
    const mayor = mayorId
      ? open(all).find((t) => memberKey(t) === mayorId)
      : undefined;
    if (mayor) result = { winner: mayor, votes: {} };
    else if (post.selection === "caucus-vote") {
      const caucus = post.key.startsWith("minority") ? minority : majority;
      result = elect(
        api,
        chamber,
        post.key,
        caucus,
        open(standing(api, chamber, post.key, caucus)),
        partisan,
      );
    } else if (partisan) {
      // Each caucus names its candidate; the floor chooses between them.
      const nominees = [majority, minority]
        .filter((c) => c.length)
        .map(
          (caucus) =>
            elect(
              api,
              chamber,
              `${post.key}:nomination`,
              caucus,
              open(standing(api, chamber, post.key, caucus)),
              partisan,
            ).winner,
        )
        .filter((t): t is TermRow => t !== null);
      result = floorVote(api, chamber, post.key, all, majority, nominees);
    } else
      result = elect(
        api,
        chamber,
        post.key,
        all,
        open(standing(api, chamber, post.key, all)),
        partisan,
      );
    if (result.winner) holders.add(memberKey(result.winner));
    const row: PostRow = {
      id: `${chamber}:${post.key}`,
      chamber,
      post: post.key,
      holderId: result.winner ? memberKey(result.winner) : null,
      since: date,
      votes: result.votes,
      ...(result.heldBy ? { heldBy: result.heldBy } : {}),
    };
    table(api, "posts").put(row as unknown as ModuleRow);
    posts.push(row);
    filled.push(row);
  }
  assignCommittees(
    api,
    chamber,
    template,
    all,
    majority,
    minority,
    posts,
    partisan,
    fill,
  );
  table(api, "organized").put({
    id: chamber,
    signature,
    date,
    members: keys,
    term,
    side,
  });
  if (filled.some((p) => p.holderId))
    api.emit({
      id: `chamber-organized:${chamber}:${date}`,
      date,
      kind: "chamber-organized",
      personIds: filled
        .map((p) => p.holderId)
        .filter((id): id is string => !!id && api.state.people.has(id)),
      placeId: (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("loaded")
          .get("town") as unknown as { townPlaceId: string }
      ).townPlaceId,
      source: {
        tag: "ESTIMATED",
        citation:
          "data/research/legislature/chamber-leadership.json (NCSL, House and Senate rules, NLC forms of government)",
        asOf: date,
        estimatedFrom: "chamber-leadership",
      },
      publicRecord: true,
      news: true,
      facts: {
        level: bodyReach(api, chamber),
        // A refill of what one leaver held, not an organizing of the body.
        ...(fill ? { "mid-term": "yes" } : {}),
        ...Object.fromEntries(filled.map((p) => [p.post, p.holderId ?? ""])),
      },
    });
  return posts;
}

/** Who assigns committee seats, by the chamber's rule, among its posts. */
function assigner(
  template: Template,
  posts: readonly PostRow[],
): { majority: string | null; minority: string | null; by: string } {
  const authority = field<string>(template, "assignmentAuthority");
  const holder = (key: string) =>
    posts.find((p) => p.post === key)?.holderId ?? null;
  const presiding =
    holder("speaker") ??
    holder("president-pro-tempore") ??
    holder("council-president") ??
    holder("chair") ??
    holder("mayor-pro-tem");
  const lead =
    authority === "speaker" ||
    authority === "senate-president" ||
    authority === "council-president" ||
    authority === "presiding-officer"
      ? presiding
      : (holder("majority-leader") ?? presiding);
  return {
    majority: lead,
    minority: holder("minority-leader") ?? lead,
    by: authority,
  };
}

function assignCommittees(
  api: CoreAPI,
  chamber: string,
  template: Template,
  all: readonly TermRow[],
  majority: readonly TermRow[],
  minority: readonly TermRow[],
  posts: readonly PostRow[],
  partisan: boolean,
  fill: OrganizedRow | undefined,
): void {
  // A fill keeps every seat whose member still sits; a full organizing
  // clears them all.
  const standing = new Set(all.map(memberKey));
  const arrived = new Set(
    fill?.members
      ? all.map(memberKey).filter((k) => !fill.members!.includes(k))
      : [],
  );
  const before = new Map(
    (
      table(api, "committees").query("byChamber", [
        chamber,
      ]) as unknown as CommitteeRow[]
    ).map((row) => [row.committee, row] as const),
  );
  if (!fill || all.length <= campaignParameter("committeeOfTheWholeMaximum"))
    for (const row of before.values()) table(api, "committees").remove(row.id);
  if (all.length <= campaignParameter("committeeOfTheWholeMaximum")) return;
  const size = Math.min(
    all.length,
    Math.max(
      campaignParameter("committeeSizeMinimum"),
      Math.min(
        campaignParameter("committeeSizeMaximum"),
        campaignParameter("committeeSize"),
      ),
    ),
  );
  const byKey = new Map(all.map((t) => [memberKey(t), t]));
  const who = assigner(template, posts);
  const minoritySeats = partisan
    ? Math.min(
        minority.length,
        Math.round((size * minority.length) / all.length),
        size - (Math.floor(size / 2) + 1),
      )
    : 0;
  const load = new Map<string, number>();
  if (fill)
    for (const row of before.values())
      for (const id of row.memberIds)
        if (standing.has(id)) load.set(id, (load.get(id) ?? 0) + 1);
  const cap = Math.ceil((COMMITTEES.length * size) / all.length);
  const appoint = (
    committee: string,
    authorityId: string | null,
    pool: readonly TermRow[],
    n: number,
    seatedAlready: ReadonlySet<string>,
  ): TermRow[] => {
    const authority = authorityId ? byKey.get(authorityId) : undefined;
    const chosen = pool
      .filter(
        (t) =>
          !seatedAlready.has(memberKey(t)) &&
          (load.get(memberKey(t)) ?? 0) < cap,
      )
      .map((t) => ({
        t,
        r:
          (authority ? rating(api, authority, t, partisan) : 0) +
          campaignParameter("committeeInterestWeight") *
            interestIn(api, t, committee),
      }))
      .sort(
        (a, b) =>
          b.r - a.r ||
          yearsServed(b.t, api.state.date) - yearsServed(a.t, api.state.date) ||
          memberKey(a.t).localeCompare(memberKey(b.t)),
      )
      .slice(0, Math.max(0, n))
      .map((x) => x.t);
    for (const t of chosen)
      load.set(memberKey(t), (load.get(memberKey(t)) ?? 0) + 1);
    return chosen;
  };
  const chairRule = field<string>(template, "chairSelectionAuthority");
  for (const committee of COMMITTEES) {
    const majorityPool = partisan ? majority : all;
    const old = fill ? before.get(committee) : undefined;
    const sitting = (old?.memberIds ?? [])
      .filter((id) => standing.has(id))
      .map((id) => byKey.get(id)!);
    const sittingMajority = sitting.filter((t) =>
      majorityPool.includes(t),
    ).length;
    // Seats the party ratio no longer gives a side (the sides changed size)
    // are not kept: the committee is seated again by the assigner's rule.
    const ratioHolds =
      sittingMajority <= size - minoritySeats &&
      sitting.length - sittingMajority <= minoritySeats;
    // Every member of a committee still sits and its ratio holds: it stands as it was.
    if (old && ratioHolds && sitting.length === old.memberIds.length) continue;
    const stay = ratioHolds ? sitting : [];
    for (const t of sitting)
      if (!ratioHolds)
        load.set(memberKey(t), (load.get(memberKey(t)) ?? 1) - 1);
    const stayKeys = new Set(stay.map(memberKey));
    const stayMajority = stay.filter((t) => majorityPool.includes(t)).length;
    // A seat left open goes first to a member who arrived since the body
    // last organized (a vacancy's new holder is seated where the leaver
    // sat), then to the rest, each by the assigner's own rating.
    const take = (
      authority: string | null,
      pool: readonly TermRow[],
      n: number,
    ): TermRow[] => {
      const first = appoint(
        committee,
        authority,
        pool.filter((t) => arrived.has(memberKey(t))),
        n,
        stayKeys,
      );
      return [
        ...first,
        ...appoint(
          committee,
          authority,
          pool,
          n - first.length,
          new Set([...stayKeys, ...first.map(memberKey)]),
        ),
      ];
    };
    const seated = [
      ...stay,
      ...take(who.majority, majorityPool, size - minoritySeats - stayMajority),
      ...(minoritySeats
        ? take(
            who.minority,
            minority,
            minoritySeats - (stay.length - stayMajority),
          )
        : []),
    ];
    if (!seated.length) continue;
    const eligible = seated.filter((t) => majorityPool.includes(t));
    // The chair: the assigning authority's pick, or the committee's vote.
    const authority = who.majority ? byKey.get(who.majority) : undefined;
    const keptChair =
      old && ratioHolds && standing.has(old.chairId)
        ? byKey.get(old.chairId)
        : undefined;
    const chair =
      keptChair ??
      (/vote/.test(chairRule) || !authority
        ? elect(api, chamber, `${committee}:chair`, seated, eligible, partisan)
            .winner
        : [...eligible].sort(
            (a, b) =>
              rating(api, authority, b, partisan) -
                rating(api, authority, a, partisan) ||
              memberKey(a).localeCompare(memberKey(b)),
          )[0]);
    table(api, "committees").put({
      id: `${chamber}:${committee}`,
      chamber,
      committee,
      memberIds: seated.map(memberKey),
      chairId: chair ? memberKey(chair) : memberKey(seated[0]!),
      assignedBy: who.by,
      since: api.state.date,
    } as unknown as ModuleRow);
  }
}

/** A body's committee as its leadership seated it (organizing it first if needed). */
export function committeeRoster(
  api: CoreAPI,
  body: string,
  committee: string,
): { memberIds: readonly string[]; chairId: string } | null {
  const chamber = chamberOf(api, body);
  organize(api, chamber);
  const row = table(api, "committees").get(
    `${chamber}:${committee}`,
  ) as unknown as CommitteeRow | undefined;
  return row ? { memberIds: row.memberIds, chairId: row.chairId } : null;
}

/**
 * A chamber's committees as leadership last seated them, without seating them
 * again: read by the sitting reader (`office-day-state.ts` ROOMS), which
 * leadership's own elections read through closeness, so organizing from it
 * would loop. Empty before the chamber is first organized.
 */
export function seatedCommittees(
  api: CoreAPI,
  body: string,
): readonly CommitteeRow[] {
  if (!api.state.modules.has(LEADERSHIP_MODULE_ID)) return [];
  return table(api, "committees").query("byChamber", [
    chamberOf(api, body),
  ]) as unknown as CommitteeRow[];
}

/**
 * The record that seated a committee: its id (`chamber:committee`), who
 * assigned it and the day, for a member told where they sit. Null where the
 * body has no such committee.
 */
export function committeeAssignment(
  api: CoreAPI,
  body: string,
  committee: string,
): { id: string; assignedBy: string; since: string } | null {
  const chamber = chamberOf(api, body);
  organize(api, chamber);
  const row = table(api, "committees").get(
    `${chamber}:${committee}`,
  ) as unknown as CommitteeRow | undefined;
  return row
    ? { id: row.id, assignedBy: row.assignedBy, since: row.since }
    : null;
}

/** The holder of a post (a speaker, a majority leader, a council president). */
export function leaderOf(
  api: CoreAPI,
  body: string,
  post: string,
): string | null {
  if (!api.state.modules.has(LEADERSHIP_MODULE_ID)) return null;
  const chamber = chamberOf(api, body);
  organize(api, chamber);
  const row = table(api, "posts").get(`${chamber}:${post}`) as unknown as
    PostRow | undefined;
  return row?.holderId ?? null;
}

/** The body's presiding officer, whatever the post is called there. */
export function presidingOfficer(api: CoreAPI, chamber: string): string | null {
  return (
    leaderOf(api, chamber, "speaker") ??
    leaderOf(api, chamber, "president-pro-tempore") ??
    leaderOf(api, chamber, "council-president") ??
    leaderOf(api, chamber, "chair") ??
    leaderOf(api, chamber, "mayor-pro-tem")
  );
}

/** The player stands for a post at the body's next organization. */
export function standForPost(
  api: CoreAPI,
  input: {
    readonly chamber: string;
    readonly post: string;
    readonly personId: string;
  },
): void {
  const chamber = chamberOf(api, input.chamber);
  table(api, "choices").put({
    id: `stand:${chamber}:${input.post}:${input.personId}`,
  });
  table(api, "organized").remove(chamber);
}

/** The player's own vote for a post; without one, the player abstains. */
export function voteForPost(
  api: CoreAPI,
  input: {
    readonly chamber: string;
    readonly post: string;
    readonly voterId: string;
    readonly candidateId: string;
  },
): void {
  const chamber = chamberOf(api, input.chamber);
  table(api, "choices").put({
    id: `vote:${chamber}:${input.post}:${input.voterId}`,
    candidateId: input.candidateId,
  });
  table(api, "organized").remove(chamber);
}
