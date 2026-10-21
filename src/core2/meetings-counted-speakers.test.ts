/**
 * Pool item people-drives-counted-speech-and-shared-causes: public comment
 * draws its speakers from every adult in town by the same rule (how strongly
 * they feel about the bill's question, by their civic temperament), the
 * wider population's included, read from their counted record. A counted
 * adult who stands up is filled in before speaking, hears the room, and can
 * take up a cause from it. A played year in places drawn from all 56, with
 * bounded redraws until one does.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { drivesReport } from "./modules/drives";
import { MEETINGS_MODULE_ID } from "./modules/meetings";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const PLACES = 4;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  "a counted adult who feels strongly stands up at public comment, is filled in and takes up a cause from the room",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "meetings-counted-speakers",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const remarks = () =>
        api
          .moduleState(MEETINGS_MODULE_ID)
          .table("remarks")
          .rows() as unknown as {
          id: string;
          personId: string;
          kind: string;
        }[];
      const seen = new Set(remarks().map((r) => r.id));
      // Speakers who were still counted the day before they spoke.
      const wereCounted = new Map<string, string>();
      let date = makeIsoDate(core.date);
      const end = addDays(date, 365);
      while (date < end) {
        const full = new Set(core.people.keys());
        date = addDays(date, 1);
        advanceCore(core, date);
        for (const r of remarks()) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          if (r.kind === "public-comment" && !full.has(r.personId))
            wereCounted.set(r.personId, r.id);
        }
      }
      const fromRoom = (
        drivesReport(core as CoreState).drives as {
          id: string;
          personId: string;
          formations: { eventId?: string }[];
        }[]
      ).filter(
        (drive) =>
          wereCounted.has(drive.personId) &&
          drive.formations.some((f) => f.eventId?.startsWith("speech:remark:")),
      );
      tried.push(
        `${where}: ${wereCounted.size} speakers were counted, ${fromRoom.length} causes from the room`,
      );
      for (const [personId, remarkId] of wereCounted) {
        // Filled in: a named person, alive, in town, on the public record.
        expect(core.people.get(personId)?.alive, `${where}: ${remarkId}`).toBe(
          true,
        );
      }
      if (!fromRoom.length) continue;
      const drive = fromRoom[0]!;
      process.stdout.write(
        `COUNTED SPEAKERS ${where}: ${wereCounted.size} speakers were counted; ${drive.personId} spoke at ${wereCounted.get(drive.personId)} and holds ${drive.id} from ${drive.formations.find((f) => f.eventId?.startsWith("speech:remark:"))!.eventId}; ${fromRoom.length} causes from the room\n`,
      );
      return;
    }
    throw new Error(
      `no counted speaker took up a cause from the room in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // A day-by-day played year took 463 seconds in Port Wentworth, Georgia on a 4-core container; up to PLACES of them.
  },
  PLACES * 600_000,
);
