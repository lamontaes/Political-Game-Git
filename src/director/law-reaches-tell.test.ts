/**
 * The law-reaches tell has words for a law that does not reach the reader
 * (Fable A on the crew line, Nov 13): one enacted but not yet in force is said
 * with the day it takes effect, one in force in another state with that state
 * and the reader's own. The law rows are the laws engine's own rows in a
 * drawn place's world; the place and seed are in every message. The played
 * case is `circumstance.test.ts` at seed 93ab4181 (CI's unit job).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { questionAbout } from "../english/question-names";
import { questionName } from "../english/policy-names";
import { advanceCore } from "../core2/life";
import { lawFactsOfCause } from "./purpose-scene";

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
  const { series, level } = coreAPI(core)
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(String(learned!.facts?.lawId)) as unknown as {
    series: string;
    level: string;
  };
  expect(facts.law!.text, where).not.toBe(questionName(series));
  // A catalog question is said by its noun name; an amount the bank names
  // for one level ("the local income tax rate") is said at the level that
  // set the law: here Illinois's own income tax, a state law.
  const about = questionAbout(series);
  if (about) expect(facts.law!.text, where).toBe(about);
  else
    expect(facts.law!.text, `${where}: ${level} law`).toMatch(
      new RegExp(`\\b${level === "city" ? "local" : level}\\b`),
    );
  expect(
    facts["in-force"],
    `${where}: it is in force where they live`,
  ).toBeDefined();
  expect(facts.law!.sourceRecordIds, where).toContain(learned!.id);
}, 600_000);
