import { createRoot } from "react-dom/client";
import { CivilPersonnelPanel } from "../../src/player/CivilPersonnelPanel";
import { serializeWorld, deserializeWorld } from "../../src/simulation/index";
import { civilPersonnelFixture } from "../e2e/support/civil-personnel-world";

/** Isolated component test mount, never a normal-player entry or hiring authority. */
export function mountCivilPersonnelTest() {
  const container = document.createElement("main");
  document.body.replaceChildren(container);
  let world = civilPersonnelFixture().world;
  const root = createRoot(container);
  const onWorldChange = (next: typeof world) => {
    world = deserializeWorld(serializeWorld(next));
    render();
  };
  const render = () =>
    root.render(
      <CivilPersonnelPanel world={world} onWorldChange={onWorldChange} />,
    );
  render();
}
