import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import {
  billOf,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  registerLegislatureHooks,
  votesOn,
  type CommitteeRecord,
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
// Bills that died in their first chamber's committee, each with no floor
// vote; sceneOpened marks one the scene opened on before it died.
const committeeDeaths: {
  billId: string;
  status: string | undefined;
  votes: number;
  sceneOpened: boolean;
}[] = [];
let armed = false;
// Not a committee-stage hook, so it runs on the floor day, just before the vote.
registerLegislatureHooks({
  beforeVote: { name: "office-scene-test", run: openScene },
});

function openScene(api: CoreAPI, billId: string): void {
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
}

/** Bills the first chamber's committee held, from the committee records. */
function collectCommitteeDeaths(core: CoreState): void {
  const api = coreAPI(core);
  for (const row of api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("committees")
    .rows() as unknown as CommitteeRecord[]) {
    const bill = billOf(api, row.billId);
    if (row.reported || !bill || row.chamber !== bill.bodyOfficeId) continue;
    if (committeeDeaths.some((d) => d.billId === row.billId)) continue;
    committeeDeaths.push({
      billId: row.billId,
      status: bill.status,
      votes: votesOn(api, row.billId).length,
      sceneOpened: false,
    });
  }
}

/**
 * Plays drawn places until both cases are in hand: a town vote with a scene
 * (kept in its own world) and a bill its committee killed. Once the scene is
 * found, a later place is played only for a committee death.
 */
function play(): {
  place: ReturnType<typeof drawPlace>;
  core: CoreState;
  date: string;
} {
  let found: {
    place: ReturnType<typeof drawPlace>;
    core: CoreState;
    date: string;
  } | null = null;
  for (let i = 0; i < maxPlaces; i += 1) {
    const place = drawPlace(i ? `${seed}:${i}` : seed, "office-scene");
    const world = buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    let date = opening;
    const scenePlace = !found;
    armed = scenePlace;
    for (let day = 0; day < maxDays; day += 1) {
      if (scenePlace ? captured : committeeDeaths.length) break;
      date = addDay(date);
      advanceCore(world.core, date);
      if (!scenePlace) collectCommitteeDeaths(world.core);
      // The scene opens just before the body votes. A bill its committee did
      // not report dies there with no floor vote at all, so no member's vote
      // is ever recorded: that scene is kept apart (it is the committee-failure
      // case) and the search goes on to a bill that reaches the floor.
      if (scenePlace && captured) {
        const held = captured as Captured;
        const voted = votesOn(coreAPI(world.core), held.scene.billId).some(
          (row) => row.memberId === held.scene.targetId,
        );
        if (!voted) {
          committeeDeaths.push({
            billId: held.scene.billId,
            status: billOf(coreAPI(world.core), held.scene.billId)?.status,
            votes: votesOn(coreAPI(world.core), held.scene.billId).length,
            sceneOpened: true,
          });
          captured = null;
        }
      }
    }
    armed = false;
    collectCommitteeDeaths(world.core);
    const outcome = !scenePlace
      ? `played for a committee death to ${date}`
      : captured
        ? `scene on ${date}`
        : `no town vote with a scene in ${maxDays} days`;
    proof.push(
      `office scene: seed ${seed}, try ${i}, ${place.name} (${place.key}), ${outcome}; committee deaths so far ${committeeDeaths.length}${committeeDeaths[0] ? `, first ${committeeDeaths[0].billId}` : ""}`,
    );
    if (scenePlace && captured) found = { place, core: world.core, date };
    if (found && committeeDeaths.length) return found;
  }
  throw new Error(
    found
      ? `No bill its committee killed in ${maxPlaces} places: ${proof.join("; ")}`
      : `No town vote with an office scene in ${maxPlaces} places: ${proof.join("; ")}`,
  );
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
    process.stdout.write(`${proof.join("\n")}\n`);
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
    // The last narrator line says what is happening, naming the member.
    const lead = scene.narration.at(-1)!.text;
    expect(lead).toMatch(/\b(member you need to reach|is the one to reach)\b/);
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
    expect(
      committeeDeaths.length,
      "a bill its committee killed in the places played",
    ).toBeGreaterThan(0);
    for (const death of committeeDeaths) {
      expect(death.status, death.billId).toBe("failed");
      expect(death.votes, death.billId).toBe(0);
    }
    // The scene opened on one is not the captured one.
    for (const death of committeeDeaths.filter((d) => d.sceneOpened))
      expect(death.billId).not.toBe(scene.billId);
  });
});
