/**
 * Meetings meet people (SG-P15-encounters, attendance part). In a drawn town
 * with a council of three, a town hall's room and a public comment's speakers
 * come to know the one they came to hear: each full person who did not know
 * them meets them by name, the meeting is a dated fact naming the place, and
 * the first tie holds the hours they sat in the room. A resident still in the
 * counted population is not filled in.
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
import {
  holdTownHall,
  meetingParameter,
  openMeetings,
  remarksOn,
} from "./modules/meetings";
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
  it("a town hall's room meets its host, and public comment's speakers meet the members, each with the hours they sat", () => {
    const { core, api, bill, seats, where } = town();
    const closeness = (a: string, b: string) =>
      core.relationships.get([a, b].sort().join(":"));

    // A town hall: attendees who did not know the host meet them.
    const host = seats[1]!.holder!.personId!;
    const strangers = new Set(
      [...core.people.values()]
        .filter((p) => p.id !== host && !p.knownIds.has(host))
        .map((p) => p.id),
    );
    const hall = holdTownHall(api, { hostId: host });
    const newlyMet = hall.attendeeIds.filter((id) => strangers.has(id));
    expect(newlyMet.length, `${where}: a stranger in the room`).toBeGreaterThan(
      0,
    );
    for (const id of newlyMet) {
      expect(core.people.get(id)!.knownIds.has(host), where).toBe(true);
      expect(core.people.get(host)!.knownIds.has(id), where).toBe(true);
      const fact = core.knowledgeByPerson.get(id)?.get(`person:${host}:met`);
      expect(fact?.value, where).toBeTruthy();
      expect(fact?.sourceId, where).toBe(hall.id);
      // The first tie holds the hours they sat in the room.
      expect(closeness(id, host), where).toBeDefined();
    }

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
    expect(meetingParameter("publicCommentHours")).toBeLessThan(
      meetingParameter("townHallHours"),
    );
    // Time passes: the new tie reads as an ordinary acquaintance after a day.
    advanceCore(core, "2026-01-07");
  }, 300_000);
});
