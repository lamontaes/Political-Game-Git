import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import {
  billOf,
  memberKey,
  members,
  registerLegislatureHooks,
} from "../core2/modules/legislature";
import { officialOf } from "../core2/modules/officials";
import { stancesOf } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import {
  chooseOfficeScene,
  composeOfficeScene,
  type OfficeScene,
  type OfficeSceneResult,
} from "./office-scene";

// The office scene on the same engine for a state legislator and a member of
// Congress (pool item director-reach): in the played world, a place drawn from
// all 56 on a seed nobody chose (OFFICE_SCENE_SEED pins one), the sponsor of
// a state or federal bill is the controlled person, and just before the body
// votes the scene opens on the colleague nearest their side who is against.
// A case made to that official moves their stance as it does a town
// member's, and the vote reads it.
const seed = process.env.OFFICE_SCENE_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const maxDays = 400;
const maxPlaces = 3;

interface Captured {
  scene: OfficeScene;
  result: OfficeSceneResult;
}
const captured: Record<"state" | "federal", Captured | null> = {
  state: null,
  federal: null,
};
let armed = false;

registerLegislatureHooks({
  beforeVote(api, billId) {
    if (!armed) return;
    const bill = billOf(api, billId);
    if (!bill || bill.status !== "drafted") return;
    const level = bill.bodyOfficeId.includes(":legislature-")
      ? "state"
      : bill.bodyOfficeId.includes("us-") ||
          bill.bodyOfficeId.includes("congress") ||
          bill.bodyOfficeId.includes("house") ||
          bill.bodyOfficeId.includes("senate")
        ? "federal"
        : null;
    if (!level || captured[level]) return;
    const core = api.state as CoreState;
    const sponsor = bill.sponsorId;
    if (
      !core.people.get(sponsor)?.alive ||
      !officialOf(api, sponsor) ||
      !members(api, bill.bodyOfficeId).some((t) => memberKey(t) === sponsor)
    )
      return;
    const scene = composeOfficeScene(core, sponsor, billId);
    if (!scene || !scene.choices.some((c) => c.key === "make-case")) return;
    captured[level] = {
      scene,
      result: chooseOfficeScene(core, scene, "make-case"),
    };
  },
});

const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("the office scene at the state and federal levels", () => {
  const proof: string[] = [];
  let core: CoreState | null = null;
  setBookkeeping(false);
  for (
    let i = 0;
    i < maxPlaces && !(captured.state && captured.federal);
    i += 1
  ) {
    const place = drawPlace(i ? `${seed}:${i}` : seed, "office-scene-levels");
    const world = buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    let date = opening;
    armed = true;
    for (
      let day = 0;
      day < maxDays && !(captured.state && captured.federal);
      day += 1
    ) {
      date = addDay(date);
      advanceCore(world.core, date);
    }
    armed = false;
    core = world.core;
    proof.push(
      `office scene levels: seed ${seed}, try ${i}, ${place.name} (${place.key}), to ${date}: state ${captured.state ? "yes" : "no"}, federal ${captured.federal ? "yes" : "no"}`,
    );
  }

  for (const level of ["state", "federal"] as const) {
    it(`opens on a ${level} colleague and moves their stance by the player's case`, () => {
      console.log(proof.join("\n"));
      const got = captured[level];
      expect(got, proof.join("; ")).toBeTruthy();
      const { scene, result } = got!;
      const api = coreAPI(core!);
      const want = scene.side === "yes" ? 1 : -1;
      // The target is an official, from a ${level} body.
      expect(officialOf(api, scene.targetId)).toBeTruthy();
      expect(scene.targetPosition.total * want).toBeLessThanOrEqual(0);
      for (const line of scene.narration)
        expect(line.sourceRecordIds.length).toBeGreaterThan(0);
      // The case is recorded on each question, and the views engine holds it.
      expect(result.eventIds.length).toBe(scene.questions.length);
      const stances = stancesOf(api, scene.targetId);
      for (const [n, { question }] of scene.questions.entries()) {
        const cause = stances
          .find((s) => s.topic === question)
          ?.causes.find((c) => c.eventId === result.eventIds[n]);
        expect(cause, question).toBeTruthy();
        expect(cause!.speakerId).toBe(scene.playerId);
      }
      // The official's position reads it.
      expect((result.after.views - result.before.views) * want).toBeGreaterThan(
        0,
      );
    });
  }
}, 1_800_000);
