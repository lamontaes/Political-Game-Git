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
  character is now (`openingLifeLocation`), with home as an explicit, labeled
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

## Increment 2 — News, Journal, proposal Compare / Read, Lie marker seam

- `src/presentation/news-front-page.ts` and `src/player/news/*`: a mixed front
  page (federal and unplaced stories first, newest first) and one outlet's own
  front page, over saved publications only. Mastheads use live text with a
  stable typographic treatment per outlet. (Superseded by increment 3: the
  other readers are now separate contexts.)
  Only one outlet (Civic Ledger) exists in saved worlds today, so the one-paper
  choice lists one paper; no outlet is invented.
- `src/presentation/journal-views.ts`: Chapters (life-record phases by age,
  default) and Years (the biography's year chapters), with an optional year
  filter; the same entries appear once in either view; private notes and
  record details are unchanged.
- `src/player/proposal/ProposalLayout.tsx`: Compare / Read / Fit window for the
  drafting table and the amendment comparison. The unsaved values stay in the
  calling editor, so switching never discards them. Fit window compares at
  widths above 900px and reads below; a section with no text says so.
- Saved reading choices: `ShellPreferences.proposalLayout`, `newsMode`,
  `newsOutletKey`, `journalView`, `journalYear`; each falls back to its default
  when absent or unreadable, so older saves open unchanged.
- `src/presentation/lie-marker.ts`: a choice shows "Lie" only when it declares
  `truthIntent: "deliberate-deception"`. **Missing producer contract:** no
  conversation choice declares deception today and no claim records a
  contradiction, so no marker is shown in play. The seam is the optional
  `truthIntent` on `ConversationIntentOption`.
- Root adapter (separate commit): `PlayerGame.tsx` mounts and preference
  dispatch; `shell-navigation.ts` and `browser-shell-state.ts` preferences;
  `run-b-conversation.ts` optional field; `SceneConversation.tsx` marker;
  `DocketWorkspace.tsx` layout wrapper; `World39Journal.tsx` view controls.

Known base failures (identical on fed321f7): the ordinary campaign win no
longer seats the member before 2027, so docket routes that win a seat stop
at `office-section`/`docket`; worlds now publish from day one, so
`public-information-empty` specs fail; `world39-news-journal` wording and
`a39-composed` "Virginia Code" expectations have drifted.

## Increment 3 — accepted separation (PLAYTEST-PORK-01 section A)

- News opens on editorial reading only. Around you, Outlets and follows
  (directory, search, follows) and Press office are separate contexts, carried
  as shell sections `news-around`, `news-directory`, `news-press`, so Back
  returns to the previous context and nothing is stacked under the paper.
- The menu carries one Politics entry (`nav-politics`), landing on Your office
  (Government for a child). The hub's tabs are the only route to campaigns,
  government and local records, parties, and budget with transit and taxes;
  the office screen now shows the tab strip too. The duplicate menu entries
  (`elsewhere-work`, `nav-municipal`, `nav-parties`, `nav-politics-*`) are gone.
- Tests reconciled to the accepted behavior, not deleted: the shared helper
  `tests/e2e/support/creator.ts` maps each former destination name to the hub
  tab that now holds it (`openPoliticsHub`, used by `goTo`, `openElsewhere`
  and `expectNoDestination`), and `openNewsContext` opens the News context a
  spec works in. Direct menu clicks in individual specs now go through
  Politics and the tab, by pointer or keyboard as before.
- No stock in-game controls (section A, required). `src/player/controls/`
  holds the shared primitives UI owns: `GameSelect` (a drop-in for `<select>`
  with the same `<option>`/`<optgroup>` children and an `onChange` whose
  `target.value` is the choice; WAI-ARIA select-only combobox with a
  viewport-placed listbox, arrows, Home/End, Page keys, typeahead, Enter/Space,
  Escape, Alt+Arrow, outside-click close and focus kept on the trigger) and
  `controls.css` (tokens and skins for checkbox, radio, range, number and text
  inputs, scoped to `body.pg-game`, which PlayerGame sets while mounted).
  Converted: creator birthday, Journal year, News paper, Docket filters,
  Local government, press, interviews, private journal, district residence,
  orientation, life paths, education, careers, personnel and incident panels.
  Not converted here, by ownership: appearance controls
  (`PersonAppearanceControls`, `PreparedAppearanceControls`, `WardrobeFigure`,
  `CreatorAppearanceStep`) belong to MODULAR, which received the API; developer
  views under `src/ui/` keep native controls. `GameDateField` (three game
  selects over a `YYYY-MM-DD` value) replaces the docket's two native date
  inputs. No `confirm`/`alert`/`prompt` and no native date or color input
  remain in `src/player`.
- Creator follows gender -> name -> full birthday -> derived age
  (`src/presentation/creator-full-birthday.ts`). The year sets `startAge`
  against the start date; month and day stay optional; Randomize birthday
  draws a deterministic adult birthday from the seed. The save shape is
  unchanged.
- Test helpers: `tests/e2e/support/controls.ts` (`chooseOption`,
  `expectChosen`, `chosenValue`, `optionEntries`, `optionValues`, which work on
  native and game selects) and `chooseStartAge` in `support/creator.ts`.
  The old typed-age buffer test (UI9-10) now asserts the derived age instead.
- Engines: Chromium (system Chrome channel) only. Playwright WebKit is not
  installed here; installing it (`npx playwright install webkit`) needs the
  owner's approval, so Safari/WebKit is unverified.
