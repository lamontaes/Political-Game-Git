import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { appointmentsIn, postRecord } from "./modules/executive";
import { coreAPI } from "./state";

// A town's department heads are chosen by what the records say each resident
// has done: years in the post's field, other work and schooling, each named
// by record id in the appointment's reasons. A resident with none of them
// heads a department only where nobody the appointer weighed had any.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a town's department heads are weighed by their recorded work and schooling, by record id", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "department-head-records");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    // A year of the played world: vacancies refilled along the way are read too.
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const heads = appointmentsIn(api, town).filter((row) =>
      core.people.has(row.holderId),
    );
    if (!heads.length) {
      tried.push(`${where}: no resident heads a department`);
      continue;
    }
    const lines: string[] = [];
    for (const head of heads) {
      const chosen = head.reasons.find((r) => r.candidateId === head.holderId);
      expect(
        chosen,
        `${where}: ${head.id} keeps its nominee's reasons`,
      ).toBeDefined();
      const records = chosen?.qualificationRecords ?? [];
      // Every record the reasons name is one the world holds.
      const person = core.people.get(head.holderId)!;
      for (const id of records)
        expect(
          core.work.commitments.has(id) ||
            (person.pastFacts ?? []).some((row) => row.id === id) ||
            id.startsWith(`${person.id}:profile:education`),
          `${where}: ${head.id} cites ${id}`,
        ).toBe(true);
      // Nobody without work or schooling on record is chosen over someone with it.
      if (!records.length)
        for (const other of head.reasons)
          expect(
            other.qualificationRecords ?? [],
            `${where}: ${head.id} went to ${head.holderId}, who has no record, over ${other.candidateId}`,
          ).toEqual([]);
      const record = postRecord(api, person, head.post, core.date);
      lines.push(
        `${head.post} ${head.holderId}: ${record.relatedYears.toFixed(1)} years in the field, ${record.workYears.toFixed(1)} of work, ${record.schooling ?? "no schooling record"}; cites ${records.join(", ") || "nothing"}`,
      );
    }
    console.log(`${where}:\n  ${lines.join("\n  ")}`);
    return;
  }
  throw new Error(
    `no drawn town had a resident department head: ${tried.join("; ")}`,
  );
}, 1_800_000);
