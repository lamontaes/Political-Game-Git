import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import {
  beginHealthEpisode,
  createDemoWorld,
  createWorld,
  type EntityId,
  type Person,
  type World,
} from "../simulation";
import { CrisisNoticesPanel } from "./CrisisNoticesPanel";

/** The surface itself, populated and empty, on the ordinary player route. */

let patient: EntityId;
let world: World;

beforeAll(() => {
  const demo = createDemoWorld("crisis-panel");
  patient = demo.personOrder[0]!;
  world = createWorld({
    seed: "crisis-panel",
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
    control: { kind: "person", personId: patient },
  });
});

function markup(current: World, scope: "personal" | "authority"): string {
  return renderToStaticMarkup(
    <CrisisNoticesPanel
      world={current}
      personId={patient}
      onWorldChange={() => undefined}
      scope={scope}
    />,
  );
}

describe("crisis notices panel", () => {
  it("says what is missing without inventing health", () => {
    const html = markup(world, "personal");
    expect(html).toContain("No current record of an illness or injury.");
    expect(html).toContain("Nobody has told you about their health.");
    expect(html).toContain("No public emergency has been recorded recently.");
  });

  it("shows the episode the record holds, and its disclosure choices", () => {
    const ill = beginHealthEpisode(world, {
      stableKey: "panel-episode",
      personId: patient,
      severity: "acute",
      initialLimitation: "none",
      origin: { kind: "authored", note: "Test episode." },
      causalParentIds: [],
    });
    const html = markup(ill, "personal");
    expect(html).toContain("An acute illness or injury");
    expect(html).toContain("Nobody else has been told.");
    expect(html).toContain("Tell the people responsible");
    expect(html).toContain("Make it public");
  });

  it("offers no authority decision to a character who holds no office", () => {
    expect(markup(world, "authority")).toContain(
      "Nothing is waiting on the office you hold.",
    );
  });

  it("renders nothing for a world this person does not control", () => {
    const observed = createWorld({
      // The same world, watched rather than played: person ids are seeded.
      seed: "crisis-panel",
      currentDate: world.currentDate,
      jurisdictions: world.jurisdictionOrder.map(
        (id) => world.jurisdictions[id]!,
      ),
      people: world.personOrder.map((id) => world.people[id] as Person),
    });
    expect(markup(observed, "personal")).toBe("");
  });
});
