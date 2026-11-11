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
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";
import { wordSceneMove } from "../english/scene-talk-words";
import situationFile from "./data/situation-types.json" with { type: "json" };

// A town hall a local official held is a scene for the official, about the
// question a resident stood up with and the answer the official gave it
// (scenes-from-life: docs/design/scenes/from-life/town-hall-goes-wrong.md).
// Places are drawn in turn until one holds a town hall by an official who is
// a full person; the scene must stand on that record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;
const ATTEMPTS = 6;
const READINGS = ["host-agreed", "host-opposed", "host-declined"];

it(`a town hall is the host's scene about a resident's question and the answer it got (seed ${seed})`, () => {
  const tried: string[] = [];
  const stakes: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "town-hall-question");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const halls = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "town-hall" &&
        director.ledger.people.has(String(row.facts?.hostId) as PersonId),
    );
    if (!halls.length) {
      tried.push(place.name);
      continue;
    }
    let composed = 0;
    for (const hall of halls) {
      const hostId = String(hall.facts!.hostId) as PersonId;
      const here = `${where}: ${hall.id}`;
      const book = director.ledger.people.get(hostId)!;
      const entry = book.schedule.find((row) => row.momentId.includes(hall.id));
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "town-hall-question",
      );
      expect(binding, `${here}: no town-hall-question scene`).toBeTruthy();
      // Office hours no longer takes a town hall.
      expect(
        entry!.bindings.some((row) => row.typeKey === "office-hours"),
        here,
      ).toBe(false);
      const result = purposeScene(core, director, hostId, entry!, {
        typeKey: "town-hall-question",
      });
      if (result?.kind !== "composed") continue;
      composed += 1;
      const { scene } = result;
      expect(scene.cause.id, here).toBe(hall.id);
      const issue = scene.facts.find((row) => row.key === "issue");
      expect(issue, `${here}: the question is on the scene`).toBeTruthy();
      expect(issue!.recordIds, here).toContain(String(hall.facts!.townHallId));
      const readings = scene.facts.filter((row) => READINGS.includes(row.key));
      expect(
        readings,
        `${here}: exactly one reading of the answer`,
      ).toHaveLength(1);
      // About the question first; the resident's own stake, where the
      // records hold one, is the reason after it, cited to its row (a job
      // lost from an employer, or rent owed).
      expect(scene.talk.state.text, here).toContain(issue!.text);
      const employer = scene.facts.find((row) => row.key === "employer");
      if (scene.facts.some((row) => row.key === "stake-work")) {
        expect(scene.talk.state.text, here).toContain(employer!.text);
        stakes.push(`${here}: ${scene.talk.state.text}`);
      }
      const owed = scene.facts.find((row) => row.key === "owed");
      if (scene.facts.some((row) => row.key === "stake-money")) {
        expect(scene.talk.state.text, here).toContain(owed!.text);
        stakes.push(`${here}: ${scene.talk.state.text}`);
      }
      // Up to four replies, each a different move, and one screen names a
      // thing once (lead, Nov 11, 2026).
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, here);
      for (const row of scene.facts.filter((fact) => fact.text.length > 2))
        expect(
          root.filter((reply) => reply.text.includes(row.text)).length,
          `${here}: "${row.text}" in two replies: ${root.map((reply) => reply.text).join(" / ")}`,
        ).toBeLessThanOrEqual(1);
      process.stdout.write(
        `TOWN HALL ${here}: "${scene.talk.state.text}" | ${root.map((row) => `${row.move}: ${row.text}`).join(" | ")}\n`,
      );
      // The same scene reads differently when the answer was opposed, agreed
      // with or not given: the cast and the question stay, the reading moves.
      const type = (
        situationFile as unknown as { types: PurposeType[] }
      ).types.find((row) => row.key === "town-hall-question")!;
      const facts: Record<string, Fact> = Object.fromEntries(
        scene.facts
          .filter((row) => !READINGS.includes(row.key))
          .map((row) => [
            row.key,
            { text: row.text, sourceRecordIds: row.recordIds },
          ]),
      );
      const stated = READINGS.map((reading) => {
        const talk = composeSceneTalk(
          core,
          director,
          { askerId: scene.askerId, askedId: scene.askedId },
          type,
          {
            ...facts,
            [reading]: { text: reading, sourceRecordIds: [hall.id] },
          },
        );
        expect(talk.kind, `${here}: ${reading}`).toBe("composed");
        return talk.kind === "composed" ? talk.talk.state.text : "";
      });
      expect(new Set(stated).size, `${here}: ${stated.join(" | ")}`).toBe(
        stated.length,
      );
    }
    expect(composed, `${where}: no town hall scene composed`).toBeGreaterThan(
      0,
    );
    return;
  }
  throw new Error(
    `no official held a town hall in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 900_000);

// A resident's own stake is the reason after their question (owner, Nov 11,
// 2026: "This introduces people to their world."): one who lost a job names
// the employer, one behind on rent names what they owe, and a host who
// answered against them hears a different question than one who agreed.
it(`a resident's question gives their own reason, from a lost job or rent owed (seed ${seed})`, () => {
  const fact = (text: string, id: string) => ({ text, sourceRecordIds: [id] });
  const base = {
    name: fact("Dana Ruiz", "person:resident"),
    first: fact("Sam", "person:host"),
    place: fact("the town", "place:town"),
    issue: fact("free fares on public transit", "town-hall:1"),
    "asker-first": fact("Dana", "person:resident"),
  };
  const ask = (
    facts: Record<string, { text: string; sourceRecordIds: string[] }>,
    momentKey: string,
  ) => {
    const worded = wordSceneMove({
      move: {
        step: "state",
        move: "ask",
        role: "asker",
        purpose: "town-hall-question",
        key: "favor-asked",
      },
      facts,
      seed,
      speakerId: "person:resident",
      traits: {},
      momentKey,
      said: new Set(),
    });
    return worded && "text" in worded ? worded.text : "";
  };
  const work = {
    stake: fact("work", "change:1"),
    "stake-work": fact("work", "change:1"),
    employer: fact("Harlan Mill", "org:mill"),
  };
  const money = {
    stake: fact("money", "case:1"),
    "stake-money": fact("money", "case:1"),
    owed: fact("about $400", "case:1"),
  };
  const opposed = ask(
    { ...base, ...work, "host-opposed": fact("host-opposed", "town-hall:1") },
    "a",
  );
  const agreed = ask(
    { ...base, ...work, "host-agreed": fact("host-agreed", "town-hall:1") },
    "a",
  );
  const behind = ask(
    {
      ...base,
      ...money,
      "host-declined": fact("host-declined", "town-hall:1"),
    },
    "b",
  );
  process.stdout.write(
    `TOWN HALL STAKES: "${opposed}" | "${agreed}" | "${behind}"\n`,
  );
  for (const text of [opposed, agreed, behind])
    expect(text).toContain("free fares on public transit");
  expect(opposed).toContain("Harlan Mill");
  expect(agreed).toContain("Harlan Mill");
  expect(opposed).not.toBe(agreed);
  expect(behind).toContain("about $400");
});
