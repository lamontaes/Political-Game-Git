import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createWorld,
  createDemoWorld,
  deserializeWorld,
  makeIsoDate,
  recordWorldEvent,
  serializeWorld,
  type World,
} from "../simulation";
import { ObserverRecordWorkspace } from "../player/ObserverWorkspace";
import { projectObserverRecord } from "./observer-world";
import {
  observerElectionSummaries,
  observerElectionSummaryPage,
} from "./observer-election-summaries";

function savedEvent(
  world: World,
  key: string,
  type: World["history"]["events"][number]["type"],
  date: string,
  summary: string,
  visibility: "public" | "private" = "public",
  jurisdictionId: World["jurisdictionOrder"][number] | null = null,
): World {
  return recordWorldEvent(world, {
    stableKey: key,
    type,
    occurredAt: makeIsoDate(date),
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility,
    tags: ["fixture"],
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

function observerFixture(): World {
  const demo = createDemoWorld("observer-election-jurisdictions");
  return createWorld({
    seed: "observer-election-summaries",
    currentDate: makeIsoDate("2027-01-05"),
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: [],
    control: { kind: "observer" },
  });
}

describe("saved observer general election summaries", () => {
  it("shows an honest empty state, separate from individual contests", () => {
    const world = observerFixture();
    expect(observerElectionSummaries(world)).toEqual([]);
    const html = renderToStaticMarkup(
      <ObserverRecordWorkspace world={world} onOpenPerson={() => {}} />,
    );
    expect(html).toContain("No general election summary is recorded yet.");
    expect(html).toContain("No individual contest result is recorded yet.");
  });

  it("retains recorded aggregate facts through reload and beyond 60 later happenings", () => {
    let world = observerFixture();
    world = savedEvent(
      world,
      "congress-2026",
      "election.congress-general-results",
      "2026-11-04",
      "Saved congressional aggregate.",
    );
    const congressId = world.history.events.at(-1)!.id;
    world = savedEvent(
      world,
      "state-2026",
      "election.state-legislative-general-results",
      "2026-11-04",
      "Saved state aggregate.",
      "public",
      world.jurisdictionOrder[0],
    );
    const stateId = world.history.events.at(-1)!.id;
    world = savedEvent(
      world,
      "private-2026",
      "election.congress-general-results",
      "2026-11-04",
      "Private aggregate.",
      "private",
    );
    for (let index = 0; index < 61; index += 1) {
      world = savedEvent(
        world,
        `later-${index}`,
        "community.meeting",
        "2027-01-05",
        `Later public happening ${index}.`,
      );
    }
    const beforeRead = serializeWorld(world);
    const loaded = deserializeWorld(beforeRead);
    const record = projectObserverRecord(loaded);
    expect(record.happenings.map((row) => row.id)).not.toContain(congressId);
    expect(record.happenings.map((row) => row.id)).not.toContain(stateId);
    expect(record.elections).toEqual([]);
    expect(record.electionSummaries).toEqual([
      {
        id: stateId,
        date: "2026-11-04",
        jurisdictionId: world.jurisdictionOrder[0],
        jurisdiction: world.jurisdictions[world.jurisdictionOrder[0]!]!.name,
        kind: "State legislature",
        summary: "Saved state aggregate.",
      },
      {
        id: congressId,
        date: "2026-11-04",
        jurisdictionId: null,
        jurisdiction: null,
        kind: "Congress",
        summary: "Saved congressional aggregate.",
      },
    ]);
    expect(serializeWorld(loaded)).toBe(beforeRead);
  });

  it("pages a selected year without hiding older years or rendering every row", () => {
    let world = observerFixture();
    world = savedEvent(
      world,
      "old-general",
      "election.congress-general-results",
      "2025-11-04",
      "Older saved result.",
    );
    for (let index = 0; index < 26; index += 1) {
      world = savedEvent(
        world,
        `current-general-${index}`,
        "election.state-legislative-general-results",
        "2026-11-04",
        `Saved result ${index}.`,
      );
    }
    const rows = observerElectionSummaries(world);
    expect(observerElectionSummaryPage(rows, "2026", 25)).toMatchObject({
      total: 26,
      entries: expect.arrayContaining([
        expect.objectContaining({ summary: "Saved result 25." }),
      ]),
    });
    expect(observerElectionSummaryPage(rows, "2026", 25).entries).toHaveLength(
      25,
    );
    expect(observerElectionSummaryPage(rows, "2026", 50).entries).toHaveLength(
      26,
    );
    expect(observerElectionSummaryPage(rows, "2025", 25).entries).toEqual([
      expect.objectContaining({ summary: "Older saved result." }),
    ]);
    const html = renderToStaticMarkup(
      <ObserverRecordWorkspace world={world} onOpenPerson={() => {}} />,
    );
    expect(html).toContain("observer-election-summaries-more");
    expect(html).toContain("Show more");
    const visibleSummaries = html.match(
      /<ul data-testid="observer-election-summaries">([\s\S]*?)<\/ul>/,
    )?.[1];
    expect(visibleSummaries).not.toContain("Older saved result.");
  });
});
