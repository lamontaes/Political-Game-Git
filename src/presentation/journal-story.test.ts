import { describe, expect, it } from "vitest";

import lifeStoryBank from "../../data/english/parts/life-story.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  ageOnDate,
  createPartnership,
  educationEnrollmentHistoryForPerson,
  lifePlaceByJurisdictionId,
  recordKinship,
  type EntityId,
  type World,
} from "../simulation";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { spelledCount } from "../simulation/press/story-voice";
import type { PartGradeLedger } from "./english-grades";
import { composeLifeStory } from "./journal-story";
import { projectJournalView } from "./journal-views";
import { createOpeningLifeController } from "./opening-life";
import { explicitNewGameSetup } from "./new-game-geography";

/**
 * The journal tells a life as a story (owner, via CTO 2:14 p.m. Oct 8): each
 * chapter is a period of the life, in sentences built from the life-story
 * bank's parts with this person's records filled in.
 */

const BANK_KEYS = new Set(
  (lifeStoryBank as { parts: { key: string }[] }).parts.map(
    (part) => `bank:${part.key}`,
  ),
);

const SEED = "journal-story-oct8";
const PLACE = drawRandomPlace(SEED);

function openingLife(startAge: number) {
  const setup = explicitNewGameSetup({
    placeKey: PLACE.key,
    seed: SEED,
    startAge: startAge as never,
    depth: "summarize-earlier-life",
  });
  const game = createOpeningLifeController(setup).finishTransition().game!;
  return { world: game.world, personId: game.playerPersonId };
}

const ledger = (held: readonly string[]): PartGradeLedger => ({
  schema: "english-part-grades/1",
  batches: ["batch-test"],
  parts: Object.fromEntries(
    held.map((key) => [
      key,
      { good: 0, bad: 1, fix: 0, sharedGood: 0, sharedBad: 0, sharedFix: 0 },
    ]),
  ),
});

function residenceMovedAway(world: World, personId: EntityId, to: EntityId) {
  const person = world.people[personId]!;
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        establishedFacts: person.establishedFacts.map((fact) =>
          fact.kind === "residence" ? { ...fact, jurisdictionId: to } : fact,
        ),
      },
    },
  } as World;
}

