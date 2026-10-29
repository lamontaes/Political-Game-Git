/**
 * What a government's own law already says on a policy question, read for a
 * change that would set an answer (pool item
 * laws-session-passes-moot-and-opposite-bills): the starting answer or an act
 * in force repeats a change toward the same answer, an act waiting on its
 * date closes the question either way, and where no law stands nothing is
 * settled. Opened in a place drawn from all 56 on a seed
 * nobody chose (GOLDEN_PATH_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import { enactLaw, lawChain, openLaws, questionSettled } from "./modules/laws";
import { buildPopulation } from "./population";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a change to a policy question is settled by the law in force, or closed by an act waiting on its date", () => {
  const place = drawPlace(seed, "laws-question-settled");
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2026-01-05",
      minimumPeople: 200,
    }),
  );
  openLaws(core);
  const api = coreAPI(core);
  const state = lawChain(api).stateKey;
  const answered = (answer: string) =>
    Object.entries(POLICY_QUESTIONS)
      .filter(
        ([q, entry]) =>
          !q.startsWith("us-federal-positions:") &&
          entry.answers[state]?.answer === answer,
      )
      .map(([q]) => q)
      .sort();
  const [yes] = answered("yes");
  const [no] = answered("no");
  expect(yes && no, `${where}: answered questions`).toBeTruthy();
  const starting = (q: string) => `law:${state}:state:${q}:general:starting`;

  // The starting answer: repeating it changes nothing, reversing it does.
  expect(questionSettled(api, state, yes!, 1), where).toEqual({
    lawId: starting(yes!),
    why: "restates-in-force",
  });
  expect(questionSettled(api, state, yes!, -1), where).toBeNull();
  expect(questionSettled(api, state, no!, -1), where).toEqual({
    lawId: starting(no!),
    why: "restates-in-force",
  });
  expect(questionSettled(api, state, no!, 1), where).toBeNull();

  // Where no law stands there is nothing to repeat or cross, either way.
  const none = "us-policy-positions:not-a-recorded-question";
  expect(questionSettled(api, state, none, 1), where).toBeNull();
  expect(questionSettled(api, state, none, -1), where).toBeNull();

  // An act waiting on its date closes the question for the sitting, whichever
  // way a change points.
  const today = makeIsoDate(core.date);
  const pending = enactLaw(api, {
    jurisdiction: state,
    level: "state",
    series: no!,
    value: 1,
    effectiveDate: addDays(today, 200),
    measureId: "HB 1",
    citation: "HB 1, enacted",
    terms: { enactedByBill: "bill:test:1" },
  });
  expect(questionSettled(api, state, no!, 1), where).toEqual({
    lawId: pending.id,
    why: "restates-pending",
  });
  expect(questionSettled(api, state, no!, -1), where).toEqual({
    lawId: pending.id,
    why: "conflicts-with-pending",
  });
  // The act being written reads the law as it stood before its own rows.
  expect(questionSettled(api, state, no!, 1, "bill:test:1"), where).toBeNull();
  expect(questionSettled(api, state, no!, -1, "bill:test:1"), where).toEqual({
    lawId: starting(no!),
    why: "restates-in-force",
  });

  // An act in force the day it passes is the level's law at once.
  const inForce = enactLaw(api, {
    jurisdiction: state,
    level: "state",
    series: yes!,
    value: 0,
    effectiveDate: today,
    measureId: "HB 2",
    citation: "HB 2, enacted",
    terms: { enactedByBill: "bill:test:2" },
  });
  expect(questionSettled(api, state, yes!, -1), where).toEqual({
    lawId: inForce.id,
    why: "restates-in-force",
  });
  expect(questionSettled(api, state, yes!, 1), where).toBeNull();
  console.log(
    `${where}: ${state} starting ${starting(yes!)} (yes) and ${starting(no!)} (no); pending ${pending.id}; in force ${inForce.id}`,
  );
}, 120_000);
