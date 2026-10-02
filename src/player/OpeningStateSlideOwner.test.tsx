import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { projectWorldOrientation } from "../presentation/world-orientation-contract";
import { projectOrientationView } from "../presentation/world-orientation";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { stateNameForUsps } from "./useWorldOrientation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";

const sampled = Array.from({ length: 5 }, (_, index) => {
  const seed = `opening-state-owner-all56-${index}`;
  return { seed, place: drawRandomPlace(seed) };
});

/**
 * Actual saved projection to the actual state-card markup. The projected state
 * step is isolated so static rendering starts on that card; the optional World
 * prop is omitted because it prepends other tour chapters. No component or
 * hook is mocked. This does not claim browser navigation or a full tour proof.
 */
describe("the opening state slide owns the saved government overview", () => {
  for (const { seed, place } of sampled) {
    it(`keeps the recorded overview without population or voting widgets in ${place.key} (${seed})`, () => {
      const fixture = smallWorld({
        place: place.key,
        seed,
        offices: ["governor"],
      });
      const world = deserializeWorld(serializeWorld(fixture.world));
      const before = serializeWorld(world);
      const orientation = projectWorldOrientation(world, fixture.personId);
      const view = projectOrientationView(orientation, stateNameForUsps);
      const state = view.steps.find((step) => step.key === "state");
      expect(state).toBeDefined();
      if (!state)
        throw new Error("The saved orientation has no home-government step.");
      expect(state.summary.length).toBeGreaterThan(0);
      const close = vi.fn();
      const openPerson = vi.fn();
      const markup = renderToStaticMarkup(
        <WorldOrientationPanel
          view={{ ...view, steps: [state] }}
          homeStateUsps={orientation.homeState?.stateUsps ?? null}
          personId={fixture.personId}
          mode="first"
          onClose={close}
          onOpenPerson={openPerson}
        />,
      );

      expect(markup).toContain("pg-state-overview");
      expect(markup).toContain(renderToStaticMarkup(<p>{state.summary}</p>));
      const governor = orientation.homeState?.governor;
      if (governor) {
        expect(world.people[governor.personId]).toBeDefined();
        expect(
          state.people.some((person) => person.personId === governor.personId),
        ).toBe(true);
        expect(markup).toContain(
          `data-testid="orientation-person-${governor.personId}"`,
        );
        expect(markup).toContain(
          renderToStaticMarkup(<strong>{governor.personName}</strong>),
        );
        expect(state.summary).toContain(governor.personName);
      } else {
        // A missing saved holder stays missing, including a District draw;
        // this fixture never invents a governor to satisfy the UI assertion.
        expect(state.summary).not.toContain("undefined");
        for (const person of state.people) {
          expect(world.people[person.personId]).toBeDefined();
          expect(markup).toContain(
            `data-testid="orientation-person-${person.personId}"`,
          );
        }
      }
      expect(markup).not.toContain('data-testid="opening-state-population"');
      expect(markup).not.toContain('data-testid="opening-state-voting"');
      expect(markup).not.toContain("Loading population");
      expect(markup).not.toContain("Loading voting survey information");
      expect(close).not.toHaveBeenCalled();
      expect(openPerson).not.toHaveBeenCalled();
      expect(serializeWorld(world)).toBe(before);
    });
  }
});
