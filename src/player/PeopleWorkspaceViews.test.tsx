import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  INITIAL_SHELL_STATE,
  type PeopleView,
} from "../presentation/shell-navigation";
import { PeopleWorkspace } from "./ShellWorkspaces";

const fixture = smallWorld({
  place: "OH",
  seed: "people-structural-views",
  household: true,
});

function render(view: PeopleView) {
  return renderToStaticMarkup(
    <PeopleWorkspace
      world={fixture.world}
      personId={fixture.personId}
      state={{
        ...INITIAL_SHELL_STATE,
        preferences: { ...INITIAL_SHELL_STATE.preferences, peopleView: view },
      }}
      dispatch={() => {}}
    />,
  );
}

describe("People's two presentation views", () => {
  it("keeps the directory out of Web without removing its filters or search", () => {
    const before = JSON.stringify(fixture.world);
    const markup = render("web");
    expect(markup).toContain('data-testid="people-relationship-web"');
    expect(markup).not.toContain('data-testid="people-list"');
    expect(markup).not.toContain('data-testid="people-web-expand"');
    expect(markup).not.toContain('data-testid="people-view-categories"');
    expect(markup).toContain('data-testid="people-search"');
    expect(markup).toContain('data-testid="people-category-all"');
    expect(JSON.stringify(fixture.world)).toBe(before);
  });

  it.each(["list", "categories"] as const)(
    "renders the recorded directory for saved %s preferences",
    (view) => {
      const markup = render(view);
      expect(markup).toContain('data-testid="people-list"');
      expect(markup).toContain('data-view="list"');
      expect(markup).not.toContain('data-testid="people-relationship-web"');
      expect(markup).not.toContain('data-testid="people-view-categories"');
      expect(markup).toContain(
        'aria-pressed="true" data-testid="people-view-list"',
      );
    },
  );
});
