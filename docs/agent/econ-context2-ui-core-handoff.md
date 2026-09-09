# ECON-CONTEXT2 → UI-core handoff

Owner: UI-core

Feature branch: `codex/econ-context2`

Feature-owned seam: `playerEconomicContextLines(placeKey)` in
`src/presentation/economic-context.ts`

After this feature PR is available in the UI-core integration base, make only
this registration change in `src/player/PlayerGame.tsx`:

```diff
+import { playerEconomicContextLines } from "../presentation/economic-context";
@@
 function placeContextLines(place: LifePlace): readonly string[] {
   const lines: string[] = [];
@@
   lines.push(
     place.capabilities.legislativeScenarioKey
       ? "The game models this state's legislature, so political office is reachable here later."
       : "The game does not model a legislature here yet, so this is an everyday life for now.",
   );
+  lines.push(...playerEconomicContextLines(place.key).map((item) => item.text));
   return lines;
 }
```

Do not copy values into `PlayerGame.tsx`. The presentation function reads the
compact generated artifact, returns nothing for an unbound place, and carries
the date/geography/unit interpretation boundaries in its typed return values.

Acceptance after integration:

1. Search and select `Lexington-Fayette, Kentucky` in the normal character
   creator.
2. Confirm the three dated lines are visible before Begin.
3. Activate the selected-place controls by pointer and keyboard and confirm the
   context does not obstruct Next.
4. Select another place and confirm no Lexington economic values appear.
5. Run `src/presentation/economic-context.test.ts` plus the UI-core creator E2E
   coverage.
