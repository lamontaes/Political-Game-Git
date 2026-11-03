/**
 * A "yes" at the door is near-binding (owner, Oct 29), in a random place.
 *
 * A campaign's knock that asks for the vote leaves a pledge row with each
 * resident who would vote for the candidate now, full people and counted
 * residents alike, and one word a race: a yes to a new candidate replaces a
 * yes to a rival. The ballot reads it as the voter's own word, so a pledged
 * voter with nothing heavy against it votes for the candidate; a rival the
 * voter is closer to weakens it by how much closer, with no roll.
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { countedChoice, countedResidents } from "./electorate";
import { electorateParameter } from "./electorate-inputs";
import { drawPlace } from "../../scripts/core2-year/place";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { setKeepEveryonesWhy } from "./why-kept";
import { openOffices } from "./modules/offices";
import {
  ballot,
  fileCandidacy,
  openContests,
  openElections,
  petitionCirculating,
  petitionOf,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  knockDoors,
  openCampaigns,
  pledgeOf,
  pledgesOf,
  type PledgeRow,
} from "./modules/campaigns";
import { openLaws } from "./modules/laws";
import { openParties } from "./modules/parties";
import {
  VOTING_MODULE_ID,
  countedBallotsOf,
  doorAppealOf,
  doorChoiceOf,
  holdElection,
  openVoting,
  pledgeDoubt,
  resultOf,
  type BallotRow,
} from "./modules/voting";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { addDays, makeIsoDate } from "./kernel/dates";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`door-pledge:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `state${salt}`);
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, `place${salt}`);
}

/** Two residents filed for the soonest local or state race that takes both, or undefined. */
function filedRace(place: string) {
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: place,
      startedAt: START,
      minimumPeople: 60,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  const api = coreAPI(core);
  const adults = [...core.people.values()]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  const platform = [`${pick(PLATFORM_QUESTIONS, "q1")}=1`];
  const against = [`${pick(PLATFORM_QUESTIONS, "q1")}=-1`];
  for (const open of openContests(api).filter((c) => c.level !== "federal")) {
    const filed: FilingRow[] = [];
    for (const [n, person] of adults.slice(0, 2).entries()) {
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: open.id,
        platform: n ? against : platform,
      });
      if (result.status === "refused") break;
      if (["petitioning", "on-ballot"].includes(result.filing.status ?? ""))
        filed.push(result.filing);
    }
    if (filed.length === 2) return { core, api, contest: open, filed };
  }
  return undefined;
}

