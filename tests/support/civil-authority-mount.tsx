import { createRoot } from "react-dom/client";
import { CivilPersonnelPanel } from "../../src/player/CivilPersonnelPanel";
import { serializeWorld, deserializeWorld } from "../../src/simulation/index";
import { civilAuthorityFixture } from "../e2e/support/civil-authority-world";

/**
 * Isolated component mount over the explicitly authored diagnostic scenario.
 * Every change is saved and reloaded through the canonical snapshot. It is not
 * a normal-player entry and it grants no authority of its own.
 */
export function mountCivilAuthorityTest(
  controlled: "director" | "otherDirector",
  seed: string,
) {
  const container = document.createElement("main");
  document.body.replaceChildren(container);
  let world = civilAuthorityFixture(
    "2026-09-14",
    "US-MN",
    controlled,
    seed,
  ).world;
  const root = createRoot(container);
  const onWorldChange = (next: typeof world) => {
    world = deserializeWorld(serializeWorld(next));
    (
      window as unknown as { civilAuthoritySnapshot: string }
    ).civilAuthoritySnapshot = serializeWorld(world);
    render();
  };
  const render = () =>
    root.render(
      <CivilPersonnelPanel world={world} onWorldChange={onWorldChange} />,
    );
  render();
}
