import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MunicipalWorkspace } from "../player/MunicipalWorkspace";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import { projectMunicipalGoverning } from "./municipal-governing";

describe("local ordinance procedure disclosure", () => {
  it("shows the game rule separately from a sourced city's retrieved law", () => {
    const place = requireLifePlace("4159000");
    const government = municipalGovernmentForLifePlace(place)!;
    let world = createScenarioWorld(
      "portland-game-procedure-label",
      place.context,
      {
        peopleCount: 8,
      },
    );
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: world.personOrder[0]!,
      startedAt: world.currentDate,
      role: "member",
      seatLabel: "Game profile seat",
    });
    world = {
      ...world,
      control: { kind: "person", personId: world.personOrder[0]! },
    };
    expect(
      projectMunicipalGoverning(world, government.key)?.procedureBasis,
    ).toBe("game-profile");
    const screen = renderToStaticMarkup(
      createElement(MunicipalWorkspace, {
        world,
        onWorldChange: () => {},
        diagnostics: true,
      }),
    );
    expect(screen).toContain("municipal-game-procedure-label");
    expect(screen).toContain("fictional game rule profile");
    expect(screen).toContain("Retrieved law");
  });
});
