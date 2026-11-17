/**
 * One draw of M4-06, the record follows you (record.test.ts and the
 * calibration-lane record-rival-turn.test.ts): a place, an incumbent's
 * promise in a real speech, the vote that broke it, and the election that
 * follows. A test kit, read only by tests.
 */
import { createHash } from "node:crypto";
import { countedChoice } from "./electorate";
import { expect } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { openOffices, townSeats } from "./modules/offices";
import { openLaws } from "./modules/laws";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  fileCandidacy,
  filingWindowOpens,
  openElections,
  type ContestRow,
} from "./modules/elections";
import {
  askForDonation,
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignTurn,
  giveSpeech,
  knockDoors,
  openCampaigns,
  runAd,
  type CauseRow,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { fileRunners, weighContest } from "./modules/candidacy";
import { ballotOf, holdElection, openVoting } from "./modules/voting";
import { openRecord, promisesOf, recordVote } from "./modules/record";
import { openPress } from "./modules/press";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { townResidentsByCash } from "./resident-adults-test-kit";

export const START = "2026-01-05";
/** How far before election day the rival's own turn is played. */
const LAST_WEEKS_DAYS = 28;
/** How long a draw waits for a held race's filing window to open. */
const WAIT_DAYS = 120;
export const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`record:${Date.now()}`).digest("hex");
export const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
export function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

