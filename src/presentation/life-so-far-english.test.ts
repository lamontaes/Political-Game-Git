import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observerSetup } from "./observer-world";
import { projectLifeSoFarEnglish } from "./life-so-far-english";
import {
  educationEnrollmentHistoryForPerson,
  organizationProfileAt,
  createStableId,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../simulation";

/** Reuse the three logged random part1 places; third is unincorporated Tab. */
const cases = [
  ["team8-opening-1-a", "2464475"],
  ["team8-opening-1-b", "1669130"],
  ["team8-opening-1-c", "1874780"],
] as const;

describe("the opening life paragraph keeps saved schooling facts", () => {
  it(
    "Dexter at56 narrates sparse saved job starts without inventing a career gap",
    { timeout: 120_000 },
    () => {
      const seed = "team8-work-56";
      const game = generateOpeningLife(
        prepareOpeningLife({ ...observerSetup(seed, "2317495"), startAge: 56 }),
      ).game!;
      const before = JSON.stringify(game.world);
      const records = workRelationshipHistoryForPerson(
        game.world,
        game.playerPersonId,
      ).filter((record) => record.organizationId);
      const starts = records.map((record) =>
        Number(record.startedAt.slice(0, 4)),
      );
      expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThan(10);
      const paragraph = projectLifeSoFarEnglish(
        game.world,
        game.playerPersonId,
      );
      const text = paragraph.sentences.join(" ");
      expect(text).toContain("Since ");
      expect(text).toContain("You started work at ");
      expect(text).not.toMatch(
        /You worked at .* from |unemployed|gap|four years/,
      );
      for (const record of records) {
        const name = organizationProfileAt(
          game.world,
          record.organizationId!,
        )?.name;
        expect(text).toContain(name!);
        expect(text).toContain(record.startedAt.slice(0, 4));
        expect(paragraph.sourceRecordIds).toContain(record.id);
      }
      expect(JSON.stringify(game.world)).toBe(before);
      expect(
        projectLifeSoFarEnglish(JSON.parse(before), game.playerPersonId),
      ).toEqual(paragraph);
      writeFileSync(
        `test-results/team8/${seed}-english.json`,
        JSON.stringify({ game, paragraph }),
      );
      process.stdout.write(
        `${JSON.stringify({ seed, placeKey: "2317495", startAge: 56, starts, text })}\n`,
      );
    },
  );
  for (const [seed, placeKey] of cases)
    it(`${seed}: ${placeKey}`, { timeout: 120_000 }, () => {
      const game = generateOpeningLife(
        prepareOpeningLife(observerSetup(seed, placeKey)),
      ).game!;
      const { world, playerPersonId } = game;
      const before = JSON.stringify(world);
      const paragraph = projectLifeSoFarEnglish(world, playerPersonId);
      const text = paragraph.sentences.join(" ");
      const schools = educationEnrollmentHistoryForPerson(
        world,
        playerPersonId,
      );
      expect(schools.length).toBeGreaterThan(1);
      for (const enrollment of schools) {
        const name = organizationProfileAt(
          world,
          enrollment.organizationId,
        )?.name;
        if (name) {
          expect(text).toContain(name);
          expect(text).toContain(enrollment.startedAt.slice(0, 4));
          expect(paragraph.sourceRecordIds).toContain(enrollment.id);
          expect(paragraph.sourceRecordIds).toContain(
            enrollment.organizationId,
          );
        }
      }
      expect(text).not.toContain("You started elementary school");
      expect(text).not.toMatch(/You worked at .* from |and have since/);
      for (const record of workRelationshipHistoryForPerson(
        world,
        playerPersonId,
      )) {
        if (record.startedAt > world.currentDate || !record.organizationId)
          continue;
        const name = organizationProfileAt(world, record.organizationId)?.name;
        if (!name) continue;
        expect(text).toContain(
          workStatusAt(world, record.id)?.status === "active"
            ? `Since ${record.startedAt.slice(0, 4)}, you've worked at ${name}.`
            : `You started work at ${name} in ${record.startedAt.slice(0, 4)}.`,
        );
        expect(paragraph.sourceRecordIds).toContain(record.id);
      }
      expect(text).not.toMatch(
        /graduated|finished high school|Population unavailable/,
      );
      expect(
        projectLifeSoFarEnglish(JSON.parse(before), playerPersonId),
      ).toEqual(paragraph);
      expect(JSON.stringify(world)).toBe(before);
      expect(
        projectLifeSoFarEnglish(
          world,
          createStableId("person", "missing-opening-person"),
        ),
      ).toEqual({
        sentences: [],
        sourceRecordIds: [],
      });
      writeFileSync(
        `test-results/team8/${seed}-english.json`,
        JSON.stringify({ game, paragraph }),
      );
      process.stdout.write(
        `${JSON.stringify({ seed, placeKey, text, schoolCount: schools.length })}\n`,
      );
      const noSchools = {
        ...world,
        history: {
          ...world.history,
          educationEnrollments: world.history.educationEnrollments.filter(
            (enrollment) => enrollment.personId !== playerPersonId,
          ),
        },
      };
      expect(
        projectLifeSoFarEnglish(noSchools, playerPersonId).sentences.join(" "),
      ).not.toContain("school at");
    });
});
