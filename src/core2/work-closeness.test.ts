/**
 * People who work the same hours at one employer grow closer while they do
 * (pool item people-shared-time-grows-ties). Pinned to Iron Station, North
 * Carolina (3733820), world seed 7de26d9d…757f665b, where an employer with
 * counted staff offers the player a job: the hire meets the coworkers, then a
 * year of shared shifts leaves each of them closer than the half-life alone
 * would; when the player quits, the tie to those coworkers is no longer
 * credited and fades.
 *
 * The run is the game's own days: about 40 s to build the world and the
 * weeks until the offer, then a year and half a year of play. No draws.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween, currentCloseness } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { pairKey } from "./kernel/ids";
import { advanceCore } from "./life";
import { knownAmong } from "./encounters";
import { creditWorkTime } from "./work-closeness";
import { acceptJobOffer, jobOffersFor, quitJob } from "./modules/jobs";
import { countedJobsOf } from "./residents-economy";
import { coreAPI } from "./state";

const PLACE = "3733820";
const SEED = "7de26d9df714e65991fe47720de84072757f665b";

it("known coworkers grow closer from shared shifts and the tie fades once the player leaves (Iron Station, NC)", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
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
  )!;
  expect(offer, "an offer from an employer with counted staff").toBeDefined();
  expect(acceptJobOffer(api, offer.id)).toBe(true);
  const hired = core.date;
  const org = offer.organizationId;
  const player = core.people.get(playerId)!;
  const mates = [...player.knownIds].filter((id) => {
    const q = core.people.get(id);
    return q?.jobId && core.jobs.get(q.jobId)?.organizationId === org;
  });
  expect(mates.length, "coworkers met at the hire").toBeGreaterThan(0);
  const atHire = new Map(
    mates.map((id) => {
      const row = core.relationships.get(pairKey(playerId, id))!;
      return [
        id,
        {
          level: row.level,
          lastContactDate: row.lastContactDate,
          kind: row.kind,
        },
      ] as const;
    }),
  );

  advanceCore(core, addDays(makeIsoDate(hired), 365));
  const lines: string[] = [];
  let grew = 0;
  for (const id of mates) {
    const before = atHire.get(id)!;
    const worked = closenessBetween(core, playerId, id);
    const faded = currentCloseness(core, before);
    // Still working there: shared shifts keep the tie above what fading alone leaves.
    const still = core.jobs.get(core.people.get(id)!.jobId ?? "");
    if (still?.organizationId === org && still.endsAt === undefined) {
      expect(worked, `${id} a year on`).toBeGreaterThan(faded);
      grew += 1;
    }
    lines.push(
      `${id} ${before.level.toFixed(3)} -> ${worked.toFixed(3)} (fading alone ${faded.toFixed(3)})`,
    );
  }
  expect(grew, "coworkers still at the employer").toBeGreaterThan(0);

  // One more week of shared shifts adds to the tie; once the player has left
  // the same call credits nothing, so the old tie only fades.
  const staff = () => knownAmong(api, 39);
  const week = () => creditWorkTime(api, core.date, staff);
  const still = mates.filter((id) => {
    const job = core.jobs.get(core.people.get(id)!.jobId ?? "");
    return job?.organizationId === org && job.endsAt === undefined;
  });
  const prior = new Map(
    still.map((id) => [id, closenessBetween(core, playerId, id)]),
  );
  week();
  expect(
    still.some((id) => closenessBetween(core, playerId, id) > prior.get(id)!),
    "a week of shared shifts adds closeness",
  ).toBe(true);
  expect(quitJob(api, playerId).left).toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const gone = new Map(
    still.map((id) => [id, closenessBetween(core, playerId, id)]),
  );
  week();
  for (const id of still)
    expect(closenessBetween(core, playerId, id), `${id} after leaving`).toBe(
      gone.get(id),
    );
  process.stdout.write(`WORK-CLOSENESS ${PLACE}: ${lines.join("; ")}\n`);
}, 900_000);
