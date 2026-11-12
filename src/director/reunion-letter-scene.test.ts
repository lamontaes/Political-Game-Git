import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, daysBetweenText, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  FAMILY_CONTACT,
  FAMILY_GATHERING_MISSED,
} from "../core2/modules/kin-contact";
import type { CoreState, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { letterFacts } from "./letter-facts";
import { destinationSaid, purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// A letter asks for something (owner, Nov 9: a purpose for every scene kind
// that lacks one). The facts come from records the world keeps: where the
// writer lives, what changed in their life (births in the household,
// weddings, moves, work, illness), the `family.contact` record that wrote it,
// a birthday missed at the reader's table and the writer's own birthday. The
// letters are NOT staged: they are the kin-contact engine's own
// `family.contact` records in a played year. (The reunion scene was deleted
// with the scene inventory, docs/design/scene-inventory.md: its cause was the
// director's own re-entry echo, not an engine record.)
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

/** The paths whose end keeps a given thing. */
function endsKeeping(tree: TreeNode, keeps: string) {
  return paths(tree).flatMap((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps
      ? [{ full, ending: node.end.ending }]
      : [];
  });
}

const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const log = (note: string) => {
  if (process.env.SCENE_LOG)
    writeFileSync(process.env.SCENE_LOG, `${note}\n`, { flag: "a" });
  process.stdout.write(`${note}\n`);
};

it(`a relative's letter asks for something, from the kin-contact record that wrote it (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "letter");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const id = playerId as PersonId;
    director.watch(core, id);
    const book = director.ledger.people.get(id)!;
    const letters = () =>
      book.schedule.filter((row) =>
        row.bindings.some((bound) => bound.typeKey === "letter"),
      );
    for (let days = 0; days < 400 && letters().length < 4; days += 30)
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
    expect(
      letters().length,
      `${where}: no letter in a played year`,
    ).toBeGreaterThan(0);
    let replied = false;
    const found = new Set<string>();
    for (const entry of letters()) {
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId)!;
      expect(record.kind, where).toBe(FAMILY_CONTACT);
      const writerId = record.facts?.writerId as PersonId;
      const result = purposeScene(core, director, id, entry, {
        typeKey: "letter",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("letter-ask");
      expect(scene.askerId, where).toBe(writerId);
      expect(scene.askedId, where).toBe(id);
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      const writer = core.people.get(writerId)!;
      // The town the writer lives in, from their place.
      const lives = destinationSaid(writer.placeId, "");
      expect(fact("hometown")?.text ?? null, where).toBe(lives);
      // Every fact the letter's records give, and no other.
      const given = letterFacts(
        core,
        "letter",
        moment.causeId,
        writerId,
        id,
        (placeId) => destinationSaid(placeId, ""),
      );
      for (const [key, expected] of Object.entries(given))
        expect(fact(key)?.recordIds, `${where}: ${key}`).toEqual(
          expected.sourceRecordIds,
        );
      for (const key of [
        "new-child",
        "married",
        "moved",
        "new-employer",
        "ill",
        "missed-birthday",
        "birthday-near",
      ])
        expect(!!fact(key), `${where}: ${key}`).toBe(key in given);
      for (const key of Object.keys(given)) found.add(key);
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["agree", "promise", "ask", "decline"], where).toContain(
          row.move,
        );
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      expect(
        scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
        where,
      ).toEqual([]);
      for (const row of scene.talk.lines)
        expect(row.text, where).not.toMatch(SLOP);
      const narration = scene.talk.narration.map((row) => row.text).join(" ");
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      if (!replied) {
        replied = true;
        const settled = endsKeeping(scene.talk.tree, "promise")[0];
        expect(settled, `${where}: no path keeps a promise`).toBeTruthy();
        const replyId = replyInScene(core, director, id, entry, settled!.full, {
          typeKey: "letter",
        });
        const reply = core.durableLog.get(replyId!);
        expect(reply?.facts?.typeKey, where).toBe("letter");
        expect(reply?.facts?.causeId, where).toBe(moment.causeId);
        expect(reply?.facts?.ending, where).toBe("wrote-back-yes");
        expect(reply?.facts?.keeps, where).toBe("promise");
        expect(reply?.personIds, where).toContain(writerId);
        const sour = endsKeeping(scene.talk.tree, "relationship-strained")[0];
        const sourId = sour
          ? replyInScene(core, director, id, entry, sour.full, {
              typeKey: "letter",
            })
          : null;
        if (sourId)
          expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
            "wrote-back-no",
          );
        log(
          `LETTER (played year, not staged) ${where}: ${core.date}, cause ${moment.causeId}, ${id} from ${writerId}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(this writer takes a no gracefully)"}\n  ${narration} | ${said}`,
        );
      }
    }
    log(
      `LETTERS ${where}: ${letters().length} letters in a played year; facts found: ${[...found].join(",") || "(where they live only)"}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it(`a letter's facts come from the world's own records in drawn places (seed ${seed})`, () => {
  setBookkeeping(false);
  const lines: string[] = [];
  const found = new Set<string>();
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const place = drawPlace(seed, `letter-facts:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const placeSaid = (placeId: string) => destinationSaid(placeId, "");
      for (const recordId of [
        ...(core.logByKind.get(FAMILY_CONTACT) ?? []),
      ].sort()) {
        const record = core.durableLog.get(recordId);
        if (!record) continue;
        const [readerId, writerId] = record.personIds as PersonId[];
        const facts = letterFacts(
          core as CoreState,
          "letter",
          recordId,
          writerId!,
          readerId!,
          placeSaid,
        );
        for (const [key, fact] of Object.entries(facts)) {
          // Each fact is cited to records that exist (a person, a place, a record).
          expect(
            fact.sourceRecordIds.length,
            `${where}: ${key}`,
          ).toBeGreaterThan(0);
          if (key === "missed-birthday") {
            const missed = core.durableLog.get(fact.sourceRecordIds[0]!);
            expect(missed?.kind, `${where}: ${key}`).toBe(
              FAMILY_GATHERING_MISSED,
            );
            expect(missed?.facts?.absentId, `${where}: ${key}`).toBe(writerId);
          }
          if (key === "birthday-near") {
            const writer = core.people.get(writerId!)!;
            const gap = daysBetweenText(
              record.date,
              `${record.date.slice(0, 4)}-${writer.birthDate.slice(5)}`,
            );
            expect(Math.abs(gap) < 400, `${where}: ${key}`).toBe(true);
          }
          if (!found.has(key)) {
            found.add(key);
            lines.push(
              `${where}: ${key} on ${recordId} (${fact.sourceRecordIds.join(", ")}) ${fact.text}`,
            );
          }
        }
      }
    }
    log(`LETTER FACTS\n${lines.join("\n")}`);
    expect(found.has("hometown"), `no hometown (seed ${seed})`).toBe(true);
    expect(
      letterFacts(
        { people: new Map() } as never,
        "return",
        "cause",
        "a" as PersonId,
        "b" as PersonId,
        () => null,
      ),
    ).toEqual({});
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it("every line of the letter's purpose carries its own facts, with no name said twice and no stray words", () => {
  const purposes = new Set(["letter-ask"]);
  const parts = (
    sceneBank as unknown as {
      parts: {
        key: string;
        text: string;
        uses: {
          subject?: string;
          purpose?: string;
          step: string;
          move: string;
          role?: string;
          key?: string;
          after?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts.filter((part) => part.uses.some((use) => purposes.has(use.purpose!)));
  const count = (purpose: string) =>
    parts.filter((part) => part.uses.some((use) => use.purpose === purpose))
      .length;
  // The places a line can sit in a purpose's talk (the same subject, step,
  // move, role, key and after). Words gives a one-line spot two or three lines
  // (words-one-line-spots-1 to -3, #8225: letter-ask went from 45 pieces to 78
  // in the same 24 spots), so the ceiling bounds the talk's spots, not the
  // number of ways a spot is said.
  const spots = (purpose: string) =>
    new Set(
      parts.flatMap((part) =>
        part.uses
          .filter((use) => use.purpose === purpose)
          .map((use) =>
            [
              use.subject,
              use.step,
              use.move,
              use.role,
              use.key,
              use.after ?? "",
            ].join("|"),
          ),
      ),
    ).size;
  for (const purpose of purposes) {
    expect(count(purpose), purpose).toBeGreaterThanOrEqual(30);
    expect(spots(purpose), purpose).toBeLessThanOrEqual(45);
  }
  const base = new Set(["name", "first", "place"]);
  for (const part of parts) {
    const slots = [...part.text.matchAll(/\{([a-z-]+)\}/g)].map((m) => m[1]!);
    const use = part.uses.find((row) => purposes.has(row.purpose!))!;
    for (const slot of slots)
      if (!base.has(slot))
        expect(use.requiresFacts ?? [], `${part.key}: {${slot}}`).toContain(
          slot,
        );
    expect(new Set(slots).size, part.key).toBe(slots.length);
    expect(part.text, part.key).not.toMatch(/\ball right\b/i);
    expect(part.text, part.key).not.toMatch(/^(well|look|so|um|uh),/i);
    // An answer to any ask names no day or time: the ask it answers may name any.
    if (use.step === "follow" && use.after === "ask")
      expect(part.text, part.key).not.toMatch(
        /\b(today|tomorrow|tonight|week|weekend|month|year|soon|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i,
      );
    // A follow-up that answers a reply fits any ask: it names no fact.
    if (use.step === "follow" && use.after)
      expect(use.requiresFacts ?? [], part.key).toEqual([]);
  }
});
