import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BudgetEconomyWorkspace } from "../../../src/player/BudgetEconomyWorkspace";
import {
  advanceWorld,
  createDemoWorld,
  money,
  recordWorldMetricState,
  worldMetricDefinitionByStableKey,
  type World,
} from "../../../src/simulation";
import "../../../src/player/player.css";

function withFiscalHistory(): World {
  let world = advanceWorld(
    createDemoWorld("recovery25-budget-graph-proof"),
    252,
  );
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const period = {
    kind: "interval" as const,
    startsAt: "2025-01-01" as World["currentDate"],
    endsAt: "2025-12-31" as World["currentDate"],
  };
  for (const [metricKey, amount] of [
    ["government.revenue", 2_450_000_000],
    ["government.outlays", 2_370_000_000],
  ] as const) {
    world = recordWorldMetricState(world, {
      stableKey: `recovery25:${metricKey}`,
      metricId: worldMetricDefinitionByStableKey(world, metricKey).id,
      scope: { jurisdictionId, segmentKey: null },
      referencePeriod: period,
      value: { kind: "money", money: money(amount, "USD") },
      recordedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Disposable browser proof for the existing fiscal record bridge.",
      },
      supersedesStateId: null,
    });
  }
  return world;
}

const world = withFiscalHistory();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="life-shell" style={{ overflow: "auto", padding: "2rem" }}>
      <BudgetEconomyWorkspace
        world={world}
        jurisdictionId={world.jurisdictionOrder[0]!}
      />
    </main>
  </StrictMode>,
);
