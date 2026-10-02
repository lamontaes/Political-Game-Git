import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { pickDistinct, SeededRng } from "../simulation/rng";
import { recordWorldEvent } from "../simulation/world";
import { makeIsoDate } from "../simulation/dates";
import { serializeWorld, deserializeWorld } from "../simulation";
import { recordKinship } from "../simulation/life";
import { describePersonContext } from "../simulation/person-context";
import { personName } from "../simulation/people";
import { projectJournalStory } from "./journal-story";

const SEED = "journal-story-recorded-paragraphs";
const [place] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
function fixture() {
  return smallWorld({ place: place!.jurisdictionKey, seed: SEED });
}
function event(
  small: ReturnType<typeof fixture>,
  key: string,
  at: string,
  summary: string,
) {
  return recordWorldEvent(small.world, {
    stableKey: key,
    type: "personal.recorded-action",
    occurredAt: makeIsoDate(at),
    recordedAt: makeIsoDate(at),
    jurisdictionId: small.jurisdictionId,
    involvedEntityIds: [small.personId],
    participants: [
      { personId: small.personId, role: "agency:actor", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe(`Journal story (${place!.name}, seed ${SEED})`, () => {
  it("connects saved actions into first-person paragraphs without year headings or invented causes", () => {
    const small = fixture();
    const at = small.world.currentDate;
    const first = event(small, "first", at, "You repaired a chair.");
    const world = event(
      { ...small, world: first },
      "second",
      at,
      "You gave the chair to a neighbor.",
    );
    const before = serializeWorld(world);
    const story = projectJournalStory(world, small.personId);
    const current = story.find((chapter) => chapter.key === "this-year")!;
    expect(current.heading).toBe("This year");
    expect(
      current.paragraphs.some((paragraph) =>
        paragraph.text.includes(
          "I repaired a chair, and gave the chair to a neighbor.",
        ),
      ),
      JSON.stringify(current.paragraphs),
    ).toBe(true);
    const prose = story
      .flatMap((chapter) =>
        chapter.paragraphs.map((paragraph) => paragraph.text),
      )
      .join(" ");
    expect(prose).not.toMatch(
      /\bYou\b|because|As I heard it|more like it|felt proud/,
    );
    expect(story.every((chapter) => !/\d{4}|At \d/.test(chapter.heading))).toBe(
      true,
    );
    expect(serializeWorld(world)).toBe(before);
    expect(
      projectJournalStory(deserializeWorld(before), small.personId),
    ).toEqual(story);
  });
  it("omits engine descriptions and preserves separate dated occurrences of the same action", () => {
    const small = fixture();
    const year = small.world.currentDate.slice(0, 4);
    let world = event(
      small,
      "earlier",
      `${year}-01-01`,
      "You repaired a chair.",
    );
    world = event(
      { ...small, world },
      "later",
      `${year}-01-02`,
      "You repaired a chair.",
    );
    world = event(
      { ...small, world },
      "engine",
      `${year}-01-03`,
      "Your work schedule has no shift today.",
    );
    const story = projectJournalStory(world, small.personId);
    const sources = story.flatMap((chapter) =>
      chapter.paragraphs.flatMap((paragraph) =>
        paragraph.entries.map((entry) => entry.sourceId),
      ),
    );
    expect(sources).toContain(
      world.history.events.find((row) => row.stableKey === "earlier")!.id,
    );
    expect(sources).toContain(
      world.history.events.find((row) => row.stableKey === "later")!.id,
    );
    expect(sources).not.toContain(
      world.history.events.find((row) => row.stableKey === "engine")!.id,
    );
  });
});

it("introduces a saved sibling on first mention and retains its event sources", () => {
  const small = fixture();
  const siblingId = small.world.personOrder.find(
    (id) => id !== small.personId,
  )!;
  let world = recordKinship(small.world, {
    stableKey: `${SEED}:journal-sibling`,
    personIds: [small.personId, siblingId],
    establishedAt: small.world.currentDate,
    kind: "collateral:sibling",
    provenance: { kind: "authored", note: "Canonical test fixture sibling." },
  });
  const kinship = world.history.kinshipRelationships.find(
    (row) => row.stableKey === `${SEED}:journal-sibling`,
  )!;
  const siblingName = personName(world.people[siblingId]!);
  for (const [key, verb] of [
    ["first", "visited"],
    ["second", "called"],
  ] as const) {
    world = recordWorldEvent(world, {
      stableKey: `${SEED}:sibling-${key}`,
      type: "personal.recorded-action",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: small.jurisdictionId,
      involvedEntityIds: [small.personId, siblingId],
      participants: [
        { personId: small.personId, role: "agency:actor", detail: null },
        { personId: siblingId, role: "presence:person", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: `You ${verb} ${siblingName}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  const context = describePersonContext(
    world,
    small.personId,
    siblingId,
    world.currentDate,
  )!;
  expect(context.relationship).toBeTruthy();
  const relation = context.relationship!.replace(/^your /, "my ");
  const paragraphs = projectJournalStory(world, small.personId).flatMap(
    (chapter) => chapter.paragraphs,
  );
  const prose = paragraphs.map((paragraph) => paragraph.text).join(" ");
  expect(prose.split(relation).length - 1).toBe(1);
  expect(prose).toContain(context.shortName);
  for (const key of ["first", "second"]) {
    const id = world.history.events.find(
      (row) => row.stableKey === `${SEED}:sibling-${key}`,
    )!.id;
    expect(
      paragraphs.flatMap((paragraph) =>
        paragraph.entries.map((entry) => entry.sourceId),
      ),
    ).toContain(id);
  }
  // Exact family source is kinship.id; context.anchors identifies it.
  expect(kinship.personIds).toContain(siblingId);
  expect(
    paragraphs.flatMap((paragraph) => paragraph.sourceRecordIds),
  ).toContain(kinship.id);
});

it("keeps birthplace provenance when combining the generated birth facts", () => {
  const small = fixture();
  const person = small.world.people[small.personId]!;
  const birthplace = person.establishedFacts.find(
    (fact) => fact.kind === "birthplace",
  )!;
  expect(birthplace).toBeDefined();
  const paragraph = projectJournalStory(small.world, small.personId)
    .flatMap((chapter) => chapter.paragraphs)
    .find((paragraph) => paragraph.text.includes("I was born in "))!;
  expect(paragraph).toBeDefined();
  // projectWorld39Journal birth row sourceId is person.id; birthplace is fact.id.
  expect(paragraph.entries.map((entry) => entry.sourceId)).toContain(person.id);
  expect(paragraph.entries.map((entry) => entry.sourceId)).toContain(
    birthplace.id,
  );
});
