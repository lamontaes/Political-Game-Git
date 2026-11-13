/**
 * The law-reaches tell has words for a law that does not reach the reader
 * (Fable A on the crew line, Nov 13): one enacted but not yet in force is said
 * with the day it takes effect, one in force in another state with that state
 * and the reader's own. The law rows are the laws engine's own rows in a
 * drawn place's world; the place and seed are in every message. The played
 * case is `circumstance.test.ts` at seed 93ab4181 (CI's unit job).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { wordSceneMove } from "../english/scene-talk-words";
import { homeStateOf, lawName, lawReachFacts } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

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
  }[];
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
      facts,
      seed: where,
      speakerId: playerId!,
      traits: {},
      momentKey: "law-reaches-tell",
      said: new Set(),
    });
  const cite = { law: ["law"], home: ["home"] };

  // Enacted, not yet in force: said with its date, never as lived with.
  const later = rows.find(
    (row) => row.effectiveDate > core.date && lawName(row.series),
  );
  expect(later, `${where}: a law row not yet in force`).toBeDefined();
  const pending = lawReachFacts(later!, home, core.date, cite);
  expect(pending.effective?.text, where).toBeTruthy();
  const saidLater = tell({
    ...pending,
    law: { text: lawName(later!.series)!, sourceRecordIds: ["law"] },
  });
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
  );
  expect(Object.keys(awayLater).sort(), where).toEqual([
    "homestate",
    "lawstate",
  ]);
  // No reply that would say the law reaches them is offered for it.
  for (let at = 0; at < 12; at += 1) {
    const reply = wordSceneMove({
      move: {
        step: "reply",
        move: "promise",
        role: "asked",
        purpose: "law-reaches",
        key: "news-received",
      } as never,
      facts: away,
      seed: `${where}:${at}`,
      speakerId: playerId!,
      traits: {},
      momentKey: "law-reaches-tell",
      said: new Set(),
    });
    const said = reply && "text" in reply ? reply.text : "";
    expect(said, where).not.toMatch(/doing to you|means for you/);
  }
  // A law in force where the reader lives gives none of these facts.
  expect(lawReachFacts(ownState!, home, core.date, cite), where).toEqual({});
  console.log(
    `law-reaches-tell: ${where}: "${saidLater && "text" in saidLater ? saidLater.text : ""}" / "${text}"`,
  );
}, 300_000);
