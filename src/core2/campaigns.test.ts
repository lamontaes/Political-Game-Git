/**
 * M2-05 campaigning and M2-06 polls, in a random place.
 *
 * After filing, each campaign activity changes what specific people know and
 * think, each change with a recorded cause; nobody's view moves without one;
 * a rival campaigns with the same tools. A poll reports what the people it
 * contacted said, with a computed margin of error; no contacts, no poll.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  askForDonation,
  askForEndorsement,
  askToVolunteer,
  causesFor,
  commissionPoll,
  contributionLimit,
  giveSpeech,
  knockDoors,
  openCampaigns,
  campaignTurn,
  runAd,
  type ImpressionRow,
} from "./modules/campaigns";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { setKeepEveryonesWhy } from "./why-kept";

// Reads every reached voter's recorded cause for people outside the player's circle.
setKeepEveryonesWhy(true);

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaigns:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace() {
  const state = pick(states, "state");
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, "place");
}

/** File and, where the place asks for signatures, gather them from neighbors. */
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
  return ["petitioning", "on-ballot"].includes(filing.status ?? "")
    ? filing
    : null;
}

describe("M2-05 and M2-06 campaigning and polls", () => {
  it("every activity moves specific people with a recorded cause; a rival campaigns; polls report what people said", () => {
    const place = process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace().key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    const api = coreAPI(core);
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
    expect(
      you,
      `no open contest the two candidates could both qualify for in ${place}`,
    ).not.toBeNull();
    expect(rival).not.toBeNull();
    const candidate = core.people.get(you!.personId)!;

    // Doors: specific people, each with their own reasons.
    const doors = knockDoors(api, {
      filingId: you!.id,
      canvasserId: candidate.id,
      hours: 3,
    });
    expect(doors.length).toBeGreaterThan(0);
    for (const cause of doors) {
      expect(cause.act).toBe("door");
      expect(cause.agreement).not.toBeNull();
      expect(cause.warmthAfter).not.toBe(Number.NaN);
    }
    // A volunteer: family first.
    const relative = [...candidate.familyIds].find((id) =>
      askToVolunteer(api, you!.id, id),
    );
    if (relative) {
      const volunteerDoors = knockDoors(api, {
        filingId: you!.id,
        canvasserId: relative,
        hours: 2,
      });
      expect(volunteerDoors.every((c) => c.act === "volunteer-door")).toBe(
        true,
      );
    }
    // Money within the limit.
    const limit =
      contributionLimit(api, you!.contestId).minor ?? Number.MAX_SAFE_INTEGER;
    const warm = doors.filter((c) => c.warmthAfter > 0).map((c) => c.voterId);
    const before = new Map(
      warm.map((id) => [id, core.people.get(id)!.liquidMinor]),
    );
    let raised = 0;
    for (const id of warm) {
      const gave = askForDonation(api, you!.id, id);
      expect(gave).toBeLessThanOrEqual(limit);
      if (gave)
        expect(core.people.get(id)!.liquidMinor).toBe(before.get(id)! - gave);
      raised += gave;
    }
    // A speech: listeners decide, and their words become promises.
    const speech = giveSpeech(api, {
      filingId: you!.id,
      venue: "town-hall",
      statements: [{ question: pick(PLATFORM_QUESTIONS, "q3"), position: 1 }],
    });
    expect(speech.every((c) => c.act === "speech")).toBe(true);
    const promises = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("promises")
      .query("byCandidate", [candidate.id]);
    expect(promises.length).toBe(1);
    // An ad, if there's money for one.
    const ad =
      raised > 0 ? runAd(api, { filingId: you!.id, amountMinor: raised }) : [];
    expect(ad.every((c) => c.act === "ad")).toBe(true);
    // An endorsement attempt: yes only for the platform they agree with most.
    const endorser = doors[0]!.voterId;
    askForEndorsement(api, you!.id, endorser);
    // The rival campaigns with the same tools.
    const contestRow = api
      .moduleState("core2-elections-v1")
      .table("contests")
      .get(rival!.contestId) as unknown as { electionDate: string };
    const rivalTurn = campaignTurn(api, rival!.id, contestRow.electionDate);
    const rivalReached = rivalTurn.doors;
    expect(rivalReached).toBeGreaterThan(0);
    // Nobody's view moved without a cause.
    const impressions = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("impressions")
      .rows() as unknown as ImpressionRow[];
    for (const impression of impressions)
      expect(
        causesFor(api, impression.voterId, impression.candidateId).length,
      ).toBe(impression.causes);
    // A poll of real people.
    const poll = commissionPoll(api, { filingId: you!.id, sampleSize: 60 });
    const total = Object.values(poll.answers).reduce((a, b) => a + b, 0);
    expect(total).toBe(poll.contacted);
    expect(poll.respondentIds.length).toBe(poll.contacted);
    if (poll.contacted) expect(poll.marginOfError).toBeGreaterThan(0);
    const none = commissionPoll(api, { filingId: you!.id, sampleSize: 0 });
    expect(none.contacted).toBe(0);
    expect(none.marginOfError).toBeNull();
    const voter = doors[0]!;
    govReport(
      "campaigns",
      JSON.stringify({
        place,
        seed,
        contest: you!.contestId,
        doorsMet: doors.length,
        volunteer: Boolean(relative),
        raisedMinor: raised,
        limitMinor: limit,
        speechListeners: speech.length,
        adReached: ad.length,
        rivalReached,
        poll: poll.answers,
        marginOfError: poll.marginOfError,
        whyOneVoter: causesFor(api, voter.voterId, candidate.id),
      }),
    );
  });
});
