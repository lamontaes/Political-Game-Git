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
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionSubject } from "../english/policy-names";
import { questionAbout, questionTo } from "../english/question-names";
import rules from "./data/conversation-rules.json" with { type: "json" };
import { addressPointFor, composedLine, subjectsBetween } from "./conversation";
import {
  ADDRESS_FACT,
  addressPoints,
  type AddressPoint,
} from "./opening-facts";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 12;
const RAISES = 200;
const DIFFERENT = 40;
const POINT = "address-point";
const WEEKS = 26;
const DAYS_A_WEEK = 7;

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
