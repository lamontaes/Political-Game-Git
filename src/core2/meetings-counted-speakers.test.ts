/**
 * Public comment draws its speakers from every adult in town by the same rule
 * (how strongly they feel about the bill's question, by their civic
 * temperament), the wider population's included, read from their counted
 * record. A counted adult who stands up speaks on the record by their id and
 * stays in the counts: they are filled in when the player opens the bill
 * (two-level population; Coordinator ruling, Nov 8). A played stretch in
 * places drawn from all 56, with bounded redraws until a counted adult speaks.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billItem } from "../bench/office";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { isDemoted } from "./counted-groups";
import { advanceCore } from "./life";
import { countedDemotions } from "./modules/counted-demotion";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { residentsRuntime } from "./modules/residents";
import { countedRecordOnly, MEETINGS_MODULE_ID } from "./modules/meetings";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const PLACES = 6;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  "a counted adult who feels strongly speaks at public comment on the record and is filled in only when the player opens the bill",
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
          billId: string;
          personId: string;
          kind: string;
        }[];
      let date = makeIsoDate(core.date);
      const end = addDays(date, 120);
      let spoke: { id: string; billId: string; personId: string } | undefined;
      while (date < end && !spoke) {
        date = addDays(date, 1);
        advanceCore(core, date);
        spoke = remarks().find(
          (r) => r.kind === "public-comment" && !core.people.has(r.personId),
        );
      }
      if (!spoke) {
        tried.push(`${where}: no counted adult spoke in 120 days`);
        continue;
      }
      // On the record by id, still in the counts: no full person was made to speak.
      expect(countedRecordOnly(core, spoke.personId), where).toBe(true);
      expect(core.people.has(spoke.personId), where).toBe(false);
      // The player opens the bill: the speaker is met, filled in, named.
      const bill = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(spoke.billId) as unknown as BillRow;
      const shown = billItem(core, bill).remarks;
      expect(core.people.get(spoke.personId)?.alive, where).toBe(true);
      const person = core.people.get(spoke.personId)!;
      expect(
        shown.some(
          (r) => r.name === `${person.givenName} ${person.familyName}`,
        ),
        `${where}: ${spoke.id} named on the bill`,
      ).toBe(true);
      process.stdout.write(
        `COUNTED SPEAKERS ${where}: ${spoke.personId} spoke at ${spoke.id} from the counts and was filled in as ${person.givenName} ${person.familyName} when the bill was opened\n`,
      );
      return;
    }
    throw new Error(
      `no counted adult spoke at public comment in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
  },
  PLACES * 300_000,
);

it(
  "a resident returned to the counts is still a counted record: eligible to stand up at public comment",
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
