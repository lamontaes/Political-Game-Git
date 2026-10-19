/**
 * Public meetings (BOARD "next" item 2), in random places: public comment on a
 * council bill (you sign up to speak; residents who feel strongly stand up;
 * every member hears the room), a town hall (residents ask about what they
 * care about; the host answers; those present react), and a race's debate on
 * the town's widest-reaching outlet (it waits for your answers).
 */
import { createHash } from "node:crypto";
import { stancesOf, viewsModule } from "./modules/views";
import { speechModule } from "./modules/speech";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
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
  impressionOf,
  openCampaigns,
  type PromiseRow,
} from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  draftBill,
  holdVote,
  memberPosition,
  memberKey,
  members,
  openLegislature,
} from "./modules/legislature";
import { openPress } from "./modules/press";
import {
  answerDebate,
  debatesIn,
  holdTownHall,
  openMeetings,
  remarksOn,
  signUpToSpeak,
} from "./modules/meetings";
import { personLean, personStance, questionAxis } from "./campaign-views";
import { POLICY_QUESTIONS } from "./policy-answers";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`meetings:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

function world(
  salt: string,
  accept: (core: ReturnType<typeof createLifeCore>) => boolean,
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = pick(states, `${salt}:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, `${salt}:place:${attempt}`).key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 300,
      }),
      { modules: [viewsModule, speechModule] },
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openPress(core);
    openMeetings(core);
    if (accept(core))
      return {
        core,
        api: coreAPI(core),
        where: `seed ${seed}, ${state} place ${key}`,
      };
  }
  throw new Error(`no fitting town (seed ${seed})`);
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

