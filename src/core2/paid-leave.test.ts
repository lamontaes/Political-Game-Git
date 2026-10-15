/** Native played-year evidence and explicit controlled repeal/rounding cases. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { composeJournal } from "../director/journal";
import { newsKey } from "./modules/news";
import { stancesOf } from "./modules/views";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { leavePremiumsOf } from "./law-reach/group-a-money";
import {
  PAID_LEAVE_KEY,
  paidLeavePremium,
  paidLeaveProgram,
} from "./paid-leave";

it("uses one premium formula, bounded by available pay", () => {
  expect(paidLeavePremium(100001, 100001, 0.006)).toBe(600);
  expect(paidLeavePremium(300003, 300003, 0.006, 3)).toBe(1800);
  expect(paidLeavePremium(100001, 20, 0.006)).toBe(20);
  expect(paidLeavePremium(100001, 100001, 0.006, 0)).toBe(0);
});

it("records native premiums for both tiers and reads a controlled repeal immediately", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(randomBytes(32).toString("hex"), "session-a-paid-leave");
  setBookkeeping(false);
  try {
    const { core, director } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const people = [...core.people.values()].filter(
      (p) => p.alive && p.placeId === town && p.jobId,
    );
    for (const person of people) {
      core.focusPersonIds.add(person.id);
      director.watch(core, person.id);
    }
    const premiums = new Map<string, unknown>();
    const heard = new Map<string, unknown>();
    const personIds = new Set(people.map((p) => p.id));
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const person of people)
        for (const row of leavePremiumsOf(api, person.id))
          premiums.set(row.id, row);
      const news = api.moduleState("news");
      for (const row of news.table("heard").rows()) {
        if (!personIds.has(String(row.personId))) continue;
        const story = news.table("stories").get(String(row.storyId));
        if (story?.topic !== PAID_LEAVE_KEY) continue;
        heard.set(row.id, {
          heard: row,
          story,
          known: api.knows(String(row.personId), newsKey(String(row.storyId))),
          stances: stancesOf(api, String(row.personId)).filter(
            (stance) => stance.topic === PAID_LEAVE_KEY,
          ),
        });
      }
    }
    const evidence = {
      draw,
      seconds: (performance.now() - started) / 1000,
      date: core.date,
      modules: core.modules.size,
      people: people.map((p) => ({
        id: p.id,
        name: `${p.givenName} ${p.familyName}`,
      })),
      premiums: [...premiums.values()],
      heard: [...heard.values()],
      journals: people.map((p) => ({
        personId: p.id,
        chapters: composeJournal(core, director, p.id),
      })),
      counted: [...(residentsRuntime(core)?.withheld ?? [])].filter(([key]) =>
        key.endsWith("|paid-leave"),
      ),
      laws: api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows()
        .filter((r) => r.series === PAID_LEAVE_KEY),
      journal: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    // Controlled transition after the native year; never reported as a played vote.
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: PAID_LEAVE_KEY,
        value: 0,
        effectiveDate: core.date,
        measureId: `controlled-leave-repeal:${level.level}`,
        citation: "Explicit controlled all-level repeal after native evidence",
      });
    expect(paidLeaveProgram(api)).toBeUndefined();
    const state = lawChain(api).levels.find((l) => l.level === "state")!;
    const enacted = enactLaw(api, {
      jurisdiction: state.jurisdiction,
      level: state.level,
      series: PAID_LEAVE_KEY,
      value: 1,
      effectiveDate: addDays(makeIsoDate(core.date), 1),
      measureId: "controlled-leave-enact",
      citation: "Explicit controlled future enactment",
    });
    expect(paidLeaveProgram(api)).toBeUndefined();
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(paidLeaveProgram(api)?.lawId).toBe(enacted.id);
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
