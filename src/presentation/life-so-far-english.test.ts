import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observerSetup } from "./observer-world";
import { projectLifeSoFarEnglish } from "./life-so-far-english";
import {
  educationEnrollmentHistoryForPerson,
  organizationProfileAt,
} from "../simulation";

/** Reuse the three logged random part1 places; third is unincorporated Tab. */
const cases = [
  ["team8-opening-1-a", "2464475"],
  ["team8-opening-1-b", "1669130"],
  ["team8-opening-1-c", "1874780"],
] as const;

describe("the opening life paragraph keeps saved schooling facts", () => {
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
      expect(text).not.toMatch(
        /graduated|finished high school|Population unavailable/,
      );
      expect(
        projectLifeSoFarEnglish(JSON.parse(before), playerPersonId),
      ).toEqual(paragraph);
      expect(JSON.stringify(world)).toBe(before);
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
