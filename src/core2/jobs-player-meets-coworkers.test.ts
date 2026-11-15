/**
 * The player meets the counted coworkers when they take a job (pool item
 * people-player-meets-coworkers-at-job). In the played world, in a random
 * place from all 56: an employer that has counted staff offers the player a
 * job; accepting it fills in the coworkers the staff's size lets the player
 * know, from the books (same job, employer and pay), meets them through the
 * hire's own source, and leaves the town's counts as they were. A hire that
 * is not the player's fills in no one. Seed and place from GOLDEN_PATH_SEED
 * (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { personCard } from "../bench/card";
import { isDemoted } from "./counted-groups";
import { knownAmong } from "./encounters";
import { countedHeadcountOf, countedJobsOf } from "./residents-economy";
import {
  acceptJobOffer,
  coworkersToMeet,
  jobOffersFor,
  JOBS_MODULE_ID,
} from "./modules/jobs";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe(
  "the player meets counted coworkers at a new job",
  {
    timeout: 900_000,
  },
  () => {
    it("fills in the counted coworkers the staff lets one know and meets them at hire", () => {
      setBookkeeping(false);
      const passed: string[] = [];
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const place = drawPlace(
          attempt ? `${seed}:${attempt}` : seed,
          "player-meets-coworkers",
        );
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        const playerId = core.playerId!;
        for (let weeks = 0; weeks < 52; weeks += 8) {
          advanceCore(core, addDays(makeIsoDate(core.date), 8 * 7));
          if (
            jobOffersFor(api, playerId).some(
              (row) => countedJobsOf(core, row.organizationId).length,
            )
          )
            break;
        }
        const offer = jobOffersFor(api, playerId).find(
          (row) => countedJobsOf(core, row.organizationId).length,
        );
        if (!offer) {
          passed.push(`${place.name} (${place.key})`);
          continue;
        }
        console.log(
          `player-meets-coworkers: place ${place.key}, seed ${seed}, offer ${offer.id}`,
        );
        const org = offer.organizationId;
        const countedBefore = countedJobsOf(core, org);
        const bookRows = new Map(
          countedBefore.map((job) => [
            job.personId,
            { id: job.id, title: job.title, hourlyMinor: job.hourlyMinor },
          ]),
        );
        const heads = () =>
          [...(core.finance.jobsByOrganization.get(org) ?? [])].filter(
            (id) =>
              core.jobs.get(id)?.endsAt === undefined &&
              core.people.has(core.jobs.get(id)!.personId),
          ).length + countedHeadcountOf(core, org);
        const headsBefore = heads();
        const seekersBefore = coreAPI(core)
          .moduleState(JOBS_MODULE_ID)
          .table("countedSeekers")
          .rows().length;
        const peopleBefore = core.people.size;

        // Someone else's hire lists full people only and fills in no one.
        const other = [...core.people.values()].find(
          (p) => p.id !== playerId && p.alive,
        )!;
        coworkersToMeet(
          api,
          { organizationId: org, title: offer.title },
          other.id,
        );
        expect(core.people.size).toBe(peopleBefore);

        expect(acceptJobOffer(api, offer.id)).toBe(true);
        const player = core.people.get(playerId)!;
        const job = core.jobs.get(player.jobId!)!;
        const source = `job-change:${core.date}:${job.id}:hire`;
        // A counted worker is filled in once they hold a full record: one returned to the counts keeps a record but is still counted.
        const filled = [...bookRows.keys()].filter((id) => {
          const q = core.people.get(id);
          return q !== undefined && !isDemoted(q);
        });
        expect(filled.length).toBeGreaterThan(0);
        // Room is the staff's size, not everyone: a small staff meets all.
        const staff = countedBefore.length;
        expect(player.knownIds.size).toBeGreaterThan(0);
        const met = filled.filter((id) => player.knownIds.has(id));
        expect(met.length).toBeGreaterThan(0);
        expect(filled.length).toBeLessThanOrEqual(
          Math.max(knownAmong(api, staff + 30), staff),
        );
        for (const id of met) {
          // The same worker the books held: same job record, employer and pay.
          const book = bookRows.get(id)!;
          const now = core.jobs.get(book.id)!;
          expect(now.organizationId).toBe(org);
          expect(now.title).toBe(book.title);
          expect(now.hourlyMinor).toBe(book.hourlyMinor);
          expect(core.people.get(id)!.jobId).toBe(book.id);
          const fact = api.knows(playerId, `person:${id}:met`);
          expect(fact?.sourceId, `${id} met`).toBe(source);
        }
        // The town's counts are as they were, plus the player's own job.
        expect(heads()).toBe(headsBefore + 1);
        expect(
          coreAPI(core)
            .moduleState(JOBS_MODULE_ID)
            .table("countedSeekers")
            .rows().length,
        ).toBe(seekersBefore);
        const card = personCard(core, playerId).known;
        // On People they sit under Work, with the tie's cause worded "working together".
        for (const id of met)
          expect(card.find((k) => k.personId === id)?.groups).toContain("work");
        // Leaving the job takes them out of Work; they stay known.
        api.endJob(job.id, `test:left:${core.date}`);
        const after = personCard(core, playerId).known;
        for (const id of met) {
          const tie = after.find((k) => k.personId === id);
          expect(tie).toBeDefined();
          expect(tie!.groups).not.toContain("work");
        }
        console.log(
          `player-meets-coworkers: ${filled.length} filled in, ${met.length} met, ${core.people.size - peopleBefore} people added`,
        );
        return;
      }
      throw new Error(
        `no drawn town offered the player a job at an employer with counted staff (seed ${seed}): ${passed.join("; ")}`,
      );
    });
  },
);
