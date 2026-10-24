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
import { declareSnapshotCovered } from "../snapshot";
import leadershipData from "../../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
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
import { officialOf } from "./officials";
import { concerns } from "./meetings";
import { campaignParameter } from "../campaign-views";

export const LEADERSHIP_MODULE_ID = "core2-leadership-v1";

type Template =
  | "federal-house"
  | "federal-senate"
  | "state-house"
  | "state-senate"
  | "unicameral"
  | "council-manager"
  | "mayor-council";

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
  // A council beside an elected mayor organizes under its mayor; otherwise
  // (and for county and township boards, an estimate) as a council-manager
  // body elects its own president.
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

const yearsServed = (t: TermRow, date: string) =>
  Math.max(
    0,
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${t.serviceStart ?? t.startDate}T00:00:00Z`)) /
      (365.25 * 86_400_000),
  );

/** Each member's lean, worked out once per organization (a body can be all of Congress). */
let leans: Map<string, number> | null = null;
function leanFor(api: CoreAPI, t: TermRow): number {
  const key = memberKey(t);
  const known = leans?.get(key);
  if (known !== undefined) return known;
  // A named official not yet filled in leans by their party (as `leanOf`).
  const lean = api.state.people.has(key)
    ? leanOf(api, key)
    : partySide(t.party) * campaignParameter("identityLeanScale");
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
  const a = partySide(voter.party);
  const b = partySide(candidate.party);
  const party = !partisan || a === 0 || b === 0 ? 0 : a === b ? 1 : -1;
  const views = 1 - Math.abs(leanFor(api, voter) - leanFor(api, candidate));
  const tie =
    voter.personId && candidate.personId
      ? closenessBetween(api.state, voter.personId, candidate.personId)
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
  const best = pool
    .map((c) => ({ c, r: rating(api, voter, c, partisan) }))
    .sort(
      (x, y) => y.r - x.r || memberKey(x.c).localeCompare(memberKey(y.c)),
    )[0];
  return best ? memberKey(best.c) : null;
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
 * Organize a body if its membership changed since it last did: elect its
 * posts and assign its committees. Returns its posts.
 */
export function organize(api: CoreAPI, body: string): readonly PostRow[] {
  const chamber = chamberOf(api, body);
  const all = members(api, chamber);
  const signature = all.map(memberKey).sort().join("|");
  const done = table(api, "organized").get(chamber) as
    { signature: string } | undefined;
  if (done?.signature === signature)
    return table(api, "posts").query("byChamber", [
      chamber,
    ]) as unknown as PostRow[];
  leans = new Map();
  try {
    return organizeNow(api, chamber, all, signature);
  } finally {
    leans = null;
  }
}

function organizeNow(
  api: CoreAPI,
  chamber: string,
  all: readonly TermRow[],
  signature: string,
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
  for (const row of table(api, "posts").query("byChamber", [chamber]))
    table(api, "posts").remove(row.id);
  const posts: PostRow[] = [];
  // One post each: a member who wins one doesn't stand for the next.
  const holders = new Set<string>();
  const open = (pool: readonly TermRow[]) =>
    pool.filter((t) => !holders.has(memberKey(t)));
  for (const post of field<Post[]>(template, "posts")) {
    let result: {
      winner: TermRow | null;
      votes: Record<string, number>;
      heldBy?: "majority-caucus" | "coalition";
    };
    if (post.selection === "caucus-vote") {
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
  );
  table(api, "organized").put({ id: chamber, signature, date });
  if (posts.some((p) => p.holderId))
    api.emit({
      id: `chamber-organized:${chamber}:${date}`,
      date,
      kind: "chamber-organized",
      personIds: posts
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
        ...Object.fromEntries(posts.map((p) => [p.post, p.holderId ?? ""])),
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
): void {
  for (const row of table(api, "committees").query("byChamber", [chamber]))
    table(api, "committees").remove(row.id);
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
  const cap = Math.ceil((COMMITTEES.length * size) / all.length);
  const appoint = (
    committee: string,
    authorityId: string | null,
    pool: readonly TermRow[],
    n: number,
  ): TermRow[] => {
    const authority = authorityId ? byKey.get(authorityId) : undefined;
    const chosen = pool
      .filter((t) => (load.get(memberKey(t)) ?? 0) < cap)
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
      .slice(0, n)
      .map((x) => x.t);
    for (const t of chosen)
      load.set(memberKey(t), (load.get(memberKey(t)) ?? 0) + 1);
    return chosen;
  };
  const chairRule = field<string>(template, "chairSelectionAuthority");
  for (const committee of COMMITTEES) {
    const majorityPool = partisan ? majority : all;
    const seated = [
      ...appoint(committee, who.majority, majorityPool, size - minoritySeats),
      ...(minoritySeats
        ? appoint(committee, who.minority, minority, minoritySeats)
        : []),
    ];
    if (!seated.length) continue;
    const eligible = seated.filter((t) => majorityPool.includes(t));
    // The chair: the assigning authority's pick, or the committee's vote.
    const authority = who.majority ? byKey.get(who.majority) : undefined;
    const chair =
      /vote/.test(chairRule) || !authority
        ? elect(api, chamber, `${committee}:chair`, seated, eligible, partisan)
            .winner
        : [...eligible].sort(
            (a, b) =>
              rating(api, authority, b, partisan) -
                rating(api, authority, a, partisan) ||
              memberKey(a).localeCompare(memberKey(b)),
          )[0];
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

// Every table this engine keeps is in the snapshot; see scripts/core2-guard/snapshot-roundtrip.mjs.
declareSnapshotCovered("core2-leadership-v1");
