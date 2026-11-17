import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  acceptJobOffer,
  jobLeaveBlock,
  jobLeaveRecord,
  jobOffersFor,
  quitJob,
} from "../core2/modules/jobs";
import { P } from "../core2/parameters";
import { attendedSchool } from "../core2/past";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { purposeScene } from "./purpose-scene";

// A last day, read from the records (situation type `last-day`): a job the
// player left by the game's own Leave this job press (cause `money:job-left`,
// key `departure`) and a school year's end (cause `circumstance:school-last-day`,
// key `school-goodbye`). Drawn places and a seed (named in a failure) play it:
// the job from the offer the game makes, the school year with a town student
// of senior age who steps in as the controlled person, as a controlled person's
// scenes are the only ones the director stages from circumstance. Each fact the
// words lean on cites the record it was read from: the job and the hire for the
// employer and the span, the jobs engine's `left-work` change for the end, the
// school and its graduation result for the school year.
// A place with no job to take or no student of that age is passed over and the
// next draw is taken.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 4;
const OFFER_DAYS = 120;
const TENURE_DAYS = 60;
const SCHOOL_DAYS = 140;
const SENIOR_AGE = 17;
const SCHOOL_YEAR_BEGINS = "09-01";

function staged(
  director: Director,
  personId: PersonId,
  label: string,
): Parameters<typeof purposeScene>[3] | null {
  const book = director.ledger.people.get(personId);
  for (const entry of book?.schedule ?? []) {
    const moment = book!.momentsById.get(entry.momentId);
    if (
      moment?.label === label &&
      entry.bindings.some((row) => row.typeKey === "last-day")
    )
      return entry;
  }
  return null;
}

it(`the last day names the job and the school from their records (seed ${seed})`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let jobProven = false;
  let schoolProven = false;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `last-day-facts:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = core.playerId as PersonId;
    const day = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));

    if (!jobProven) {
      core.focusPersonIds.add(me);
      director.watch(core, me);
      const held = core.people.get(me)!.jobId;
      if (held && jobLeaveBlock(api, me))
        passedOver.push(
          `${where}: the player holds a post the press cannot end`,
        );
      else {
        // A player with a job leaves it by the press at once; one without takes
        // the job the game offers, holds it, then leaves it.
        let hiredOn = "";
        let left: ReturnType<typeof quitJob> | null = held
          ? quitJob(api, me)
          : null;
        for (let n = 0; n < OFFER_DAYS + TENURE_DAYS && !left?.left; n += 1) {
          day();
          if (!hiredOn)
            for (const offer of jobOffersFor(api, me))
              if (acceptJobOffer(api, offer.id)) hiredOn = core.date;
          if (
            hiredOn &&
            !jobLeaveBlock(api, me) &&
            Date.parse(core.date) - Date.parse(hiredOn) >=
              TENURE_DAYS * 86_400_000
          )
            left = quitJob(api, me);
        }
        let entry = staged(director, me, "money:job-left");
        for (let n = 0; n < 3 && left?.left && !entry; n += 1) {
          day();
          entry = staged(director, me, "money:job-left");
        }
        if (!left?.left || !entry)
          passedOver.push(`${where}: no job taken and left (hired ${hiredOn})`);
        else {
          const result = purposeScene(core, director, me, entry, {
            typeKey: "last-day",
          });
          // An employer with no one left to say goodbye is passed over.
          if (
            result?.kind === "skipped" &&
            /no .* on record/.test(result.reason)
          )
            passedOver.push(`${where}: ${result.reason}`);
          else
            expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
              "composed",
            );
          if (result?.kind === "composed") {
            const facts = new Map(result.scene.facts.map((r) => [r.key, r]));
            const book = director.ledger.people.get(me)!;
            const job = core.jobs.get(
              book.momentsById.get(entry.momentId)!.causeId as never,
            )!;
            expect(job.personId, where).toBe(me);
            expect(facts.get("employer")?.recordIds, where).toEqual(
              expect.arrayContaining([job.id, job.organizationId]),
            );
            expect(facts.get("years-there")?.recordIds, where).toEqual(
              expect.arrayContaining([job.id, `work-commitment:${job.id}`]),
            );
            const end = jobLeaveRecord(api, job);
            expect(end?.kind, where).toBe("left-work");
            expect(facts.get("left-work")?.recordIds, where).toContain(end!.id);
            expect(
              result.scene.talk.lines.every((row) => row.key === "departure"),
              where,
            ).toBe(true);
            jobProven = true;
          }
        }
      }
    }

    if (!schoolProven) {
      for (let n = 0; n < 14; n += 1) day();
      // A senior is 17 when the school year begins; the attended row names the year.
      const senior = [...core.people.values()].find((row) => {
        const attended = row.alive ? attendedSchool(core, row.id) : undefined;
        return (
          !!attended &&
          row.id !== me &&
          ageOnDate(
            makeIsoDate(row.birthDate),
            makeIsoDate(`${attended.year}-${SCHOOL_YEAR_BEGINS}`),
          ) === SENIOR_AGE
        );
      });
      if (!senior) passedOver.push(`${where}: no student of senior age`);
      else {
        core.playerId = senior.id;
        core.focusPersonIds.add(senior.id);
        director.watch(core, senior.id);
        let entry: ReturnType<typeof staged> = null;
        let packet = advancePlayerV1(core, {
          controlledPersonId: senior.id,
          through: {
            date: addDays(makeIsoDate(core.date), SCHOOL_DAYS),
            minuteOfDay: P.zero,
          },
        });
        while (packet.kind !== "complete" && !entry) {
          entry = staged(director, senior.id, "circumstance:school-last-day");
          if (entry) break;
          packet = resumePlayerV1(core, {
            kind: packet.kind === "stop" ? "stop" : "own-choice",
            pauseId: packet.pauseId,
          } as never);
        }
        entry ??= staged(director, senior.id, "circumstance:school-last-day");
        if (!entry) passedOver.push(`${where}: no last school day staged`);
        else {
          const result = purposeScene(core, director, senior.id, entry, {
            typeKey: "last-day",
          });
          expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
            "composed",
          );
          if (result?.kind === "composed") {
            const facts = new Map(result.scene.facts.map((r) => [r.key, r]));
            const schoolId = attendedSchool(core, senior.id)!.schoolId;
            expect(facts.get("school")?.recordIds, where).toContain(schoolId);
            // The result is the school engine's own record, cited by its id.
            const resultId =
              facts.get("passed")?.recordIds[P.zero] ??
              facts.get("failed")?.recordIds[P.zero];
            expect(resultId, where).toMatch(/^school\.graduation-pct:/);
            // The classmate either finishes too or comes back to the school.
            expect(
              facts.has("classmate-leaving") !== facts.has("same-school-next"),
              where,
            ).toBe(true);
            expect(
              result.scene.talk.lines.every((r) => r.key === "school-goodbye"),
              where,
            ).toBe(true);
            schoolProven = true;
          }
        }
      }
    }
    if (jobProven && schoolProven) return;
  }
  throw new Error(
    `no drawn place showed both last days (job ${jobProven}, school ${schoolProven}); passed over: ${passedOver.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
