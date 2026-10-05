import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { householdIdFor } from "../presentation/person-dossier";
import { createResourcePosition, money } from "../simulation/resources";
import type { World } from "../simulation";
import { PersonalWorkspace } from "./ShellWorkspaces";

const fixture = smallWorld({
  place: "OH",
  seed: "personal-money-presentation",
  household: true,
});
function render(world: World) {
  return renderToStaticMarkup(
    <PersonalWorkspace
      world={world}
      personId={fixture.personId}
      section="finances"
      onOpenPerson={() => {}}
    />,
  );
}

describe("personal money presentation", () => {
  it("shows a recorded zero and excludes the separately recorded household purse", () => {
    let world = createResourcePosition(fixture.world, {
      stableKey: "money-presentation:personal",
      owner: { kind: "person", personId: fixture.personId },
      openedAt: fixture.world.currentDate,
      openingBalance: money(0, "USD"),
      provenance: { kind: "authored", note: "Recorded test balance." },
    });
    world = createResourcePosition(world, {
      stableKey: "money-presentation:household",
      owner: {
        kind: "household",
        householdId: householdIdFor(world, fixture.personId)!,
      },
      openedAt: world.currentDate,
      openingBalance: money(12500, "USD"),
      provenance: {
        kind: "authored",
        note: "Separate test household balance.",
      },
    });
    const before = JSON.stringify(world);
    const markup = render(world);
    const purses = markup.match(
      /<ul[^>]*data-testid="personal-purses"[\s\S]*?<\/ul>/,
    )?.[0];
    expect(purses).toContain('data-purse="personal"');
    expect(purses).toContain('data-testid="purse-balance-personal"');
    expect(purses).toContain("$0");
    expect(purses).not.toContain('data-purse="household"');
    expect(purses).not.toContain('data-purse="committee"');
    expect(purses).not.toContain("Nobody else can spend it");
    expect(markup).not.toContain("The place you live");
    expect(markup).not.toContain('data-testid="personal-economic-context"');
    expect(markup).not.toContain("This is a benchmark");
    expect(JSON.stringify(world)).toBe(before);
  });

  it("keeps missing personal money distinct from a recorded zero", () => {
    const markup = render(fixture.world);
    expect(markup).toContain('data-testid="purse-absent-personal"');
    expect(markup).not.toContain('data-testid="purse-balance-personal"');
  });
});
