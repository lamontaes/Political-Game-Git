/**
 * A relative's employer closes through the game's own closure path (the
 * business engine's close-by-choice, which writes the same records a natural
 * closure writes), and the relative tells the player they lost the job
 * (Account lead, Nov 14, 2026). Natural household job losses were seen at 1 of
 * 24 drawn places, so the loss is staged here; the talk is not: it opens
 * through the director as in play. Three pinned places from one seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { familyFactsOf } from "../core2/modules/people";
import businessData from "../core2/data/business/business.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { openConversation, say } from "./conversation";

/** The teller's second sentence says how work is in town, in the Words lead's lines (rule 101). */
const LEVEL_SENTENCE = new RegExp(
  [
    "Nobody's hiring around here\\.",
    "There's nothing out there",
    "I'll find something\\. It may take a while\\.",
    "Places are hiring\\. I'll land somewhere\\.",
    "I won't be out long\\.",
  ].join("|"),
);

const PLACES = [
  {
    seed: "5d20040f-f644-490d-a78c-694236af4bcd",
    draw: 0,
    name: "Charlotte Amalie West, U.S. Virgin Islands",
  },
  {
    seed: "5d20040f-f644-490d-a78c-694236af4bcd",
    draw: 1,
    name: "Hotevilla-Bacavi, Arizona",
  },
  {
    seed: "9d453478-d777-4f4b-acce-06824b7697f4",
    draw: 2,
    name: "Afono, American Samoa",
  },
];

describe("a relative's closed employer is told as a lost job", () => {
  for (const { seed, draw, name } of PLACES)
    it(
      `${name}: the relative tells it first, every reply is answered, and it is not told again later`,
      { timeout: 300_000 },
      () => {
        setBookkeeping(false);
        const place = drawPlace(`${seed}:${draw}`, "job-lost-staged");
        expect(place.name).toBe(name);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const { core, director } = world;
        const playerId = world.playerId!;
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const owners = api.moduleState("business").table("owners");
        let picked: { id: string; org: string; owner: string } | undefined;
        for (const [id] of familyFactsOf(core.people.get(playerId)!)) {
          const person = core.people.get(id);
          const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
          const owner = job
            ? (owners.get(job.organizationId) as
                { ownerId: string } | undefined)
            : undefined;
          if (
            !person?.alive ||
            !job ||
            !owner ||
            !core.finance.businesses.get(job.organizationId) ||
            !(
              core.people.has(owner.ownerId as never) ||
              core.organizations.has(owner.ownerId)
            ) ||
            ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) <
              18
          )
            continue;
          picked = { id, org: job.organizationId, owner: owner.ownerId };
          break;
        }
        expect(
          picked,
          `${name}: a relative who works at a closable business`,
        ).toBeTruthy();
        director.watch(core, picked!.id as never);
        api.closeBusinessByChoice({
          organizationId: picked!.org,
          ownerAccountId: api.accounts().main(picked!.owner),
          reasonKey: businessData.reasons.noSuccessor,
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation: "A staged closure through the closure path.",
            estimatedFrom: "job-lost-talk-played.test.ts",
          },
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const talk = openConversation(core, playerId, picked!.id as never, {
          director,
        });
        const told = talk.lines.findIndex((line) => line.kind === "job-lost");
        expect(
          told,
          `${name}: opened ${talk.lines.map((line) => line.text).join(" / ")}`,
        ).toBeGreaterThanOrEqual(0);
        const employer = core.organizations.get(picked!.org)!.name;
        expect(talk.lines[told]!.speakerId).toBe(picked!.id);
        expect(talk.choices.length).toBeGreaterThan(0);
        for (const choice of talk.choices) {
          const copy = { ...talk, lines: [...talk.lines] } as typeof talk;
          const from = copy.lines.length;
          say(core, copy, choice.key);
          const back = copy.lines
            .slice(from)
            .filter((line) => line.speakerId === picked!.id);
          expect(back.length, `${name}: "${choice.text}" is answered`).toBe(1);
          expect(back[0]!.text).not.toContain(employer);
        }
        // A figure opening a line is said in words (up to ninety-nine).
        expect(talk.lines[told]!.text).not.toMatch(/^\d/);
        // The opener says what happened and how work is in town: no pay and
        // no search of their own (that is for "Looking yet?"), no rate.
        expect(talk.lines[told]!.text).not.toMatch(/I'm looking|\$|percent|%/i);
        expect(talk.lines[told]!.text).toMatch(LEVEL_SENTENCE);
        // "Looking yet?" is answered and the talk takes one more turn: the
        // player may ask where or say they will find something, and each is
        // answered by the teller.
        const hope = talk.choices.find((choice) =>
          /looking|leads/i.test(choice.text),
        );
        expect(
          hope,
          `${name}: a reply that asks whether they are looking`,
        ).toBeTruthy();
        const asked = { ...talk, lines: [...talk.lines] } as typeof talk;
        say(core, asked, hope!.key);
        expect(
          asked.choices.map((choice) => choice.text).sort(),
          `${name}: the second turn`,
        ).toEqual(expect.arrayContaining(["Where?", "You'll find something."]));
        for (const next of asked.choices) {
          const again = { ...asked, lines: [...asked.lines] } as typeof asked;
          const length = again.lines.length;
          say(core, again, next.key);
          const theirs = again.lines
            .slice(length)
            .filter((line) => line.speakerId === picked!.id);
          expect(theirs.length, `${name}: "${next.text}" is answered`).toBe(1);
          expect(theirs[0]!.text).not.toContain(employer);
        }
        // A month on, the loss is not told a second time.
        for (let day = 0; day < 30; day += 1)
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const later = openConversation(core, playerId, picked!.id as never, {
          director,
        });
        expect(later.lines.some((line) => line.kind === "job-lost")).toBe(
          false,
        );
      },
    );
});
