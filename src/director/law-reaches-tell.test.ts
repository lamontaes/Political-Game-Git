/**
 * The law-reaches tell has words for a law that does not reach the reader
 * (Fable A on the crew line, Nov 13): one enacted but not yet in force is said
 * with the day it takes effect, one in force in another state with that state
 * and the reader's own. The law rows are the laws engine's own rows in a
 * drawn place's world; the place and seed are in every message. The played
 * case is `circumstance.test.ts` at seed 93ab4181 (CI's unit job).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { wordSceneMove } from "../english/scene-talk-words";
import { questionAbout } from "../english/question-names";
import { questionName } from "../english/policy-names";
import { advanceCore } from "../core2/life";
import {
  homeStateOf,
  lawFactsOfCause,
  lawName,
  lawReachFacts,
} from "./purpose-scene";

// Pinned: a named place the test passes in every run; GOLDEN_PATH_SEED draws another.
const seed = process.env.GOLDEN_PATH_SEED ?? "t53-law-tells-1";

it(`says a law that does not reach the reader as what it is (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "law-reaches-tell");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const reader = core.people.get(playerId!)!;
  const home = homeStateOf(reader.placeId);
  const rows = coreAPI(core)
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as {
    id: string;
    series: string;
    jurisdiction: string;
    effectiveDate: string;
    endDate: string | null;
  }[];
  // What every scene carries: the town and the player's first name.
  const scene = {
    place: { text: place.name.split(",")[0]!, sourceRecordIds: ["place"] },
    first: { text: reader.givenName, sourceRecordIds: [reader.id] },
  };
  const tell = (
    facts: Record<string, { text: string; sourceRecordIds: string[] }>,
  ) =>
    wordSceneMove({
      move: {
        step: "state",
        move: "tell",
        role: "asker",
        purpose: "law-reaches",
        key: "news-received",
      } as never,
      facts: { ...scene, ...facts },
      seed: where,
      speakerId: playerId!,
      traits: {},
      momentKey: "law-reaches-tell",
      said: new Set(),
    });
  const cite = { law: ["law"], home: ["home"] };
  const play = { from: gameStartDate(), replaced: false };

  // Enacted, not yet in force: said with its date, never as lived with.
  const later = rows.find(
    (row) => row.effectiveDate > core.date && lawName(row.series),
  );
  expect(later, `${where}: a law row not yet in force`).toBeDefined();
  const pending = lawReachFacts(later!, home, core.date, cite, play);
  expect(pending.effective?.text, where).toBeTruthy();
  // Said by what changes, never the number's label acting.
  expect(pending.about?.text, where).toBeTruthy();
  const saidLater = tell(pending);
  expect(
    saidLater && "text" in saidLater ? saidLater.text : "",
    where,
  ).toContain(pending.effective!.text);

  // In force in another state: said with that state and the reader's own.
  const ownState = rows.find(
    (row) => row.jurisdiction === home && row.effectiveDate <= core.date,
  );
  expect(
    ownState,
    `${where}: a law row of the reader's own state`,
  ).toBeDefined();
  const elsewhere = home === "US-DE" ? "US-RI" : "US-DE";
  const away = lawReachFacts(
    { jurisdiction: elsewhere, effectiveDate: core.date },
    home,
    core.date,
    cite,
    play,
  );
  expect(away.lawstate?.text, where).toBeTruthy();
  const saidAway = tell(away);
  const text = saidAway && "text" in saidAway ? saidAway.text : "";
  expect(text, where).toContain(away.lawstate!.text);
  // Another state's law not yet in force is still another state's: said by
  // the states, never by a date that would sound as if it will reach them.
  const awayLater = lawReachFacts(
    { jurisdiction: elsewhere, effectiveDate: "2099-01-01" },
    home,
    core.date,
    cite,
    play,
  );
  expect(Object.keys(awayLater).sort(), where).toEqual([
    "homestate",
    "lawstate",
  ]);
  // The reader is told the law is another state's; the replies offered fit
  // that: a promise to call (or to look into it) is never offered for it, and
  // the one that is, says whose law it is (Words lead's read of #9045).
  const reply = (
    move: string,
    facts: typeof away,
    at: number,
    step = "reply",
  ) => {
    const line = wordSceneMove({
      move: {
        step,
        move,
        role: step === "reply" ? "asked" : "asker",
        purpose: "law-reaches",
        key: "news-received",
      } as never,
      facts: { ...scene, ...facts },
      seed: `${where}:${at}`,
      speakerId: playerId!,
      traits: {},
      momentKey: "law-reaches-tell",
      said: new Set(),
    });
    return line && "text" in line ? line.text : "";
  };
  for (let at = 0; at < 12; at += 1) {
    expect(reply("promise", away, at), `${where}: no promise to call`).toBe("");
    const fitting = reply("tell", away, at);
    expect(fitting, `${where}: a reply that says whose law it is`).toMatch(
      /ours|another state|not our/,
    );
    expect(fitting, where).not.toMatch(/let me see what I can do|voted/);
  }
  const pendingReply = reply("tell", pending, 0);
  expect(pendingReply, `${where}: a reply for a law not yet in force`).toMatch(
    /Not yet|Give it time/,
  );
  expect(pendingReply, where).not.toContain(pending.effective!.text);
  // A law no longer in force is said by the day it ended, only when it ended
  // during play and nothing replaced it (Words lead, Nov 14): the world's own
  // rows that ended before the game began, or that a newer rate replaced, are
  // never raised. SYNTHETIC: no drawn world ends a law in play, so the law that
  // ends in play is the world's own row with the
  // end date a repeal would write on the day.
  const old = rows.find(
    (row) =>
      row.endDate &&
      row.endDate < play.from &&
      row.jurisdiction !== elsewhere &&
      lawName(row.series),
  );
  expect(old, `${where}: a law row that ended before play`).toBeDefined();
  expect(lawReachFacts(old!, home, core.date, cite, play), where).toEqual({});
  const base = rows.find(
    (row) => row.jurisdiction !== elsewhere && lawName(row.series),
  )!;
  const over = { ...base, id: base.id, endDate: core.date }; // synthetic end
  expect(
    lawReachFacts(over, home, core.date, cite, { ...play, replaced: true }),
    `${where}: a replaced rate is not raised`,
  ).toEqual({});
  const ended = lawReachFacts(over, home, core.date, cite, play);
  expect(ended.ended?.text, where).toBeTruthy();
  const saidEnded = tell(ended);
  const endedText = saidEnded && "text" in saidEnded ? saidEnded.text : "";
  expect(endedText, where).toContain(ended.ended!.text);
  // It names the law that ended, never "that one" (Words lead's read of #9045).
  expect(ended.about?.text, where).toBeTruthy();
  expect(endedText.toLowerCase(), where).toContain(
    ended.about!.text.toLowerCase(),
  );
  for (let at = 0; at < 6; at += 1)
    expect(
      reply("promise", ended, at),
      `${where}: no promise for a law that ended`,
    ).toBe("");
  // One fact once: the resident names the law and the day, the reply and the
  // answer say "it" and "that", never the name or the day again.
  for (let at = 0; at < 6; at += 1)
    for (const step of ["reply", "follow"]) {
      const line = reply(step === "reply" ? "tell" : "accept", ended, at, step);
      expect(line, `${where}: ${step} to an ended law is worded`).not.toBe("");
      expect(line, where).not.toContain(ended.about!.text);
      expect(line, where).not.toContain(ended.ended!.text);
    }
  // Every series a law row can end in is either worded in all three lines or
  // not offered (its opening has no words, so the scene is never staged).
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.series)) continue;
    seen.add(row.series);
    const facts = lawReachFacts(
      { ...row, endDate: core.date },
      home,
      core.date,
      cite,
      play,
    );
    const opening = tell(facts);
    const worded = Boolean(opening && "text" in opening);
    expect(worded, `${where}: ${row.series}: opening and noun agree`).toBe(
      Boolean(lawName(row.series)),
    );
    if (worded) {
      expect(reply("tell", facts, 0), `${where}: ${row.series}`).not.toBe("");
      expect(
        reply("accept", facts, 0, "follow"),
        `${where}: ${row.series}`,
      ).not.toBe("");
    }
  }
  // A law in force where the reader lives gives none of these facts.
  expect(lawReachFacts(ownState!, home, core.date, cite, play), where).toEqual(
    {},
  );
  console.log(
    `law-reaches-tell: ${where}: "${saidLater && "text" in saidLater ? saidLater.text : ""}" / "${text}" / "${endedText}" (${over!.id})`,
  );
}, 300_000);

/**
 * A learned law is a scene that can be worded (the Words lead's read of #9045,
 * fault 3). A `law.effect-learned` record names its law row and carries no
 * series, so the facts of a scene about it (`law`, `in-force`) were never set
 * and the tell was skipped ("cannot be worded from the records given") in
 * every played year. In a pinned place (found by drawing), the world's own
 * learned record now gives both, from the law row. The played scene is the
 * line in the PR body: a sitting member's month in the same place and seed.
 */
