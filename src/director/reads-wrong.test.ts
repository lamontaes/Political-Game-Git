import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";

// Lines that read wrong once the game filled them (pool item
// words-batch-4-reads-wrong). Each test plays a scene in a generated world
// drawn from all 56 places and reads the line the way play says it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`office hours is a one-on-one: no town-hall beat plays in it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "reads-wrong-office-hours");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    for (const row of townSeats(coreAPI(core))) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const visits = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        director.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
    if (!visits.length) {
      tried.push(place.name);
      continue;
    }
    for (const visit of visits) {
      const officialId = String(visit.facts!.officialId) as PersonId;
      const entry = director.ledger.people
        .get(officialId)!
        .schedule.find((row) => row.momentId.includes(visit.id));
      const result = purposeScene(core, director, officialId, entry!);
      expect(result?.kind, where).toBe("composed");
      if (result?.kind !== "composed") continue;
      const said = JSON.stringify(result.scene.talk);
      expect(said, where).not.toMatch(
        /microphone|moderator|Somebody in the back|Next question|town hall|starts clapping|near the back lean/i,
      );
    }
    return;
  }
  throw new Error(`no office visit in ${tried.join("; ")} (seed ${seed})`);
}, 600_000);

// A line written for one place is not said in another: the narration after
// the arrival line, and the lines the people say, follow the room the scene
// is set in. [purpose, what the line says, the one setting it was written for]
const WRITTEN_FOR: readonly (readonly [string, RegExp, string])[] = [
  ["ask-vote", /at your desk when .* knocks on the open door/, "office"],
  ["ask-vote", /catches you outside the chamber/, "chamber"],
  [
    "owed-apology",
    /After the meeting, .* waits until the room is nearly empty/,
    "public",
  ],
  ["owed-apology", /rather do it out here/, "public"],
  ["donor-ask", /Thanks for taking my call/, "phone"],
  ["ask-support", /opens the door|comes to the door before/, "other-home"],
  ["recall-confront", /folding table|card table/, "public"],
  ["law-reaches", /on the street|crosses the street/, "public"],
  [
    "appointment-offer",
    /calls (?:while|from)|Do you have ten minutes/,
    "phone",
  ],
  ["veto-call", /Your phone lights up/, "phone"],
  ["scandal-comment", /Your phone rings|isn't a call I like/, "phone"],
  ["cut-argument", /Sorry to come in like this/, "office"],
  ["staff-news", /comes into your office/, "office"],
  ["section-bargain", /break in the meeting/, "chamber"],
  ["victory-night", /The room is loud|in the ballroom/, "venue"],
];

interface Played {
  where: string;
  scenes: {
    typeKey: string;
    kind: string;
    recordId: string;
    purpose: string;
    facts: { key: string; text: string; recordIds: string[] }[];
    said: string;
  }[];
}

let played: Played | undefined;
/** One generated year at a drawn place; every staged scene played as the player meets it. */
function playedYear(): Played {
  if (played) return played;
  const scenes: Played["scenes"] = [];
  const world = stageWorldHeld({
    id: "reads-wrong",
    seed,
    days: 365,
    onStaged: (staged, _scene, core, director) => {
      const entry = director.ledger.people
        .get(staged.watchedId as PersonId)
        ?.schedule.find((row) => row.momentId === staged.momentId);
      if (!entry) return;
      const result = purposeScene(
        core,
        director,
        staged.watchedId as PersonId,
        entry,
      );
      if (result?.kind !== "composed") return;
      scenes.push({
        typeKey: staged.typeKey,
        kind: staged.setting.kind,
        recordId: staged.setting.recordId,
        purpose: result.scene.purpose,
        facts: result.scene.facts,
        said: JSON.stringify(result.scene.talk),
      });
    },
  });
  const { place } = world.report;
  played = {
    where: `${place.name} (${place.key}), seed ${seed}`,
    scenes,
  };
  return played;
}

it(`a scene's lines name the room the scene is set in (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  expect(scenes.length, where).toBeGreaterThan(0);
  for (const scene of scenes) {
    const fact = scene.facts.find((row) => row.key === `setting-${scene.kind}`);
    expect(fact?.recordIds, `${where}: ${scene.typeKey}`).toContain(
      scene.recordId,
    );
    for (const [purpose, line, written] of WRITTEN_FOR) {
      if (scene.purpose === purpose && scene.kind !== written)
        expect(
          scene.said,
          `${where}: ${scene.typeKey} in ${scene.kind}`,
        ).not.toMatch(line);
    }
  }
}, 1_200_000);

it(`an office is said in sentence case, and the oath names the office with its article (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  let named = 0;
  for (const scene of scenes) {
    const office = scene.facts.find((row) => row.key === "office");
    if (!office) continue;
    named += 1;
    // "Council member" is "council member" inside a sentence.
    expect(office.text, `${where}: ${scene.typeKey}`).not.toMatch(
      /^[A-Z][^A-Z]*$/,
    );
    expect(scene.said, `${where}: ${scene.typeKey}`).not.toMatch(
      /work of (?!the )[a-z]/,
    );
  }
  expect(named, where).toBeGreaterThan(0);
}, 1_200_000);

it("no piece asks for the work of an office without its article", () => {
  const parts = (sceneTalkBank as unknown as { parts: { text: string }[] })
    .parts;
  expect(parts.filter((part) => /work of \{office\}/.test(part.text))).toEqual(
    [],
  );
});
