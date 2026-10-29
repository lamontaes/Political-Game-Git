/**
 * A job offer comes through a person and a scene or not at all (owner,
 * Oct 27). Played in the bench world in a place drawn from all 56 (up to
 * eight draws; GOLDEN_PATH_SEED pins the seed): the player is out of work by
 * the jobs engine's own path, and the first employer that picks them makes the
 * offer through a full person who works there (`offeredBy`). The offer is a
 * `job-offered` record, not a clock stop; the director stages it as a call
 * from that person, who says the job and the pay from the record; the
 * player's yes, said in the scene (`replyInScene`), is what hires them.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  JOB_OFFERED_EVENT,
  JOBS_MODULE_ID,
  layOff,
  type JobOfferRow,
} from "./modules/jobs";
import { earliestModuleStopsV1 } from "./player-stops-v1";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import { dollars } from "../english/bill-sections";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("an employer's offer reaches the player through a person who works there, in a scene, and a yes hires them", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "job-offer-through-person");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId! as PersonId;
    // A grown player, as the creator makes one.
    applyChosenPerson(core, me, {
      givenName: "Pat",
      familyName: core.people.get(me)!.familyName,
      gender: "female",
      birthYear: 1985,
      birthMonth: 6,
      birthDay: 1,
    });
    const api = coreAPI(core);
    director.watch(core, me);
    // Out of work by the jobs engine's own path: the business lets them go.
    let tries = 0;
    while (core.people.get(me)!.jobId && tries < 14) {
      const job = core.jobs.get(core.people.get(me)!.jobId!)!;
      layOff(api, job.organizationId, [job], 1, {});
      if (core.people.get(me)!.jobId)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      tries += 1;
    }
    if (core.people.get(me)!.jobId) {
      tried.push(`${where}: the player could not be let go`);
      continue;
    }
    const loggedOffer = () =>
      [...core.durableLog.values()].find(
        (row) => row.kind === JOB_OFFERED_EVENT && row.personIds.includes(me),
      );
    for (let week = 0; week < 26 && !loggedOffer(); week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const event = loggedOffer();
    if (!event) {
      tried.push(`${where}: no employer picked the player in 26 weeks`);
      continue;
    }
    const facts = event.facts!;
    const offeredBy = String(facts.offeredBy) as PersonId;
    const offerId = String(facts.offerId);
    const org = String(facts.organizationId);
    process.stdout.write(
      `job-offer-through-person: ${where}: ${event.id} by ${offeredBy} at ${org} (${offerId})\n`,
    );
    // The offer is made by a full, living person who works at that employer.
    const maker = core.people.get(offeredBy)!;
    expect(maker?.alive, where).toBe(true);
    expect(offeredBy, where).not.toBe(me);
    expect(event.personIds, where).toEqual([me, offeredBy]);
    const makerJob = maker.jobId ? core.jobs.get(maker.jobId) : undefined;
    expect(makerJob?.organizationId, `${where}: ${offeredBy}'s employer`).toBe(
      org,
    );
    const jobs = api.moduleState(JOBS_MODULE_ID);
    const row = jobs.table("offers").get(offerId) as unknown as JobOfferRow;
    expect(row.offeredBy, where).toBe(offeredBy);
    expect(row.status, where).toBe("pending");
    // No clock stop: the offer is the scene's alone.
    expect(
      earliestModuleStopsV1(core, {
        controlledPersonId: me,
        from: { date: core.date, minuteOfDay: 0 },
        through: { date: addDays(makeIsoDate(core.date), 60), minuteOfDay: 0 },
      }).filter((stop) => stop.moduleId === JOBS_MODULE_ID),
      `${where}: no jobs-module player stop`,
    ).toEqual([]);
    // The director's schedule for the player stages it as a call from that person.
    const book = director.ledger.people.get(me)!;
    const entry = book.schedule.find((item) =>
      item.bindings.some(
        (binding) =>
          binding.typeKey === "job-offer" &&
          binding.roles.some((role) => role.personIds.includes(offeredBy)),
      ),
    );
    expect(
      entry,
      `${where}: a job-offer scene naming ${offeredBy}`,
    ).toBeTruthy();
    process.stdout.write(
      `job-offer-through-person: scheduled ${entry!.momentId}\n`,
    );
    // The call composes: the caller says the job and the pay from the
    // offer record, and the player has four different answers.
    const composed = purposeScene(core, director, me, entry!, {
      typeKey: "job-offer",
    });
    expect(composed?.kind, `${where}: ${JSON.stringify(composed)}`).toBe(
      "composed",
    );
    if (composed?.kind !== "composed") return;
    const { talk } = composed.scene;
    expect(talk.narration.length, where).toBeGreaterThan(0);
    const offer = talk.state.text;
    const title = String(facts.title).toLowerCase();
    expect(offer.toLowerCase(), `${where}: ${offer}`).toContain(title);
    expect(offer, `${where}: ${offer}`).toContain(
      dollars(Number(facts.hourlyMinor)),
    );
    const moves = talk.tree.replies.map((reply) => reply.line.move);
    expect(new Set(moves).size, `${where}: ${moves.join(", ")}`).toBe(
      moves.length,
    );
    process.stdout.write(
      `job-offer-through-person: ${talk.narration.map((line) => line.text).join(" ")} / ${offer} / ${talk.tree.replies.map((reply) => `[${reply.line.move}] ${reply.line.text}`).join(" ")}\n`,
    );
    // The player's yes, said in the scene.
    const yes = moves.indexOf("agree");
    expect(yes, `${where}: ${moves.join(", ")}`).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(core, director, me, entry!, [yes], {
      typeKey: "job-offer",
    });
    expect(replyId, where).toBeTruthy();
    const hired = core.jobs.get(core.people.get(me)!.jobId ?? "");
    expect(hired?.organizationId, `${where}: hired by ${org}`).toBe(org);
    expect(
      (jobs.table("offers").get(offerId) as unknown as JobOfferRow).status,
    ).toBe("accepted");
    process.stdout.write(
      `job-offer-through-person: ${replyId} -> job ${hired!.id} at ${org}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place made the jobless player an offer (seed ${seed}): ${tried.join("; ")}`,
  );
}, 3_600_000);