/** One draw: a place, an incumbent's broken promise, and the election that follows. */
export function scenario(draw: number, byTurn = false) {
  let place = process.env.GOLDEN_PATH_PLACE_KEY;
  let core = null as ReturnType<typeof createLifeCore> | null;
  let contest: ContestRow | undefined;
  let incumbentId: string | undefined;
  // A place whose town has a local seat held by a resident and up this cycle.
  for (let attempt = 0; attempt < 8 && !contest; attempt += 1) {
    const state = pick(states, `state:${draw}:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key =
      draw === 0 && attempt === 0 && place
        ? place
        : pick(places, `place:${draw}:${attempt}`).key;
    core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openLaws(core);
    openOffices(core, seed, core.date);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    openRecord(core);
    // The press, as buildBenchWorld opens it: the rival's ad is bought from an
    // outlet's ad time, and none registered means it buys nothing.
    openPress(core);
    const api = coreAPI(core);
    // Each local seat held by a resident, and who holds it.
    const held = new Map(
      townSeats(api)
        .filter(
          (s) =>
            s.holder?.personId &&
            s.office.level !== "federal" &&
            s.office.level !== "state",
        )
        .map((s) => [s.seat.id, s.holder!.personId as string]),
    );
    // The town's held seats up for election, soonest election first, so a
    // draw plays the fewest days to the race's last weeks. Nobody can file
    // before a race's window opens: at seed rec-probe-4 the November races
    // opened on January 12, a week after the start, and the first race in
    // table order was a 2027 one. So the test waits, playing the world on
    // to a window within WAIT_DAYS, and an incumbent who decides not to run
    // leaves no record on the ballot to weigh: try the next race, then
    // draw again.
    const races = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter(
        (c) =>
          held.has(c.seatId) &&
          c.incumbentTermId &&
          c.filingDeadline >= core!.date,
      )
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          filingWindowOpens(a).localeCompare(filingWindowOpens(b)) ||
          a.id.localeCompare(b.id),
      );
    const waitUntil = addDays(makeIsoDate(START), WAIT_DAYS);
    for (const race of races) {
      const opens = filingWindowOpens(race);
      if (opens > waitUntil) continue;
      if (opens > core.date) advanceCore(core, makeIsoDate(opens));
      // Who runs is candidacy's: the incumbent weighs standing again, and
      // whoever runs files when the window opens.
      if (!ballot(api, race.id).length) {
        weighContest(api, race);
        fileRunners(api, race);
      }
      // The incumbent is the seat's holder, not whoever filed first:
      // once the window is open the world's own challengers file too.
      const holder = held.get(race.seatId);
      if (ballot(api, race.id).some((f) => f.personId === holder)) {
        contest = race;
        incumbentId = holder;
        break;
      }
    }
    place = key;
  }
  expect(
    contest,
    "no town with a resident-held local seat up for election whose incumbent runs",
  ).toBeDefined();
  const api = coreAPI(core!);
  const incumbentFiling = ballot(api, contest!.id).find(
    (f) => f.personId === incumbentId,
  )!;
  const incumbent = core!.people.get(incumbentFiling.personId)!;
  // A challenger from town files (by fee or signatures).
  const challenger = townResidentsByCash(core!, api).filter(
    (p) =>
      p.id !== incumbent.id &&
      // A resident: the press's national staff are people of the world
      // who live elsewhere and could not file for a town seat.
      p.placeId === incumbent.placeId &&
      Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
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
    `promise:${draw}`,
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
  const brokeIt = recordVote(api, {
    personId: incumbent.id,
    body: contest!.officeId,
    billId: "fixture-measure",
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
  const where = `${place} ${seed}:${draw}`;
  // A challenger who is not on the ballot (a signature drive that fell
  // short) has no ad to run: the draw is passed over, by name.
  if (!rivalFiling)
    return { where, skipped: "the challenger is not on the ballot" };
  knockDoors(api, {
    filingId: rivalFiling.id,
    canvasserId: challenger.id,
    hours: 6,
  });
  for (const id of [...core!.people.keys()].sort())
    askForDonation(api, rivalFiling.id, id);
  if (byTurn) {
    // The rival's own campaign turn decides to show the record
    // (campaign-rival-ad-quotes-a-real-vote): no hand call of the ad.
    // A campaign spends at an even pace to election day, so a turn months
    // out has no money for a spot (rec-probe-3: $9 to $27 of attack money
    // 295 days out). The world plays on to the race's last weeks, where a
    // campaign's turn has money to show the record (CTO, Nov 17).
    const lastWeeks = addDays(
      makeIsoDate(contest!.electionDate),
      -LAST_WEEKS_DAYS,
    );
    if (lastWeeks > core!.date) advanceCore(core!, lastWeeks);
    campaignTurn(api, rivalFiling.id, contest!.electionDate);
    const causes = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .rows() as unknown as CauseRow[]
    ).filter(
      (c) =>
        c.act === "attack-ad" &&
        c.actorId === challenger.id &&
        c.candidateId === incumbent.id,
    );
    if (!causes.length)
      return {
        where,
        skipped: `the rival's turn bought no attack ad (raised ${campaignFor(api, rivalFiling.id).raisedMinor})`,
      };
    // The ad names the vote it showed, by record id.
    const showing = causes.filter((c) => c.shownIds?.includes(brokeIt.id));
    expect(showing.length, `${where}: ${brokeIt.id}`).toBeGreaterThan(0);
    holdElection(api, contest!.id);
    // A voter it reached weighs that vote among their reasons, by id.
    const citing = showing
      .map((c) => ballotOf(api, contest!.id, c.voterId))
      .filter((b) =>
        (b?.recordReasons?.[incumbent.id] ?? []).some(
          (r) => r.kind === "vote" && r.itemId === brokeIt.id,
        ),
      );
    expect(
      citing.length,
      `${where}: no ballot cites ${brokeIt.id}`,
    ).toBeGreaterThan(0);
    process.stdout.write(
      `RIVAL AD ${where}: ${challenger.id} ran ${causes.length} attack-ad causes against ${incumbent.id}; ${showing.length} showed vote ${brokeIt.id} (for example ${showing[0]!.id}); ${citing.length} ballots cite it (for example ${citing[0]!.id})\n`,
    );
    return {
      where,
      skipped: null,
      weighed: citing.length,
      flippable: 0,
      changed: 0,
    };
  }
  attack = runAd(api, {
    filingId: rivalFiling.id,
    amountMinor: campaignFor(api, rivalFiling.id).raisedMinor,
    attackFilingId: incumbentFiling.id,
  });
  expect(attack.every((c) => c.act === "attack-ad")).toBe(true);
  // `every` is true of an empty list: the ad must have reached people. A
  // rival who raised too little to buy any airtime has no ad to check.
  if (!attack.length)
    return {
      where,
      skipped: `the rival raised ${campaignFor(api, rivalFiling.id).raisedMinor} and the ad reached no one`,
    };
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
  // A voter who saw the rival's attack ad names it among the reasons: the
  // broken promise in their ballot's record reasons is one the ad told them
  // of (its record is the ad's source), by record id.
  const adSource = `attack-ad:${challenger.id}:`;
  const citingAd = broken.filter((b) =>
    b!.recordReasons![incumbent.id]!.some(
      (r) =>
        r.kind === "broken-promise" &&
        (coreAPI(core!).knows(b!.voterId, r.itemId)?.sourceId ?? "").startsWith(
          adSource,
        ),
    ),
  );
  expect(
    citingAd.length,
    `${place} ${seed}: no ballot cites the rival's attack ad (${attack.length} reached)`,
  ).toBeGreaterThan(0);
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
  // Whether the record flips anyone depends on how close the race is for the
  // voters who weigh it, which no place guarantees. What always holds is the
  // accounting: each candidate's record term is the sum of the recorded
  // reasons' effects, and a voter's choice changes without it exactly when
  // the record is bigger than the margin (the top two, strictly).
  const leader = (totals: [string, number][]) => {
    const ranked = [...totals].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    return ranked.length > 1 && ranked[0]![1] > ranked[1]![1]
      ? ranked[0]![0]
      : null;
  };
  for (const b of weighed) {
    const entries = Object.entries(b!.appeal);
    for (const [id, a] of entries)
      expect(
        a.record,
        `${place} ${seed} record term of ${id} on ${b!.id}`,
      ).toBeCloseTo(
        (b!.recordReasons?.[id] ?? []).reduce((n, r) => n + r.effect, 0),
        9,
      );
    if (entries.length < 2) continue;
    const withRecord = leader(entries.map(([id, a]) => [id, a.total]));
    const without = leader(entries.map(([id, a]) => [id, a.total - a.record]));
    expect(
      countedChoice(b!.appeal) ===
        countedChoice(
          Object.fromEntries(
            entries.map(([id, a]) => [id, { total: a.total - a.record }]),
          ),
        ),
      `${place} ${seed} ${b!.id}`,
    ).toBe(withRecord === without);
  }
  // A voter flips when the record is bigger than the lead the voter would
  // otherwise give the top candidate: the record's swing between the top two
  // without it, against their gap. A race with such a voter is close enough
  // for the record to matter.
  const flippable = weighed.filter((b) => {
    const ranked = Object.entries(b!.appeal)
      .map(([id, a]) => ({
        id,
        without: a.total - a.record,
        record: a.record,
      }))
      .sort((x, y) => y.without - x.without || x.id.localeCompare(y.id));
    if (ranked.length < 2) return false;
    const [first, second] = ranked as [
      (typeof ranked)[number],
      (typeof ranked)[number],
    ];
    return second.record - first.record > first.without - second.without;
  });
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
      brokenPromiseBallots: broken.slice(0, 8).map((b) => b!.id),
      brokenPromiseIds: [
        ...new Set(
          broken.flatMap((b) =>
            b!
              .recordReasons![incumbent.id]!.filter(
                (r) => r.kind === "broken-promise",
              )
              .map((r) => r.itemId),
          ),
        ),
      ],
      choicesChanged: changed.length,
      attackAdReached: attack.length,
      attackAdBallots: citingAd.slice(0, 8).map((b) => b!.id),
      oneVoter: changed[0],
    }),
  );
  return {
    where,
    skipped: null,
    weighed: weighed.length,
    flippable: flippable.length,
    changed: changed.length,
  };
}
