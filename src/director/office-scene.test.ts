import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import {
  billOf,
  memberKey,
  members,
  registerLegislatureHooks,
  votesOn,
  type MemberPosition,
} from "../core2/modules/legislature";
import { officialOf } from "../core2/modules/officials";
import { stancesOf } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState } from "../core2/types";
import {
  chooseOfficeScene,
  composeOfficeScene,
  type OfficeScene,
  type OfficeSceneResult,
} from "./office-scene";

// The office scene in the world the player gets (owner, Oct 14, 2026: scenes
// carry the consequential dialogue): `buildBenchWorld`, two-level, a place
// drawn from all 56 on a seed nobody chose (OFFICE_SCENE_SEED pins one),
// played day by day until a town body takes up a bill. Its sponsor is the
// controlled person; just before the body votes, the scene opens on the one
// colleague nearest the sponsor's side who is still against it. Saying
// nothing records nothing; making the case moves the colleague's stance by
// the sponsor's standing with them, and the vote reads it.
const seed = process.env.OFFICE_SCENE_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const maxDays = 120;
const maxPlaces = 8;

interface Captured {
  scene: OfficeScene;
  silent: OfficeSceneResult;
  silentEvents: { before: number; after: number };
  caseResult: OfficeSceneResult;
}

const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

const townBody = (api: CoreAPI, officeId: string) =>
  ["council", "county-board", "township-board"].includes(
    (
      api.moduleState("core2-offices-v1").table("offices").get(officeId) as
        { kind: string } | undefined
    )?.kind ?? "",
  );

const proof: string[] = [];
let captured: Captured | null = null;
// Scenes whose bill died in committee, with no floor vote held on it.
const committeeDeaths: {
  billId: string;
  status: string | undefined;
  votes: number;
}[] = [];
let armed = false;
registerLegislatureHooks({
  beforeVote(api, billId) {
    if (!armed || captured) return;
    const core = api.state as CoreState;
    const bill = billOf(api, billId);
    if (!bill || bill.status !== "drafted" || !townBody(api, bill.bodyOfficeId))
      return;
    const sponsor = bill.sponsorId;
    if (
      !core.people.get(sponsor)?.alive ||
      officialOf(api, sponsor) ||
      !members(api, bill.bodyOfficeId).some((t) => memberKey(t) === sponsor)
    )
      return;
    const scene = composeOfficeScene(core, sponsor, billId);
    if (!scene || !scene.choices.some((c) => c.key === "make-case")) return;
    const before = core.eventIds.size;
    const silent = chooseOfficeScene(core, scene, "silent");
    const silentEvents = { before, after: core.eventIds.size };
    const caseResult = chooseOfficeScene(core, scene, "make-case");
    captured = { scene, silent, silentEvents, caseResult };
  },
});

function play(): {
  place: ReturnType<typeof drawPlace>;
  core: CoreState;
  date: string;
} {
  for (let i = 0; i < maxPlaces; i += 1) {
    const place = drawPlace(i ? `${seed}:${i}` : seed, "office-scene");
    const world = buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    let date = opening;
    armed = true;
    for (let day = 0; day < maxDays && !captured; day += 1) {
      date = addDay(date);
      advanceCore(world.core, date);
      // The scene opens just before the body votes. A bill its committee did
      // not report dies there with no floor vote at all, so no member's vote
      // is ever recorded: that scene is kept apart (it is the committee-failure
      // case) and the search goes on to a bill that reaches the floor.
      if (captured) {
        const held = captured as Captured;
        const voted = votesOn(coreAPI(world.core), held.scene.billId).some(
          (row) => row.memberId === held.scene.targetId,
        );
        if (!voted) {
          committeeDeaths.push({
            billId: held.scene.billId,
            status: billOf(coreAPI(world.core), held.scene.billId)?.status,
            votes: votesOn(coreAPI(world.core), held.scene.billId).length,
          });
          captured = null;
        }
      }
    }
    armed = false;
    proof.push(
      `office scene: seed ${seed}, try ${i}, ${place.name} (${place.key}), ${captured ? `scene on ${date}` : `no town vote with a scene in ${maxDays} days`}`,
    );
    if (captured) return { place, core: world.core, date };
  }
  throw new Error(`No town vote with an office scene in ${maxPlaces} places.`);
}

const sum = (p: MemberPosition) => p.total;

