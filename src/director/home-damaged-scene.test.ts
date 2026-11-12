import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  HOME_DAMAGED_EVENT,
  damagedHomesOf,
  normalizedGovernmentName,
  townDisastersWithDamage,
} from "../core2/modules/disasters";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import { townsWithDamage } from "../core2/tooling/disaster-damage-screen";
import { moneySaid } from "../english/count-words";
import { wordSceneMove, type Fact } from "../english/scene-talk-words";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import situationFile from "./data/situation-types.json" with { type: "json" };
import { createDirector } from "./ledger";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode, TreeReply } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";
import { expectUpToFourDifferent } from "./reply-set-check";

// A disaster damaged the player's home (the disasters engine's damaged-home
// row, filled on the declaration date and told to the household as the
// `disaster.home-damaged` record, circumstance row home-damaged). That day
// someone who lives with the player sits them down: what the repairs cost,
// what the aid came to and what is still owed, each as people round a sum.
// The player's answer is written back; a promise to see the repairs through
// is kept on its record and told in their journal.
//
// The test draws a place from all 56 whose FEMA figures show damaged homes,
// plays the world to the day after the disaster begins (the engine marks the
// homes then), takes a named head of a household of two or more, and plays
// them through the player's clock to the declaration date.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 400;
const LABEL = "circumstance:home-damaged";

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it(`a damaged home is talked over at home, from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let opened = 0;
  try {
    for (let draw = 0; draw < DRAWS && opened < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "home-damaged");
      const name = normalizedGovernmentName(place.name.split(",")[0] ?? "");
      if (!townsWithDamage(place.state.replace(/^US-/, "")).has(name)) continue;
      opened += 1;
      const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const start = makeIsoDate(core.date);
      // The disaster whose damage the engine marks (it begins after the
      // opening) and pays in the first year.
      const disaster = townDisastersWithDamage(api)
        .filter(
          (row) =>
            row.begins > core.date &&
            row.declared > row.begins &&
            row.declared <= addDays(start, 330),
        )
        .sort((a, b) => a.declared.localeCompare(b.declared))[0];
      if (!disaster) {
        tried.push(
          `${where}: no disaster that begins and is declared in the year`,
        );
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(disaster.begins), 1));
      // A named head of a household of two or more, grown.
      const homes = damagedHomesOf(api, disaster.number)
        .filter((home) => {
          const head = home.headId ? core.people.get(home.headId) : undefined;
          return (
            !!head?.alive &&
            head.tier !== "husk" &&
            ageOnDate(makeIsoDate(head.birthDate), makeIsoDate(core.date)) >=
              18 &&
            (core.households
              .get(home.householdId)
              ?.memberIds.filter((id) => core.people.get(id)?.alive).length ??
              0) > 1
          );
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      const home = homes[0];
      if (!home) {
        tried.push(
          `${where}: disaster ${disaster.number} marked ${damagedHomesOf(api, disaster.number).length} homes, none a named head with a household`,
        );
        continue;
      }
      const personId = home.headId!;
      core.focusPersonIds.add(personId);
      director.watch(core, personId);
      const book = director.ledger.people.get(personId)!;
      let entry: ScheduleEntry | undefined;
      const open = () => {
        entry ??= book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.label === LABEL,
        );
      };
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: {
          date: addDays(makeIsoDate(disaster.declared), 3),
          minuteOfDay: P.zero,
        },
      });
      while (packet.kind !== "complete" && !entry) {
        if (packet.kind === "stop") {
          open();
          if (entry) break;
          packet = resumePlayerV1(core, {
            kind: "stop",
            pauseId: packet.pauseId,
          });
        } else
          packet = resumePlayerV1(core, {
            kind: "own-choice",
            pauseId: packet.pauseId,
          });
      }
      open();
      if (!entry) {
        tried.push(
          `${where}: ${home.id} (${personId}), declared ${disaster.declared}, not talked over`,
        );
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId);
      // The staged scene cites the engine's record of this very home.
      expect(record?.kind, where).toBe(HOME_DAMAGED_EVENT);
      expect(record?.facts?.damagedId, where).toBe(home.id);
      expect(record?.personIds, where).toContain(personId);
      const row = damagedHomesOf(api, disaster.number).find(
        (r) => r.id === home.id,
      )!;
      expect(String(row.aidMinor), where).toBe(record?.facts?.aidMinor);
      expect(String(row.repairsOwedMinor), where).toBe(
        record?.facts?.repairsOwedMinor,
      );
      // Composed by the purpose engine, not skipped.
      const result = purposeScene(core, director, personId, entry);
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("home-damaged");
      // Someone they live with brings it.
      expect(scene.askerId, where).not.toBe(personId);
      expect(core.people.get(scene.askerId)?.householdId, where).toBe(
        core.people.get(personId)?.householdId,
      );
      // The sums are the row's, said as people round them.
      const fact = (key: string) => scene.facts.find((f) => f.key === key);
      if (row.repairsOwedMinor > P.zero) {
        expect(fact("loss")?.text, where).toBe(moneySaid(row.repairsOwedMinor));
        expect(fact("loss")?.recordIds, where).toContain(moment.causeId);
      }
      if (row.aidMinor > P.zero)
        expect(fact("aid")?.text, where).toBe(moneySaid(row.aidMinor));
      const owedStill = row.repairsOwedMinor - row.repairsPaidMinor;
      expect(Boolean(fact("left")), where).toBe(owedStill > P.zero);
      expect(fact("home")?.text, where).toBeTruthy();
      // The opening statement quotes the money the record holds.
      const state = scene.talk.state.text;
      if (row.repairsOwedMinor > P.zero || row.aidMinor > P.zero)
        expect(
          [fact("loss"), fact("aid"), fact("left")].some(
            (f) => f && state.includes(f.text),
          ),
          `${where}: the statement says none of the record's sums: ${state}`,
        ).toBe(true);
      for (const line of scene.talk.lines)
        expect(line.text, where).not.toMatch(
          /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
        );
      // Up to four answers, all different moves.
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expect(new Set(root.map((r) => r.move)).size, where).toBe(root.length);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["promise", "ask", "offer", "deflect"], where).toContain(
          row.move,
        );
      // A promise to see the repairs through is kept on the reply's record,
      // which cites this cause (and so the damaged home).
      const promised = paths(scene.talk.tree).find((full) => {
        let node: TreeNode | null = scene.talk.tree;
        for (const index of full) node = node?.replies[index]?.next ?? null;
        return node?.end?.ending?.keeps === "promise";
      });
      expect(promised, `${where}: no path keeps a promise`).toBeTruthy();
      const id = replyInScene(core, director, personId, entry, promised!);
      const reply = core.durableLog.get(id!);
      expect(reply?.facts?.keeps, where).toBe("promise");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.typeKey, where).toBe("home-damaged");
      // The scene as the promise path plays it, line by line.
      const walk: string[] = [
        ...scene.talk.narration.map((line) => `[${line.text}]`),
        ...(scene.talk.open ? [scene.talk.open.text] : []),
        scene.talk.state.text,
      ];
      let at: TreeNode | null = scene.talk.tree;
      for (const index of promised!) {
        const taken: TreeReply | undefined = at?.replies[index];
        if (!taken) break;
        walk.push(`> ${taken.line.text}`);
        at = taken.next;
        for (const line of at?.lines ?? []) walk.push(line.text);
      }
      if (at?.end?.close) walk.push(at.end.close.text);
      const told = composeJournal(core, director, personId)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(id!));
      const note = `HOME DAMAGED ${where}: ${core.date}, disaster ${disaster.number} (${disaster.title}), cause ${moment.causeId}, damaged row ${home.id}, ${personId} with ${scene.askerId}; aid ${row.aidMinor}, repairs paid ${row.repairsPaidMinor} of ${row.repairsOwedMinor}; reply ${id} (${reply?.facts?.ending}); journal "${told?.text ?? "(other unnamed)"}"\n  ${walk.join("\n  ")}`;
      if (process.env.SCENE_LOG) writeFileSync(process.env.SCENE_LOG, note);
      process.stdout.write(`${note}\n`);
      return;
    }
    throw new Error(
      `no drawn place talked over a damaged home in ${opened} opened places: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

// The three ways the money can go are worded from the record: the aid covers
// the repairs, falls short of them, or the repairs went unpaid. The words are
// the bank's; the sums are said as people round them (an edge proof of the
// bank, with no world).
it("words the statement from what the record says: aid that covers, aid that falls short, repairs unpaid", () => {
  const fact = (text: string): Fact => ({ text, sourceRecordIds: ["x"] });
  const base = { name: fact("Pat Rivera"), home: fact("farmhouse") };
  const say = (facts: Record<string, Fact>) => {
    const out = new Set<string>();
    for (let n = 0; n < 24; n += 1) {
      const word = wordSceneMove({
        move: {
          step: "state",
          move: "deliver-news",
          role: "asker",
          purpose: "home-damaged",
          key: "damage",
        },
        facts: { ...base, ...facts },
        seed: `variants:${n}`,
        speakerId: `speaker-${n}`,
        traits: {},
        momentKey: `m:${n}`,
        said: new Set(),
      });
      if (word && "text" in word) out.add(word.text);
    }
    return [...out];
  };
  const covers = say({
    loss: fact(moneySaid(300_000)),
    aid: fact(moneySaid(500_000)),
    "aid-covers": fact("yes"),
    "paid-up": fact("yes"),
  });
  const short = say({
    loss: fact(moneySaid(900_000)),
    aid: fact(moneySaid(400_000)),
    "aid-short": fact("yes"),
  });
  const unpaid = say({
    loss: fact(moneySaid(900_000)),
    aid: fact(moneySaid(400_000)),
    left: fact(moneySaid(200_000)),
    "aid-short": fact("yes"),
    unpaid: fact("yes"),
  });
  const none = say({});
  for (const lines of [covers, short, unpaid, none])
    for (const line of lines) expect(line).not.toMatch(/[{}]/);
  expect(covers.some((l) => l.includes(moneySaid(500_000)))).toBe(true);
  expect(short.some((l) => l.includes(moneySaid(900_000)))).toBe(true);
  expect(unpaid.some((l) => l.includes(moneySaid(200_000)))).toBe(true);
  // A word of "owe" never reaches a household whose repairs are paid.
  expect(covers.some((l) => /\bowe\b|\bshort\b|\bhole\b/.test(l))).toBe(false);
  // The three differ from one another and from the plain statement.
  expect(new Set([...covers, ...short, ...unpaid, ...none]).size).toBe(
    covers.length + short.length + unpaid.length + none.length,
  );
  expect(none.length).toBeGreaterThan(0);
});

// Every path of the scene is worded for each of the three ways the money went,
// with nothing a reader of that case would find false: a household whose
// repairs are paid is never told it owes, and no case leaves a gap in the bank.
it("plays a whole scene for each way the money went, with no gap and no line that says what the record does not", () => {
  const base = enrichCivicInputs(
    buildPopulation({
      seed: `home-damaged-${seed}`,
      startedAt: "2021-01-01",
      minimumPeople: 120,
    }),
  );
  const adults = base.people.filter(
    (person) =>
      person.tier !== "husk" &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(base.startedAt)) >=
        25,
  );
  const input = { ...base, playerId: adults[0]!.id };
  const director = createDirector({ watch: [...initialFocusPeople(input)] });
  const core = createLifeCore(input, { modules: [director.module] });
  director.start(core);
  advanceCore(core, "2021-01-03");
  const type = (
    situationFile as unknown as { types: PurposeType[] }
  ).types.find((row) => row.key === "home-damaged")!;
  const fact = (text: string): Fact => ({
    text,
    sourceRecordIds: [adults[1]!.id],
  });
  const common = {
    name: fact("Pat Rivera"),
    first: fact(core.people.get(adults[0]!.id)!.givenName),
    place: fact("the town"),
    home: fact("house"),
    disaster: fact("the flood"),
  };
  const cases: Record<string, Record<string, Fact>> = {
    covers: {
      loss: fact(moneySaid(300_000)),
      aid: fact(moneySaid(500_000)),
      "aid-covers": fact("yes"),
      "paid-up": fact("yes"),
    },
    short: {
      loss: fact(moneySaid(900_000)),
      aid: fact(moneySaid(400_000)),
      "aid-short": fact("yes"),
    },
    unpaid: {
      loss: fact(moneySaid(900_000)),
      aid: fact(moneySaid(400_000)),
      left: fact(moneySaid(200_000)),
      "aid-short": fact("yes"),
      unpaid: fact("yes"),
    },
    none: {
      loss: fact(moneySaid(900_000)),
      left: fact(moneySaid(900_000)),
      "no-aid": fact("yes"),
      unpaid: fact("yes"),
    },
  };
  for (const [name, extra] of Object.entries(cases)) {
    const result = composeSceneTalk(
      core,
      director,
      { askerId: adults[1]!.id, askedId: adults[0]!.id },
      type,
      { ...common, ...extra },
      {},
      { includeHeld: true },
    );
    expect(result.kind, name).toBe("composed");
    if (result.kind !== "composed") continue;
    const { talk } = result;
    expect(talk.gaps, name).toEqual([]);
    expect(
      new Set(talk.tree.replies.map((reply) => reply.line.move)),
      name,
    ).toEqual(new Set(["promise", "ask", "offer", "deflect"]));
    const lines: string[] = [];
    const walk = (node: TreeNode) => {
      lines.push(...node.lines.map((line) => line.text));
      if (node.end?.close) lines.push(node.end.close.text);
      for (const reply of node.replies) {
        lines.push(reply.line.text);
        if (reply.next) walk(reply.next);
      }
    };
    walk(talk.tree);
    lines.push(...talk.lines.map((line) => line.text), talk.state.text);
    for (const line of lines) expect(line, name).not.toMatch(/[{}]/);
    if (name === "covers")
      for (const line of lines)
        expect(line, `${name}: ${line}`).not.toMatch(
          /\bowe\b|\bowing\b|\bshort\b|\bhole\b|how we pay|where it comes from/,
        );
  }
});
