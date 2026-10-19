/**
 * M4-06 (golden path step 11): the record follows you.
 *
 * In a random place an incumbent made a promise in a real speech, then cast a
 * vote that broke it. At the next election that record changes specific
 * voters' choices, each with its reason on their ballot, and the rival's
 * attack ad draws on it (and only on it).
 *
 * The council vote is written through `recordVote` directly: an edge-case
 * fixture until councils on core2 (golden path step 6) cast votes themselves.
 */
import { createHash } from "node:crypto";
import { countedChoice } from "./electorate";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI, registerModule } from "./state";
import { openOffices, townSeats } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  fileCandidacy,
  openElections,
  type ContestRow,
} from "./modules/elections";
import {
  askForDonation,
  campaignFor,
  giveSpeech,
  knockDoors,
  openCampaigns,
  runAd,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  ballotOf,
  fileStandingCandidates,
  holdElection,
  openVoting,
} from "./modules/voting";
import { openRecord, promisesOf, recordVote, votesOf } from "./modules/record";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`record:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("M4-06 the record follows you", () => {
  it("an incumbent's broken promise changes specific voters' choices, with reasons, and feeds the rival's attack ad", () => {
    let place = process.env.GOLDEN_PATH_PLACE_KEY;
    let core = null as ReturnType<typeof createLifeCore> | null;
    let contest: ContestRow | undefined;
    // A place whose town has a local seat held by a resident and up this cycle.
    for (let attempt = 0; attempt < 8 && !contest; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key =
        attempt === 0 && place ? place : pick(places, `place:${attempt}`).key;
      core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 300,
        }),
      );
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      openRecord(core);
      const api = coreAPI(core);
      const held = new Set(
        townSeats(api)
          .filter(
            (s) =>
              s.holder?.personId &&
              s.office.level !== "federal" &&
              s.office.level !== "state",
          )
          .map((s) => s.seat.id),
      );
      contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).find((c) => held.has(c.seatId) && c.incumbentTermId);
      place = key;
    }
    expect(
      contest,
      "no town with a resident-held local seat up for election",
    ).toBeDefined();
    const api = coreAPI(core!);
    fileStandingCandidates(api, contest!.id);
    const incumbentFiling = ballot(api, contest!.id)[0]!;
    const incumbent = core!.people.get(incumbentFiling.personId)!;
    // A challenger from town files (by fee or signatures).
    const challenger = [...core!.people.values()]
      .filter(
        (p) =>
          p.id !== incumbent.id &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0]!;
    fileCandidacy(api, {
      personId: challenger.id,
      contestId: contest!.id,
      platform: [],
    });
    // The incumbent campaigns on a promise, in a real speech to people who know them.
    // A question voters divide on (under the views stand-in, a question with
    // no left-right split moves nobody).
    const question = pick(
      PLATFORM_QUESTIONS.filter(
        (q) =>
          Math.abs(
            (axes.axes as Record<string, { axis: number }>)[q]?.axis ?? 0,
          ) >= 0.3,
      ),
      "promise",
    );
    knockDoors(api, {
      filingId: incumbentFiling.id,
      canvasserId: incumbent.id,
      hours: 6,
    });
    giveSpeech(api, {
      filingId: incumbentFiling.id,
      venue: "town-hall",
      statements: [{ question, position: 1 }],
    });
    // Fixture: the council vote that breaks it.
    recordVote(api, {
      personId: incumbent.id,
      body: contest!.officeId,
      measureId: "fixture-measure",
      stance: { question, position: -1 },
      passed: true,
    });
    expect(promisesOf(api, incumbent.id).map((p) => p.status)).toContain(
      "broken",
    );
    // The rival's attack ad, paid with money raised from warm neighbors.
    const rivalFiling = ballot(api, contest!.id).find(
      (f) => f.personId === challenger.id,
    );
    let attack: readonly { act: string; voterId: string }[] = [];
    if (rivalFiling) {
      knockDoors(api, {
        filingId: rivalFiling.id,
        canvasserId: challenger.id,
        hours: 6,
      });
      for (const id of [...core!.people.keys()].sort())
        askForDonation(api, rivalFiling.id, id);
      attack = runAd(api, {
        filingId: rivalFiling.id,
        amountMinor: campaignFor(api, rivalFiling.id).raisedMinor,
        attackFilingId: incumbentFiling.id,
      });
      expect(attack.every((c) => c.act === "attack-ad")).toBe(true);
    }
    // Election: the record is a reason on specific ballots, and changes some choices.
    holdElection(api, contest!.id);
    const ballots = [...core!.people.keys()]
      .map((id) => ballotOf(api, contest!.id, id))
      .filter((b) => b !== null);
    const weighed = ballots.filter(
      (b) => (b!.recordReasons?.[incumbent.id] ?? []).length > 0,
    );
    expect(weighed.length, `${place} ${seed}`).toBeGreaterThan(0);
    const broken = weighed.filter((b) =>
      b!.recordReasons![incumbent.id]!.some((r) => r.kind === "broken-promise"),
    );
    // Whom each voter would back with the record and without it (whether
    // they turn out that day is a separate decision).
    const changed = weighed.filter((b) => {
      const without = Object.fromEntries(
        Object.entries(b!.appeal).map(([id, a]) => [
          id,
          { total: a.total - a.record },
        ]),
      );
      return countedChoice(without) !== countedChoice(b!.appeal);
    });
    expect(
      changed.length,
      `${place} ${seed} weighed ${weighed.length}`,
    ).toBeGreaterThan(0);
    govReport(
      "record",
      JSON.stringify({
        place,
        seed,
        contest: contest!.id,
        incumbent: incumbent.id,
        promise: question,
        weighedTheRecord: weighed.length,
        sawTheBrokenPromise: broken.length,
        choicesChanged: changed.length,
        attackAdReached: attack.length,
        oneVoter: changed[0],
      }),
    );
  });
});

describe("a vote by a member who isn't a full person", () => {
  // Regression (wire-all-modules, Oct 12): with Congress voting in the played
  // world, each of its members' votes became its own story in the town and
  // every resident heard hundreds a session, slowing the year tenfold. The
  // roll call's own story carries the count; the vote stays on the record.
  it("is on the record but is not its own event", () => {
    const state = pick(states, "outsider:state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "outsider:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 20,
      }),
    );
    openRecord(core);
    const heard: string[] = [];
    registerModule(core, {
      id: "probe-vote-recorded",
      eventKinds: ["vote-recorded"],
      onEvent: (_api, event) => void heard.push(event.id),
    });
    const api = coreAPI(core);
    const resident = [...core.people.keys()].sort()[0]!;
    const outsider = "official:congress:seat:US-AK:us-house:00";
    for (const personId of [resident, outsider])
      recordVote(api, {
        personId,
        body: "office:test",
        measureId: "2026-001",
        stance: { question: PLATFORM_QUESTIONS[0]!, position: 1 },
        passed: null,
      });
    const where = `seed ${seed}, ${state} place ${key}`;
    expect(votesOf(api, outsider).length, where).toBe(1);
    expect(votesOf(api, resident).length, where).toBe(1);
    expect(heard, where).toEqual([`vote-recorded:vote:2026-001:${resident}`]);
  });
});
