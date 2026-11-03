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
import { subjectsBetween } from "./conversation";
import { spoken } from "./words";

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
