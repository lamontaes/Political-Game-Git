import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TaxWorkWorkspace } from "../../../src/player/TaxWorkWorkspace";
import {
  deserializeWorld,
  serializeWorld,
} from "../../../src/simulation/serialization";
import { createMileageLevyWorld } from "../../fixtures/mileage-levy-world";
import type {} from "./tax-quantity-contract";

const fixture = createMileageLevyWorld();
function TaxQuantityFixture() {
  const [world, setWorld] = useState(fixture.world);
  useEffect(() => {
    window.p2TaxFixture = {
      reload: () => setWorld(deserializeWorld(serializeWorld(world))),
      counts: () => ({
        bases: world.history.taxBases?.length ?? 0,
        assessments: world.history.taxAssessments?.length ?? 0,
        collections: world.history.taxCollections?.length ?? 0,
        amount: world.history.taxBases?.[0]?.amount ?? null,
        assessedMinor:
          world.history.taxAssessments?.[0]?.taxAmount.minorUnits ?? null,
      }),
    };
  }, [world]);
  return (
    <TaxWorkWorkspace
      world={world}
      personId={fixture.personId}
      onWorldChange={setWorld}
      onOpenMeasure={() => {}}
    />
  );
}
createRoot(document.getElementById("root")!).render(<TaxQuantityFixture />);
