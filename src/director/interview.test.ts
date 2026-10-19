/**
 * An interview told as a conversation, in the played world: a random place
 * from all 56 (buildBenchWorld, two-level, every module), an officeholder
 * asks an outlet, answers, and the reporter's questions and the candidate's
 * answers come out of the mined interview bank, each citing the interview.
 * Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  answerInterview,
  candidateAnswers,
  officeholderSpeaker,
  outletsHere,
  requestInterview,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { interviewLines } from "./interview";
import { INTERVIEW_BANK, interviewWordsFromBank } from "./mined/interview-bank";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("the mined interview bank", () => {
  it("records a public-domain source for every part", () => {
    for (const part of INTERVIEW_BANK.parts as unknown as {
      key: string;
      source: { url: string; license?: string };
    }[]) {
      expect(part.source.url, part.key).toMatch(/^https:\/\//);
      expect(part.source.license ?? "", part.key).toMatch(/public domain/i);
    }
  });

  it("says a vote only when the record holds it", () => {
    const words = interviewWordsFromBank();
    const none = words.answer.record!(new Set()).map((v) => v.text);
    expect(none.join(" ")).not.toMatch(/voted/);
    const yes = words.answer.record!(new Set(["voted-yes"])).map((v) => v.text);
    expect(yes).toContain("I voted for it.");
  });
});

describe("an interview in the played world", () => {
  it("composes the reporter's questions and the candidate's answers through the engine", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "interview-lines");
    const where = `place ${place.key}, seed ${seed}`;
    console.log(`interview-lines: ${where}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const outlets = outletsHere(api).filter((o) => o.tier !== "national");
    if (!outlets.length) {
      console.log(`interview-lines: no local outlet in ${where}`);
      return;
    }
    const holders = [...core.people.values()]
      .filter((p) => p.alive && officeholderSpeaker(api, p.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    let told = 0;
    for (const outlet of outlets)
      for (const holder of holders) {
        const row = requestInterview(api, {
          outletId: outlet.id,
          personId: holder.id,
        });
        if (row.status !== "invited") continue;
        const speaker = officeholderSpeaker(api, holder.id)!;
        const done = answerInterview(
          api,
          row.id,
          candidateAnswers(api, row.questions, speaker),
        );
        const lines = interviewLines(core, done);
        const asked = lines.filter((l) => l.speaker === "reporter");
        const said = lines.filter((l) => l.speaker === "candidate");
        expect(asked.length, where).toBeGreaterThan(0);
        expect(said.length, where).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.text, `${where} ${done.id}`).not.toMatch(/[{}]/);
          expect(line.sourceRecordIds.length, where).toBeGreaterThan(0);
        }
        console.log(`interview-lines: ${done.id} (${outlet.id})`);
        told += 1;
        if (told >= 2) return;
      }
    console.log(`interview-lines: ${told} interviews told in ${where}`);
  });
});
