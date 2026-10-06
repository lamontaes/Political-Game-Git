import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import type { PlacedScenePerson } from "../presentation/life-scene-people";
import type { BackdropPerson } from "../presentation/backdrop-people";
import type { EntityId } from "../simulation/types";

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
    paintedUrl: fixture.painted ? "fixture-scene.png" : null,
    paintedWidth: 1376,
  }),
}));

import { SceneBackdrop } from "./SceneBackdrop";
import { PlacePeopleLayer } from "./PlacePeopleLayer";
import { EngineFigure } from "./EnginePerson";

// Opaque test recipe: the callback must pass it, never resolve or redraw it.
const recipe: EngineRecipe = {
  presentation: "masculine",
  build: "average",
  shade: 3,
  face: "saved-face",
  hair: "saved-hair",
  hairColor: "brown",
  outfit: "saved-scene-outfit",
  colors: { shirt: "saved-scene-shirt", trousers: "saved-scene-trousers" },
};
const person: PlacedScenePerson = {
  personId: "recorded-person",
  name: "Recorded person",
  relationship: null,
  anchorId: "recorded-anchor",
  seated: false,
  leftPercent: 20,
  topPercent: 20,
  widthPercent: 10,
  heightPercent: 30,
  layers: [],
  engine: recipe,
  hasArt: true,
  presence: "Recorded person",
};
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
function collect(render: () => ReactNode) {
  let nodes: ReactElement<Record<string, unknown>>[] = [];
  function Capture() {
    nodes = elements(render());
    return null;
  }
  renderToStaticMarkup(<Capture />);
  return nodes;
}
function click(element: ReactElement<Record<string, unknown>>) {
  (element.props.onClick as () => void)();
}
function scene(entry = person, onSelectPerson = vi.fn()) {
  fixture.painted = true;

  return {
    onSelectPerson,
    nodes: collect(() =>
      SceneBackdrop({
        sceneId: null,
        people: [entry],
        onSelectPerson,
        children: null,
      }),
    ),
  };
}

describe("the rendered scene recipe selection producer", () => {
  it.each(["scene-person-recorded-person", "scene-name-recorded-person"])(
    "%s passes the exact drawn recipe and colors",
    (testId) => {
      const before = JSON.stringify(person);
      const { nodes, onSelectPerson } = scene();
      const drawn = nodes.find((node) => node.type === EngineFigure)!;
      click(nodes.find((node) => node.props["data-testid"] === testId)!);
      expect(onSelectPerson).toHaveBeenCalledExactlyOnceWith(
        person.personId,
        drawn.props.recipe,
      );
      expect(onSelectPerson.mock.calls[0]![1]).toBe(recipe);
      expect(onSelectPerson.mock.calls[0]![1].colors).toBe(recipe.colors);
      expect(JSON.stringify(person)).toBe(before);
    },
  );
  it("old/modular scene art passes no invented recipe", () => {
    const { engine, ...oldEntry } = person;
    void engine;
    const { nodes, onSelectPerson } = scene(oldEntry);
    click(
      nodes.find(
        (node) => node.props["data-testid"] === "scene-person-recorded-person",
      )!,
    );
    expect(onSelectPerson).toHaveBeenCalledExactlyOnceWith(
      person.personId,
      undefined,
    );
  });
  it("the saved place click closure passes the very same recipe the figure binds", () => {
    const entry: BackdropPerson = {
      personId: "recorded-person" as EntityId,
      name: person.name,
      title: "Recorded role",
      leftPercent: 20,
      topPercent: 20,
      widthPercent: 10,
      heightPercent: 30,
      clipBelowPercent: null,
      clipBandEndPercent: null,
      depth: 0,
      engine: recipe,
    };
    const before = JSON.stringify(entry);
    const onSelectPerson = vi.fn();
    // SSR cannot mount/measure a place stage. Execute the actual saved JSX
    // handler, and compare with the recipe binding on the figure it contains.
    const source = readFileSync(
      new URL("./PlacePeopleLayer.tsx", import.meta.url),
      "utf8",
    );
    const file = ts.createSourceFile(
      "PlacePeopleLayer.tsx",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let clickSource: string | undefined;
    let drawnSource: string | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node)) {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        if (
          node.tagName.getText(file) === "button" &&
          attributes.some(
            (attribute) =>
              attribute.name.getText(file) === "data-testid" &&
              attribute.initializer &&
              ts.isStringLiteral(attribute.initializer) &&
              attribute.initializer.text === "scene-place-person",
          )
        ) {
          const attribute = attributes.find(
            (attribute) => attribute.name.getText(file) === "onClick",
          );
          if (
            attribute?.initializer &&
            ts.isJsxExpression(attribute.initializer)
          )
            clickSource = attribute.initializer.expression?.getText(file);
        }
      }
      if (
        ts.isJsxSelfClosingElement(node) &&
        node.tagName.getText(file) === "EngineFigure"
      ) {
        const attribute = node.attributes.properties
          .filter(ts.isJsxAttribute)
          .find((attribute) => attribute.name.getText(file) === "recipe");
        if (attribute?.initializer && ts.isJsxExpression(attribute.initializer))
          drawnSource = attribute.initializer.expression?.getText(file);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    expect(clickSource).toBeDefined();
    expect(drawnSource).toBeDefined();
    const drawnRecipe = runInNewContext(drawnSource!, { person: entry });
    runInNewContext(`(${clickSource!})()`, { person: entry, onSelectPerson });
    expect(onSelectPerson).toHaveBeenCalledExactlyOnceWith(
      entry.personId,
      drawnRecipe,
    );
    expect(onSelectPerson.mock.calls[0]![1]).toBe(recipe);
    expect(JSON.stringify(entry)).toBe(before);
  });
  it("SceneBackdrop forwards the callback unchanged to the place layer", () => {
    fixture.painted = false;

    const onSelectPerson = vi.fn();
    const placeBackdrop = {
      place: "recorded-place",
      variant: "day",
      url: "fixture-place.png",
    } as unknown as NonNullable<
      Parameters<typeof SceneBackdrop>[0]["placeBackdrop"]
    >;
    const nodes = collect(() =>
      SceneBackdrop({
        sceneId: null,
        placeBackdrop,
        onSelectPerson,
        children: null,
      }),
    );
    expect(
      nodes.find((node) => node.type === PlacePeopleLayer)!.props
        .onSelectPerson,
    ).toBe(onSelectPerson);
  });
  it("a legacy one-argument callback still receives the actual selected person", () => {
    let selected: string | undefined;
    const callback = (id: string) => {
      selected = id;
    };
    fixture.painted = true;

    const nodes = collect(() =>
      SceneBackdrop({
        sceneId: null,
        people: [person],
        onSelectPerson: callback,
        children: null,
      }),
    );
    click(
      nodes.find(
        (node) => node.props["data-testid"] === "scene-name-recorded-person",
      )!,
    );
    expect(selected).toBe(person.personId);
  });
});
