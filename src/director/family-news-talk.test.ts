import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { applyCoreEvent } from "../core2/state";
import type { PersonId } from "../core2/types";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { wordConversationMove } from "../english/conversation-words";
import {
  subjectsBetween,
  meetOverTalk,
  openConversation,
} from "./conversation";
import { spoken } from "./words";
import { expectUpToFourDifferent } from "./reply-set-check";

// Asked after a relative, the player can tell what happened to them, from
// the record of it (the owner, Nov 1: every life is simulated, and under Q7
// what happened to someone is the news). Before, every answer was "doing
// well", whatever the records said. In a drawn place, after a month of play,
// one of the player's relatives moves away, recorded as the moves engine
// writes it (person.moved-away: its id, the destination as its topic, the
// relatives who stay as witnesses; the shape the lives lead confirmed on
// Nov 1). Someone who knows that relative asks after them, and the player's
// answer at the move's stage says where they went, citing the move. A
// played year rarely holds such news yet: in twelve drawn places none came
// in a year, because the relatives who live elsewhere have no lives on
// record until core-every-life-simulated lands.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a relative's recorded move is the player's answer when someone asks after them (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "family-news");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director!.watch(core, me);
    const player = core.people.get(me)!;
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), 30));
    // A relative of the player someone else knows, who lives apart from
    // them (another household), and a place for them to move to below.
    const pair = [...player.familyIds].sort().flatMap((relativeId) => {
      const relative = core.people.get(relativeId);
      if (!relative?.alive) return [];
      const listenerId = [...player.knownIds].sort().find((id) => {
        const other = core.people.get(id);
        return (
          id !== relativeId &&
          !!other?.alive &&
          other.knownIds.has(relativeId) &&
          !other.familyIds.has(relativeId) &&
          other.householdId !== relative.householdId
        );
      });
      return listenerId ? [{ relativeId, listenerId }] : [];
    })[0];
    if (!pair) {
      tried.push(
        `${where}: nobody the player knows knows a relative of theirs`,
      );
      continue;
    }
    const relative = core.people.get(pair.relativeId)!;
    // Somewhere they don't live: the player's town, or for a relative who
    // lives in it, the town's county.
    const to =
      relative.placeId !== player.placeId
        ? player.placeId
        : (player.countyId ?? player.placeId);
    const destination = corePlaceByJurisdictionId(to as never)!;
    const moveId = `person.moved-away:${relative.id}:${core.date}`;
    applyCoreEvent(core, {
      id: moveId,
      date: core.date,
      kind: "person.moved-away",
      personIds: [relative.id],
      witnessIds: [me],
      placeId: relative.placeId,
      publicRecord: false,
      topic: to,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Recorded as the moves engine writes a move away.",
        estimatedFrom: "SG-P15-moves-weights",
      },
      facts: {
        [`person:${relative.id}:residence`]: to,
        "moves:elsewhere": relative.placeId,
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const row = subjectsBetween(core, me, pair.listenerId, director).find(
      (subject) => subject.kind === "family" && subject.aboutId === relative.id,
    );
    expect(row, `${where}: ${relative.id} is not asked after`).toBeTruthy();
    // The news is the newest staged happening that names them: a move the
    // moves engine wrote after this one (a household member's, naming them)
    // is the news instead. Such a draw is passed over, by name.
    const newsId = row!.facts.happened?.sourceRecordIds[0];
    if (newsId !== moveId) {
      tried.push(
        `${where}: ${relative.id} has newer news on record (${newsId})`,
      );
      continue;
    }
    expect(row!.stage, where).toBe("moved");
    expect(row!.facts.place?.text, where).toBe(spoken(destination));
    expect(row!.facts.place?.sourceRecordIds, where).toContain(moveId);
    // The player's answer, worded at the move's stage from the bank.
    const said = wordConversationMove({
      seed: core.seed,
      subject: "family",
      part: "answers",
      speakerId: me,
      traits: player.traits,
      facts: row!.facts,
      momentKey: `${me}:${pair.listenerId}:${core.date}:family-news`,
      about: { gender: relative.looks?.gender },
      relationText: row!.facts.relation!.text,
      stage: row!.stage!,
      keys: [row!.stage!],
    });
    expect(said, `${where}: ${row!.id}`).not.toBeNull();
    expect(said!.text, where).toMatch(/moved|living/);
    expect(said!.sourceRecordIds, where).toContain(moveId);
    process.stdout.write(
      `FAMILY NEWS ${where}: ${pair.listenerId} asks after ${relative.id}; the player can say "${said!.text}", citing ${said!.sourceRecordIds.join(", ")}\n`,
    );
    // A later move with no new place on record, as the moves engine writes
    // a new home within a state's record (and a leaver it found no
    // destination for): where they went is where they left. The answer says
    // they moved away, never "moved to" the place they already lived in.
    const at = core.people.get(relative.id)!.placeId;
    const atPlace = corePlaceByJurisdictionId(at as never);
    const withinId = `person.moved-away:${relative.id}:${core.date}`;
    applyCoreEvent(core, {
      id: withinId,
      date: core.date,
      kind: "person.moved-away",
      personIds: [relative.id],
      witnessIds: [me],
      placeId: at,
      publicRecord: false,
      topic: at,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation:
          "Recorded as the moves engine writes a move within a place's record.",
        estimatedFrom: "SG-P15-moves-weights",
      },
      facts: {
        [`person:${relative.id}:residence`]: at,
        "moves:elsewhere": at,
        "moves:within-state": at,
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const within = subjectsBetween(core, me, pair.listenerId, director).find(
      (subject) => subject.kind === "family" && subject.aboutId === relative.id,
    );
    expect(within?.stage, where).toBe("moved");
    expect(within!.facts.place, where).toBeUndefined();
    const away = wordConversationMove({
      seed: core.seed,
      subject: "family",
      part: "answers",
      speakerId: me,
      traits: player.traits,
      facts: within!.facts,
      momentKey: `${me}:${pair.listenerId}:${core.date}:family-news`,
      about: { gender: relative.looks?.gender },
      relationText: within!.facts.relation!.text,
      stage: within!.stage!,
      keys: [within!.stage!],
    });
    expect(away?.text, where).toMatch(/moved away/);
    if (atPlace) expect(away!.text, where).not.toContain(spoken(atPlace));
    expect(away!.sourceRecordIds, where).toContain(withinId);
    process.stdout.write(
      `FAMILY NEWS no new place (${atPlace ? spoken(atPlace) : at}): "${away!.text}", citing ${withinId}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a relative someone else knows: ${tried.join("; ")}`,
  );
}, 1_800_000);

/** A played world in a drawn place, a month in, and a relative of the player someone the player knows also knows. */
function relativeAskedAfter(draw: string) {
  const place = drawPlace(draw, "family-news");
  const where = `${place.name} (${place.key}), seed ${draw}`;
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  director!.watch(core, me);
  advanceCore(core, addDays(makeIsoDate(gameStartDate()), 30));
  const player = core.people.get(me)!;
  const pair = [...player.familyIds].sort().flatMap((relativeId) => {
    const relative = core.people.get(relativeId);
    if (!relative?.alive) return [];
    const listenerId = [...player.knownIds].sort().find((id) => {
      const other = core.people.get(id);
      return (
        id !== relativeId &&
        !!other?.alive &&
        other.knownIds.has(relativeId) &&
        !other.familyIds.has(relativeId) &&
        other.householdId !== relative.householdId
      );
    });
    return listenerId ? [{ relativeId, listenerId }] : [];
  })[0];
  return { core, director: director!, me, player, pair, where };
}

/** The player's answer about a relative, at a stage, worded from the bank. */
function answerAbout(
  world: ReturnType<typeof relativeAskedAfter>,
  facts: Parameters<typeof wordConversationMove>[0]["facts"],
  stage: string,
  choice: string,
) {
  const relative = world.core.people.get(world.pair!.relativeId)!;
  return wordConversationMove({
    seed: world.core.seed,
    subject: "family",
    part: "answers",
    speakerId: world.me,
    traits: world.player.traits,
    facts,
    momentKey: `${world.me}:${world.pair!.listenerId}:${world.core.date}:${stage}`,
    about: { gender: relative.looks?.gender },
    relationText: facts.relation!.text,
    stage,
    keys: [choice],
  });
}

it(`an ill or dead relative is answered by name with when it happened (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const world = relativeAskedAfter(`${seed}:ill:${draw}`);
    const { core, director, me, pair, where } = world;
    if (!pair) {
      tried.push(
        `${where}: nobody the player knows knows a relative of theirs`,
      );
      continue;
    }
    const relative = core.people.get(pair.relativeId)!;
    const illId = `health.serious-illness:${relative.id}:${core.date}`;
    applyCoreEvent(core, {
      id: illId,
      date: core.date,
      kind: "health.serious-illness",
      personIds: [relative.id],
      witnessIds: [me],
      placeId: relative.placeId,
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Recorded as the health engine writes a serious illness.",
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 8));
    const ill = subjectsBetween(core, me, pair.listenerId, director).find(
      (row) => row.kind === "family" && row.aboutId === relative.id,
    );
    // A newer happening of theirs (a move in those days) is the news then.
    if (ill?.stage !== "ill") {
      tried.push(`${where}: newer news (${ill?.stage}) came after the illness`);
      continue;
    }
    const when = ill!.facts.when!.text;
    const sick = answerAbout(world, ill!.facts, "ill", "ill");
    expect(sick?.text, where).toContain(when);
    expect(sick!.text, where).toMatch(
      new RegExp(`${relative.givenName}|${ill!.facts.relation!.text}`, "i"),
    );
    expect(sick!.sourceRecordIds, where).toContain(illId);
    const deathId = `life.death:${relative.id}:${core.date}`;
    applyCoreEvent(core, {
      id: deathId,
      date: core.date,
      kind: "life.death",
      personIds: [relative.id],
      witnessIds: [me],
      placeId: relative.placeId,
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const gone = subjectsBetween(core, me, pair.listenerId, director).find(
      (row) => row.kind === "family" && row.aboutId === relative.id,
    );
    expect(gone?.stage, `${where}: the death is not the news`).toBe("died");
    const died = answerAbout(world, gone!.facts, "died", "gone");
    expect(died?.text, where).toContain(gone!.facts.when!.text);
    expect(died!.sourceRecordIds, where).toContain(deathId);
    process.stdout.write(
      `FAMILY NEWS ${where}: "${sick!.text}" then "${died!.text}"\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a relative someone else knows: ${tried.join("; ")}`,
  );
}, 1_800_000);

it(`a relative the listener has not met is raised by name with their town or work, and the replies differ (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const world = relativeAskedAfter(`${seed}:kin:${draw}`);
    const { core, director, me, where } = world;
    // Someone who has a relative, living elsewhere or working, the player
    // has not met: first among the people the player knows, then among the
    // townspeople they would meet (a new life's circle may be all family).
    const town = [...core.people.values()]
      .filter(
        (row) =>
          row.tier !== "husk" &&
          row.id !== me &&
          row.placeId === world.player.placeId &&
          !world.player.knownIds.has(row.id) &&
          !world.player.familyIds.has(row.id),
      )
      .map((row) => row.id)
      .sort();
    const found = [...[...world.player.knownIds].sort(), ...town].flatMap(
      (otherId) => {
        if (!core.people.get(otherId)?.alive) return [];
        return subjectsBetween(core, otherId, me, director)
          .filter(
            (row) =>
              row.kind === "kin" && (row.facts.place || row.facts.employer),
          )
          .map((row) => ({ otherId, row }));
      },
    )[0];
    if (!found) {
      tried.push(`${where}: no one the player knows has such a relative`);
      continue;
    }
    const other = core.people.get(found.otherId)!;
    const said = wordConversationMove({
      seed: core.seed,
      subject: "kin",
      part: "raise",
      speakerId: found.otherId,
      traits: other.traits,
      facts: found.row.facts,
      momentKey: `${found.otherId}:${me}:${core.date}:kin`,
    });
    expect(said, where).not.toBeNull();
    expect(said!.text, where).toContain(found.row.facts.name!.text);
    const told = [found.row.facts.place?.text, found.row.facts.employer?.text]
      .filter(Boolean)
      .some((text) => said!.text.includes(text!));
    expect(told, `${where}: "${said!.text}"`).toBe(true);
    // The player's replies: each a different move, no two the same words.
    const replies = ["no", "not-yet", "brief"].flatMap((choice) => {
      const reply = wordConversationMove({
        seed: core.seed,
        subject: "asked-kin",
        part: "answers",
        speakerId: me,
        traits: world.player.traits,
        facts: found.row.facts,
        momentKey: `${me}:${found.otherId}:${core.date}:${choice}`,
        keys: [choice],
      });
      return reply ? [{ move: choice, text: reply.text }] : [];
    });
    expectUpToFourDifferent(replies, where);
    process.stdout.write(
      `KIN ${where}: "${said!.text}" / ${replies.map((r) => r.text).join(" / ")}\n`,
    );
    return;
  }
  throw new Error(`no drawn place had an unmet relative: ${tried.join("; ")}`);
}, 1_800_000);

it(`a talk the player opens makes that one person someone they know (the room's probe meets nobody), so their news comes up from someone both know (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:met:${draw}`, "family-news");
    const where = `${place.name} (${place.key}), seed ${seed}:met:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director!.watch(core, me);
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), 30));
    const player = core.people.get(me)!;
    // Two grown people who know each other and whom the player does not know.
    const pair = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== me &&
          row.jobId &&
          !player.knownIds.has(row.id) &&
          !player.familyIds.has(row.id) &&
          row.householdId !== player.householdId,
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((a) => {
        const b = [...a.knownIds].sort().find((id) => {
          const row = core.people.get(id);
          return (
            !!row?.alive &&
            row.tier !== "husk" &&
            id !== me &&
            !player.knownIds.has(id) &&
            !player.familyIds.has(id) &&
            !row.familyIds.has(a.id) &&
            row.householdId !== player.householdId
          );
        });
        return b ? [{ a: a.id, b }] : [];
      })[0];
    if (!pair) {
      tried.push(
        `${where}: no two people who know each other and not the player`,
      );
      continue;
    }
    // Before any talk, the player does not know them: neither is someone both know.
    expect(player.knownIds.has(pair.a), where).toBe(false);
    // The room's probe of who has something to say (handler.ts `sceneNow`)
    // opens a talk with everyone present and writes nothing: nobody is met.
    const knownBefore = [...player.knownIds].sort();
    const present = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== me &&
          (row.placeId === player.placeId ||
            row.id === pair.a ||
            row.id === pair.b),
      )
      .sort(
        (x, y) =>
          Number(y.id === pair.a || y.id === pair.b) -
          Number(x.id === pair.a || x.id === pair.b),
      )
      .slice(0, 40);
    const talks = new Map(
      present.map((row) => [
        row.id,
        openConversation(core, me, row.id as PersonId, { director }),
      ]),
    );
    expect([...core.people.get(me)!.knownIds].sort(), where).toEqual(
      knownBefore,
    );
    const talkA = talks.get(pair.a)!;
    const talkB = talks.get(pair.b)!;
    if (!talkA.lines.length || !talkB.lines.length) {
      tried.push(`${where}: a talk said nothing, so nobody was met`);
      continue;
    }
    // The player opens one talk, as the talk route does: exactly that person is met.
    expect(meetOverTalk(core, talkA), where).toBe(true);
    expect(
      [...core.people.get(me)!.knownIds].filter(
        (id) => !knownBefore.includes(id),
      ),
      where,
    ).toEqual([pair.a]);
    expect(meetOverTalk(core, talkB), where).toBe(true);
    // The talk is how they met: each now knows the other.
    expect(core.people.get(me)!.knownIds.has(pair.a as PersonId), where).toBe(
      true,
    );
    expect(core.people.get(pair.a as PersonId)!.knownIds.has(me), where).toBe(
      true,
    );
    // Then A moves away, as the moves engine writes it.
    const a = core.people.get(pair.a as PersonId)!;
    const to = player.countyId ?? player.placeId;
    const moveId = `person.moved-away:${a.id}:${core.date}`;
    applyCoreEvent(core, {
      id: moveId,
      date: core.date,
      kind: "person.moved-away",
      personIds: [a.id],
      placeId: a.placeId,
      publicRecord: false,
      topic: to,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Recorded as the moves engine writes a move away.",
        estimatedFrom: "SG-P15-moves-weights",
      },
      facts: {
        [`person:${a.id}:residence`]: to,
        "moves:elsewhere": a.placeId,
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // B knows A and now so does the player: A is someone both know, with news.
    const mutual = subjectsBetween(core, pair.b as PersonId, me, director).find(
      (row) => row.kind === "mutual" && row.aboutId === a.id,
    );
    expect(mutual, `${where}: ${a.id} is not someone both know`).toBeTruthy();
    process.stdout.write(
      `MET ${where}: the player met ${a.id} and ${pair.b} in talks; after ${a.id} moved, ${pair.b} has them as someone both know (${mutual!.id})\n`,
    );
    return;
  }
  throw new Error(`no drawn place had such a pair: ${tried.join("; ")}`);
}, 1_800_000);