const PINNED = {
  key: "1751700",
  seed: "22a232c8ce8c09977327c98c7cdad11aabae1b8cdaa8b3974bf0a306dc975c96",
};

it("a learned law's record gives the scene its law and that it is in force", () => {
  setBookkeeping(false);
  const where = `place ${PINNED.key}, seed ${PINNED.seed}`;
  const { core } = buildBenchWorld(PINNED.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PINNED.key,
  });
  advanceCore(core, "2025-02-04");
  const learned = [...core.durableLog.values()].find(
    (row) => row.kind === "law.effect-learned" && row.facts?.lawId,
  );
  expect(learned, `${where}: a learned law by 2025-02-04`).toBeDefined();
  expect(
    learned!.facts?.series,
    "the record carries no series",
  ).toBeUndefined();
  const reader = core.people.get(learned!.personIds[0]!)!;
  const facts = lawFactsOfCause(
    core,
    learned!.facts as Record<string, string>,
    learned!.id,
    reader.placeId,
    reader.id,
  );
  expect(facts.law?.text, `${where}: the law is named`).toBeTruthy();
  // Said as the law's name, never the bare action ("Allow retail electric
  // choice took effect").
  const series = (
    coreAPI(core)
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .get(String(learned!.facts?.lawId)) as unknown as { series: string }
  ).series;
  expect(facts.law!.text, where).not.toBe(questionName(series));
  expect(facts.law!.text, where).toBe(questionAbout(series));
  expect(
    facts["in-force"],
    `${where}: it is in force where they live`,
  ).toBeDefined();
  expect(facts.law!.sourceRecordIds, where).toContain(learned!.id);
}, 600_000);