describe("the journal told as a story", () => {
  it("opens every one of the 56 places with where the person was born, from the bank", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const { world, personId } = smallWorld({
        place: state.usps,
        seed: SEED,
      });
      const birthplace = world.people[personId]!.establishedFacts.find(
        (fact) => fact.kind === "birthplace",
      )!;
      const name = lifePlaceByJurisdictionId(
        birthplace.jurisdictionId!,
      )!.displayName;
      const [first] = composeLifeStory(world, personId);
      expect(first, state.usps).toBeDefined();
      expect(first!.text, state.usps).toMatch(
        new RegExp(
          `^I was born (?:and raised )?in ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`,
        ),
      );
      for (const part of first!.parts)
        expect(BANK_KEYS.has(part), part).toBe(true);
      expect(first!.text).not.toMatch(/[{}]|\d{4}-\d{2}-\d{2}/);
    }
  });

  it("tells a generated life's schooling and work from its records, without changing the world", () => {
    const { world, personId } = openingLife(34);
    const before = JSON.stringify(world);
    const story = composeLifeStory(world, personId);
    expect(JSON.stringify(world)).toBe(before);
    expect(story.map((chapter) => chapter.key)).toEqual([
      "story:early",
      "story:adult",
    ]);
    const [early, adult] = story;
    expect(early!.heading).toMatch(/^\d{4}–\d{4}$/);
    expect(early!.text).toMatch(/^I was born /);
    // The high school the records say was finished, by its recorded name.
    const finished = educationEnrollmentHistoryForPerson(world, personId).find(
      (enrollment) =>
        enrollment.programKind === "schooling:secondary" &&
        world.history.educationEnrollmentStates.some(
          (state) =>
            state.enrollmentId === enrollment.id &&
            state.status === "completed",
        ),
    );
    if (finished) {
      expect(early!.sourceRecordIds).toContain(finished.id);
      expect(early!.text).toMatch(/I graduated from /);
    }
    expect(adult!.text).toMatch(/I went to work for /);
    for (const chapter of story)
      for (const part of chapter.parts)
        expect(BANK_KEYS.has(part), part).toBe(true);
  });

  it("gives way to another part when the owner graded one down", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const told = composeLifeStory(world, personId)[0]!;
    const used = told.parts[0]!;
    const regraded = composeLifeStory(world, personId, ledger([used]))[0]!;
    expect(regraded.parts).not.toContain(used);
    expect(regraded.text).toMatch(/^I was born /);
  });

  it("says born and raised only when the person still lives where they were born", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const elsewhere = Object.values(world.jurisdictions).find(
      (jurisdiction) =>
        jurisdiction.id !==
        world.people[personId]!.establishedFacts.find(
          (fact) => fact.kind === "birthplace",
        )!.jurisdictionId,
    )!;
    for (let held = 0; held < 2; held += 1) {
      const moved = residenceMovedAway(world, personId, elsewhere.id);
      const grades = ledger(
        held ? ["bank:life-story.birth.i-was-born-in-place"] : [],
      );
      // With the plain part held, nothing is said rather than "raised".
      expect(
        composeLifeStory(moved, personId, grades)[0]?.text ?? "",
      ).not.toMatch(/raised/);
    }
  });

  it("tells a marriage with how old the person was, from the partnership record", () => {
    const { world, personId } = smallWorld({
      place: PLACE.key,
      seed: SEED,
      people: 4,
    });
    const person = world.people[personId]!;
    expect(
      ageOnDate(person.birthDate, world.currentDate),
    ).toBeGreaterThanOrEqual(18);
    const spouseId = world.personOrder.find(
      (id) =>
        id !== personId &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    )!;
    // A small world records no one's gender; the spouse is given one, as
    // "wife" or "husband" is what the bank's speakers say.
    const withSpouse = {
      ...world,
      people: {
        ...world.people,
        [spouseId]: {
          ...world.people[spouseId]!,
          identity: { gender: "female", pronouns: "she-her" },
        },
      },
    } as World;
    const marriedOn = world.currentDate;
    const married = createPartnership(withSpouse, {
      stableKey: "test:journal-story:marriage",
      personIds: [personId, spouseId],
      startedAt: marriedOn,
      kind: "legal:marriage",
      provenance: { kind: "authored", note: "A marriage for the story test." },
    });
    const adult = composeLifeStory(married, personId).find(
      (chapter) => chapter.key === "story:adult",
    )!;
    expect(adult.text).toContain(
      "I met my wife, and we got married when I was",
    );
    expect(adult.text).toContain(
      `we got married when I was ${spelledCount(ageOnDate(person.birthDate, marriedOn), false)}.`,
    );
    expect(adult.parts).toContain("bank:life-story.when.when-i-was-age");
  });

  it("says only child only when no parent's record shows another child", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const person = world.people[personId]!;
    const byAge = world.personOrder
      .filter((id) => id !== personId)
      .map((id) => world.people[id]!)
      .sort((a, b) => a.birthDate.localeCompare(b.birthDate));
    const parent = byAge[0]!;
    const younger = byAge.find((other) => other.birthDate > person.birthDate)!;
    expect(parent.birthDate < person.birthDate && younger).toBeTruthy();
    const provenance = {
      kind: "authored" as const,
      note: "Story test family.",
    };
    const withParent = recordKinship(world, {
      stableKey: "test:journal-story:parent",
      personIds: [parent.id, personId],
      establishedAt: person.birthDate,
      kind: "lineal:parent-child",
      provenance,
    });
    const told = (w: World) =>
      composeLifeStory(w, personId)
        .map((chapter) => chapter.text)
        .join(" ");
    expect(told(withParent)).toContain("I was an only child.");
    // No sibling record: the other child is known only through the parent.
    const withSecondChild = recordKinship(withParent, {
      stableKey: "test:journal-story:second-child",
      personIds: [parent.id, younger.id],
      establishedAt: younger.birthDate,
      kind: "lineal:parent-child",
      provenance,
    });
    expect(told(withSecondChild)).not.toContain("only child");
  });

  it("leads the Chapters view, and only Chapters with no year chosen", () => {
    const { world, personId } = openingLife(34);
    const chapters = projectJournalView(world, personId, "chapters", null);
    expect(chapters.story).toEqual(composeLifeStory(world, personId));
    expect(chapters.story.length).toBeGreaterThan(0);
    expect(projectJournalView(world, personId, "years", null).story).toEqual(
      [],
    );
    expect(
      projectJournalView(world, personId, "chapters", chapters.years[0]!).story,
    ).toEqual([]);
  });
});
