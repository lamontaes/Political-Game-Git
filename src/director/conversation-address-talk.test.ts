/**
 * The talk after the President's address (owner, Nov 11, 2026: "the relative
 * raises a real thing the President said in that address and where they stand
 * on it from their own life. The player's replies are up to four, each a
 * different move about what was said"). In places drawn from all 56, on the
 * opening evening:
 *
 * - the relative's line names a point (`about`) that is in that world's
 *   address, with a stand and a reason the engine composes from parts;
 * - the relative's line names the point once; the replies are up to four,
 *   each a different move with its own insert (the point, the town, the
 *   President or the person), at most one naming the point, and each is
 *   answered without naming it again; the answer to the town reply says one
 *   thing the world keeps (the state's law, else the town's figure);
 * - what the player answered is kept by the relative, keyed by the question,
 *   and a later talk reads it: the point is behind them;
 * - two people with opposite views on the point take opposite stands;
 * - someone who lost a job this year or is looking for work raises a work
 *   point when the address has one;
 * - over 200 openings in one world, at least 40 different raise lines;
 * - across five drawn worlds the points raised are not all the same point.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { officialsIn } from "../core2/modules/officials";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionSubject } from "../english/policy-names";
import { questionAbout, questionTo } from "../english/question-names";
import rules from "./data/conversation-rules.json" with { type: "json" };
import {
  addressPointFor,
  composedLine,
  openConversation,
  say,
  subjectsBetween,
} from "./conversation";
import {
  ADDRESS_FACT,
  addressPoints,
  type AddressPoint,
} from "./opening-facts";
import { expectUpToFourDifferent } from "./reply-set-check";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const OPENINGS = 5;
const ATTEMPTS = 12;
const RAISES = 200;
const DIFFERENT = 40;
const POINT = "address-point";
const BACK = rules.addressPoint.back;
const MOVES = ["agree", "disagree", "here", "instead"];
const WEEKS = 26;
const TOWN_TALKS = 20;
const INSERTS = [
  "about",
  "place",
  "president",
  "president-object",
  "president-possessive",
  "name",
];
const DAYS_A_WEEK = 7;

const BANK = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../data/english/parts/conversation.json"),
    "utf8",
  ),
) as {
  lineWords: Record<string, number>;
  parts: { key: string; text: string }[];
};
const TEXT = new Map(BANK.parts.map((row) => [row.key, row.text]));
/** A composed line's words besides its slots, from the pieces it is made of. */
const wordsOf = (pieces: readonly string[]) =>
  pieces
    .map((key) => TEXT.get(key) ?? "")
    .join(" ")
    .replace(/\{[\w-]+\},?/g, "")
    .trim()
    .split(/\s+/).length;

function world(draw: number, purpose: string) {
  const place = drawPlace(`${seed}:${draw}`, purpose);
  setBookkeeping(false);
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    ...built,
    me: built.playerId as PersonId,
    where: `${place.name} (${place.key}), seed ${seed}:${draw}`,
    points: addressPoints(built.director.ledger.opening!),
  };
}

