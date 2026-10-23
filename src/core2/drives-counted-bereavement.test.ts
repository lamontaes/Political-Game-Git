/**
 * Pool item people-drives-counted-bereavement-causes: when someone in the
 * wider population dies, the household that outlives them perceives the loss
 * by the same bereavement rule as a named household (drives.ts `respond`, the
 * same roles, channels and responses), read from each survivor's counted
 * record. A cause one of them takes up is kept for them and is theirs when
 * they are filled in. A played year in places drawn from all 56, with
 * bounded redraws until a counted survivor takes one up.
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

/**
 * A death in a counted household is perceived by its survivors, and about
 * one perception in eight takes up a drive (Phoenix, Oregon: 3 of 23), so a
 * small town's two to six a year often form none (seed
 * d292a20af22f10b93be7f32e029ef070: 2, 2, 0 and 4 perceptions in four
 * places, none formed). Up to eight places are drawn.
 */
const PLACES = 8;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const KIND = DEFAULT_HEALTH_DATA.countedDeathEventKind;

it(
  "a counted household that outlives a member takes up a cause by the named bereavement rule, kept when filled in",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "drives-counted-bereavement",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      // A played year, read at each month's end: a survivor's cause can later
      // go with them when they are filled in, move away or die, so the first
      // month a counted survivor holds one is the witness.
      const start = core.date;
      let held: ReturnType<typeof countedDrivesHeld> = [];
      for (let month = 1; month <= 12 && !held.length; month++) {
        advanceCore(core, addDays(makeIsoDate(start), month * 30));
        held = countedDrivesHeld(api).filter((row) =>
          row.sourceEventId.startsWith(`event:${KIND}:`),
        );
      }
      // Every counted survivor's perception of a death is scored by the shared rule, as family or household.
      const perceptions = drivesReport(core as CoreState).decisions.filter(
        (t) => t.counted && t.eventKind === KIND,
      );
      for (const trace of perceptions) {
        expect(["family", "household"], where).toContain(trace.role);
        expect(trace.chosen, where).toBeTruthy();
        expect(trace.personId, where).not.toBe(
          trace.event.facts?.["counted-subject"],
        );
      }
      // Formed: a perception that chose a response with a drive. Formed and
      // then not held: filled in (the full person holds it) or gone from the counts.
      const formed = perceptions.filter((t) => t.driveId);
      const filledIn = formed.filter((t) => core.people.has(t.personId));
      tried.push(
        `${where}: ${perceptions.length} counted perceptions of a death (${perceptions.map((t) => t.chosen.responseId).join(", ") || "none"}), ${formed.length} formed a drive, ${filledIn.length} of them filled in since, ${held.length} held on ${core.date}`,
      );
      if (!held.length) continue;
      const drive = held[0]!;
      // The death it came from was in their household: the event lists them among those it left.
      expect(["family", "household"], where).toContain(drive.role);
      expect(
        JSON.parse(drive.sourceFacts?.["counted-perceivers"] ?? "[]"),
        `${where}: ${drive.personId} was left by ${drive.sourceEventId}`,
      ).toContain(drive.personId);
      expect(drive.strength, where).toBeGreaterThan(0);
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
      // Observe the natural cause when it exists, then complete the played year.
      const witnessedAt = core.date;
      const yearEnd = addDays(makeIsoDate(start), 365);
      advanceCore(core, yearEnd);
      expect(core.date, where).toBe(yearEnd);
      process.stdout.write(
        `COUNTED BEREAVEMENT ${where}: ${drive.personId} holds ${drive.driveId} from ${drive.sourceEventId} at ${drive.strength.toFixed(3)}; ${held.length} causes, ${perceptions.length} perceptions; witnessed ${witnessedAt}; played through ${core.date}; places tried: ${tried.join("; ")}\n`,
      );
      return;
    }
    throw new Error(
      `no counted survivor took up a cause from a death in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // Four drawn years took 492 seconds on a 4-core container (about 2
    // minutes each, up to 4 in a larger town); up to PLACES of them.
  },
  PLACES * 300_000,
);
