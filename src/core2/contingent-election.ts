/**
 * The contingent election (U.S. Const. amend. XII): when no ticket wins a
 * majority of the electors, the House chooses the president, one vote to each
 * state's delegation, and the Senate chooses the vice president, one vote to
 * each senator. Each member's vote is the side of the two major tickets they
 * weigh highest: their party's pull (scaled by their loyalty), their
 * district's lean, and how their state's electors went. Nothing is rolled: the
 * same members and the same electors always give the same vote, and every
 * vote keeps its parts. A delegation that splits evenly casts no vote.
 */
import data from "./data/elections/contingent-election.json" with { type: "json" };
import { caucusSide } from "./appointments";
import { leaderOf } from "./modules/leadership";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "./modules/legislature";
import { officialOf } from "./modules/officials";
import type { CoreAPI } from "./types";

export interface MemberVote {
  readonly memberId: string;
  readonly stateKey: string;
  /** Right (Republican) ticket positive, left negative, zero when nothing moves them. */
  readonly side: number;
  readonly parts: {
    readonly party: number;
    readonly district: number;
    readonly stateVote: number;
  };
  readonly total: number;
}

export interface DelegationVote {
  readonly stateKey: string;
  readonly members: number;
  readonly republican: number;
  readonly democratic: number;
  /** The delegation's one vote: the side most of its members chose, none on a tie. */
  readonly side: number;
  readonly memberVotes: readonly MemberVote[];
}

export interface ContingentResult {
  readonly year: number;
  readonly house: {
    readonly delegations: readonly DelegationVote[];
    readonly republicanStates: number;
    readonly democraticStates: number;
    readonly needed: number;
    readonly quorum: boolean;
    /** The side the House chose, or 0 when no ticket had the states it needed. */
    readonly chosenSide: number;
  };
  readonly senate: {
    readonly votes: readonly MemberVote[];
    readonly republican: number;
    readonly democratic: number;
    readonly needed: number;
    readonly chosenSide: number;
  };
  /** The side of the president: the House's choice, else the one who acts (amend. XX, § 3). */
  readonly presidentSide: number;
  /** The side of the vice president, or 0 when the Senate chose no one. */
  readonly vicePresidentSide: number;
  /** Who acts as president when the House chose no one. */
  readonly acting: "vice-president-elect" | "speaker" | null;
  readonly sourceRecordIds: readonly string[];
}

const PARAMETERS = data.parameters;

/** Where a member of Congress stands between the two tickets, and why. */
function memberVote(
  api: CoreAPI,
  term: ReturnType<typeof members>[number],
  stateKey: string,
  electors: Readonly<Record<string, number>>,
  chamber: "house" | "senate",
): MemberVote {
  const id = memberKey(term);
  const official = officialOf(api, id);
  const side = caucusSide(official?.independent?.caucus ?? term.party);
  const party = PARAMETERS.party.value * (official?.loyalty ?? 1) * side;
  const lean =
    chamber === "house"
      ? (official?.districtLean ?? 0)
      : (official?.stateLean ?? 0);
  const district = PARAMETERS.district.value * lean;
  const stateVote = PARAMETERS.stateVote.value * (electors[stateKey] ?? 0);
  const total = party + district + stateVote;
  return {
    memberId: id,
    stateKey,
    side: Math.sign(total),
    parts: { party, district, stateVote },
    total,
  };
}

/**
 * Hold the House's and the Senate's votes. `electors` is the side each state's
 * electors went to (right positive), the state's own pull on its members.
 */
export function contingentElection(
  api: CoreAPI,
  input: {
    readonly year: number;
    readonly electors: Readonly<Record<string, number>>;
    /** How many states have electors and a House delegation. */
    readonly states: number;
  },
): ContingentResult {
  const byState = new Map<string, MemberVote[]>();
  for (const term of members(api, FEDERAL_HOUSE)) {
    const stateKey = term.seatId.split(":")[1] ?? "";
    const row = byState.get(stateKey) ?? [];
    row.push(memberVote(api, term, stateKey, input.electors, "house"));
    byState.set(stateKey, row);
  }
  const delegations: DelegationVote[] = [...byState]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stateKey, votes]) => {
      const republican = votes.filter((v) => v.side > 0).length;
      const democratic = votes.filter((v) => v.side < 0).length;
      return {
        stateKey,
        members: votes.length,
        republican,
        democratic,
        side: Math.sign(republican - democratic),
        memberVotes: votes,
      };
    });
  const republicanStates = delegations.filter((d) => d.side > 0).length;
  const democraticStates = delegations.filter((d) => d.side < 0).length;
  const needed = Math.floor(input.states / 2) + 1;
  const quorum =
    delegations.length >= data.house.quorumShareOfStates * input.states;
  const houseSide = !quorum
    ? 0
    : republicanStates >= needed
      ? 1
      : democraticStates >= needed
        ? -1
        : 0;

  const senators = members(api, FEDERAL_SENATE).map((term) =>
    memberVote(
      api,
      term,
      term.seatId.split(":")[1] ?? "",
      input.electors,
      "senate",
    ),
  );
  const senateRepublican = senators.filter((v) => v.side > 0).length;
  const senateDemocratic = senators.filter((v) => v.side < 0).length;
  const senateNeeded = Math.floor(senators.length / 2) + 1;
  const senateSide =
    senateRepublican >= senateNeeded
      ? 1
      : senateDemocratic >= senateNeeded
        ? -1
        : 0;

  // The House chose, or the vice president-elect acts, or the Speaker does.
  let presidentSide = houseSide;
  let acting: ContingentResult["acting"] = null;
  if (houseSide === 0) {
    const speaker = leaderOf(api, FEDERAL_HOUSE, "speaker");
    const speakerTerm = members(api, FEDERAL_HOUSE).find(
      (term) => memberKey(term) === speaker,
    );
    for (const who of data.actingOrder) {
      if (who === "vice-president-elect" && senateSide !== 0) {
        presidentSide = senateSide;
        acting = "vice-president-elect";
        break;
      }
      if (who === "speaker" && speakerTerm) {
        presidentSide = caucusSide(speakerTerm.party);
        acting = "speaker";
        break;
      }
    }
  }
  return {
    year: input.year,
    house: {
      delegations,
      republicanStates,
      democraticStates,
      needed,
      quorum,
      chosenSide: houseSide,
    },
    senate: {
      votes: senators,
      republican: senateRepublican,
      democratic: senateDemocratic,
      needed: senateNeeded,
      chosenSide: senateSide,
    },
    presidentSide,
    // The vice president is the Senate's choice, and none when the vice
    // president-elect is the one acting as president.
    vicePresidentSide: acting === "vice-president-elect" ? 0 : senateSide,
    acting,
    sourceRecordIds: [`contingent:${input.year}`],
  };
}