describe("the office scene", () => {
  const { place, core } = play();
  const api = coreAPI(core);
  const { scene, silent, silentEvents, caseResult } = captured!;
  const bill = billOf(api, scene.billId);
  const vote = votesOn(api, scene.billId).find(
    (row) => row.memberId === scene.targetId,
  );
  proof.push(
    JSON.stringify(
      {
        place: `${place.name} (${place.key})`,
        seed,
        billId: scene.billId,
        bill: bill.number,
        status: bill.status,
        playerId: scene.playerId,
        targetId: scene.targetId,
        side: scene.side,
        questions: scene.questions,
        narration: scene.narration.map((l) => l.text),
        choices: scene.choices.map((c) => [c.key, c.label.text, c.line?.text]),
        eventIds: caseResult.eventIds,
        reply: caseResult.reply?.text,
        totalBefore: sum(caseResult.before),
        totalAfter: sum(caseResult.after),
        viewsBefore: caseResult.before.views,
        viewsAfter: caseResult.after.views,
        vote: vote && { vote: vote.vote, total: vote.position.total },
      },
      null,
      2,
    ),
  );

  it("logs the place, seed, bill, target and events", () => {
    console.log(proof.join("\n"));
    expect(proof.length).toBeGreaterThan(1);
  });

  it("picks, by records, the colleague nearest the player's side who is against it", () => {
    const want = scene.side === "yes" ? 1 : -1;
    expect(scene.targetId).not.toBe(scene.playerId);
    expect(scene.targetPosition.total * want).toBeLessThanOrEqual(0);
    expect(scene.goal).toEqual({
      kind: "member-vote",
      personId: scene.targetId,
      billId: scene.billId,
      vote: scene.side,
    });
    // Every line is said from records, and names the target from their term.
    for (const line of scene.narration)
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
    // The last narrator line puts the member in the room, named from their
    // records. (The sentence saying why they are the one to reach was
    // hand-written and is held until graded; pool item
    // words-office-scene-lead.)
    const lead = scene.narration.at(-1)!.text;
    const target = core.people.get(scene.targetId)!;
    expect(lead).toContain(target.givenName);
    expect(lead).toContain(target.familyName);
    expect(lead).not.toMatch(/\{\{|\}\}|undefined/);
    expect(scene.choices.map((c) => c.key)).toContain("silent");
    expect(scene.choices.map((c) => c.key)).toContain("make-case");
  });

  it("records nothing when the player says nothing", () => {
    expect(silent.eventIds).toEqual([]);
    expect(silentEvents.after).toBe(silentEvents.before);
    expect(silent.after).toEqual(silent.before);
    expect(silent.line).toBeNull();
  });

  it("moves the target's stance by the player's case, and the vote reads it", () => {
    expect(caseResult.eventIds.length).toBe(scene.questions.length);
    const stances = stancesOf(api, scene.targetId);
    for (const [i, { question }] of scene.questions.entries()) {
      const stance = stances.find((s) => s.topic === question)!;
      const cause = stance.causes.find(
        (c) => c.eventId === caseResult.eventIds[i],
      );
      expect(cause, question).toBeTruthy();
      expect(cause!.speakerId).toBe(scene.playerId);
      expect(cause!.change).toBeGreaterThan(0);
    }
    const want = scene.side === "yes" ? 1 : -1;
    expect(
      (caseResult.after.views - caseResult.before.views) * want,
    ).toBeGreaterThan(0);
    expect(
      (sum(caseResult.after) - sum(caseResult.before)) * want,
    ).toBeGreaterThan(0);
    // The vote the body held read the moved stance: its views part is no
    // longer where it stood before the case (other cases made at the same
    // meeting may move it further, either way), and the stance it read still
    // lists the player's case among its causes (checked above).
    expect(vote, "the target's recorded vote").toBeTruthy();
    expect(vote!.position.views).not.toBeCloseTo(caseResult.before.views, 10);
    if (vote!.vote === "yes" || vote!.vote === "no")
      expect(vote!.vote).toBe(vote!.position.total > 0 ? "yes" : "no");
  });

  it("a bill its committee did not report has no floor vote, and its scene is not taken for the vote", () => {
    for (const death of committeeDeaths) {
      expect(death.status, death.billId).toBe("failed");
      expect(death.votes, death.billId).toBe(0);
    }
  });
});