describe("a door yes is near-binding", () => {
  it("the knock writes a yes from each resident who would vote for the candidate, one a race, and the ballot holds the voter to it", () => {
    const previousWhy = setKeepEveryonesWhy(true);
    try {
      const draws = [
        ...(process.env.GOLDEN_PATH_PLACE_KEY
          ? [process.env.GOLDEN_PATH_PLACE_KEY]
          : []),
        ...Array.from({ length: 8 }, (_, n) => randomPlace(`:${n}`).key),
      ];
      let place = "";
      let world: ReturnType<typeof filedRace>;
      for (place of draws) {
        world = filedRace(place);
        if (world) break;
      }
      expect(world, `no race two residents could file for`).toBeDefined();
      const { core, api, contest, filed } = world!;
      console.log(`door pledges: playing ${place}, seed ${seed}`);
      openVoting(core);
      const [mine, theirs] = filed as [FilingRow, FilingRow];
      // A door that carries a petition asks for a signature, not the vote:
      // knock once the petitions are in.
      const dues = filed
        .filter((f) => petitionCirculating(api, f.id))
        .map((f) => petitionOf(api, f.id)!.due)
        .sort();
      if (dues.length) advanceCore(core, addDays(makeIsoDate(dues.at(-1)!), 1));
      expect(
        core.date < contest.electionDate,
        `${place} (seed ${seed}): the petitions close after the election`,
      ).toBe(true);
      const pledgeTo = (voterId: string, candidateId: string) =>
        pledgeOf(api, voterId, candidateId, contest.id);
      // Evenings of doors until someone says yes (a town can mostly prefer
      // the rival), up to a fortnight of them.
      const met: ReturnType<typeof knockDoors>[number][] = [];
      for (
        let evening = 0;
        evening < 14 && !met.some((c) => pledgeTo(c.voterId, mine.personId));
        evening++
      )
        met.push(
          ...knockDoors(api, {
            filingId: mine.id,
            canvasserId: mine.personId,
            hours: 4,
          }),
        );
      expect(met.length, `${place}: nobody opened`).toBeGreaterThan(0);
      // A yes is said by each resident who would vote for the candidate now,
      // naming the visit; nobody else says it.
      const causesOf = new Map<string, string[]>();
      for (const cause of met)
        causesOf.set(cause.voterId, [
          ...(causesOf.get(cause.voterId) ?? []),
          cause.id,
        ]);
      for (const [voterId, causes] of causesOf) {
        const pledge = pledgeTo(voterId, mine.personId);
        const choice = doorChoiceOf(api, voterId, contest.id);
        if (choice === mine.personId) {
          expect(causes, `${place}: ${voterId}`).toContain(pledge?.causeId);
          expect(pledge!.canvasserId).toBe(mine.personId);
        } else
          expect(pledge, `${place}: ${voterId} chose ${choice}`).toBeNull();
      }
      expect(
        [...causesOf.keys()].some((v) => pledgeTo(v, mine.personId)),
        `${place} (seed ${seed}): no yes at ${met.length} doors`,
      ).toBe(true);
      // A counted resident's door answer is written by the same rule,
      // without filling them in.
      knockDoors(api, {
        filingId: theirs.id,
        canvasserId: theirs.personId,
        hours: 6,
        fillCounted: false,
      });
      // Yes's to a candidate in this race: a candidate who is also running
      // elsewhere holds yes's there too.
      const allPledges = (candidateId: string) =>
        (
          api
            .moduleState(CAMPAIGNS_MODULE_ID)
            .table("pledges")
            .query("byCandidate", [candidateId]) as unknown as PledgeRow[]
        ).filter((p) => p.contestId === contest.id);
      const countedPledges = allPledges(theirs.personId).filter(
        (p) => p.causeId === null,
      );
      // One word a race: no resident holds a yes to both, and each yes to
      // the rival went to the one they would vote for.
      const toMine = new Set(allPledges(mine.personId).map((p) => p.voterId));
      for (const p of allPledges(theirs.personId)) {
        expect(
          toMine.has(p.voterId),
          `${place}: ${p.voterId} pledged twice`,
        ).toBe(false);
        expect(doorChoiceOf(api, p.voterId, contest.id)).toBe(theirs.personId);
      }
      const pledged = [...causesOf.keys()].filter((v) =>
        pledgeTo(v, mine.personId),
      );
      expect(pledged.length, `${place}: every yes switched`).toBeGreaterThan(0);

      // A rival the voter is closer to undoes the word by how much closer.
      const tested = core.people.get(pledged[0]!)!;
      const pledge = pledgeOf(api, tested.id, mine.personId, contest.id)!;
      const field = filed.map((f) => ({ id: f.personId }));
      const before = pledgeDoubt(api, tested, 0, pledge, field);
      api.meet(tested.id, theirs.personId, {
        placeId: tested.householdId,
        sourceId: `test:${tested.id}`,
        cause: "neighbors",
        hours: 40,
      });
      const after = pledgeDoubt(api, tested, 0, pledge, field);
      expect(after, `${place}: closeness to a rival`).toBeGreaterThan(before);
      expect(after).toBeLessThanOrEqual(1);

      advanceCore(core, addDays(makeIsoDate(contest.electionDate), 1));
      expect(resultOf(api, contest.id), `${place}: no result`).not.toBeNull();
      const ballots = api
        .moduleState(VOTING_MODULE_ID)
        .table("ballots")
        .query("byContest", [contest.id]) as unknown as BallotRow[];
      const weight = campaignParameter("doorPledgeWeight");
      const onBallot = new Set(ballot(api, contest.id).map((f) => f.personId));
      // The yes a voter holds on election day is the record's, not the list
      // the first knock made. A later knock that ends in a no leaves it as it
      // was (near-binding, owner Oct 29); only a yes to a rival in the race
      // replaces it (`answerAtDoor`), so a voter met at the first knock who
      // holds none by the count holds a rival's.
      const keptYes = (voterId: string) =>
        pledgeOf(api, voterId, mine.personId, contest.id);
      const movedOn = pledged.filter((v) => !keptYes(v));
      const rivalYes = (voterId: string) =>
        pledgesOf(api, voterId).some(
          (p) => p.contestId === contest.id && p.candidateId !== mine.personId,
        );
      // A voter's word goes only to a rival who now outweighs it: one who
      // holds no yes to the candidate holds a rival's in this race, and their
      // ballot carries no pledge part for the candidate.
      for (const voterId of movedOn) {
        expect(
          rivalYes(voterId),
          `${place} (seed ${seed}): ${voterId} lost a yes with no yes to a rival`,
        ).toBe(true);
        const part = ballots.find((x) => x.voterId === voterId)?.appeal[
          mine.personId
        ];
        expect(
          part?.pledge ?? 0,
          `${place} (seed ${seed}): ${voterId} voted on a yes it gave a rival`,
        ).toBe(0);
      }
      console.log(
        `door pledges: ${place}, seed ${seed}; ${movedOn.length} of ${pledged.length} voters who said yes at the first knock gave a rival their yes by election day`,
      );
      // Only a candidate still on the ballot holds anyone to a door "yes".
      if (!onBallot.has(mine.personId)) return;
      let held = 0;
      for (const voterId of pledged) {
        const b = ballots.find((x) => x.voterId === voterId);
        if (!b?.voted || b.voterId === tested.id) continue;
        // A voter who gave a rival their yes holds no word to weigh here
        // (read above).
        const word = keptYes(b.voterId);
        if (!word) continue;
        // A candidate in the race backs themselves; a voter who also told
        // another candidate yes weighs both words.
        if (
          pledgesOf(api, b.voterId).some(
            (p) =>
              p.contestId === contest.id && p.candidateId !== mine.personId,
          ) ||
          onBallot.has(b.voterId)
        )
          continue;
        // The ballot carries their word, as far as it still holds: undone
        // only by what heavy they learned since (pledgeDoubt).
        const part = b.appeal[mine.personId]?.pledge ?? 0;
        const voter = core.people.get(b.voterId)!;
        const holds =
          1 -
          pledgeDoubt(
            api,
            voter,
            b.lean ?? 0,
            word,
            ballot(api, contest.id).map((f) => ({ id: f.personId })),
          );
        expect(part, `${place}: ${b.id} pledge as held`).toBeCloseTo(
          weight * holds,
          6,
        );
        if (holds === 0) continue;
        // Held in full, it decides the vote for the candidate.
        if (part === weight) {
          expect(
            b.choice,
            `${place}: ${b.id} broke a held pledge ${JSON.stringify(b.appeal)}`,
          ).toBe(mine.personId);
          held += 1;
        }
      }
      // Their word at the door is also a word to vote, each voter's by their
      // own reasons: where the ballot still holds the yes, the turnout of
      // one who voted carries the pledge reason. Whether the pledged as a
      // group turn out more than the town's others is the parameter's total
      // check, which read 0.17 of 18 against 0.19 of 36 in 1717939 (seed
      // dp-fresh-1) and is pool item campaign-door-pledge-turnout-total.
      for (const b of ballots.filter((x) => x.voted))
        if (
          keptYes(b.voterId) &&
          (b.appeal[mine.personId]?.pledge ?? 0) > 0 &&
          !onBallot.has(b.voterId)
        )
          expect(
            b.turnoutReasons.pledge ?? 0,
            `${place}: ${b.id} turnout without its word`,
          ).toBeGreaterThan(0);
      // A record standing for one household carries the pledge on its own
      // ballot; one standing for several votes one household on its word.
      const counted = countedBallotsOf(api, contest.id);
      const kept = api
        .moduleState(VOTING_MODULE_ID)
        .table("countedBallots")
        .get(`counted:${contest.id}`) as unknown as
        | {
            readonly voterIds: readonly string[];
            readonly weight: readonly number[];
            readonly pledgedChoice?: readonly number[];
          }
        | undefined;
      for (const p of countedPledges) {
        const at = kept?.voterIds.indexOf(p.voterId) ?? -1;
        if (at < 0) continue;
        if (kept!.weight[at]! <= 1)
          expect(
            counted[at]!.appeal[theirs.personId]?.pledge,
            `${place}: counted ${p.voterId}`,
          ).toBeGreaterThan(0);
        else
          expect(
            kept!.pledgedChoice?.[at],
            `${place}: counted ${p.voterId} of ${kept!.weight[at]}`,
          ).toBeGreaterThanOrEqual(0);
      }
      console.log(
        `door pledges: ${place}, seed ${seed}; ${pledged.length} of ${causesOf.size} residents met said yes; ${held} held ballots voted as pledged; ${countedPledges.length} counted residents pledged to the rival; doubt from a closer rival ${before.toFixed(2)} -> ${after.toFixed(2)}`,
      );
    } finally {
      setKeepEveryonesWhy(previousWhy);
    }
  }, 300_000);
});

