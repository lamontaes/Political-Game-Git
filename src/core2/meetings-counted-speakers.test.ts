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
import { isDemoted } from "./counted-groups";
import { advanceCore } from "./life";
import { countedDemotions } from "./modules/counted-demotion";
import { residentsRuntime } from "./modules/residents";
import { drivesReport } from "./modules/drives";
import { countedRecordOnly, MEETINGS_MODULE_ID } from "./modules/meetings";
import { coreAPI, fillInPerson } from "./state";
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
      // Whether each was a living named person on the day they spoke (a speaker
      // may die later in the year, which does not undo the fill-in).
      const livingWhenSpoke = new Map<string, boolean>();
      let date = makeIsoDate(core.date);
      const end = addDays(date, 365);
      while (date < end) {
        const full = new Set(core.people.keys());
        date = addDays(date, 1);
        advanceCore(core, date);
        for (const r of remarks()) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          if (r.kind === "public-comment" && !full.has(r.personId)) {
            wereCounted.set(r.personId, r.id);
            livingWhenSpoke.set(
              r.personId,
              core.people.get(r.personId)?.alive === true,
            );
          }
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
        expect(livingWhenSpoke.get(personId), `${where}: ${remarkId}`).toBe(
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

it(
  "a resident returned to the counts is still a counted record: eligible to stand up at public comment and filled in before speaking",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:demoted:${n}`).digest("hex"),
        "meetings-counted-speakers-demoted",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core as CoreState;
      const api = coreAPI(core);
      const rt = residentsRuntime(core)!;
      const player = core.playerId ? core.people.get(core.playerId) : undefined;
      const circle = new Set([
        ...(player?.familyIds ?? []),
        ...(player?.knownIds ?? []),
      ]);
      // A few counted households nobody in the player's circle belongs to,
      // met and then left alone, return to the counts.
      const met = [...rt.households.values()]
        .filter((row) => row.people.every((p) => !circle.has(p.id)))
        .slice(0, 4);
      for (const row of met) fillInPerson(core, row.people[0]!.id);
      advanceCore(core, addDays(makeIsoDate(core.date), 300));
      const demoted = countedDemotions(api)
        .flatMap((row) => row.personIds)
        .map((id) => core.people.get(id))
        .filter((row) => row && isDemoted(row) && row.alive);
      if (!demoted.length) {
        tried.push(`${where}: nobody was returned to the counts`);
        continue;
      }
      for (const person of demoted)
        expect(
          countedRecordOnly(core, person!.id),
          `${where}: ${person!.id} returned to the counts`,
        ).toBe(true);
      // A named person who was not returned is not a counted record.
      const named = [...core.people.values()].find(
        (row) => row.alive && !isDemoted(row),
      )!;
      expect(countedRecordOnly(core, named.id), `${where}: ${named.id}`).toBe(
        false,
      );
      // Someone who never had a full record is.
      expect(countedRecordOnly(core, "person_never_filled_in"), where).toBe(
        true,
      );
      process.stdout.write(
        `COUNTED RECORDS ${where}: ${demoted.length} returned to the counts (e.g. ${demoted[0]!.id}) count as counted records; ${named.id} does not\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place returned anyone to the counts in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
  },
  PLACES * 600_000,
);
