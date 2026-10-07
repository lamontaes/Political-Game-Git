import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EntityId, World } from "../simulation/types";
import type { PersonDossier } from "../presentation/person-dossier";

vi.mock("../presentation/relationship-web", () => ({
  projectRelationshipWeb: () => ({ nodes: [], edges: [] }),
  neighborsOf: () => [],
  otherPersonId: () => null,
  EDGE_KIND_LABELS: {},
}));
vi.mock("../presentation/person-contact", () => ({
  projectPersonContact: () =>
    Object.fromEntries(
      ["talk", "travel", "meet", "contact"].map((key) => [
        key,
        { available: false, reason: "No recorded route." },
      ]),
    ),
}));
vi.mock("../presentation/person-dossier", () => ({ labelForRef: () => null }));
vi.mock("../presentation/learned-traits", () => ({
  learnedTraits: () => [],
  strongestLearnedTraits: () => [],
}));
vi.mock("../presentation/person-card-english", () => ({
  CARD_TRAIT_LIMIT: 3,
  howYouKnowLine: () => "your colleague",
  learnedTraitWhere: () => "",
  observedTraitsSentence: () => null,
}));
vi.mock("./ShellPinRail", () => ({ pinKindLabel: () => "" }));
vi.mock("./controls/PinToggle", () => ({ PinToggle: () => null }));
vi.mock("./PersonPortrait", () => ({
  PersonPortrait: ({ personId }: { personId: string }) => (
    <span data-portrait-person={personId} />
  ),
}));
vi.mock("./SavedPersonFigure", () => ({
  SavedPersonFigure: ({ personId }: { personId: string }) => (
    <span data-figure-person={personId} />
  ),
}));
import { PersonCard } from "./PersonCard";

const selfId = "person-self" as EntityId;
const world = {
  currentDate: "2026-10-04",
  currentMoment: { date: "2026-10-04", minuteOfDay: 600 },
  actionSequence: 7,
  control: { kind: "person", personId: "person-self" },
  people: {},
  history: { relationshipKnowledge: [{ id: "existing-knowledge" }] },
} as unknown as World;
function dossier(personId: EntityId = selfId): PersonDossier {
  return {
    personId,
    name: "Alex Morgan",
    shortName: "Alex",
    relationship: null,
    relationshipBasis: "existing record",
    howYouKnowThem: null,
    appearance: null,
    sharedHistory: [],
    publicCareer: [],
    age: 27,
    presentNow: false,
    presentRoom: null,
    reminders: [],
    details: [
      {
        key: "record-fact",
        attribution: "record",
        text: "Recorded office fact.",
      },
      {
        key: "reported-fact",
        attribution: "reported",
        text: "Reported by the recorded source.",
      },
      { key: "known-fact", attribution: "known", text: "A fact you learned." },
      {
        key: "existing-prose",
        attribution: "known",
        text: "On the record together.",
      },
    ],
    lastInteraction: "This is you.",
    standing: null,
    strain: null,
    links: [],
    laws: [],
  };
}
const render = (entry: PersonDossier, expanded = true) =>
  renderToStaticMarkup(
    <PersonCard
      world={world}
      playerId={selfId}
      dossier={entry}
      pinned={false}
      expanded={expanded}
      mode="workspace"
      onTogglePin={() => {}}
      onOpenLink={() => {}}
      talkUnavailable={null}
      onFullRecord={() => {}}
    />,
  );

const renderAnchored = (entry: PersonDossier) =>
  renderToStaticMarkup(
    <PersonCard
      world={world}
      playerId={selfId}
      dossier={entry}
      pinned={false}
      expanded
      mode="overlay"
      anchor={{ left: 100, top: 100, width: 40, height: 120 }}
      presentPersonIds={[]}
      onTogglePin={() => {}}
      onOpenLink={() => {}}
      talkUnavailable={null}
    />,
  );

it("removes only the standalone record attribution label, retaining all facts and attribution data", () => {
  const entry = dossier();
  const before = JSON.stringify({ world, entry });
  const html = render(entry);
  expect(html).not.toContain('class="pg-fact-attribution">On the record');
  expect(html).toContain('class="pg-fact-attribution">Reported');
  for (const fact of entry.details) expect(html).toContain(fact.text);
  for (const attribution of ["record", "reported", "known"])
    expect(html).toContain(`data-attribution="${attribution}"`);
  expect(html).toContain('data-person-id="person-self"');
  expect(html).toContain('data-portrait-person="person-self"');
  expect(html).toContain('data-figure-person="person-self"');
  expect(JSON.stringify({ world, entry })).toBe(before);
});

it("omits the self-only You badge in compact and expanded cards without deleting ordinary prose", () => {
  for (const expanded of [false, true]) {
    const html = render(dossier(), expanded);
    expect(html).not.toContain('data-testid="dossier-relation"');
    expect(html).toContain("This is you.");
    expect(html).toContain("Your record and appearance");
  }
});

it("retains another person's recorded relationship and makes no time or knowledge changes", () => {
  const entry = dossier("person-other" as EntityId);
  const before = JSON.stringify({ world, entry });
  const html = render(entry);
  expect(html).toContain('data-testid="dossier-relation"');
  expect(html).toContain("Your colleague");
  expect(html).toContain('data-person-id="person-other"');
  expect(JSON.stringify({ world, entry })).toBe(before);
});

it("recognizes a person whose card was opened from their figure as present in the room", () => {
  const entry = {
    ...dossier("person-other" as EntityId),
    presentRoom: "The room's own name",
  };
  const before = JSON.stringify({ world, entry });
  const html = renderAnchored(entry);

  expect(html).toContain('data-testid="person-card-present"');
  expect(html).toContain("Present");
  expect(html).toContain(
    '<span data-testid="person-card-present-room">The room&#x27;s own name</span>',
  );
  expect(html).not.toContain("Here in the room with you.");
  expect(html).not.toContain("Away from your current location.");
  expect(html).toContain("Recorded office fact.");
  expect(JSON.stringify({ world, entry })).toBe(before);
});

it("prints a refusal to talk once, not twice, on the card", () => {
  const refusal = "Nobody is being played, so nothing can be done.";
  const html = renderToStaticMarkup(
    <PersonCard
      world={world}
      playerId={selfId}
      dossier={dossier()}
      pinned={false}
      expanded
      mode="workspace"
      onTogglePin={() => {}}
      onOpenLink={() => {}}
      talkUnavailable={refusal}
      onFullRecord={() => {}}
    />,
  );
  expect(html.split(refusal).length - 1).toBe(1);
  expect(html).toContain('data-testid="dossier-talk-unavailable"');
});

describe("the personal screens carry no authored sentence", () => {
  it.each([
    "PersonCard.tsx",
    "PersonalGoalsPanel.tsx",
    "PersonalRoutinePanel.tsx",
  ])("%s has no sentence literal or helper paragraph", (file) => {
    const text = readFileSync(join(__dirname, file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{25,}/g) ?? []).toEqual([]);
  });
});

it("renders the talk refusal and the first-contact line as trace fields, not text", () => {
  const text = readFileSync(join(__dirname, "PersonCard.tsx"), "utf8");
  expect(text).toContain("data-reason={talkUnavailable}");
  expect(text).toContain("dossier.neverSpoken");
});

it("keeps no hidden screen-reader sentence on the card", () => {
  const text = readFileSync(join(__dirname, "PersonCard.tsx"), "utf8");
  expect(text.match(/className="sr-only"[^>]*>\s*\{/g) ?? []).toEqual([]);
  expect(text).not.toMatch(/aria-describedby=\{`person-\w+-reason-/);
});