describe("a door yes holds for the one household the door reached", () => {
  it("in a town whose counted records each stand for several households, the pledged household votes on its word and the rest as they would have", () => {
    // A played-world town whose counted records each stand for several real
    // households (the opening's count scale, as a town opened at its Census
    // size above its generated sample has): draws go on until a door reaches
    // a counted record that votes in the race.
    for (let draw = 0; draw < 8; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "door-pledge-weighted");
      const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        countScale: 3,
      });
      const weighted = new Set(
        countedResidents(core)
          .filter((v) => v.weight > 1)
          .map((v) => v.id),
      );
      if (!weighted.size) continue;
      const api = coreAPI(core);
      const adults = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
              35,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      let filed: FilingRow[] = [];
      let contestId = "";
      let electionDate = "";
      for (const contest of openContests(api)) {
        filed = [];
        for (const [n, person] of adults.slice(0, 2).entries()) {
          const result = fileCandidacy(api, {
            personId: person.id,
            contestId: contest.id,
            platform: [`${PLATFORM_QUESTIONS[0]}=${n ? -1 : 1}`],
          });
          if (result.status === "refused") break;
          filed.push(result.filing);
        }
        if (filed.length === 2) {
          contestId = contest.id;
          electionDate = contest.electionDate;
          break;
        }
      }
      if (!contestId) continue;
      // A door that carries a petition asks for a signature, not the vote:
      // the candidates gather their signatures at the doors, then knock for
      // votes once the petitions are in.
      for (const f of filed)
        for (
          let evening = 0;
          evening < 30 &&
          petitionCirculating(api, f.id) &&
          petitionOf(api, f.id)!.signers.length < petitionOf(api, f.id)!.needed;
          evening++
        )
          knockDoors(api, {
            filingId: f.id,
            canvasserId: f.personId,
            hours: 4,
            fillCounted: false,
          });
      const dues = filed
        .filter((f) => petitionCirculating(api, f.id))
        .map((f) => petitionOf(api, f.id)!.due)
        .sort();
      if (dues.length) advanceCore(core, addDays(makeIsoDate(dues.at(-1)!), 1));
      const onBallot = new Set(ballot(api, contestId).map((f) => f.personId));
      if (
        filed.some((f) => petitionCirculating(api, f.id)) ||
        core.date >= electionDate ||
        !onBallot.has(filed[0]!.personId)
      )
        continue;
      const mine = filed[0]!;
      // A volunteer-style evening (counted openers stay counted) until a
      // weighted record says yes.
      let pledged: PledgeRow | undefined;
      for (let evening = 0; evening < 20 && !pledged; evening++) {
        knockDoors(api, {
          filingId: mine.id,
          canvasserId: mine.personId,
          hours: 4,
          fillCounted: false,
        });
        // A yes in this race: a candidate who is also running elsewhere
        // (a world official in the town) holds yes's there too.
        pledged = (
          api
            .moduleState(CAMPAIGNS_MODULE_ID)
            .table("pledges")
            .query("byCandidate", [mine.personId]) as unknown as PledgeRow[]
        ).find(
          (p) =>
            p.contestId === contestId &&
            p.causeId === null &&
            weighted.has(p.voterId),
        );
      }
      if (!pledged) continue;
      // A counted resident's visit is read as a full person's knowledge is:
      // their own recognition of the candidate in place of the town's share,
      // and the visit's warmth; the other candidates are as they were.
      const resident = countedResidents(core).find(
        (v) =>
          doorAppealOf(api, v.id, contestId) && !pledgesOf(api, v.id).length,
      );
      expect(resident, `${where}: no counted adult to visit`).toBeDefined();
      const visit = {
        candidateId: filed[1]!.personId,
        agreement: 0.25,
        warmth: 0.2,
      };
      const without = doorAppealOf(api, resident!.id, contestId)!;
      const visited = doorAppealOf(api, resident!.id, contestId, visit)!;
      for (const [id, a] of Object.entries(without))
        expect(
          visited[id]!.total,
          `${where}: ${resident!.id} ${id}`,
        ).toBeCloseTo(
          id === visit.candidateId
            ? a.total -
                a.recognition +
                campaignParameter("countedRecognitionWeight") +
                visit.agreement +
                visit.warmth
            : a.total,
          9,
        );
      expect(doorChoiceOf(api, resident!.id, contestId, visit)).toBe(
        countedChoice(visited),
      );
      holdElection(api, contestId);
      const kept = api
        .moduleState(VOTING_MODULE_ID)
        .table("countedBallots")
        .get(`counted:${contestId}`) as unknown as {
        readonly field: readonly {
          readonly id: string;
          readonly side: number;
        }[];
        readonly voterIds: readonly string[];
        readonly weight: readonly number[];
        readonly pledgedChoice?: readonly number[];
        readonly split: readonly (readonly number[])[];
      };
      const at = kept.voterIds.indexOf(pledged.voterId);
      // Not in the race's electorate (a ward seat elsewhere in town): redraw.
      if (at < 0) continue;
      expect(kept.weight[at], `${where}: weight`).toBeGreaterThan(1);
      // The pledged household voted for the candidate on its word.
      const mineAt = kept.field.findIndex((f) => f.id === mine.personId);
      expect(mineAt, `${where}: on the counted ballot`).toBeGreaterThanOrEqual(
        0,
      );
      expect(kept.pledgedChoice?.[at], `${where}: pledged household`).toBe(
        mineAt,
      );
      // The rest of the record divide by their appeal without the pledge
      // (CTO, Nov 1): whole to its top on a ballot with party labels, by each
      // candidate's logistic share at appealPerShare's slope without them,
      // and the pledged household's one vote on top.
      const recordBallot = countedBallotsOf(api, contestId)[at]!;
      expect(recordBallot.appeal[mine.personId]?.pledge ?? 0).toBe(0);
      const restWeight = kept.weight[at]! - 1;
      const ids = kept.field.map((f) => f.id);
      const expected: Record<string, number> = { [mine.personId]: 1 };
      const top = countedChoice(recordBallot.appeal);
      if (kept.field.some((f) => f.side !== 0) || ids.length === 1) {
        if (top) expected[top] = (expected[top] ?? 0) + restWeight;
      } else {
        const k = 4 / electorateParameter("appealPerShare");
        const pull = (id: string) =>
          Math.exp(k * recordBallot.appeal[id]!.total);
        const sum = ids.reduce((n, id) => n + pull(id), 0);
        for (const id of ids)
          expected[id] = (expected[id] ?? 0) + (restWeight * pull(id)) / sum;
      }
      for (const [j, id] of ids.entries())
        expect(
          kept.split[at]![j]!,
          `${where}: the rest of ${kept.weight[at]} households for ${id}`,
        ).toBeCloseTo(expected[id] ?? 0, 9);
      return;
    }
    throw new Error(
      `seed ${seed}: no drawn town had a weighted counted record that a door reached and that votes in the race`,
    );
  }, 900_000);
});
