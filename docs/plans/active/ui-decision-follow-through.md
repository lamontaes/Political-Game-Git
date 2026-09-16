# UI DECISION FOLLOW-THROUGH

Authority: PLAYTEST-PORK-01 section "UI DECISION FOLLOW-THROUGH" (Drive
1HhEloK5fN08KNzLc0ma2LuJxNisUUQHpgg7Imz1nSKA); Decision Register OCD-UI-004,
OCD-UI-005, OCD-UI-009, OCD-PROD-002, OCD-SIM-006. Base: public main fed321f7.
Receiver: LAND (Codex) through Drive folder 1baN6DcYsLRKqOqceu3xuJ5FVZkZpZYLF.

## Increment 1 — Politics hub, Government browser, contextual person card

- `src/presentation/politics-government.ts`: public government for a place by
  Local / State / Federal and Legislative / Executive / Judicial, from existing
  records only (municipal reading or Census units; state legislature rule pack
  and executive holder; Congress and federal holders). Defaults to the place the
  character is now (`openingLifeLocation`), with home as an explicit, labelled
  choice. A branch with no record says so; a missing holder is not a vacancy;
  a county government is listed, never forced into a branch.
- `src/player/politics/*`: the tab strip over the existing political surfaces
  and the Government browser. Transit and taxes are sections of Issues and
  budget; local meetings and records a section of Government.
- `PersonCard` anchors beside a clicked scene person, flips and clamps inside
  the viewport and keeps the bottom reserve for choices and corner controls;
  list, web and link opens keep the side placement. The player's own card says
  "This is you." and never "same household".
- Root adapter (separate commit): `PlayerGame.tsx` Government surface and tab
  strip mounts, scene-click anchor measurement, holder opens the quick card;
  `shell-navigation.ts` surface; `ShellDossier.tsx` passes the anchor.

Known data gaps, named not filled: there is no current-location government
record beyond the place's jurisdiction; state courts and local courts are not
established; the Budget screen remains bound to the home jurisdiction and now
says so.
