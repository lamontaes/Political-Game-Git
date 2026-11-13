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
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { spanSaid } from "../english/span-words";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { composeJournal } from "./journal";
import { letterFacts } from "./letter-facts";
import { newsSince } from "./life-news";
import { destinationSaid, purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// A reunion and a letter each ask for something (owner, Nov 9: a purpose for
// every scene kind that lacks one). The facts come from records the world
// keeps: how long two people were apart (the director's thread for the pair),
// where they live (the person's place), what changed in their life (births in
// the household, weddings, moves, work, illness) and, for a letter, the
// `family.contact` record that wrote it, a birthday missed at the reader's
// table and the writer's own birthday.
//
// A reunion needs a pair that has been out of touch for years and a history
// the director weighs; the opening starts every tie fresh, so the reunion's
// cause is HAND-STAGED: a tie's last contact is set three years back before
// the director watches, its thread is given the grown tie two years of
// history would have built, and the player is then in touch once more
// (`api.relationship`, the core's own writer). Everything after is the
// director's: it renews the thread, stages the scene, `purposeScene` words it
// and `replyInScene` writes the reply back. The letters are NOT staged: they
// are the kin-contact engine's own `family.contact` records in a played year.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 2;
const STAGED_DAYS_APART = 1100;

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

it(`someone out of touch for years comes back and asks for something (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let done = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `reunion:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const id = playerId as PersonId;
      const player = core.people.get(id)!;
      const api = coreAPI(core);
      const apart = addDays(makeIsoDate(core.date), -STAGED_DAYS_APART);
      // Even attempts: a relative who lives elsewhere (the one with the most
      // news in the records); odd: a person in town the player has no tie to.
      const candidates = (
        attempt % 2 === 0
          ? [...player.familyIds]
              .map((rel) => core.people.get(rel as PersonId)!)
              .filter(
                (row) => row?.alive && row.householdId !== player.householdId,
              )
          : [...core.people.values()].filter(
              (row) =>
                row.alive &&
                row.tier !== "husk" &&
                row.id.startsWith("person_") &&
                row.id !== id &&
                row.householdId !== player.householdId &&
                !player.familyIds.has(row.id),
            )
      ).sort(
        (a, b) =>
          Object.keys(newsSince(core, b.id, apart, player.householdId)).length -
            Object.keys(newsSince(core, a.id, apart, player.householdId))
              .length || a.id.localeCompare(b.id),
      );
      const other = candidates[0];
      if (!other) {
        tried.push(`${where}: no one to bring back`);
        continue;
      }
      const hasTie = [...(core.relationshipsByPerson.get(id) ?? [])].some(
        (rid) =>
          core.relationships.get(rid)?.actorId === other.id ||
          core.relationships.get(rid)?.otherId === other.id,
      );
      if (!hasTie)
        api.meet(id, other.id, {
          placeId: player.placeId,
          sourceId: "fixture-reunion",
          cause: "met-in-group",
          hours: 1,
        });
      // HAND-STAGED: the tie's last contact was three years ago.
      const tieId = [...(core.relationshipsByPerson.get(id) ?? [])].find(
        (rid) =>
          core.relationships.get(rid)?.actorId === other.id ||
          core.relationships.get(rid)?.otherId === other.id,
      )!;
      (
        core.relationships.get(tieId) as { lastContactDate: string }
      ).lastContactDate = apart;
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      // HAND-STAGED: the grown tie of two years' history.
      const thread = book.threads.get(other.id)!;
      thread.tie = 1;
      thread.turns.push({
        date: apart,
        turn: "grew",
        causeId: tieId,
        closeness: thread.closeness,
      });
      api.relationship(id, other.id, "contact", 6);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const entry = book.schedule.find((row) =>
        row.bindings.some(
          (bound) =>
            bound.typeKey === "reunion" &&
            bound.roles.some((r) => r.personIds.includes(other.id)),
        ),
      );
      if (!entry) {
        tried.push(
          `${where}: no reunion staged (${book.schedule
            .map((row) => row.bindings.map((b) => b.typeKey).join("+") || "-")
            .slice(-6)
            .join(",")})`,
        );
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const result = purposeScene(core, director, id, entry, {
        typeKey: "reunion",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("reunion-ask");
      expect(scene.askerId, where).toBe(other.id);
      expect(scene.askedId, where).toBe(id);
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      // How long: from the thread's renewing turn, cited to the pair.
      const renewed = book.threads
        .get(other.id)!
        .turns.find((turn) => turn.turn === "renewed")!;
      expect(renewed.since, where).toBe(apart);
      expect(fact("away")?.text, where).toBe(
        spanSaid(daysBetweenText(apart, moment.date)),
      );
      expect(fact("away")?.recordIds, where).toContain(other.id);
      // Where they live: said only where it is not the player's place.
      const there =
        other.placeId === player.placeId
          ? null
          : destinationSaid(other.placeId, "");
      expect(fact("hometown")?.text ?? null, where).toBe(there);
      // What changed: every fact the records give, and no other.
      const news = newsSince(
        core,
        other.id,
        apart,
        player.householdId,
        moment.date,
      );
      for (const [key, expected] of Object.entries(news)) {
        expect(fact(key)?.text, `${where}: ${key}`).toBe(expected.text);
        expect(fact(key)?.recordIds, `${where}: ${key}`).toEqual(
          expected.sourceRecordIds,
        );
      }
      for (const key of [
        "new-child",
        "married",
        "moved",
        "new-employer",
        "ill",
      ])
        expect(!!fact(key), `${where}: ${key}`).toBe(key in news);
      // No fall-out is claimed: the thread kept no soured turn before the last contact.
      expect(!!fact("fell-out"), where).toBe(false);
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      const narration = scene.talk.narration.map((row) => row.text).join(" ");
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["agree", "promise", "ask", "deflect"], where).toContain(
          row.move,
        );
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      expect(
        scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
        where,
      ).toEqual([]);
      for (const row of scene.talk.lines)
        expect(row.text, where).not.toMatch(SLOP);
      // The player's name is said at most once a line; another person in the
      // scene may share it (a new child named for the player's own first name).
      const sharedName = scene.facts.some(
        (fact) => fact.key !== "first" && fact.text === player.givenName,
      );
      if (!sharedName)
        for (const row of scene.talk.lines)
          expect(
            (row.text.match(new RegExp(player.givenName, "g")) ?? []).length,
            `${where}: ${row.text}`,
          ).toBeLessThanOrEqual(1);
      // A promise settles it and is written on the reply by id.
      const settled = endsKeeping(scene.talk.tree, "promise")[0];
      expect(settled, `${where}: no path keeps a promise`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, settled!.full, {
        typeKey: "reunion",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("reunion");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.ending, where).toBe("said-yes-to-old-tie");
      expect(reply?.facts?.keeps, where).toBe("promise");
      expect(reply?.personIds, where).toContain(other.id);
      // A put-off that is pressed strains the tie. Whether it is pressed is the
      // other's own answer, led by their traits (no dice).
      const sour = endsKeeping(scene.talk.tree, "relationship-strained")[0];
      const sourId = sour
        ? replyInScene(core, director, id, entry, sour.full, {
            typeKey: "reunion",
          })
        : null;
      if (sourId)
        expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
          "put-off-old-tie",
        );
      const told = composeJournal(core, director, id)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(replyId!));
      log(
        `REUNION (hand-staged tie, ${other.tier === "husk" ? "a relative elsewhere" : "a person in town"}) ${where}: ${core.date}, cause ${moment.causeId}, ${id} with ${other.id}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(takes a put-off in stride)"}; journal "${told?.text ?? "(other unnamed)"}"\n  ${narration} | ${said}`,
      );
      done += 1;
    }
    expect(
      done,
      `no reunion played: ${tried.join("; ")} (seed ${seed})`,
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

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

it("every line of the two purposes carries its own facts, with no name said twice and no stray words", () => {
  const purposes = new Set(["reunion-ask", "letter-ask"]);
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