const housematesOf = (core: CoreState, me: PersonId) =>
  [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.id !== me &&
        row.householdId === core.people.get(me)!.householdId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

it(`the relative raises a point of this world's address, with a stand and a reason, and four replies about it (seed ${seed})`, () => {
  const raised: string[] = [];
  const pointsRaised: string[] = [];
  const townAnswers: string[] = [];
  const tried: string[] = [];
  for (let draw = 0; draw < ATTEMPTS && raised.length < OPENINGS; draw += 1) {
    const { core, director, me, where, points } = world(draw, "address-talk");
    const abouts = points.map((row) => row.about);
    const president = officialsIn(coreAPI(core), "US:president")[0];
    const gender = president
      ? core.people.get(president.id)?.looks?.gender
      : undefined;
    let found = false;
    for (const other of housematesOf(core, me)) {
      const otherId = other.id as PersonId;
      const talk = openConversation(core, me, otherId, { director });
      // Someone who watched it with the player opens on their own point
      // (owner, Nov 12: what a household did together each of them knows);
      // anyone else asks about the address, and any answer moves them on.
      const first = talk.lines[0]?.kind;
      if ((first !== "address" && first !== POINT) || !talk.choices.length)
        continue;
      if (first === "address") say(core, talk, talk.choices[0]!.key);
      const line = talk.lines.find(
        (row) => row.kind === POINT && row.speakerId === otherId,
      );
      if (!line) continue;
      const here = `${where}: ${other.givenName}`;
      // It names something the President said in this world's address.
      const about = abouts.find((text) => line.text.includes(text));
      expect(
        about,
        `${here}: "${line.text}" names none of ${abouts.join(", ")}`,
      ).toBeTruthy();
      expect(line.sourceRecordIds, here).toContain(director.ledger.opening!.id);
      expect(
        wordsOf(line.wording!.parts),
        `${here}: "${line.text}"`,
      ).toBeLessThanOrEqual(BANK.lineWords[POINT]!);
      // Up to four replies, each a different move about the point.
      expectUpToFourDifferent(talk.choices, here);
      // Agree and disagree always; a question is offered only when the
      // relative holds a record to answer it with (owner, Nov 12: "how the
      // hell would she know?"): what it means here needs the state's law or
      // the town's figure, what they would do instead a reason of their own.
      const moves = new Set(talk.choices.map((row) => row.move));
      expect(
        [...moves].every((move) => MOVES.includes(move)),
        here,
      ).toBe(true);
      expect(moves.has("agree") && moves.has("disagree"), here).toBe(true);
      // The relative's line names the point once in full (the lead's review,
      // Nov 11: one screen said it six times).
      expect(
        line.text.split(about!).length - 1,
        `${here}: "${line.text}"`,
      ).toBe(1);
      // Each reply carries its own insert: the point, the town, the President
      // or the person; at most one names the point, and no two share one.
      const inserts = talk.choices.map(
        (row) =>
          INSERTS.filter((key) => row.wording?.facts.includes(key))[0] ?? "",
      );
      expect(inserts.every(Boolean), `${here}: ${inserts.join(", ")}`).toBe(
        true,
      );
      expect(new Set(inserts).size, `${here}: ${inserts.join(", ")}`).toBe(
        inserts.length,
      );
      expect(
        talk.choices.filter((row) => row.text.includes(about!)).length,
        `${here}: ${talk.choices.map((row) => row.text).join(" / ")}`,
      ).toBeLessThanOrEqual(1);
      for (const choice of talk.choices) {
        // Every reply is answered, and the answer does not name the point
        // again: no talk ends on the player's line. An agreement or a
        // disagreement is answered with what comes next for the side the
        // speaker took (round 9: an answer fits the side), never the old
        // "Good. We'll watch what it does to ..." (owner, Nov 12: "makes no
        // sense").
        const back = composedLine(
          core,
          otherId,
          BACK,
          talk.last!.facts,
          choice.move,
          `${here}:${choice.key}`,
        );
        expect(back, `${here}: "${choice.text}"`).toBeTruthy();
        expect(back!.text, `${here}: "${choice.text}"`).not.toContain(about!);
        expect(wordsOf(back!.wording.parts), back!.text).toBeLessThanOrEqual(
          BANK.lineWords[BACK]!,
        );
      }
      // "What would it mean here?" is offered only to someone holding a
      // record to answer it with: the state's law or the town's figure, which
      // only someone holding an office in town reads (owner, Nov 12: "how the
      // hell would she know?"). Without one, no answer can be composed, so
      // the question is never left unanswered.
      const hereFact =
        talk.last!.facts.state ?? talk.last!.facts["town-figure"];
      if (moves.has("here"))
        expect(hereFact, `${here}: "here" offered with no record`).toBeTruthy();
      if (!hereFact) {
        expect(moves.has("here"), here).toBe(false);
        expect(
          composedLine(
            core,
            otherId,
            BACK,
            talk.last!.facts,
            "here",
            `${here}:town:none`,
          ),
          `${here}: an answer about here with no record`,
        ).toBeNull();
      }
      // Where it is offered, the answer says one thing this world keeps (the
      // state's law on it, else the town's figure), over 20 talks in each
      // place: a slot besides the town's name every time.
      for (
        let talkAt = 0;
        moves.has("here") && talkAt < TOWN_TALKS;
        talkAt += 1
      ) {
        const back = composedLine(
          core,
          otherId,
          BACK,
          talk.last!.facts,
          "here",
          `${here}:town:${talkAt}`,
        );
        expect(
          back?.wording.facts.some((key) => key !== "place"),
          `${here}: "${back?.text}"`,
        ).toBe(true);
        townAnswers.push(back!.text);
      }
      // No line about the President says "they" for a President whose record gives a gender.
      if (gender === "female" || gender === "male")
        for (const row of [line, ...talk.choices])
          expect(row.text, here).not.toMatch(/\b(they|them|their)\b/i);
      // The player answers; the relative keeps the answer by the question,
      // and answers it.
      const question = talk.last!.subject.point!.question;
      const choice = talk.choices[raised.length % talk.choices.length]!;
      const before = talk.lines.length;
      say(core, talk, choice.key);
      const answer = talk.lines[before + 1];
      expect(answer?.kind, `${here}: "${choice.text}"`).toBe(BACK);
      expect(answer?.speakerId, here).toBe(otherId);
      expect(answer!.text, here).not.toContain(about!);
      expect(answer!.text, here).not.toMatch(/We'll watch what it does/);
      const kept = core.knowledgeByPerson
        .get(otherId)
        ?.get(`talk:${me}:address-point:${question}`);
      expect(kept?.value, here).toBe(choice.move);
      expect(core.eventIds.has(kept!.sourceId as never), here).toBe(true);
      // A later talk reads it: that point is behind them.
      expect(
        addressPointFor(core, otherId, points, me, director)?.point.question,
        here,
      ).not.toBe(question);
      process.stdout.write(
        `${here}: "${talk.lines[0]!.text}" / you: "${talk.lines[1]!.text}" / "${line.text}" / you: "${choice.text}" / "${answer!.text}" (record ${kept!.sourceId})\n`,
      );
      raised.push(line.text);
      pointsRaised.push(about!);
      found = true;
      break;
    }
    if (!found) tried.push(`${where}: no housemate raised a point`);
  }
  process.stdout.write(`ADDRESS POINTS ${seed}: ${raised.join(" | ")}\n`);
  process.stdout.write(
    `TOWN ANSWERS ${seed}: ${townAnswers.length}, ${new Set(townAnswers).size} different: ${[...new Set(townAnswers)].slice(0, 6).join(" | ")}\n`,
  );
  expect(raised.length, tried.join("; ")).toBe(OPENINGS);
  // The openings do not share a raise line.
  expect(new Set(raised).size, raised.join(" | ")).toBe(OPENINGS);
  // Across the worlds the points raised are not all the same point.
  expect(new Set(pointsRaised).size, pointsRaised.join(" | ")).toBeGreaterThan(
    1,
  );
}, 1_800_000);

/** A point on work the bill catalog names, for an address that has none: a hand-made edge case beside the drawn ones. */
function workPoint(points: readonly AddressPoint[]): AddressPoint {
  const own = points.find(
    (row) =>
      row.kind === "policy" &&
      rules.addressPoint.work.subjects.includes(
        questionSubject(row.question) ?? "",
      ),
  );
  if (own) return own;
  const question = "us-policy-positions:labor-workforce.raise-minimum-wage";
  return {
    kind: "policy",
    question,
    about: questionAbout(question)!,
    to: questionTo(question)!,
    stance: "for",
    sourceRecordIds: [`question:${question}`],
  };
}

it(`opposite views take opposite stands, a job lost raises a work point, and 200 openings say at least 40 lines (seed ${seed})`, () => {
  const passed: string[] = [];
  let opposite = false;
  let work = false;
  let varied = false;
  for (
    let draw = 0;
    draw < ATTEMPTS && !(opposite && work && varied);
    draw += 1
  ) {
    const { core, director, me, where, points } = world(draw, "address-stands");
    const api = coreAPI(core);
    const knows = [...core.people.values()].filter(
      (row) =>
        row.alive &&
        !!core.knowledgeByPerson.get(row.id)?.get(ADDRESS_FACT.event) &&
        !!viewOf(api, row.id as PersonId),
    );
    // Two people with opposite views on the same point take opposite stands.
    if (!opposite)
      for (const point of points.filter((row) => row.kind === "policy")) {
        const stands = knows.map((row) => ({
          id: row.id as PersonId,
          view: viewOn(
            api,
            row.id as PersonId,
            point.question,
            viewOf(api, row.id as PersonId)!.lean,
          ),
          stand: addressPointFor(core, row.id as PersonId, [point])!.stand,
        }));
        const up = stands.find((row) => row.view > 0);
        const down = stands.find((row) => row.view < 0);
        if (!up || !down) continue;
        expect(up.stand, `${where}: ${point.about}`).not.toBe(down.stand);
        expect([up.stand, down.stand].sort(), where).toEqual([
          "against",
          "with",
        ]);
        passed.push(
          `${where}: ${up.id} ${up.stand}, ${down.id} ${down.stand} on ${point.about}`,
        );
        opposite = true;
        break;
      }
    // Over 200 openings in one world, at least 40 different raise lines.
    if (!varied) {
      const subjects = housematesOf(core, me).flatMap((row) =>
        subjectsBetween(core, row.id as PersonId, me, director)
          .filter((subject) => subject.kind === POINT)
          .map((subject) => ({ speakerId: row.id as PersonId, subject })),
      );
      if (subjects.length) {
        const lines = new Set<string>();
        for (let opening = 0; opening < RAISES; opening += 1) {
          const { speakerId, subject } = subjects[opening % subjects.length]!;
          const line = composedLine(
            core,
            speakerId,
            POINT,
            subject.facts,
            subject.stage!,
            `opening:${opening}`,
          );
          expect(line, where).toBeTruthy();
          lines.add(line!.text);
        }
        expect(
          lines.size,
          `${where}: ${[...lines].slice(0, 5).join(" | ")}`,
        ).toBeGreaterThanOrEqual(DIFFERENT);
        passed.push(
          `${where}: ${lines.size} different raise lines in ${RAISES}`,
        );
        varied = true;
      }
    }
    // Someone looking for work raises a work point when the address has one.
    // Nobody is looking on the opening day, so the world runs a week at a
    // time until the jobs engine records someone (drawn-place-tests).
    if (!work && core.modules.has(JOBS_MODULE_ID)) {
      const point = workPoint(points);
      const seekers = api.moduleState(JOBS_MODULE_ID).table("seekers");
      for (let week = 0; week < WEEKS && !work; week += 1) {
        const looking = [...core.people.values()].filter(
          (row) =>
            row.alive &&
            !!viewOf(api, row.id as PersonId) &&
            (seekers.get(row.id) as { isSeeker?: boolean } | undefined)
              ?.isSeeker,
        );
        for (const row of looking) {
          const pick = addressPointFor(core, row.id as PersonId, [
            ...points,
            point,
          ]);
          expect(pick?.reason, `${where}: ${row.id}`).toBe("work");
          // The work point it raises: the one added here, or a claim the
          // address made about work this year, whichever the address has first.
          const claim = pick?.point.claim ?? "";
          const claims = rules.addressPoint.claims as unknown as Record<
            string,
            { area?: string }
          >;
          expect(
            pick?.point.question === point.question ||
              claims[claim]?.area === "work",
            `${where}: ${row.id} raised ${pick?.point.about}`,
          ).toBe(true);
          work = true;
        }
        if (work)
          passed.push(
            `${where}: on ${core.date}, ${looking.length} looking for work raised ${point.about}`,
          );
        else advanceCore(core, addDays(makeIsoDate(core.date), DAYS_A_WEEK));
      }
      if (!work)
        passed.push(`${where}: nobody looking for work in ${WEEKS} weeks`);
    }
  }
  process.stdout.write(`ADDRESS STANDS ${seed}: ${passed.join("; ")}\n`);
  expect({ opposite, work, varied }, passed.join("; ")).toEqual({
    opposite: true,
    work: true,
    varied: true,
  });
}, 1_800_000);
