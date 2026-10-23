# Prior rulings: screens, UI and dev mode

Current as of 2026-10-23 (a frozen digest of the owner's Drive rulings; later rulings in OWNER-DECISIONS.md win)

Compiled Oct 14, 2026 from the owner's Google Drive. Read-only; no other files were edited.

## Method and coverage

- Searches: 20 `fullText contains` queries, pageSize 15, snippetVerbosity MEDIUM: "UI", "kit", "radial", "menu", "HUD", "dossier", "glossary", "pin rail", "watch the world", "dev mode", "god mode", "custom start", "trace", "settings", "save", "saves", "screenshot", "Steam", "logo", "navy".
- Files read in depth (the 10 most relevant):
  1. `UI AND LOGO PACKET — read me first (Oct 2)` (1-IP3d8hB1ewRM9ia-qeXcQp3LtpuMZnuKwn1QWjwr-w). Full text.
  2. `03 OVERNIGHT ORDERS — UI, Sept 29, 1:35 a.m.` (1cy5gNh4WF9PD5ccJbnabLstPV4PJp6YKcwct5uuG4kA). Full text.
  3. `03 OVERNIGHT ORDERS — UI 2, Sept 29, 1:45 a.m.` (1rbiYLi-THecBRsWSz7Oyyy1Ch9Q4QSFbJ3q-3A4Fiho). Full text.
  4. `03 CTO RULINGS — 11:28 a.m. EDT, Sept 29 — PLAYTEST SCREEN 8` (17x0WcrcWgdTg0Fd-Su3ZoKY_EmHDf8dv2MJCrEEumSc). Full text.
  5. `03 CTO RULINGS — 11:15 a.m. EDT, Sept 29 — PLAYTEST SCREEN 3` (1HBIh2_hKAdF6i7Z785ATvl0nTBxHqJYDg2jpIIN2Oao). Full text.
  6. `00 UI brief for Gemini (Google Doc)` (1tbbsG8q2Gsl-zdTKEXTcG-NNeTHHDiYC865lAesmwYk). Full text.
  7. `UI-PROTOTYPE-01 — Clickable whole-game shell and menu visual prototype` (1T7xu8eJWmsJ6h1ed93yceSOztMbD121iLyfk3QoX_98). About 60 KB; read by keyword extraction, not end to end.
  8. `WAVE · TEAM E · Interface structure and the opening` (14iublUDPiFy9jIS2qeSL05Nq8LzENHhuGhtZXcxKjBU). About 76 KB; read by keyword extraction plus the key orders, not end to end.
  9. `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER` (1bZWrzjUgDql2CIo_k1ElcQ2GrBZOzC_xJs8D-JswKpE). About 250 KB; read by keyword extraction plus the UI sections, not end to end.
  10. `00s PACKAGES — big assignments (Oct 8)` (16PfU1AVhbXYtMJ-DKXk8U4vYRDIjz0GulISsxT6zGLw). About 76 KB; read by keyword extraction, not end to end.
- Snippet-only (search result text, not opened): `03 HAND-BACK` Sept 29 files (Build 17 final, 4:50 a.m., 5:50 a.m., 2:50 a.m.), `03 OVERNIGHT` Sept 27 Watch the World wave, `PATCHNOTES-VERSION1`, `77_CLAUDE_PR87` (title/creator), `AX-PIN1`, `2026-09-23 Title save list` docs, `b25` and `b26` specs, the `00h WAVE COORDINATOR` doc, and the Oct 7 `session-46-mr13` patch. Snippets are quoted only where the text was in the snippet.
- Full texts saved in this folder for audit: `_1bZWrz.txt`, `_14iubl.txt`, `_16PfU1.txt`, `_1T7x.txt`, `_dr_ui.txt` (Decision Register lines tagged by nearest heading).
- Not in Drive, so not read: `docs/ui/kit13/APPROVED-2026-10-04.md` (cited by the Oct 7 patch), `docs/codex/ui-logo-packet/` (in repo), and `AGENTS.md`. AGENTS.md is quoted where a ruling conflicts with a Drive ruling.

Dates are the Drive document's creation or modification time in UTC unless the document states its own time (then that time is given, in ET). Where a Decision Register entry carries no date in the extract, it is marked undated.

---

## Rulings, newest first

1. **Oct 8, 2026 (doc modified Oct 10): look, title and dossier.** Quote: "Owner design record: Ink & Scene LOOK with Capitol Ledger FUNCTION (Canva kits 2 and 3); dossier layout (mockup 22) in the clear-glass style (mockup 18); radial menu, no labeled bar, no navy anywhere; Crusader Kings / Sims spirit; title screen = recognizable national scenes (White House at night, Lincoln Memorial, rally, convention) with people posed in them, NOT state capitols and never the community-room painting".
   File: `00s PACKAGES — big assignments (Oct 8)`.
   Binds: the current look (Ink & Scene), the radial menu with no labeled bar, no navy, and the title scene rule. This is the newest statement of the look.

2. **Oct 9 to 10, 2026: developer bench, God mode, "why" traces.** Quotes: "A throwaway developer test bench, not a game screen; the real screens get redesigned with the owner one at a time. It shows records, control names and click-anything 'why' traces. It has no hand-written player text, no art and no styling work beyond readability." Also, owner, Oct 9 about 12:40 a.m.: "with a God mode that can control any decision, to see whether the engine coherently makes such lives".
   File: `00s PACKAGES — big assignments (Oct 8)`.
   Binds: dev mode and God mode are developer tools (bench and tests). The bench shows "why" traces on click. Player screens get no developer text.

3. **Oct 7, 2026 (patch file dated Oct 7): four screens stripped to record data.** Quote (MR-10 to MR-13, Campaign, News, Places, Transit): "Strip every authored sentence, helper line, explanation and developer word from the [screen]; keep record data and Kit 13 control names; rebuild layout to the owner's picks; before/after screenshot from a played new game." Cites `docs/ui/kit13/APPROVED-2026-10-04.md`.
   File: `SKIP status-only — session-46-mr13-pool-closeout.patch` (snippet).
   Binds: News, Places, Transit and Campaign screens. Kit 13 is the current kit (approved Oct 4, per the citation). Screenshots must come from a played new game.

4. **Oct 6, 2026: custom start and saves.** Quotes: "Custom Start keeps premises deliberate; the world becomes canonical at Begin." And from the Register: "Do not impose mandatory Ironman or prohibit earlier-save loading" (one-save only as an option).
   File: `b25 Optional difficulty settings` (snippet), with the Register quote from the same spec.
   Binds: custom start flow and the save options. No forced one-save mode.

5. **Oct 2, 2026 (doc created 22:35 UTC): locked decisions, the packet summary.** Quotes: "No navy in the game UI. Crusader Kings and Sims spirit; low-key, sleek menus that complement the art." / "Conversation box: serious and political; portraits top-left; numbered replies, no chevrons." / "Lie = scales of justice, 34px, upper right of the conversation box; tips and glows red when lying; the word 'Lie' never appears." / "Radial menu restyled; portrait next to the clock; date and time only on the player card." / "Glossary underlines with 'Mark as learned' MUST ship." / "Title screen: civic scene or the latest character's hero pose; never the community-meeting painting; no hard-coded version string." / "Logo: navy ballot box, brass corners..." / "Steam: option C (full comic collage fading to navy, title along the bottom)." / "Verify with full-screen screenshots of every main screen before claiming done."
   File: `UI AND LOGO PACKET — read me first (Oct 2)`.
   Binds: a summary of the locked decisions, pointing at repo `docs/codex/ui-logo-packet/`. Its kit (kit12) is superseded by Kit 13 (ruling 3). Its logo and Steam navy and its title rule are still in force unless ruling 1 changes them.

6. **Sept 29, 2026, 1:45 a.m. EDT: glossary, radial, portrait.** Quotes: "Clicking 'Got it' marks the term learned for this player. The underline then no longer appears anywhere, but the term stays in the glossary." / "Remove the bottom taskbar and restore the radial menu as the main menu, restyled in the new UI style... with no labeled bar." / "Next to the date and time, show the player character's current portrait, so the player always sees how old they look." / "About 30 UI mockups in genuinely different styles, for Lamontae to choose from... tabs and menus, and the radial menu; the talk menu; the dossier."
   File: `03 OVERNIGHT ORDERS — UI 2, Sept 29, 1:45 a.m. EDT`.
   Binds: radial menu return, portrait by the clock, glossary underline and "Got it" (label since changed in ruling 5), the 30-mockup choice.

7. **Sept 29, 2026, 1:35 a.m. EDT: no navy, Steam-ready.** Quotes: "I don't like the Navy stuff… games I like their UI in… Crusader Kings… The Sims… let's get rid of that shitty UI. So tomorrow there should be no remnants of this shitty era of the game." / "Palette direction: warm off-white paper, deep ink brown or charcoal text, brass and gold accents; oxblood and forest green as the two party-neutral accent colors; no navy surfaces anywhere." / "Search for navy hex values and navy in src/player, src/ui and src/styles.css... The count at the end must be zero." / "Screenshots: before and after of every main screen, at 1280×720 and 1920×1080."
   File: `03 OVERNIGHT ORDERS — UI, Sept 29, 1:35 a.m. EDT`.
   Binds: the palette and the navy ban, on every player screen, title, dialog and tooltip. Screenshots at both sizes.

8. **Sept 29, 2026, 11:28 a.m. EDT: radial ring, stops, time text.** Quotes: "Make it a true ring around a center point with even spacing and room to breathe, and keep it inside the viewport. It must never cover the portrait or the clock. Brass and ink style, no navy." / "STOPS panel: remove 'a skip always stops for these, not a preference'. Show only the real choices, in plain words: your own election day, invitations, and things you might go to." / "The small time-status text at the bottom ('Clear: Tuesday…') shows through and overlaps the controls. Give it a home or remove it."
   File: `03 CTO RULINGS — 11:28 a.m. EDT, Sept 29 — PLAYTEST SCREEN 8`.
   Binds: radial geometry, the Stops wording and the time-status line.

9. **Sept 29, 2026, 11:15 a.m. EDT: opening cards, dossier, figures, version.** Quotes: "Every figure in a scene must be drawn from that person's own appearance record." / "Hovering (or focusing) a name on the card puts a soft glow around that person in the scene, and hovering the person highlights their name." / "The President's dossier is nearly empty... show what the world records... Estimate from averages where a value isn't read (no UNKNOWN). The same applies to every officeholder's dossier." / "The version still reads v0.4.0 on the title and every screen... so the version moves with each release."
   File: `03 CTO RULINGS — 11:15 a.m. EDT, Sept 29 — LAMONTAE PLAYTEST, SCREEN 3`.
   Binds: card-to-scene hover, the officeholder dossier contents, the version display.

10. **Sept 29, 2026, 5:50 a.m. EDT (hand-back): radial restored, portrait by clock.** Decided: "the radial menu is the September 26 design, restored from the code before the bar replaced it (commit 20d9209d0)." Also: "the portrait by the clock was already in place... It stays with the radial menu."
    File: `03 HAND-BACK — Build 17 · UI Overhaul (5:50 a.m. EDT, Sept 29)` (snippet).
    Binds: the radial menu's September 26 design is the baseline. Rings and angles are fixed values (ShellNav.tsx FAN_RINGS).

11. **Sept 29, 2026, 4:50 a.m. EDT (hand-back): glossary rules.** Decided: "'primary' is underlined only as an election" and "once 'Got it' is pressed, the word is plain text everywhere. The Guide still lists it, and the Guide can take the mark back." Also: the card opens after 250 ms of rest and closes 180 ms after leaving (hand-set).
    File: `03 HAND-BACK — Build 17 · UI Overhaul (4:50 a.m. EDT, Sept 29)` (snippet).
    Binds: the glossary marking rule, the election-only "primary", and the Guide's reversal.

12. **Sept 29, 2026, 2:50 a.m. EDT (hand-back): room colors.** Decided: "printed things inside the room keep their real-world blue" (a campaign poster, a whiteboard marker and one newspaper rule line); "the room's television screen is dark charcoal, not navy"; "red and green colors that carry a meaning stay."
    File: `03 HAND-BACK — Build 17 · UI Overhaul (2:50 a.m. EDT, Sept 29)` (snippet).
    Binds: the exceptions to the no-navy rule (printed objects, TV screen), and the meaning colors (warnings, lie toggle).

13. **Sept 29, 2026, 7:45 a.m. EDT (Build 17 final hand-back, snippet).** The 7:45 a.m. hand-back reports the paper and brass theme and the glossary underline and radial menu on main. Its "NEEDS LAMONTAE: Nothing." It records that "Clicking a person to talk is the one order not done."
    File: `03 HAND-BACK — Build 17 · UI Overhaul (7:45 a.m. EDT, Sept 29) — FINAL` (snippet).
    Binds: nothing new; it marks the talk-from-a-clicked-person order as still open.

14. **Sept 27, 2026 (05:49 UTC): labeled bar, shared controls, custom start (Team E order).** Quotes: "A labeled menu bar replaces the wheel: Calendar, People, Politics, News, Journal, Personal, Travel. Save, Options, Guide and Return to title go in a corner menu." / "Custom start: Next is always visible, primary buttons look primary, and Back never overlaps." / "A loading screen with a progress bar and plain stages for new game and Continue." / "The blue HTML removed and stylized better, all over the game."
    File: `WAVE · TEAM E · Interface structure and the opening`.
    Binds: superseded for the menu by rulings 6 and 1 (radial, no labeled bar). Still in force: Save, Options, Guide and Return in a corner menu (not restated later), the custom-start layout, and the loading screen. Team E's shared-control rule is in ruling 17.

15. **Sept 27, 2026 (18:30 UTC): UI brief for mockups.** Quotes: "Never developer or record language. Forbidden: 'on the record', 'reported', 'tentative hold'... 'a skip', 'lapses', 'supported', 'this save's'..." / "Options needs real settings (date format, profanity softening, reduced motion)." / "Show today's date and time once, clearly. A time button says where it goes." / "Pins run down the right edge as small separate tabs... tiny, normal and expanded. There's no shared backing panel behind them and no 'PINS' heading." / "Clicking a person in the scene opens a small menu anchored to that person. A small card shows first, and a full card only when asked."
    File: `00 UI brief for Gemini (Google Doc)`.
    Binds: the words rules (still in force, since they are about screen text), the pin rail, the person card, Options settings and the date/time line. Its navy palette and its bottom-left nav cluster are superseded by rulings 7 and 6.

16. **Sept 26, 2026 (register entry, "The game's vision and scope, in Lamontae's answers"): cuts.** Quote: "Cut from the game: chores ('Waiting on you' errands such as groceries), favors, household evenings and shop shifts. Jobs remain as income, not as clicking work." Also "Childhood is optional flavor... over in a few clicks."
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`.
    Binds: no chore or shift screens as clicking work. See conflict 7.

17. **Sept 25, 2026 (register entry, bill drafting): the bill is the workspace.** Quote: "The current preferred workflow is a physical bill/working-document interface rather than a dashboard or gamified builder... The owner specifically rejects the recent colored wheel treatment." Also: "Once a subject/current policy is selected, the bill itself becomes the primary workspace."
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`.
    Binds: the drafting screen (the paper, phrase-select, small editors). No colored wheel for subjects; a plain index is allowed for navigation.

18. **Sept 20, 2026 (register, OCD-UI-013 and the keyboard clarification): shared controls.** Quotes: "Generic time progression must have one coherent primary home and shared behavior, not repeated Move on/Continue/Simulate blocks." / "Reading, navigating or selecting a pin never silently advances time." / "Use the game's shared visual language for buttons, fields, selectors, open picker surfaces, tabs and dialogs... unstyled operating-system-looking presentation is not the requested finish." / "Escape dismisses the top applicable transient context and restores focus; when none is open, it opens the session menu." (owner clarification, September 20)
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`, entry OCD-UI-013 (entry undated in extract; the register was consolidated Sept 26 and last modified Oct 6).
    Binds: one time control home; no OS-styled controls; Escape rules; a pin never moves time.

19. **Sept 20, 2026 (register, Calais playtest addition): setup screens.** Quotes: "removal of the indicated dark/translucent setup backing, continuous alphabetical state-place scrolling without More places... genuinely game-styled controls." / "Remove normal-play source/debug boilerplate, 'in this fictional world,' raw ISO dates, placeholder schools and the universal Neighborhood Market/demo-employment path in new lives."
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`, entry "CURRENT OWNER FOLLOW-THROUGH — ART BENCH AND CALAIS PLAYTEST — SEPTEMBER 20, 2026".
    Binds: the New Game and setup screens; no debug text on player screens.

20. **Sept 19, 2026 (register, playtest65 ratification): creator and cards.** Quotes: "Appearance selection uses direct arrows/gallery and color swatches, with immediate safe preview for a new unsaved character. Small person cards use headshots; full records show the same saved full-body person in a suitable stable pose." / "Retain the game's restrained illustrated style while lifting overly dreary backgrounds into readable natural light."
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`, entry "CURRENT OWNER RATIFICATION — PLAYTEST65 / CODEX DELIVERY — SEPTEMBER 19, 2026".
    Binds: the appearance pickers (arrows, swatches), headshot cards, full-body records.

21. **Sept 28, 2026, 3:30 p.m. (register, "Decided" additions): opening order.** Quote: "The opening order is approved: the year and the world, then the White House, then your corner of the country (your state's governor, legislature and current fights; your county and town), then your story last." Also on the same date: "Career-aware scenes and one tag system" (not approved to build).
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`, entry "OWNER IDEAS AND DIRECTION, SEPTEMBER 28, 2026" (the 3:30 p.m. additions are marked Decided).
    Binds: the opening sequence and its order.

22. **Sept 8, 2026 (PATCHNOTES-VERSION1, snippet): patch notes and version.** Quote: "The main/title menu needs a Patch Notes button. It opens human-readable notes... The game also needs a consistent visible version number in the bottom-right of the title/main-menu composition."
    File: `PATCHNOTES-VERSION1 — Steam-Style Patch Notes and Canonical Build Version UI — 2026-09-08` (snippet).
    Binds: a Patch Notes button on title, a visible version. Source is package.json. See conflict 11.

23. **Sept 7, 2026 (UI-PROTOTYPE-01): title, pins, navigation rules.** Quotes: "NO opaque blue/navy slab behind the title/menu." / "Avoid a Capitol-dome logo or other symbol that implies the game is primarily Washington/federal politics." / "pins independent from who is physically present." / "Inspect opens a narrow contextual/adaptive quick dossier near the selected person where space permits." / "No localStorage unless a specific review flow clearly benefits; session-local state is sufficient."
    File: `UI-PROTOTYPE-01 — Clickable whole-game shell and menu visual prototype`.
    Binds: pins are references, not presence; quick dossier near the person; no Capitol-dome logo (not re-ruled since). Its navy wording is superseded by ruling 7.

24. **Sept 4, 2026 (PR87 title repair, snippet): title and New Game.** Quotes: "The intended home composition is a scene-first tableau with a compact menu at the right side of the screen." / "New Game currently breaks to a blank standalone form... Lexington is never a canonical default." / "Character creation should behave as progressive states of one continuous first-session screen."
    File: `77_CLAUDE_PR87_SECOND_HUMAN_PLAY_FAIL_TITLE_CREATOR_NARRATIVE_PRESENTATION_REPAIR` (snippet).
    Binds: title layout (compact menu) and the one-screen creator. Title menu placement is not re-ruled since; see conflict 9.

25. **Undated register entry: developer screens.** Quote: "Developer screens (LQ-10). Removed from the player build and kept in the developer route."
    File: `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER` (undated in extract).
    Binds: dev screens and tools never ship to the player build. Consistent with ruling 2.

Repo ruling (not in Drive, quoted because it binds the trace question): AGENTS.md, "Keep it simple (owner, Oct 11, 2026)": "Bookkeeping is a debug switch. Read tracing, validation, copying and freezing run in tests and the bench, not in play. Save 'why' reasons only for the player and the people they deal with."

---

## Conflicts

Rule applied: the most recent ruling wins unless the older one makes more sense. Each item says which side is newer and whether the older side may make more sense. Nothing here is decided by this file; the owner should choose where flagged.

**C1. Navy: banned for UI, kept for logo, Steam and printed objects.**

- Old side (Sept 14 and Sept 27, and Sept 7): navy panels and "navy-and-brass" are the approved look. The Sept 27 UI brief: "deep navy panels (#141C2B to #1E2838 range)". The Sept 7 prototype: "Restrained deep navy/charcoal/slate". The Sept 14 approved crops are labeled "the navy-and-brass style".
- New side (Sept 29, 1:35 a.m.): "no navy surfaces anywhere", "the count at the end must be zero". Repeated Oct 2: "No navy in the game UI." Oct 8: "no navy anywhere".
- Still navy in the newest docs: Oct 2 logo "navy ballot box" and Steam "option C... fading to navy". Sept 29 2:50 a.m. hand-back keeps printed campaign-poster blue and a whiteboard marker.
- Verdict: no-navy governs the UI (newest and explicit). It makes sense, since the owner's words reject the navy look directly. The logo and Steam navy are not UI, so they stand unless the owner rules otherwise. Owner to confirm that logo and Steam are exempt.

**C2. Which kit and fonts.**

- Oct 2: kit12, Cinzel 800 titles (gold #d6bd84), Andada Pro speech, Fira Sans UI, brass #9c8350, iron #1c1a18, text #f6f1e8.
- Sept 27 (Team E concept 01, "Civic Brass"): deep green #13241c, brass #b89556, cream #f3ecda, fonts Libre Caslon Display, Libre Franklin, Newsreader.
- Oct 7 patch rows: "Kit 13 control names", citing `docs/ui/kit13/APPROVED-2026-10-04.md`.
- Oct 8: "Ink & Scene LOOK with Capitol Ledger FUNCTION (Canva kits 2 and 3)".
- Verdict: Kit 13 (Oct 4) is newest and governs, but its palette and fonts are not in the Drive text I read. The Kit 13 file is in the repo, not Drive. Owner to confirm whether Ink & Scene is Kit 13 and whether Cinzel/Andada/Fira still stand. Kit12 fonts are probably superseded.

**C3. Radial menu versus labeled bar, and the bottom-left cluster.**

- Sept 27 Team E: "A labeled menu bar replaces the wheel."
- Sept 27 UI brief: "Navigation is a compact cluster in the bottom-left corner... an upward stack of main menus."
- Sept 29 1:35 and 1:45 and Oct 8: radial menu, "no labeled bar". Sept 29 11:28: must be a true ring.
- Verdict: radial menu governs (newest, and it was the owner's explicit reversal on Sept 27 and again Sept 29). It makes sense. The bottom-left cluster from the Sept 27 brief is not re-ruled either way. Owner to confirm whether the cluster still exists.

**C4. Where the date and time live.**

- Sept 27 UI brief: bottom-left cluster shows the time and place ("10:05 a.m. · Tue., Jan. 6", "HOME · PUEBLO").
- Sept 29 hand-back: the corner shows the portrait beside the name, date and place.
- Oct 2: "date and time only on the player card."
- Verdict: Oct 2 governs (newest). It is ambiguous whether "player card" is the corner card or the bottom-left cluster. Owner to confirm.

**C5. Glossary button label and behavior.**

- Sept 27 UI brief: "Shift-click marks it learned."
- Sept 29 1:45: "Clicking 'Got it' marks the term learned."
- Sept 29 4:50 (shipped): a "Got it" button, and the Guide can take the mark back.
- Oct 2 (locked): "'Mark as learned' MUST ship."
- Verdict: Oct 2 governs the label (newest). It makes sense as the locked wording. The "Got it" label is in the shipped build and must change if Oct 2 governs. Owner to confirm the label.

**C6. Time-control labels.**

- Sept 27 Team E: "Day, Week, Continue."
- Sept 27 UI brief: "Day, Week, 'Until something needs me'."
- Sept 29 hand-back: "Until needed."
- Later Team D work (undated in this read): "quiet stretch."
- Sept 20 (OCD-UI-013): "Labels must disclose the actual destination or interval."
- Verdict: no single label is ruled. The newest label seen is "quiet stretch" in the Team D work. This is unresolved. Owner to pick one label. It must say the destination, per OCD-UI-013.

**C7. Chores and shop shifts.**

- Sept 26 register: "Cut from the game: chores... shop shifts... Jobs remain as income, not as clicking work."
- Sept 29 Build 7 (hand-back): "A shop shift pays $72 for four hours... the player works shop shifts." The Team E route (Oct) also runs "Shop assistant shifts" as a player step.
- Verdict: the Sept 26 cut governs (it is the register decision) unless the owner has since ruled shifts back in. The newer work treats shifts as pay that happens, which could be read as income, not clicking. It is unclear. Owner to confirm whether a shift is a clickable action or an automatic pay record.

**C8. "Why" traces: click anything, or player-only.**

- Oct 9 (owner, through the Oct 8 packages doc): the bench shows "click-anything 'why' traces"; the Oct 10 design calls them developer tools.
- AGENTS.md, Oct 11 (repo): "Save 'why' reasons only for the player and the people they deal with," and read tracing runs in tests and the bench, not in play.
- Verdict: AGENTS.md (Oct 11) governs the saved and play side (newest, and it is the bookkeeping rule). It makes sense that "click anything" applies only to the developer bench. Both can hold if the trace is a dev tool only. Owner to confirm that "click anything" means the bench, not the player.

**C9. Title scene.**

- Sept 4 (PR87): "scene-first tableau with a compact menu at the right side."
- Oct 2: "civic scene or the latest character's hero pose; never the community-meeting painting."
- Oct 8 (newer): "recognizable national scenes (White House at night, Lincoln Memorial, rally, convention) with people posed in them, NOT state capitols."
- Verdict: Oct 8 governs (newest, and narrower: national scenes, not hero poses). The "latest character's hero pose" from Oct 2 is no longer listed. Owner to confirm whether hero poses are still allowed.

**C10. Capitol-dome logo.**

- Sept 7 (UI-PROTOTYPE-01): "Avoid a Capitol-dome logo or other symbol that implies the game is primarily Washington/federal politics."
- Oct 2 logo rules: no mention of a dome. Oct 8: title scenes are national (White House, Lincoln Memorial).
- Verdict: no newer ruling on the logo dome. The Sept 7 rule still stands by default. It makes sense. Owner to confirm.

**C11. Version display.**

- Sept 8 (PATCHNOTES-VERSION1): "a consistent visible version number in the bottom-right of the title/main-menu composition."
- Oct 2: "no hard-coded version string."
- Sept 29 11:15: the version must move with each release.
- Verdict: compatible, not a true conflict. The version should be visible and read from the build, not typed into the UI. The bottom-right position is from Sept 8 and not re-ruled. Owner to confirm.

---

## Notes for the next reader

- The Decision Register extract is in `_dr_ui.txt` with each line tagged by its nearest heading. The full register is about 250 KB, so only the UI sections were pulled.
- The Kit 13 approval file is not in Drive. The Oct 7 patch only cites it.
- Snippet-only sources were not opened, so their wording may be truncated. Each one is marked "(snippet)".
- Ruling count: 25 numbered entries, all from Drive (entry 25 is undated), plus 1 repo rule quoted at the end. Conflicts: 11.
