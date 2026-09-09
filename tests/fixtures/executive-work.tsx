import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ExecutiveWorkWorkspace } from "../../src/player/ExecutiveWorkWorkspace";
import { EXECUTIVE_GOVERNING_KERNELS } from "../../src/simulation/executive-governing-kernel-bank";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { facts, incoming, officeWorld, staff } from "./executive-work-world";
import "../../src/player/player.css";
const fixture = facts(
  incoming(staff(officeWorld())),
  EXECUTIVE_GOVERNING_KERNELS.find((k) => k.row.id === "92H-K-003")!
    .requiredFactKeys,
).world;
function Review() {
  const [world, setWorld] = useState(fixture);
  const [open, setOpen] = useState(false);
  return (
    <main>
      <p>
        Review fixture — fictional office premise; normal entry is not
        implemented.
      </p>
      <button onClick={() => setOpen(true)}>Open office work</button>
      <button onClick={() => setWorld(deserializeWorld(serializeWorld(world)))}>
        Reload snapshot
      </button>
      <output aria-label="Recorded work">
        {world.history.workItems.length}
      </output>
      <output aria-label="Date">{world.currentDate}</output>
      {open && (
        <ExecutiveWorkWorkspace
          world={world}
          onWorldChange={setWorld}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Review />);
