import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  PRESS_MODULE_ID,
  type InterviewRow,
  officeholderSpeaker,
  requestInterview,
  storiesPrinted,
} from "../core2/modules/press";
import { recordVote } from "../core2/modules/record";
import { townSeats } from "../core2/modules/offices";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { finishInterviewTalk, openInterviewTalk } from "./press-interview";

// A press interview is a conversation (SG-PEOPLE-press-interview-conversation):
// the reporter asks each question as a mined line, the answer is one of the
// conversation's moves worded from the mined bank, and the chosen move reaches
// the press engine, which prints it. Played world, a place drawn from all 56.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;

const run = (attemptSeed: string): boolean => {
  const place = drawPlace(attemptSeed, "press-interview");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // Half a year in, so the town's members have votes on the record to speak to.
  advanceCore(core, addDays(makeIsoDate(core.date), 200));
  const outlets = (
    api.moduleState(PRESS_MODULE_ID).table("outlets").rows() as unknown as {
      id: string;
      tier?: string;
      reporterIds?: string[];
    }[]
  ).filter((o) => o.tier !== "national" && o.reporterIds?.length);
  const holders = townSeats(api)
    .map((s) => s.holder?.personId)
    .filter((id): id is string => !!id && !!core.people.get(id)?.alive);
  const invited: { id: string; outletId: string }[] = [];
  for (const holder of holders) {
    if (!officeholderSpeaker(api, holder)) continue;
    for (const outlet of outlets) {
      const row = requestInterview(api, {
        outletId: outlet.id,
        personId: holder,
      });
      if (row.status === "invited")
        invited.push({ id: row.id, outletId: outlet.id });
    }
  }
  // The first invited speaker has voted on the first question asked (a vote
  // through the record's own writer), so the further fact and the lie are offered.
  const target = invited[0];
  const voted: { id: string; question: string } | null = target
    ? (() => {
        const interview = api
          .moduleState(PRESS_MODULE_ID)
          .table("interviews")
          .get(target.id) as unknown as InterviewRow;
        const probe = openInterviewTalk(api, target.id);
        const question = probe.steps[0]?.question;
        if (!question) return null;
        const vote = recordVote(api, {
          personId: interview.candidateId,
          body: "council",
          measureId: `measure:press-interview:${question}`,
          stance: { question, position: 1 },
          passed: true,
        });
        return { id: vote.id, question };
      })()
    : null;
  const talks = invited.map((row) => ({
    row,
    talk: openInterviewTalk(api, row.id),
  }));
  const chosen = talks[0];
  if (chosen) {
    const { row, talk } = chosen;
    const outlet = { id: row.outletId };
    {
      expect(
        talk.steps.length,
        "the reporter asks at least one question",
      ).toBeGreaterThan(0);
      for (const step of talk.steps) {
        expect(step.reporterLine.length).toBeGreaterThan(0);
        expect(step.reporterVariantKey).toMatch(/^interview\.reporter-issue\./);
        const moves = step.choices.map((c) => c.move);
        expect(moves, step.question).toContain("plain");
        expect(moves, step.question).toContain("decline");
        // Every wording is a mined part of the interview bank.
        for (const c of step.choices)
          expect(c.variantKey, c.text).toMatch(/^interview\.official-/);
      }
      // Answer every question with the further fact where one is offered, else plainly.
      const asked = talk.steps.find((s) => s.question === voted?.question);
      if (voted && asked) {
        const further = asked.choices.find((c) => c.move === "further");
        const lie = asked.choices.find((c) => c.move === "lie");
        expect(further?.position, "further states the voted position").toBe(1);
        expect(further?.sourceRecordIds).toContain(voted.id);
        expect(lie?.position, "the lie states the opposite of the vote").toBe(
          -1,
        );
        expect(lie?.text).not.toBe(further?.text);
      }
      const picks = Object.fromEntries(
        talk.steps.map((s) => [
          s.question,
          s.choices.some((c) => c.move === "further") ? "further" : "plain",
        ]),
      ) as Record<string, "further" | "plain">;
      const done = finishInterviewTalk(api, talk, picks);
      expect(done.status).toBe("published");
      for (const answer of done.answers) {
        const move = picks[answer.question];
        if (move) expect(answer.move).toBe(move);
        if (answer.move === "further")
          expect(answer.recordId, "a further fact names its vote").toBeTruthy();
      }
      const story = storiesPrinted(api, outlet.id).find(
        (s) => s.interviewId === done.id,
      );
      expect(story, "the outlet printed the interview").toBeTruthy();
      expect(story!.receivedNamed, "its readers received it").toBeGreaterThan(
        0,
      );
      if (process.env.INTERVIEW_TALK_OUT)
        writeFileSync(
          process.env.INTERVIEW_TALK_OUT,
          JSON.stringify(
            { place: place.name, attemptSeed, talk, picks, done, story },
            null,
            1,
          ),
        );
      return true;
    }
  }
  return false;
};

it(`an invited interview runs as a conversation and the chosen move prints (up to ${ATTEMPTS} drawn places from seed ${seed})`, () => {
  let reached = false;
  for (let attempt = 0; attempt < ATTEMPTS && !reached; attempt += 1)
    reached = run(`${seed}:${attempt}`);
  expect(
    reached,
    `no drawn place from seed ${seed} had an outlet that invited a seated resident`,
  ).toBe(true);
}, 1_800_000);
