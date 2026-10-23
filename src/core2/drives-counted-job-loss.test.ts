/**
 * Pool item people-drives-counted-job-loss-causes: a counted worker who loses
 * their job (laid off, or their employer closed) perceives it by the same
 * rule as a named worker (drives.ts `respond`): the same roles, trait-led
 * perception, appraisal and shared chooser, read from their counted record.
 * A cause they take up is kept for them while they are counted and is theirs
 * when they are filled in. A played year in places drawn from all 56, with
 * bounded redraws until a counted worker forms one.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedDrivesHeld, drivesReport } from "./modules/drives";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const PLACES = 4;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LOSS = new Set(["work.job-lost", "organization.closed"]);

it(
  "a counted worker who loses their job takes up a cause by the named rule, and keeps it when filled in",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "drives-counted-job-loss",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const report = drivesReport(core as CoreState);
      // Every counted perception of a job loss was scored by the shared rule.
      const countedTraces = report.decisions.filter(
        (t) => t.counted && LOSS.has(t.eventKind),
      );
      for (const trace of countedTraces) {
        expect(trace.role, where).toBe("subject");
        expect(trace.considered.length, where).toBeGreaterThan(0);
        expect(trace.chosen, where).toBeTruthy();
      }
      // Bereavement is also counted now; this case requires a cause from a job loss.
      const held = countedDrivesHeld(api).filter((row) =>
        /^(event:work\.job-lost:|employer-closed:)/.test(row.sourceEventId),
      );
      tried.push(
        `${where}: ${countedTraces.length} counted perceptions, ${held.length} causes held`,
      );
      if (!held.length) continue;
      const changes = api
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .rows() as unknown as { id: string; kind: string; personId: string }[];
      const drive = held[0]!;
      // The cause came from the job they lost, by its record.
      expect(
        changes.some(
          (row) =>
            row.personId === drive.personId &&
            (row.kind === "layoff" || row.kind === "closure"),
        ),
        `${where}: ${drive.personId} lost a job (${drive.sourceEventId})`,
      ).toBe(true);
      expect(drive.sourceEventId, where).toMatch(
        /^(event:work\.job-lost:|employer-closed:)/,
      );
      expect(drive.strength, where).toBeGreaterThan(0);
      expect(
        Object.values(report.countedFormedByYearKind).reduce(
          (a, b) => a + b,
          0,
        ),
        where,
      ).toBeGreaterThanOrEqual(held.length);
      // Filled in, the person holds the same drive and the goal it gives.
      const person = fillInPerson(core as CoreState, drive.personId);
      expect(person.drives.get(drive.driveId)?.sourceEventId, where).toBe(
        drive.sourceEventId,
      );
      expect(
        [...person.goals.values()].some(
          (goal) => goal.sourceDriveId === drive.driveId,
        ),
        where,
      ).toBe(true);
      expect(
        countedDrivesHeld(api).some((row) => row.personId === drive.personId),
        where,
      ).toBe(false);
      process.stdout.write(
        `COUNTED CAUSE ${where}: ${drive.personId} holds ${drive.driveId} from ${drive.sourceEventId} at ${drive.strength.toFixed(3)}; ${held.length} held, ${countedTraces.length} counted perceptions\n`,
      );
      return;
    }
    throw new Error(
      `no counted worker formed a cause from a job loss in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // A drawn place's played year took about 4 minutes on a 4-core container; up to PLACES of them.
  },
  PLACES * 400_000,
);
