/**
 * Campaign interviews (BOARD "next" item 1), in a random place: the town's
 * outlets are sized from its state's real counts; people follow them by their
 * age band's real habits; a candidate asks for an interview and answers
 * questions drawn from the race; the answers go on the record as promises only
 * the audience heard, each reader moved with a recorded cause; outlets seek
 * out the candidates on the ballot in the final weeks.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  causesFor,
  openCampaigns,
  type PromiseRow,
} from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import {
  answerInterview,
  candidateAnswers,
  followersOf,
  interviewsFor,
  openPress,
  requestInterview,
  storiesPrinted,
} from "./modules/press";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`press:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

function fileAndQualify(
  api: ReturnType<typeof coreAPI>,
  personId: string,
  contestId: string,
  platform: readonly string[],
): FilingRow | null {
  const result = fileCandidacy(api, {
    personId,
    contestId,
    platform,
  });
  if (result.status === "refused") return null;
  const filing = result.filing;
  return filing.status === "on-ballot" ? filing : null;
}

describe("campaign interviews", () => {
  it("outlets from real counts, an interview on the record, and outlets seeking out candidates", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${attempt}`).key;
      const where = `seed ${seed}, ${state} place ${key}`;
      tried.push(where);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 300,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      const outlets = openPress(core);
      const api = coreAPI(core);
      // A town with no local newspaper or news radio is a news desert; draw again.
      const print = outlets.find(
        (o) => o.tier !== "national" && o.kind !== "television",
      );
      if (!print) continue;
      // Followers are the town's adults, by their age band's real habits.
      const town = [
        ...(core.peopleByPlace.get(
          core.people.get([...core.people.keys()][0]!)!.placeId,
        ) ?? []),
      ];
      for (const outlet of outlets)
        for (const id of followersOf(api, outlet.id))
          expect(town, where).toContain(id);
      const adults = [...core.people.values()]
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        );
      const platformA = [
        `${pick(PLATFORM_QUESTIONS, "q1")}=1`,
        `${pick(PLATFORM_QUESTIONS, "q2")}=-1`,
      ];
      const platformB = platformA.map((s) =>
        s.replace("=1", "=x").replace("=-1", "=1").replace("=x", "=-1"),
      );
      let you: FilingRow | null = null;
      let rival: FilingRow | null = null;
      for (const contest of openContests(api)) {
        you = fileAndQualify(api, adults[0]!.id, contest.id, platformA);
        if (!you) continue;
        rival = fileAndQualify(api, adults[1]!.id, contest.id, platformB);
        if (rival) break;
      }
      if (!you || !rival) continue;
      core.playerId = you.personId;

      // You ask for an interview; the questions come from the race.
      const asked = requestInterview(api, {
        filingId: you.id,
        outletId: print.id,
      });
      expect(asked.status, where).toBe("invited");
      expect(asked.questions.length, where).toBeGreaterThan(0);
      // Where you and your rival differ is asked.
      expect(asked.questions, where).toContain(platformA[0]!.split("=")[0]);
      const answers = asked.questions.map((question, i) => ({
        question,
        position: i === asked.questions.length - 1 && i > 0 ? null : 1,
      }));
      const published = answerInterview(api, asked.id, answers);
      expect(published.status).toBe("published");
      const readers = followersOf(api, print.id).filter(
        (id) => id !== you!.personId,
      );
      expect(published.audience, where).toBe(
        readers.filter((id) => core.people.get(id)?.alive).length,
      );
      // Each answer is a promise on the record; only the audience heard it.
      const promises = (
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("promises")
          .query("byCandidate", [you.personId]) as unknown as PromiseRow[]
      ).filter((p) => p.venue === print.id);
      expect(promises.length).toBe(
        answers.filter((a) => a.position !== null).length,
      );
      if (readers[0]) {
        expect(api.knows(readers[0], promises[0]!.id)?.value, where).toBe(
          "heard",
        );
        expect(
          causesFor(api, readers[0], you.personId).some(
            (c) => c.act === "interview",
          ),
        ).toBe(true);
      }
      const nonReader = [...core.people.keys()].find(
        (id) => id !== you!.personId && !readers.includes(id),
      );
      if (nonReader)
        expect(api.knows(nonReader, promises[0]!.id)).toBeUndefined();
      // The same outlet doesn't run you twice.
      expect(
        requestInterview(api, { filingId: you.id, outletId: print.id }).reason,
      ).toBe("already-interviewed");
      expect(interviewsFor(api, you.personId).map((r) => r.status)).toContain(
        "published",
      );

      // In the final weeks the outlets seek out the candidates on the ballot.
      const contest = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(you.contestId) as unknown as ContestRow;
      const day = new Date(
        Date.parse(`${contest.electionDate}T00:00:00Z`) - 3 * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      advanceCore(core, day);
      const rivalRows = interviewsFor(api, rival.personId).filter(
        (r) => r.askedBy === "outlet",
      );
      const yourRows = interviewsFor(api, you.personId).filter(
        (r) => r.askedBy === "outlet",
      );
      expect(rivalRows.length + yourRows.length, where).toBeGreaterThan(0);
      for (const row of rivalRows)
        expect(["published", "declined"], where).toContain(row.status);
      for (const row of yourRows) {
        expect(["invited", "declined"], where).toContain(row.status);
        // An outlet that already ran you doesn't ask again.
        expect(row.outletId, where).not.toBe(print.id);
      }
      // An editorial board's head endorses a candidate on this ballot: the
      // story is printed once, names the endorsed candidate, and the
      // outlet's readers hear it as an endorsement.
      const heads = outlets.filter((o) => o.tier !== "national" && o.headId);
      const endorsed = heads.flatMap((o) =>
        storiesPrinted(api, o.id).filter(
          (story) => story.kind === "endorsement",
        ),
      );
      expect(endorsed.length, where).toBeGreaterThan(0);
      const onBallots = new Set(
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows()
          .map((f) => (f as unknown as FilingRow).personId),
      );
      expect(new Set(endorsed.map((e) => e.id)).size, where).toBe(
        endorsed.length,
      );
      for (const story of endorsed) {
        const candidateId = story.subjectIds[0]!;
        expect(onBallots.has(candidateId), where).toBe(true);
        // A reader of the outlet heard it: an endorsement cause on the record.
        const reader = followersOf(api, story.outletId).find(
          (id) => id !== candidateId && core.people.get(id)?.alive,
        );
        if (reader)
          expect(
            causesFor(api, reader, candidateId).some(
              (c) => c.act === "endorsement",
            ),
            `${where} reader ${reader} of ${story.outletId}`,
          ).toBe(true);
      }
      govReport(
        "press",
        JSON.stringify({
          seed,
          state,
          place: key,
          outlets: outlets.map((o) => ({
            kind: o.kind,
            followers: followersOf(api, o.id).length,
          })),
          adults: town.length,
          questions: asked.questions,
          audience: published.audience,
          rivalInterviews: rivalRows.map((r) => `${r.outletId}:${r.status}`),
          yourInvitations: yourRows.map((r) => `${r.outletId}:${r.status}`),
          all: interviewsFor(api, you.personId).map(
            (r) => `${r.id}:${r.status}:${r.askedBy}`,
          ),
        }),
      );
      return;
    }
    throw new Error(
      `no town with a local outlet and a race: ${tried.join("; ")}`,
    );
  }, 300_000);
});

describe("a reporter who runs", () => {
  // Scotland Neck, North Carolina (seed d48dca5fc9c0): a local reporter filed
  // for council, their own paper asked them for an interview, and the paper
  // sent the candidate as their own reporter; the core refused the meeting.
  // The owner ruled on Oct 16, 2026 that "a reporter who wants to run may
  // run": press staff file like anyone, and the paper sends someone else.
  it("files and is on the ballot, and their paper never sends them to interview themselves", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = pick(states, `rstate:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `rplace:${attempt}`).key;
      const where = `seed ${seed}, ${state} place ${key}`;
      tried.push(where);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 300,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      const outlets = openPress(core);
      const api = coreAPI(core);
      const paper = outlets.find(
        (o) => o.tier !== "national" && (o.reporterIds ?? []).length > 0,
      );
      if (!paper) continue;
      const reporter = paper.reporterIds![0]!;
      const contests = openContests(api);
      // The first contest the reporter is allowed to enter (their age and
      // residence decide that, not their job).
      for (const contest of contests) {
        const result = fileCandidacy(api, {
          personId: reporter,
          contestId: contest.id,
          platform: [`${pick(PLATFORM_QUESTIONS, "r1")}=1`],
        });
        if (result.status === "refused") {
          // Never because they work for a paper.
          expect(
            result.unmet.map((check) => check.rule),
            `${where}: ${contest.id}`,
          ).not.toContain("press-employment");
          continue;
        }
        expect(result.filing.status, where).toBe("on-ballot");
        // Their own paper asked for an interview with them: another of its
        // reporters goes, or none; never the candidate themselves.
        const interview = requestInterview(api, {
          outletId: paper.id,
          filingId: result.filing.id,
        });
        expect(interview.reporterId, where).not.toBe(reporter);
        return;
      }
    }
    throw new Error(
      `no town with a local paper whose reporter could enter an open contest: ${tried.join("; ")}`,
    );
  }, 300_000);
});

describe("interviews with state and federal candidates", () => {
  // Regression (wire-all-modules, Oct 12): in the played world, outlets ask
  // the state and federal candidates on the town's ballot, who aren't full
  // people; publishing their interview threw on the missing person.
  it("a candidate who isn't a full person is interviewed and published", () => {
    const start = "2026-10-12";
    const tried: string[] = [];
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const state = pick(states, `official:state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `official:place:${attempt}`).key;
      const where = `seed ${seed}, ${state} place ${key}`;
      tried.push(where);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: start,
          minimumPeople: 120,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      openRecord(core);
      const outlets = openPress(core);
      const api = coreAPI(core);
      const outsider = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      )
        .filter((f) => f.status === "on-ballot" && !core.people.has(f.personId))
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!outsider) continue;
      // The candidate asks each outlet in turn; a television station may pass
      // on a race it finds not newsworthy enough.
      for (const outlet of outlets) {
        const row = requestInterview(api, {
          filingId: outsider.id,
          outletId: outlet.id,
        });
        if (row.status !== "invited") continue;
        const done = answerInterview(
          api,
          row.id,
          candidateAnswers(api, row.questions, outsider),
        );
        expect(done.status, where).toBe("published");
        expect(done.candidateId.startsWith("official:"), where).toBe(true);
        return;
      }
    }
    throw new Error(
      `No town interviewed an outside candidate: ${tried.join("; ")}`,
    );
  });
});
