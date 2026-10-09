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
import { composeLifeStory, composeStoryChapter } from "./journal-story";
import type { StoryChapterPacket, StoryMoment } from "./story-chapter-packet";
import { projectJournalView } from "./journal-views";
import { placeFor, rng } from "../../scripts/playtest/mass-play/driver";
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

  it("tells only the work a parent did while raising the person", () => {
    // The batch 1 life in West Jordan, Utah (seed p3-batch1a-oct8, world 0):
    // the mother's only job began in 2016, after the player turned 18.
    const states = lifePlaceStateIdentities();
    const random = rng("p3-batch1a-oct8:0");
    let place: ReturnType<typeof placeFor> = null;
    while (!place)
      place = placeFor(
        states[Math.floor(random() * states.length)]!.usps,
        random,
      );
    const setup = explicitNewGameSetup({
      placeKey: place.key,
      seed: "p3-batch1a-oct8-0",
      startAge: 28 as never,
      depth: "summarize-earlier-life",
    });
    const { world, playerPersonId: personId } =
      createOpeningLifeController(setup).finishTransition().game!;
    const person = world.people[personId]!;
    const grownUp = `${Number(person.birthDate.slice(0, 4)) + 18}${person.birthDate.slice(4)}`;
    const story = composeLifeStory(world, personId);
    const told = new Set(story.flatMap((chapter) => chapter.sourceRecordIds));
    const parentJobs = world.history.workRelationships.filter(
      (job) => job.personId !== personId && told.has(job.id),
    );
    for (const job of parentJobs) expect(job.startedAt < grownUp).toBe(true);
    expect(story[0]!.text).not.toMatch(/\bmother was\b/);
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

/**
 * The turns that make the facts a story (owner, via CTO 4:30 p.m. Oct 8): each
 * told from a chapter packet, so each case states the facts it rests on.
 */
describe("the story's turns", () => {
  const moment = (
    key: string,
    kind: StoryMoment["kind"],
    date: string,
    age: number,
    facts: Record<string, string>,
    extra: Partial<StoryMoment> = {},
  ): StoryMoment =>
    ({
      key,
      kind,
      date,
      age,
      facts,
      causeKey: null,
      feeling: null,
      sourceRecordIds: [],
      ...extra,
    }) as StoryMoment;
  const packet = (
    moments: readonly StoryMoment[],
    over: Partial<StoryChapterPacket> = {},
  ): StoryChapterPacket =>
    ({
      key: "story:test",
      personId: "person:story-test",
      place: { name: PLACE.displayName, jurisdictionId: "jurisdiction:test" },
      bornHere: false,
      raisedHere: false,
      from: "2000-06-01",
      through: "2026-01-05",
      ageFrom: 18,
      ageThrough: 44,
      current: true,
      narratorAgeNow: 44,
      quiet: false,
      raisedBy: [],
      siblings: null,
      people: [],
      moments,
      texture: { smallTown: null, temperament: [] },
      sourceRecordIds: [],
      ...over,
    }) as StoryChapterPacket;
  const jobs = (years: number) => [
    moment("work:a", "work-started", "2001-03-01", 19, { employer: "Acme" }),
    moment("work:b", "work-started", `${2001 + years}-03-01`, 19 + years, {
      employer: "Baker Freight",
    }),
  ];

  it("turns from one event to the next by date, eventually after five years", () => {
    const soon = composeStoryChapter(packet(jobs(2)))!.text;
    expect(soon).toMatch(
      /^I went to work for Acme\. (?:Then|After that,) I went to work for Baker Freight\.$/,
    );
    const later = composeStoryChapter(packet(jobs(7)))!.text;
    expect(later).toMatch(/\. Eventually, I went to work for Baker Freight\.$/);
  });

  it("says that's when only where a record names the cause", () => {
    const [first, second] = jobs(2);
    const caused = composeStoryChapter(
      packet([first!, { ...second!, causeKey: first!.key }]),
    )!;
    expect(caused.text).toContain(
      "That's when I went to work for Baker Freight.",
    );
    for (let years = 1; years <= 9; years += 1)
      expect(composeStoryChapter(packet(jobs(years)))!.text).not.toMatch(
        /That's when/,
      );
  });

  it("weighs a loss as the records say it felt, never twice the same way", () => {
    const losses = [
      moment(
        "loss:a",
        "loss",
        "2010-05-01",
        28,
        { parent: "father" },
        {
          feeling: "hard",
        },
      ),
      moment(
        "loss:b",
        "loss",
        "2015-05-01",
        33,
        { parent: "mother" },
        {
          feeling: "hard",
        },
      ),
    ];
    const text = composeStoryChapter(packet(losses))!.text;
    const weighed = text.match(/It was (?:hard|tough|difficult)\./g) ?? [];
    expect(text).toMatch(/^My father died when I was 28\. It was/);
    expect(weighed).toHaveLength(2);
    expect(new Set(weighed).size).toBe(2);
    // No feeling on record: nothing is weighed.
    const unfelt = losses.map((loss) => ({ ...loss, feeling: null }));
    expect(composeStoryChapter(packet(unfelt))!.text).not.toMatch(/It was/);
  });

  it("looks back only on a stretch lived past, and only for a narrator whose temperament fits", () => {
    const contented = { smallTown: null, temperament: ["Contented"] };
    const past = composeStoryChapter(
      packet(jobs(2), { current: false, texture: contented }),
    )!;
    expect(past.text).toMatch(/ Looking back, I was lucky\.$/);
    expect(
      composeStoryChapter(
        packet(jobs(2), { current: true, texture: contented }),
      )!.text,
    ).not.toMatch(/Looking back/);
    expect(
      composeStoryChapter(packet(jobs(2), { current: false }))!.text,
    ).not.toMatch(/Looking back/);
  });

  it("turns across a chapter break only for events close together", () => {
    const school = moment("school:a", "school-finished", "2000-06-01", 18, {});
    const near = composeStoryChapter(
      packet(jobs(2).slice(0, 1)),
      undefined,
      school,
    )!;
    expect(near.text).toMatch(
      /^(?:Then|After that,) I went to work for Acme\.$/,
    );
    const far = composeStoryChapter(
      packet([
        moment("work:c", "work-started", "2009-03-01", 27, {
          employer: "Acme",
        }),
      ]),
      undefined,
      school,
    )!;
    expect(far.text).toBe("I went to work for Acme.");
  });

  it(
    "weighs a parent's death in a generated life, told from its records",
    { timeout: 180_000 },
    () => {
      // A generated life in a place drawn from all 56 (seed story-probe-4):
      // both parents' deaths are on record, in the adult chapter.
      const states = lifePlaceStateIdentities();
      const random = rng("story-probe:4");
      let place: ReturnType<typeof placeFor> = null;
      while (!place)
        place = placeFor(
          states[Math.floor(random() * states.length)]!.usps,
          random,
        );
      const setup = explicitNewGameSetup({
        placeKey: place.key,
        seed: "story-probe-4",
        startAge: 66 as never,
        depth: "summarize-earlier-life",
      });
      const { world, playerPersonId } =
        createOpeningLifeController(setup).finishTransition().game!;
      const adult = composeLifeStory(world, playerPersonId).find(
        (chapter) => chapter.key === "story:adult",
      )!;
      expect(adult.text, place.displayName).toMatch(
        /My (?:father|mother) died when I was (?:[a-z-]+|\d+)\. It was (?:hard|tough|difficult)\./,
      );
      const deaths = world.history.personDeaths.filter((death) =>
        adult.sourceRecordIds.includes(death.id),
      );
      expect(deaths.length).toBeGreaterThan(0);
    },
  );
});
