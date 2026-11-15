import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import {
  campaignDayChoices,
  takeCampaignDayChoice,
} from "../core2/campaign-day";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  fileCandidacy,
  petitionOf,
  petitionSigners,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { endorsementsOf } from "../core2/modules/campaigns";
import { purposeScene, replyInScene } from "./purpose-scene";

// The clerk's word on the player's petition, the morning after its deadline.
// One pinned town (Acequia, Idaho, GEOID 1600280), as petition-filing.test.ts
// pins it: the player files a month before the town race's deadline.
const PLACE = "1600280";
const SEED = "1110d0796efcdf584767079f512566be41cf3b19d816526056f3f73445ee8eaf";
const LEAD_DAYS = 30;

function playToTheCheck(moveASigner: boolean, canvassDays = true) {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const latest = addDays(makeIsoDate(core.date), 400);
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter(
      (c) =>
        c.level !== "state" &&
        c.level !== "federal" &&
        !c.special &&
        c.filingDeadline > addDays(makeIsoDate(core.date), LEAD_DAYS) &&
        c.filingDeadline <= latest,
    )
    .sort(
      (a, b) =>
        a.filingDeadline.localeCompare(b.filingDeadline) ||
        a.id.localeCompare(b.id),
    )[0]!;
  advanceCore(core, addDays(makeIsoDate(contest.filingDeadline), -LEAD_DAYS));
  const { townPlaceId } = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 25,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const adult of adults) {
    if (checkEligibility(api, adult.id, contest.id, null).some((c) => !c.met))
      continue;
    core.playerId = adult.id;
    director.watch(core, adult.id);
    const filed = fileCandidacy(api, {
      personId: adult.id,
      contestId: contest.id,
      platform: [],
      party: null,
    });
    if (filed.status !== "refused") {
      filing = filed.filing;
      break;
    }
  }
  const playerId = core.playerId as PersonId;
  const opened = petitionOf(api, filing!.id)!;
  let moved: string | null = null;
  while (core.date <= opened.due) {
    const canvass = campaignDayChoices(api, filing!.id).find(
      (c) => c.kind === "canvass",
    );
    if (canvassDays && canvass?.available)
      takeCampaignDayChoice(api, filing!.id, "canvass");
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // One signer, with their whole household, moves out of town before the deadline.
    if (moveASigner && !moved) {
      const signer = petitionSigners(api, filing!.id)
        .map((s) => core.people.get(s.personId as PersonId))
        .find(
          (p) =>
            p &&
            p.alive &&
            p.id !== playerId &&
            p.placeId === townPlaceId &&
            p.householdId !== core.people.get(playerId)!.householdId &&
            // Nobody in the household holds a job, so the move needs none ended.
            core.households
              .get(p.householdId)!
              .memberIds.every((id) => !core.people.get(id as PersonId)?.jobId),
        );
      if (signer) {
        const home = core.households.get(signer.householdId)!;
        const elsewhere = [...core.people.values()].find(
          (p) => p.placeId !== townPlaceId && p.alive,
        )!.placeId;
        api.relocatePeopleV1({
          personIds: [...home.memberIds] as PersonId[],
          placeId: elsewhere,
          householdId: signer.householdId,
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation: "Staged: a signer moves out of town before the deadline.",
            estimatedFrom: "src/director/petition-checked-scene.test.ts",
          },
        });
        moved = signer.id;
      }
    }
  }
  advanceCore(core, addDays(makeIsoDate(opened.due), 1));
  return { core, director, api, filing: filing!, playerId, moved, contest };
}

const sceneOf = (run: ReturnType<typeof playToTheCheck>) => {
  const book = run.director.ledger.people.get(run.playerId)!;
  const entry = book.schedule.find(
    (row) =>
      row.momentId.includes(`petition-checked:${run.filing.id}`) &&
      row.bindings.some((b) => b.typeKey === "petition-checked"),
  );
  return {
    entry,
    scene: entry
      ? purposeScene(run.core as CoreState, run.director, run.playerId, entry, {
          typeKey: "petition-checked",
        })
      : null,
  };
};

describe("the clerk's word on the player's petition", () => {
  it("a short petition leaves the player to back someone else, kept as their own endorsement (Acequia, Idaho)", () => {
    const run = playToTheCheck(false, false);
    expect(run.core.date >= petitionOf(run.api, run.filing.id)!.due).toBe(true);
    const { entry, scene } = sceneOf(run);
    expect(entry, "no petition-checked scene staged").toBeTruthy();
    if (scene?.kind !== "composed") return expect.fail("scene not composed");
    const backable = scene.scene.facts.find((row) => row.key === "backable")!;
    expect(backable, "nobody the player would back").toBeTruthy();
    const [theirFiling, theirPerson] = backable.recordIds;
    const byPlayer = () =>
      endorsementsOf(run.api, theirFiling!).filter(
        (row) => row.speakerId === run.playerId,
      );
    // Filing in the race ended the player's earlier backing of this candidate
    // (the engine's own rule: a yes is withdrawn the day its speaker files in the
    // same race), so nothing of theirs backs anyone now.
    expect(byPlayer().filter((row) => row.answer === "yes")).toHaveLength(0);
    const reply = scene.scene.talk.tree.replies.findIndex(
      (row) => row.line.move === "promise",
    );
    expect(reply, "no reply to back them").toBeGreaterThanOrEqual(0);
    const id = replyInScene(
      run.core as CoreState,
      run.director,
      run.playerId,
      entry!,
      [reply],
    );
    expect(id).toBeTruthy();
    const kept = endorsementsOf(run.api, theirFiling!).find(
      (row) => row.speakerId === run.playerId,
    );
    expect(kept?.answer).toBe("yes");
    expect(kept?.endedByFilingId).toBeUndefined();
    expect(kept?.candidateId).toBe(theirPerson);
    expect(kept?.askerId).toBeNull();
    expect(run.core.durableLog.has(`campaign-endorsed:${kept!.id}`)).toBe(true);
    expect(run.core.durableLog.get(id!)?.facts?.backed).toBe(theirFiling);
    // The word is kept once: saying it again changes nothing.
    expect(
      replyInScene(run.core as CoreState, run.director, run.playerId, entry!, [
        reply,
      ]),
    ).toBe(id);
    expect(byPlayer()).toHaveLength(1);
  }, 90_000);

  it("names a signer who moved, by record id and with no count (Acequia, Idaho)", () => {
    const run = playToTheCheck(true);
    const check = petitionOf(run.api, run.filing.id)!.check!;
    expect(run.moved, "no signer to move").not.toBeNull();
    expect(check.struckReasons[run.moved!]).toBe("moved");
    expect(Object.keys(check.struckReasons).sort()).toEqual(
      [...check.struckIds].sort(),
    );
    const { entry, scene } = sceneOf(run);
    expect(entry, "no petition-checked scene staged").toBeTruthy();
    expect(scene?.kind).toBe("composed");
    if (scene?.kind !== "composed") return;
    const moved = scene.scene.facts.find((row) => row.key === "struck-moved");
    expect(moved?.recordIds).toContain(run.moved);
    expect(moved?.recordIds).toContain(petitionOf(run.api, run.filing.id)!.id);
    for (const line of scene.scene.talk.lines)
      expect(line.text, line.text).not.toMatch(/\d/);
    process.stdout.write(
      scene.scene.talk.lines.map((l) => `${l.role}: ${l.text}`).join("\n") +
        "\n",
    );
  }, 90_000);
});
