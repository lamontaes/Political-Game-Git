import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PlacedScenePerson } from "../presentation/life-scene-people";

const fixture = vi.hoisted(() => ({ painted: true }));
vi.mock("./useSceneTransform", () => ({
  useSceneCoverTransform: () => ({
    xOffset: 0,
    yOffset: 0,
    uniformScale: 1,
    renderedSceneWidth: 1376,
    devicePixelRatio: 1,
    viewport: { width: 1376, height: 768 },
  }),
}));
vi.mock("./useRasterTier", () => ({
  useRasterTier: () => ({
    paintedUrl: fixture.painted ? "test-scene.png" : null,
    paintedWidth: 1376,
  }),
}));
import { SceneBackdrop } from "./SceneBackdrop";
import { PlacePeopleLayer } from "./PlacePeopleLayer";

const person: PlacedScenePerson = {
  personId: "controlled-rendered-person",
  name: "Rendered person",
  relationship: null,
  anchorId: "controlled-anchor",
  seated: false,
  leftPercent: 20,
  topPercent: 20,
  widthPercent: 10,
  heightPercent: 30,
  layers: [],
  hasArt: true,
  presence: "Rendered person",
  engine: {
    presentation: "masculine",
    build: "average",
    shade: 3,
    face: "saved-face",
    hair: "saved-hair",
    hairColor: "brown",
    outfit: "saved-outfit",
    colors: { shirt: "saved-color" },
  },
};
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
function capture(render: () => ReactNode) {
  let nodes: ReactElement<Record<string, unknown>>[] = [];
  function Capture() {
    nodes = elements(render());
    return null;
  }
  renderToStaticMarkup(<Capture />);
  return nodes;
}

describe("separate room Talk and Inspect controls", () => {
  it("activates only the exact selected person, with an independently accessible Inspect", () => {
    fixture.painted = true;
    const talk = vi.fn();
    const inspect = vi.fn();
    const nodes = capture(() =>
      SceneBackdrop({
        sceneId: null,
        people: [person],
        onSelectPerson: talk,
        onInspectPerson: inspect,
        children: null,
      }),
    );
    const token = nodes.find(
      (node) => node.props["data-testid"] === `scene-person-${person.personId}`,
    )!;
    expect(token.props["aria-label"]).toBe(`Talk to ${person.presence}`);
    expect(token.props["aria-haspopup"]).toBeUndefined();
    (token.props.onClick as () => void)();
    expect(talk).toHaveBeenCalledExactlyOnceWith(
      person.personId,
      person.engine,
    );
    expect(inspect).not.toHaveBeenCalled();
    const control = nodes.find(
      (node) =>
        node.props["data-testid"] === `scene-inspect-${person.personId}`,
    )!;
    expect(control.props["aria-label"]).toBe(`Inspect ${person.name}`);
    expect(control.props["aria-hidden"]).toBeUndefined();
    (control.props.onClick as () => void)();
    expect(inspect).toHaveBeenCalledExactlyOnceWith(
      person.personId,
      person.engine,
    );
    expect(talk).toHaveBeenCalledTimes(1);
  });
  it("forwards the separate Inspect callback unchanged to the place layer", () => {
    fixture.painted = false;
    const inspect = vi.fn();
    const nodes = capture(() =>
      SceneBackdrop({
        sceneId: null,
        placeBackdrop: {
          place: "controlled-place",
          variant: "midday",
          url: "test-place.png",
        },
        onSelectPerson: vi.fn(),
        onInspectPerson: inspect,
        children: null,
      }),
    );
    expect(
      nodes.find((node) => node.type === PlacePeopleLayer)?.props
        .onInspectPerson,
    ).toBe(inspect);
  });
});
