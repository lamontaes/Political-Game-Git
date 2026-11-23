import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween, feelingBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { drivesReport } from "./modules/drives";
import { coreAPI } from "./state";

// Votes, endorsements, leadership and recalls read feelingBetween: closeness
// less the holder's grudge. Before, they read closeness alone, which never
// goes below zero, so a person laid off by someone they knew still rated them
// as warmly as a stranger. The grudge here comes from a layoff on record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "feeling-read");

it(`a grudge from a layoff on record lowers the holder's feeling below their closeness in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const api = coreAPI(core);
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 25,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const organizationId = [...core.organizations.keys()].sort()[0]!;
  const decider = adults[0]!.id;
  let holder: string | undefined;
  for (const worker of adults.slice(1)) {
    api.emit({
      id: `event:work.job-lost:${core.date}:${worker.id}`,
      date: core.date,
      kind: "work.job-lost",
      personIds: [worker.id],
      placeId: worker.placeId,
      publicRecord: false,
      topic: organizationId,
      facts: { decidedBy: decider, organizationId },
      source: { tag: "SOURCED", citation: "Test layoff.", asOf: core.date },
    });
    const drive = drivesReport(core).drives.find(
      (r) =>
        r.personId === worker.id &&
        r.kind === "grudge" &&
        r.targetId === decider,
    );
    if (drive) {
      holder = worker.id;
      break;
    }
  }
  expect(holder, `${where}: someone held a grudge`).toBeDefined();
  const close = closenessBetween(core, holder as never, decider as never);
  const feel = feelingBetween(core, holder as never, decider as never);
  expect(feel, where).toBeLessThan(close);
  // The grudge is the holder's: the decider's feeling for them is untouched.
  expect(feelingBetween(core, decider as never, holder as never), where).toBe(
    closenessBetween(core, decider as never, holder as never),
  );
}, 600_000);
