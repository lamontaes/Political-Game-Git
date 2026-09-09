# ECON-CONTEXT2 → UI-core handoff

Owner: UI-core

Feature branch: `codex/econ-context2`

Feature-owned seams:

- `EconomicContextPanel` and `LEXINGTON_ECONOMIC_BINDING` in
  `src/player/EconomicContextPanel.tsx`;
- `createEconomicContextBrowserProvider` in
  `src/presentation/economic-context-browser.ts`;
- lazy static data under `public/data/economic-context/v1`.

After the frozen feature checkpoint is available in the UI-core integration
base, register the panel on the normal post-Begin player path, where the
canonical `world.currentDate` exists. Do not use the setup screen's undated
place copy as a substitute. The bounded registration is:

```diff
+import {
+  EconomicContextPanel,
+  LEXINGTON_ECONOMIC_BINDING,
+} from "./EconomicContextPanel";
@@
+{homePlace?.key === LEXINGTON_ECONOMIC_BINDING.placeKey ? (
+  <EconomicContextPanel
+    binding={LEXINGTON_ECONOMIC_BINDING}
+    simulationDate={world.currentDate}
+  />
+): null}
```

Use the player's already resolved canonical home place; do not infer a binding
from a label. Do not copy values into `PlayerGame.tsx`. The provider reads the
full sharded corpus, while the current normal-player registration is limited to
the one exact authored place-to-provider crosswalk. Future places may register
only by declaring their own provider codes and relationships.

Acceptance after integration:

1. Search and select `Lexington-Fayette, Kentucky` in the normal character
   creator.
2. Begin normally and confirm the panel shows the canonical simulation date,
   historical-observation labels, exact values and missing LAUS gaps.
3. Activate panel disclosures by pointer and keyboard.
4. Start in another place and confirm no Lexington values appear.
5. Confirm no request loads the nationwide corpus as one browser payload.
6. Run the feature tests plus the UI-core normal-player E2E coverage.
