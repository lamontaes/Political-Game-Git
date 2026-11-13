/**
 * Public comment meets people . In a drawn
 * town with a council of three, a resident who stands up and did not know a
 * member meets that member: both know each other by name, the meeting is a
 * dated fact naming the place, and the first tie holds the speaker's time at
 * the podium. A resident still in the counted population is not filled in.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { draftBill, holdVote, openLegislature } from "./modules/legislature";
import { openPress } from "./modules/press";
import { openMeetings, remarksOn, signUpToSpeak } from "./modules/meetings";
import { ENCOUNTERS } from "./encounters";
import { viewsModule } from "./modules/views";
import { speechModule } from "./modules/speech";
import { POLICY_QUESTIONS } from "./policy-answers";
import { questionAxis } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`meetings-encounters:${Date.now()}`)
    .digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

function town() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = pick(states, `state:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, `place:${attempt}`).key;
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
    const api = coreAPI(core);
    const seats = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    if (seats.length < 3) continue;
    for (const question of Object.keys(POLICY_QUESTIONS)
      .filter((q) => questionAxis(q) !== 0)
      .sort()) {
      const bill = draftBill(api, {
        bodyOfficeId: seats[0]!.office.id,
        sponsorId: seats[0]!.holder!.personId!,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
      if (bill.status === "drafted")
        return {
          core,
          api,
          bill,
          seats,
          where: `seed ${seed}, ${state} place ${key}`,
        };
    }
  }
  throw new Error(`no fitting town (seed ${seed})`);
}

describe("meetings meet people", () => {
  it("public comment's speakers and the members who heard them know each other", () => {
    const { core, api, bill, seats, where } = town();
    const closeness = (a: string, b: string) =>
      core.relationships.get([a, b].sort().join(":"));

    // Public comment: the speakers who did not know a member meet that member.
    const memberIds = seats.map((s) => s.holder!.personId!);
    const before = new Map(
      [...core.people.values()].map((p) => [p.id, new Set(p.knownIds)]),
    );
    holdVote(api, bill.id);
    const speakers = remarksOn(api, bill.id)
      .map((r) => r.personId)
      .filter((id) => core.people.has(id) && !memberIds.includes(id));
    expect(speakers.length, `${where}: someone stood up`).toBeGreaterThan(0);
    const metMember = speakers.flatMap((id) =>
      memberIds.filter((m) => !before.get(id)!.has(m)).map((m) => [id, m]),
    );
    expect(
      metMember.length,
      `${where}: a speaker met a member`,
    ).toBeGreaterThan(0);
    for (const [id, m] of metMember) {
      expect(core.people.get(id!)!.knownIds.has(m!), where).toBe(true);
      const fact = core.knowledgeByPerson.get(id!)?.get(`person:${m}:met`);
      expect(fact?.sourceId, where).toBe(`public-comment:${bill.id}`);
      expect(closeness(id!, m!), where).toBeDefined();
    }
    // Time passes: the new tie reads as an ordinary acquaintance after a day.
    advanceCore(core, "2026-01-07");
  }, 300_000);

  it("a player who signed up to speak meets the members who heard them, with the speaker's time at the podium as the first tie", () => {
    const { core, api, bill, seats, where } = town();
    const memberIds = seats.map((s) => s.holder!.personId!);
    const you = [...core.people.values()]
      .filter(
        (p) =>
          !memberIds.includes(p.id) &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30 &&
          memberIds.every((m) => !p.knownIds.has(m)),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(you, `${where}: an adult who knows no member`).toBeDefined();
    core.playerId = you!.id;
    signUpToSpeak(api, { billId: bill.id, personId: you!.id, position: 1 });
    holdVote(api, bill.id);
    expect(
      remarksOn(api, bill.id).some((r) => r.personId === you!.id && r.signedUp),
      where,
    ).toBe(true);
    for (const m of memberIds) {
      expect(core.people.get(you!.id)!.knownIds.has(m), where).toBe(true);
      expect(core.people.get(m)!.knownIds.has(you!.id), where).toBe(true);
      const fact = core.knowledgeByPerson.get(you!.id)?.get(`person:${m}:met`);
      expect(fact?.sourceId, where).toBe(`public-comment:${bill.id}`);
      const tie = core.relationships.get([you!.id, m].sort().join(":"));
      expect(tie, where).toBeDefined();
      // The tie is the player's own, so its reason is kept: the meeting.
      expect(tie!.level, where).toBeGreaterThan(0);
      expect(tie!.latestChange?.reason?.cause, where).toBe(
        ENCOUNTERS.causes.metAtPublicComment,
      );
      expect(tie!.latestChange?.reason?.sourceId, where).toBe(
        `public-comment:${bill.id}`,
      );
    }
  }, 300_000);
});
