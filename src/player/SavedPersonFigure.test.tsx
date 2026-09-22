import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { World } from "../simulation/types";
vi.mock("./SavedAppearance", () => ({
  useSavedRenderSnapshot: () => undefined,
  useSavedWardrobe: () => undefined,
}));
import { SavedPersonFigure } from "./SavedPersonFigure";
it("does not borrow an adult figure for a child or mutate a missing appearance", () => {
  const child = {
    id: "saved-child",
    givenName: "Taylor",
    familyName: "Jones",
    birthDate: "2020-01-01",
  };
  const world = {
    people: { "saved-child": child },
    currentDate: "2026-01-05",
  } as unknown as World;
  const before = JSON.stringify(world);
  const markup = renderToStaticMarkup(
    <SavedPersonFigure world={world} personId="saved-child" />,
  );
  expect(markup).toContain('data-person-id="saved-child"');
  expect(markup).toContain('data-figure-status="unavailable"');
  expect(markup).toContain("Taylor Jones");
  expect(JSON.stringify(world)).toBe(before);
});
