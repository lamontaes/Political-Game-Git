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
import { POLICY_QUESTIONS } from "./policy-answers";
import { residentsRuntime } from "./modules/residents";
import { leavePremiumsOf, type LeavePremium } from "./law-reach/group-a-money";
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

/**
 * Whether a state's researched starting answer is a paid-leave program: the
 * row the laws engine puts in force at the opening (modules/laws.ts), read
 * here before a world is opened. The opened world's own program decides.
 */
const startsWithPaidLeave = (stateKey: string): boolean =>
  POLICY_QUESTIONS[PAID_LEAVE_KEY]?.answers[stateKey]?.answer === "yes";

/** Draws screened against the starting law; at most OPENED of them opened. */
const DRAWS = 2000;
const OPENED = 4;

it("records native premiums for both tiers and reads a controlled repeal immediately", () => {
  const named = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : undefined;
  const base = randomBytes(32).toString("hex");
  const passedOver: string[] = [];
  let opened = 0;
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < (named ? 1 : DRAWS); attempt++) {
      if (opened >= OPENED) break;
      const draw =
        named ?? drawPlace(`${base}:${attempt}`, "session-a-paid-leave");
      if (!named && !startsWithPaidLeave(draw.state)) continue;
      opened += 1;
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
      const { core, director } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const people = [...core.people.values()].filter(
        (p) => p.alive && p.placeId === town && p.jobId,
      );
      // Chosen from what the world opens with, never from the premiums: a
      // paid-leave program in force, and full people working in town.
      if (!paidLeaveProgram(api) || !people.length) {
        passedOver.push(
          `${where}: ${people.length ? "no paid-leave program" : "no full person working in town"}`,
        );
        continue;
      }
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
            known: api.knows(
              String(row.personId),
              newsKey(String(row.storyId)),
            ),
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
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      // Both tiers paid the premium in the native year: full people by their
      // premium records, the counted households by their withholding.
      const premium = (evidence.premiums as LeavePremium[]).find(
        (row) => row.premiumMinor > 0,
      );
      expect(premium, `${where}: no full person's premium paid`).toBeDefined();
      const counted = evidence.counted.filter(([, cents]) => cents > 0);
      expect(
        counted.length,
        `${where}: no counted paid-leave withholding`,
      ).toBeGreaterThan(0);
      // Controlled transition after the native year; never reported as a played vote.
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: PAID_LEAVE_KEY,
          value: 0,
          effectiveDate: core.date,
          measureId: `controlled-leave-repeal:${level.level}`,
          citation:
            "Explicit controlled all-level repeal after native evidence",
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
      console.log(
        `PAID LEAVE ${where}: ${evidence.premiums.length} full-person premiums (first ${premium!.id}: ${premium!.premiumMinor} cents on ${premium!.paidMinor} cents of pay), ${counted.length} counted withholding rows (first ${counted[0]![0]}: ${counted[0]![1]} cents); ${opened} opened${passedOver.length ? `; passed over ${passedOver.join("; ")}` : ""}`,
      );
      return;
    }
    throw new Error(
      `No drawn place opened with a paid-leave program and working full people (${opened} opened): ${passedOver.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
  // Measured one at a time on a 4-core container: 103 to 294 seconds for a
  // drawn place and its year (the longest, North Bend, Washington). Each place
  // passed over adds one opening, 3 to 36 seconds; 3 passed over and the
  // longest year come to about 7 minutes, and 15 minutes allows twice that
  // for a run beside another file.
}, 900_000);
