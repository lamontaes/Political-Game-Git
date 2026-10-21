/**
 * Pool item people-drives-counted-illness-causes: when someone in the wider
 * population falls seriously ill, they and the household they live with
 * perceive it by the same serious-illness rule as named people (drives.ts
 * `respond`, the same roles, channels and responses), read from their counted
 * records: the ill person as its subject, the others as family or household.
 * A cause any of them takes up from it is theirs when they are filled in. A
 * played year in places drawn from all 56, with bounded redraws until an
 * illness is perceived.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { DEFAULT_HEALTH_DATA } from "./modules/health";
import { countedDrivesHeld, drivesReport } from "./modules/drives";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const PLACES = 4;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const KIND = DEFAULT_HEALTH_DATA.countedOnsetEventKind;

it(
  "a counted person who falls seriously ill, and their household, perceive it by the named rule",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "drives-counted-illness",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const perceptions = drivesReport(core as CoreState).decisions.filter(
        (t) => t.counted && t.eventKind === KIND,
      );
      tried.push(`${where}: ${perceptions.length} counted perceptions`);
      if (!perceptions.length) continue;
      let subjects = 0;
      for (const trace of perceptions) {
        const ill = trace.event.facts?.["counted-subject"];
        expect(trace.chosen, where).toBeTruthy();
        expect(trace.considered.length, where).toBeGreaterThan(0);
        if (trace.personId === ill) {
          // The ill person perceives it as its subject.
          expect(trace.role, where).toBe("subject");
          subjects += 1;
        } else {
          // Their household, named by the event, as family or household.
          expect(["family", "household"], where).toContain(trace.role);
          expect(
            JSON.parse(trace.event.facts?.["counted-perceivers"] ?? "[]"),
            where,
          ).toContain(trace.personId);
        }
      }
      expect(
        subjects,
        `${where}: the ill perceive their own illness`,
      ).toBeGreaterThan(0);
      // A cause taken up from it is theirs once they are filled in.
      const held = countedDrivesHeld(api).filter((row) =>
        row.sourceEventId.startsWith(`event:${KIND}:`),
      );
      for (const drive of held.slice(0, 1)) {
        const person = fillInPerson(core as CoreState, drive.personId);
        expect(person.drives.get(drive.driveId)?.sourceEventId, where).toBe(
          drive.sourceEventId,
        );
      }
      const chosen: Record<string, number> = {};
      for (const t of perceptions)
        chosen[t.chosen.responseId] = (chosen[t.chosen.responseId] ?? 0) + 1;
      process.stdout.write(
        `COUNTED ILLNESS ${where}: ${perceptions.length} perceptions (${subjects} as subject), responses ${JSON.stringify(chosen)}, ${held.length} causes; first ${perceptions[0]!.eventId}\n`,
      );
      return;
    }
    throw new Error(
      `no counted illness was perceived in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // A drawn place's played year took about 4 minutes on a 4-core container; up to PLACES of them.
  },
  PLACES * 400_000,
);
