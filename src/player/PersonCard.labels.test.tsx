import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
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
    rightNow: null,
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

it("uses the recorded room for a person standing there and keeps their job and pay", () => {
  const entry = {
    ...dossier("person-other" as EntityId),
    presentNow: true,
    rightNow: "Standing in the county clerk's office with you.",
    details: [
      {
        key: "occupation",
        attribution: "record" as const,
        text: "Records clerk at the county clerk's office · $44,720 a year.",
      },
    ],
  };
  const html = renderToStaticMarkup(
    <PersonCard
      world={world}
      playerId={selfId}
      dossier={entry}
      pinned={false}
      expanded
      mode="workspace"
      presentPersonIds={[]}
      onTogglePin={() => {}}
      onOpenLink={() => {}}
      talkUnavailable={null}
    />,
  );

  expect(html).toContain(
    "Standing in the county clerk&#x27;s office with you.",
  );
  expect(html).toContain(
    "Records clerk at the county clerk&#x27;s office · $44,720 a year.",
  );
  expect(html).not.toContain("Away from your current location.");
});