describe("public meetings", () => {
  it("public comment on a council bill reaches every member, and a town hall moves those present", () => {
    // Some states give a town's council no power over any recorded policy
    // question (nothing it may draft), so a place is accepted only when it
    // has a council of three that can act on one.
    const found: { bill: ReturnType<typeof draftBill> | null } = {
      bill: null,
    };
    const { core, api, where } = world("comment", (c) => {
      const a = coreAPI(c);
      const seats = townSeats(a).filter(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (seats.length < 3) return false;
      found.bill = null;
      for (const question of Object.keys(POLICY_QUESTIONS)
        .filter((q) => questionAxis(q) !== 0)
        .sort(
          (x, y) =>
            Math.abs(questionAxis(y)) - Math.abs(questionAxis(x)) ||
            x.localeCompare(y),
        )) {
        const drafted = draftBill(a, {
          bodyOfficeId: seats[0]!.office.id,
          sponsorId: seats[0]!.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (drafted.status === "drafted") {
          found.bill = drafted;
          break;
        }
      }
      return found.bill !== null;
    });
    const council = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    const body = council[0]!.office.id;
    const bill = found.bill;
    expect(bill, `${where}: no question the council may act on`).not.toBeNull();
    const memberIds = members(api, body).map(memberKey);
    const you = [...core.people.values()]
      .filter(
        (p) =>
          !memberIds.includes(p.id) &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    core.playerId = you.id;
    const before = memberPosition(api, bill!.id, memberIds[1]!).lobby;
    signUpToSpeak(api, { billId: bill!.id, personId: you.id, position: 1 });
    // Every member hears you.
    for (const id of memberIds)
      expect(memberPosition(api, bill!.id, id).lobby, where).toBeGreaterThan(
        id === memberIds[1] ? before : -Infinity,
      );
    const after = holdVote(api, bill!.id);
    const said = remarksOn(api, bill!.id);
    expect(said.some((r) => r.personId === you.id && r.signedUp)).toBe(true);
    // Those who stood up said what they think.
    const question = bill!.provisions[0]!.question!;
    for (const r of said.filter((r) => !r.signedUp)) {
      const p = core.people.get(r.personId)!;
      expect(r.position, where).toBe(
        Math.sign(personStance(personLean(core.people, p, 0), question)),
      );
    }
    expect(said.filter((r) => !r.signedUp).length).toBeLessThanOrEqual(6);
    expect(() =>
      signUpToSpeak(api, { billId: bill!.id, personId: you.id, position: -1 }),
    ).toThrow();

    // A town hall: residents ask, the member answers from their own views.
    const host = council[1]!.holder!.personId!;
    const hall = holdTownHall(api, { hostId: host });
    // Everyone who came knows the host now (met there, or already known).
    for (const a of hall.attendeeIds)
      expect(core.people.get(a)!.knownIds.has(host), `${where}: ${a}`).toBe(
        true,
      );
    expect(hall.attendeeIds.length, where).toBeGreaterThan(0);
    expect(hall.questions.length).toBeGreaterThan(0);
    expect(hall.questions.length).toBeLessThanOrEqual(4);
    for (const a of hall.attendeeIds)
      expect(impressionOf(api, a, host), `${where}: ${a}`).not.toBeNull();
    govReport(
      "meetings-comment",
      JSON.stringify({
        where,
        bill: bill!.number,
        question,
        status: after.status,
        speakers: said.map(
          (r) => `${r.signedUp ? "signed-up" : "stood-up"}:${r.position}`,
        ),
        townHall: {
          attendees: hall.attendeeIds.length,
          questions: hall.questions.map((q) => q.question),
          answers: hall.answers.map((a) => a.position),
          moved: hall.moved,
        },
      }),
    );
  }, 300_000);

  it("a race's debate waits for your answers and its audience hears every candidate", () => {
    let filed: { you: FilingRow; rival: FilingRow } | null = null;
    const { core, api, where } = world("debate", (c) => {
      const a = coreAPI(c);
      const adults = [...c.people.values()]
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
        )
        .sort(
          (x, y) => y.liquidMinor - x.liquidMinor || x.id.localeCompare(y.id),
        );
      const platformA = [`${pick(PLATFORM_QUESTIONS, "q1")}=1`];
      const platformB = [platformA[0]!.replace("=1", "=-1")];
      for (const contest of openContests(a)) {
        const you = fileAndQualify(a, adults[0]!.id, contest.id, platformA);
        if (!you) continue;
        const rival = fileAndQualify(a, adults[1]!.id, contest.id, platformB);
        if (rival) {
          filed = { you, rival };
          return true;
        }
      }
      return false;
    });
    const { you, rival } = filed!;
    core.playerId = you.personId;
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
    const debate = debatesIn(api, contest.id)[0];
    expect(debate, `${where}: no debate for ${contest.title}`).toBeDefined();
    expect(debate!.status).toBe("invited");
    const held = answerDebate(
      api,
      debate!.id,
      debate!.questions.map((question) => ({ question, position: 1 })),
    );
    expect(held.status).toBe("held");
    expect(Object.keys(held.answers).sort()).toEqual(
      [you.personId, rival.personId].sort(),
    );
    if (held.outletId) {
      expect(held.audience, where).toBeGreaterThan(0);
      const rivalPromises = (
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("promises")
          .query("byCandidate", [rival.personId]) as unknown as PromiseRow[]
      ).filter((p) => p.venue === held.id);
      expect(rivalPromises.length).toBe(
        held.answers[rival.personId]!.filter((a) => a.position !== null).length,
      );
      // The debate's audience hears each candidate as a speaker: the views
      // engine moves stances by the same read as a speech (owner, Oct 14).
      {
        const heard = [...core.people.keys()].filter((id) =>
          stancesOf(api, id).some((st) =>
            st.causes.some((c) => c.eventId.includes(`:debate:${held.id}`)),
          ),
        );
        expect(heard.length, where).toBeGreaterThan(0);
      }
    }
    govReport(
      "meetings-debate",
      JSON.stringify({
        where,
        contest: contest.title,
        outlet: held.outletId,
        questions: held.questions,
        audience: held.audience,
        answers: held.answers,
      }),
    );
  }, 300_000);
});
