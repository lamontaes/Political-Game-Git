# Screen rulings the menu look doesn't hold, checked against main (Nov 8, 2026)

For the Fixer (approved menus), Legislation (bill screens), Dev Mode (dev controls on the game's screens) and Story (the talk box and scenes).

Read first, not repeated here: `~/.claude/skills/menu-look/SKILL.md`, `cto-notes/menus/RULINGS-nov5.md` (items 1 to 59) and `cto-notes/menus/audit-nov7/AUDIT.md` (69 surfaces). This file holds every other screen ruling I found, plus a short list of skill rules that are still open on main after tonight's merges.

- **Main checked:** `d0d870956d` (Nov 8, 07:05 UTC), read with `gh api` only. Since the audit, the Fixer merged You (#7357), the person card (#7358), Budgets (#7363), Government (#7364) and Saved games; Legislation merged a bill stage API (#7369, no screen yet).
- **Quotes:** his words exactly, unless marked "recorded" (the CTO's wording of what he said).
- **Sources:** OD = `docs/coordination/OWNER-DECISIONS.md` by line; LAW = `docs/play-first/LAW.md`; REG = `docs/coordination/DECISION-REGISTER.md`; PRS = `docs/coordination/prior-rulings/screens.md` by entry; S26, S27, S28 = the Oct 26, 27 and 28 sittings in `docs/coordination/playtest/`; M = a memory file; FR = `cto-notes/menus/examples/front-record.md`.
- **Code:** `play.mjs`, `play.css`, `play.html` and `ui/` are under `src/bench/`. Line numbers are on main at the commit above.

---

## Tonight's two (do these first, every session)

### 1. No subtexts, anywhere. Everyone; the Fixer sweeps the shared words.

- **Ruled:** "I see, again, I say remove all those subtexts... Remove all of those submenus. Kept. That's why she holds the tax at 35 mils... Fades about October too. Those, I already said I don't like those." (Nov 8, about 2:15 a.m., FR and M no-subtexts-nov8). Before that: "REMOVE. THE. MENU. SUBTITLES. DO NOT REPLACE THEM" (Oct 27, OD:449); "remove all those fucking subheadings. I hate them. I hate them all." (Oct 27, S27); "These subtitles need to fucking go." (Oct 27, on Travel cards, S27 log).
- **On main, still there:**
  - Saved games: "Your life is kept as you play. More saved lives, and saving to a slot of your own, arrive with early access." (`controls.json` saves.later; `play.mjs:3340`). It's also dev talk. The place sits under the name as a second line (`play.mjs:3317`).
  - Travel: "You file here to run for office. The clerk takes your papers..." under "What you do here" (`controls.json` travel.filingDoes; `play.mjs:3488-3493`). Each card carries a reason line ("You work here", "You can...", "Where you serve") and an open line (`play.mjs:3447-3467`). See conflict C4.
  - Parties: "Your recorded views against the party's platform: {fit}" (`controls.json:359`; `play.mjs:1321`). Dev talk too.
  - Patch notes: a chip and the note's text under each title (`play.mjs:3239`, `3264-3266`).
  - The player card: "Something needs you" over Day and Week, with a second Continue (`play.html:641-649`; `play.mjs:495-503`). See item 9.
  - The creator: "You will be {age} on {date}, the day your life begins." (`play.mjs:4958`), and a disabled button that reads "Choose a gender to randomize a name" (`play.mjs:4982-4987`). The Nov 8 front mock drops both and flashes the field red instead (FR).
- **Docs on main lag:** `docs/mocks/2026-11-07-approved/MENU-LOOK.md` has the Nov 7 subtitles line but not tonight's ruling or the glossary line. Its `RULINGS-nov5.md` stops before items 57 to 59.
- **Do:** delete each line above, don't reword it. A figure goes on the same line as its label or into the control. Check every new screen before merge.

### 2. The glossary's inline help. Fixer builds it in the shared parts; Legislation, Story and Dev Mode use it on their screens.

- **Ruled:** "Also, I've never seen any of the inline helping stuff for the glossary." (Nov 8, 2:15 a.m., FR). Sept 29: "Clicking 'Got it' marks the term learned for this player. The underline then no longer appears anywhere, but the term stays in the glossary." (recorded, PRS 6); promised "a thousand times" (recorded, M glossary-underlines-radial-portrait). Oct 2 lock: "'Mark as learned' MUST ship." (recorded, PRS C5). Sept 29 hand-back: the Guide "can take the mark back"; the card opens after 250 ms and closes 180 ms after you leave (PRS 11). Oct 28: "Terms get the carbon-copy underline and show the guide text on hover; the Guide itself is a separate entry in the menu." and "'What is a trustee?' Hovering Trustee should explain what the office does" (recorded, S28 #23, #30). Register: "Normal click/focus opens a short plain-language explanation in place"; a keyboard route; "Provide a reset/restore-learned control" (register wording, REG OCD-UI-014, Sept).
- **On main: partly.** The parts exist: the tip card and "Mark as learned" (`play.html:653-659`; `play.mjs:366-440`; `ui/term.mjs`). But:
  - Only a whole label that equals a term gets underlined, "never a search through prose" (`play.mjs:421-424`). That means `row()` labels and big-chamber leader posts only (`play.mjs:144`, `3944-3950`). No talk box, narration, bill paper, news, journal, calendar, filing counter or office text is ever scanned. So he has never seen one.
  - 38 terms (`data/research/glossary/terms.json`), all procedure. No offices (Trustee, Selectman, Council member, Commissioner, Alderman), so his Trustee example can't work.
  - Mouse only (`ui/term.mjs:9`). No focus or keyboard route. No unlearn or reset in the Guide (`play.mjs:3133-3218`). The card opens at once, with no 250 ms rest.
  - The card is a boxed panel with a hard edge (audit #15).
- **Do:** one shared helper that underlines known terms inside any player text (first use per screen, never inside a name), used by the talk box, narration, the bill paper, news, the journal, the calendar and the filing counter. Add office terms from the offices data. Add focus, a reset in the Guide, and the 250 ms rest. Restyle the card to menu-look. Show him a real underline in a real scene.

---

## Not done or partly done, most important first

### 3. Owner rulings since Nov 5 aren't in OWNER-DECISIONS.md. CTO (docs).

- **On main:** the newest entry is "Nov 5, 12:49 p.m." (OD:10). None of the Nov 5 menu look, the Nov 7 approvals, or tonight's rulings are there. LAW.md says a ruling is added "only after it is in `docs/coordination/OWNER-DECISIONS.md`" (LAW:5), yet LAW.md already cites the Nov 5 to 7 rulings.
- **Do:** add the Nov 5, Nov 7 and Nov 8 screen rulings to OWNER-DECISIONS.md, newest first, with the conflicts at the end of this file.

### 4. Stale lines on main that a session would build from. CTO (docs).

- LAW:15 still describes Issues as "a marker between the two extremes". He ruled against that: "I don't want those sliders that's in the UI mockup, though. Those are too video game-like." (Nov 5, R 2).
- `docs/ui/kit13/APPROVED-2026-10-04.md` still lists a slider, gold checkboxes, Continue and Back, and "brass corner mark only while activated". All were replaced Nov 5 (no sliders, no checkboxes, lit brass fill) and Oct 28 ("Remove every Continue and Back from every menu", recorded, S28 #22).
- LAW:20 still says "the calendar is an opaque panel" (Oct 15). See conflict C5.
- **Do:** fix those three lines with pointers to the Nov 5 rulings.

### 5. Four replies, with Say nothing beside them. Story.

- **Ruled:** "Four dynamic choices, always. A conversation always offers four replies ranked by the engine, with "say nothing" as a smaller control beside them, never one of the four." (Oct 14, LAW:58). Restated Oct 27 (OD:453).
- **On main: partly.** Say nothing is the smaller control (`play.html:599-601`). The box shows up to six replies (`play.mjs:1073`, `.slice(0, 6)`).
- **Do:** cap at four, ranked; never pad to four with rewordings (Oct 27, recorded: "four replies are four different answers, never one reworded", OD:484).

### 6. The speaker's portrait in the talk box. Story, with the Fixer's bust part.

- **Ruled:** he wants "the people's actual portraits in the top left" (Sept 27, recorded, M dialogue-box-and-lie-button). "Conversation box: serious and political; portraits top-left; numbered replies, no chevrons." (Oct 2, recorded, PRS 5). His pick: the small bust "cut out straight on the glass with the shoulders fading", 66 px, "no border and no background" (Oct 2, recorded, M ui-kit-picks-oct1).
- **On main: partly.** Top left, yes. It's a 62 px round headshot (`play.css:295-306`; `ui/headshot.mjs:1-3`), which the audit calls a face in a ring (#65).
- **Do:** use the bust part from `ui/strips.mjs` (fading bust) at talk-box size, lit evenly, per menu-look.

### 7. "Skip scene" or "Simulate scene" instead of Continue. Story.

- **Ruled:** "'Continue' becomes 'Skip scene' or 'Simulate scene'" (Oct 26, recorded, OD:523; S26 #9, "his idea").
- **On main: partly.** "Skip scene" shows only while a speech plays (`play.mjs:1766`; `play.html:592-598`). Other scenes have only Continue.
- **Do:** offer Skip scene on every scene with replies; the director plays it out on its own path.

### 8. Talk history in the box. Story. See conflict C2.

- **Ruled:** talk history set apart, "different color, separated" (Oct 26, recorded, OD:523). "There is not enough delineation between what the player said, what was said before, and what is being said now." (Oct 28, recorded, S28 #39).
- **On main: done for Oct 28.** Three past lines sit above the current one, quieter and named (`ui/talk-box.mjs:40-56`; `play.css:1355-1385`). They are 13 px, under the 15 px floor.
- **Do:** keep the three kinds apart inside the box, at 15 px or more, and never above the box or over the room (Nov 7).

### 9. Nothing on the card but the date and time. Fixer.

- **Ruled:** "There doesn't need to be any indicator other than the time and date on the bottom... The game is played through scenes. That's what stops time" (Oct 27, OD:459). In that sitting, the card read "SOMETHING NEEDS YOU" with a Continue, and "Nothing explained what needed me" (recorded, S27 log).
- **On main: not done.** The card still shows "Something needs you", "The meeting" or "Your desk" with its own Continue (`play.html:641-649`; `controls.json` endedBy).
- **Do:** a stop opens its scene or screen directly. Drop the label and the card's Continue.

### 10. The rail: names on hover, a dot for anything unread. Fixer.

- **Ruled:** "Bottom left: the player card, with the vertical icon rail above it (names on hover)... Alerts: a toast for news that just reached you, a dot on a rail icon for something unread, a scene when something needs you; no pop-up lists." (Oct 20, recorded, OD:632).
- **On main: partly.** The names are the browser's own tooltip (`ui/rail.mjs:47`), not a styled name after about 250 ms. The dot exists for News only (`play.mjs:991-996`).
- **Do:** a styled hover name, and unread dots for Journal, Calendar and People too.

### 11. Fewer pop-ups. Story (what pops), Fixer (the part).

- **Ruled:** "Not every small world update needs a pop-up." (REG:752, Sept). "Same thing with a journal on the bottom right." (Oct 26, S26:34, on pop-ups he couldn't clear).
- **On main: partly.** Pop-ups fade and close (`ui/toast.mjs`). But every newest journal line pops (`play.mjs:510-520`).
- **Do:** pop a journal line only when it matters (a chapter turn, a first), and never during a scene.

### 12. Which stops interrupt you, by default and customizable. Dev Mode (owns Options tonight), with Legislation for office stops.

- **Ruled:** "What stops you in office: your own bills, any vote where yours could decide it, your desk, and scenes, by default; you can customize it." (Oct 29, recorded, OD:258). See conflict C6.
- **On main: not done.** The server has `/api/scene-filter`; no screen calls it (audit #9).
- **Do:** one short Stops setting in Options with those defaults. Lit toggle buttons, never checkboxes.

### 13. Before a vote: what colleagues told you and your aide's estimate, no exact count. Legislation.

- **Ruled:** "Before a vote you see what colleagues told you plus your aide's estimate, marked as an estimate that can be wrong. No exact count." (Oct 29, recorded, OD:257).
- **On main: not done.** The bill shows exact for, against and undecided counts (`controls.json:272-273`; audit #42). The new bill stage API (#7369, `src/bench/bill-stage.ts`) has "told", but no screen reads it yet.
- **Do:** the bill and floor screens show "told you yes/no" by name, plus one estimate line from the aide, marked as an estimate.

### 14. Dev controls on the game's own screens, driving the same path. Dev Mode.

- **Ruled:** "It should be a fast track to prove whatever needs to be proved in the game... simulate X amount of days at a time, or until a certain thing has happened... force pass things and you could choose the margin" and "Making it happen should just trigger the code in the game that makes it happen... it has to be built out to where the player can get to it... you should be able to force a scene... See what people remember." (Nov 8, about 12:50 a.m., M dev-mode-proving-ground-nov8).
- **On main: not done.** Options has a dev-only "Dev mode" button that opens the separate `/dev` page (`play.mjs:3376-3381`). The top-right gear toggles a hidden class and is labeled "Customize the world" (`play.html:660-672`; `play.mjs:4873-4877`).
- **Do:** dev controls sit beside what they act on, in the menu look, and every one calls the player's or the world's own path. Dev screens follow tonight's subtext cuts (FR).

### 15. A face tells you who someone is; hovering links name and figure. Story, Fixer.

- **Ruled:** "Hovering (or focusing) a name on the card puts a soft glow around that person in the scene, and hovering the person highlights their name." (Sept 29, recorded, PRS 9). "Introduce people before they speak. The narrator says who someone is and why they are here" (Oct 15, LAW:38).
- **On main: not done.** The room makes people clickable (`ui/room.mjs:55-56`), with no glow tied to a name.
- **Do:** in scenes with several people (the opening, meetings), hovering a name in the talk box lights that figure, and back.

### 16. People: the web he liked, faces lighting their lines, no boxes. Fixer.

- **Ruled:** "Built on the old People web ... Clicking a face lights their lines and says in one sentence how you know them. No side info panel." (Oct 14, LAW:36). "There was a people map that had already been made that I had already really liked... It had different colors for different people" and "no black box around my guy or anyone else. It should be either a headshot or the people cut out" (Oct 27, OD:433-435). "there shouldn't be a separate family tab" (Oct 27, OD:434).
- **On main: partly.** The web exists with filter tabs and List and Web views (`ui/people-web.mjs`; `controls.json` people). Faces are round crops in gold rings (audit #25). "Family" is a filter tab, which matches.
- **Do:** busts or cut-outs without rings, and the one-sentence "how you know them" on click.

### 17. Overheard news on TV or radio. Story.

- **Ruled:** "News you overhear: TV or radio speaks like anyone else: a small card in the conversation text style with a tiny radio/TV icon, the station, and the line." (Oct 14, LAW:81).
- **On main: not done.** Nothing in `play.mjs` or `ui/` shows broadcast news in a room.
- **Do:** the director stages a TV or radio line as a speaker in the talk box, the station named. A small icon is allowed here because he asked for it.

### 18. Public figures are known. Fixer (person card), Story (lines).

- **Ruled:** "Public figures are known. Everyone knows what the public knows about the president, the vice president, their governor, their representative and their mayor ... "you have never met" is never the only line." (Oct 14, LAW:50).
- **On main:** not checked in the new person card (#7358). Check that a public figure's card shows public record and what's said about them, even when you've never met.

### 19. Options gets real settings. Dev Mode or Fixer.

- **Ruled:** "Options needs real settings (date format, profanity softening, reduced motion)." (Sept 27 UI brief, recorded, PRS 15). "Optional presentation filters may soften depiction without rewriting established saved facts." (REG OCD-UI-010).
- **On main: not done.** Options has Version, Full screen, Dev mode and Quit to title (`play.mjs:3342-3392`).
- **Do:** with color-blind and Stops (items 12 and the skill), add reduced motion and a softening filter. Lit toggles, no checkboxes.

### 20. Painted screens and posters become live surfaces. Story (art spots), Fixer (drawing).

- **Ruled:** painted screens, blank posters, sticky notes, newspapers and brochures "should become dynamic like the room's TV and newspaper" (Sept 27, recorded, M title-screen-and-live-surfaces). The register agrees: "populate actual news, agendas, institution/store names, notices... from the same saved world" (REG:530).
- **On main: not done** beyond the opening's news on the table.
- **Do:** later. Mark surface spots when rooms are repainted.

### 21. Calendar events open their details. Fixer.

- **Ruled:** "Calendar event selection opens details including what the event is, the recorded invitation/source, known attendees and supported travel/time information... Inspection never automatically attends." (REG OCD-UI-011, Sept). The player's own deadlines first; one worded line each; no "LAW TAKES EFFECT" rows that name no body (Oct 27, recorded, OD:477).
- **On main: partly.** "Go to this day" and kinds you can hide exist (`controls.json` calendar). No attendees or source on an event (`ui/calendar.mjs` has none).
- **Do:** build it into the approved Calendar (cal-strips) as each event's own view.

### 22. Things that need running the game to check. Whoever builds the screen.

- "It shouldn't take 5 seconds after you open a menu for it to load. It should be there instantly." (Oct 29, OD:345). Faces on menus.
- "Buttons are the same size." (Oct 24, recorded, OD:580).
- "Travel always lists destinations, including at night" (Oct 27, recorded, OD:489).
- Back on "where are you from" goes back to the states; no native scroller in the places list (Oct 28, recorded, S28 #5, #6). The CSS styles the scroller (`play.css:1074-1095`).
- **Do:** check each in the running game when that screen is next touched.

---

## Skill rules still open on main after tonight's merges

These are held in menu-look or the audit. They're listed because a session might think tonight's merges closed them.

- **"Ward" on Government.** City seats still read "Ward {n}" after the Government rebuild (`controls.json` politics.ward; `play.mjs:3800-3803`). He said: "take off, a word [ward]... Again, American English." (Nov 5, R 9). Fixer.
- **Corner marks on pressed buttons.** The brass corner still shows on active buttons (`play.css:388-397`, `904-912`). Nov 5 replaced it with a lit brass fill (R 7). Fixer.
- **Options.** Full screen is a checkbox (`play.mjs:3345-3366`; `ui/fields.mjs:66-67`). No color-blind setting exists in `play.mjs`, `play.css` or `ui/`. Dev Mode or Fixer.
- **Plates with corners inside menus.** Plates still draw their own brass corners (`play.css:3924-3936`), and `ui/timeline.mjs` still exists. Nov 5 and Nov 7 replaced both. Fixer.
- **The HUD in scenes.** Only meetings, election day, the ballot and election night hide the rail and card (`play.mjs:702-970`, the `cinema` class; `play.css:1937-1940`). Talks and story scenes keep them (R 35). Story, Fixer.
- **Talk box size and type.** 680 px wide (`play.css:1347-1351`); replies 14.5 px (`play.css:412-418`). Nov 7 asked for a wider box with larger type. No scene name at top center. Story.
- **Title.** Three monuments, no Washington Monument or Jefferson Memorial, no hero figure or passersby (`src/bench/title.ts:12-16`). The New game panel still has Back (`play.html:158-165`). Fixer.

---

## Done on main (don't redo)

- **Lie is the scales of justice, upper right, no word "Lie" anywhere.** "LIE = SCALES (his pick)"; "NO 'LIE' TEXT ANYWHERE"; locked at 34 px upper right (Oct 2, recorded, M dialogue-box-and-lie-button). Main: `play.html:564-582`; `play.css:1327-1340`, `592-690`; `play.mjs:1059-1062`, `1124-1128`.
- **Plain numbered replies, no marks, no boxes; number keys answer.** He chose "PLAIN NUMBERS" (Oct 1, recorded, M ui-kit-picks-oct1). Main: `play.css:412-426`; `ui/talk-box.mjs` mountTalkKeys.
- **Narration alone shows one Continue, bottom left; no Leave or Say nothing.** "WHEN IT IS JUST THE NARRATOR REMOVE THE LEAVE/SAY NOTHING! ... CONTINUE ON THE BOTTOM LEFT" (Oct 27, OD:453). Main: `ui/talk-box.mjs` fillTalk; `play.css:1404-1413`.
- **No Say nothing when there's nothing left to say; Leave only where it's a real choice** (Oct 27, S27 #6, #7). Main: `ui/talk-box.mjs` talkControls; `play.mjs:1793`, `1823`.
- **The narrator first, Continue, then the person** (Oct 28, recorded, S28 #36). Main: `play.mjs:1036-1047`.
- **No line under the speaker's name** ("that needs work. I don't like the way that's displayed", Oct 27, S27 log). Main: `play.html:582` (`data-role="none"`).
- **No Talk button; clicking a person starts the talk; nobody is clickable without dialogue.** "Remove the goddamn talk button." (Oct 27, OD:479). "If there's no dialogue, you shouldn't be able to click on the person." (Nov 1, OD:78). Main: `play.mjs:335-338`; `ui/room.mjs:55-56`.
- **"Last talked" never shown** (Oct 27, recorded, OD:462). No reader on main.
- **No meter of how someone feels about you.** "No scale like that." (Oct 29, OD:190). No closeness bar or dot on main.
- **No initials in circles** (Oct 28, recorded, S28 #12). Main: `ui/face-grid.mjs:4`, `ui/list-row.mjs:32`, `ui/people-web.mjs:49`. (The Parties "R" badge is in the audit, #32.)
- **Mark gap and line grades are dev-only** (Oct 24, recorded, LAW:99). Main: `play.mjs:1100-1118`; `ui/talk-box.mjs` gradeControl.
- **One date and time, on the card, the time under the date** (Oct 1, M check-whole-screen-before-ui-merge). Main: `play.mjs` setClock.
- **Day and Week move time; a future day on the calendar offers "Go to this day"** (Oct 15, OD:858). Main: `play.html:643-647`; `controls.json` calendar.advance.
- **The rail: one column of round icons above the card, News on it, the Guide its own entry, Options on Esc** (Oct 14, Oct 20, Oct 28 #23). Main: `ui/rail.mjs`; `play.mjs:4719-4740`, `320-329`.
- **Pop-ups fade and close** ("The news box fades or can be dismissed", Oct 24, recorded, OD:580). Main: `ui/toast.mjs`; `play.mjs:239-266`.
- **Title menu words only, no subtitles** (Oct 27, OD:449). Patch notes in (Oct 28 #1). Saved games works (Nov 8, `58df6605cd`). Main: `play.html:73-139`.
- **Title rotation with drift and crossfade, monuments only, never convention halls** (Oct 26, Oct 29, Nov 3). Main: `play.mjs:4769-4800`; `src/bench/title.ts:4-16`.
- **No community-room painting** ("Stop using that community room reference picture", Oct 2, M no-community-room-art). The file is not in the repo tree.
- **New game: Start a life first, Advanced beneath** (Oct 24, OD:568). Main: `play.html:141-157`.
- **Creator:** the random name waits for a gender (Nov 1, OD:77; `play.mjs:4978-4987`); a missing field says what's missing (Oct 28 #3; `play.mjs:5049-5050`); a Random place (Oct 28 #4; `play.mjs:5149-5152`); everyday and work clothes chosen apart (Oct 29, OD:275; `play.mjs:5175`); the state field reads the state's name, not "Your state" (Oct 28 #15; `play.mjs:4154`).
- **Budgets hidden until they're yours** (Oct 24, OD:566). Main: `play.mjs:4603-4609`.
- **News: four paper looks, a drop cap never splits a number** (Oct 14, LAW:79; Nov 1, OD:83). Main: `ui/newspaper.mjs:44`, `316`.
- **Fonts:** Cinzel for names and titles at 800, Fira Sans for controls and numbers, Andada Pro for narrative (Oct 2 and Oct 4, M logo-uses-game-font, Kit 13). Playfair Display and Courier Prime are loaded for You and Budgets (Nov 7). Main: `play.css:12-75`, `100-102`, `307-311`.
- **The radial menu is gone** (see C8). Main uses the rail.

---

## Conflicts (newer wins unless the older makes more sense)

- **C1. A portrait on the player card.** Sept 29: "show the player character's current portrait" by the date and time (PRS 6). Oct 20: "Clicking your own portrait opens You" (recorded, OD:632). Oct 27, newer: "I'd rather have the date and time down there versus another picture for me" (OD:437). The menu-look skill's layout line says "portrait opens You; name, town". That line is the CTO's reading of Oct 20, not a newer ruling. Main follows Oct 27: date and time only, You on the rail (`play.css:1274-1286`). **Call:** keep Oct 27 unless he says otherwise. Fix the skill's line or ask him in talk mode.
- **C2. Past lines in the talk box.** Oct 26 and Oct 28 want them shown and set apart. Nov 7, newer: "have the dialogue take center stage", with no earlier lines floating over the room (R 35). **Call:** both hold. Past lines stay inside the box, apart, never above it.
- **C3. News as a paper.** Oct 14 (four paper looks, LAW:79), Oct 27 ("there is still no newspapers", S27) and Oct 28 ("must look like a real newspaper", recorded, S28 #25) want a newspaper. Nov 7, newer: no paper sheets on a panel; paper "still looks pasted on" (R 37, R 40). Nov 7 was said about Money and the paper options, not News. **Call:** ask him whether News is the exception. Until then, don't rebuild News either way.
- **C4. Travel cards: who's there.** Oct 27, about 3:30 p.m.: the card lines "need to fucking go" (S27 log). Oct 27, 5 p.m., newer: "a list of places with a painting per place type and who is there now" ("I like number eight", OD:465). Nov 8: no subtexts. **Call:** keep who is there now as names, on the same line as the place. Drop "You work here", "You can..." and the filing sentence.
- **C5. Calendar.** Oct 15: "the calendar is an opaque panel" (LAW:20). Nov 5, newer: one dark panel, 78% solid, for every menu. Nov 1: "just make them color code those things... And be able to hide them if you want." (OD:70). Nov 7, newer: "the events look too much like an iphone" (R 36). **Call:** Nov 5 panel. Kinds stay hideable, but no phone-style colored chips. Color goes in type or a small mark, from the color-blind setting.
- **C6. Interrupt settings.** Oct 14: "Options must not need a dozen interrupt toggles; the director decides what interrupts." (recorded, OD:787). Oct 29, newer: stops "by default; you can customize it" (recorded, OD:258). **Call:** a short Stops list with those defaults (item 12), never a dozen toggles.
- **C7. The version on the title.** Sept 8: "a consistent visible version number in the bottom-right" (PRS 22). Oct 14, newer: "no version string" on the front (recorded, OD:767). Main shows the version bottom right (`play.html:133-138`; `play.mjs:4801`). **Call:** low. Ask him, or keep it only in Options and Patch notes.
- **C8. Radial menu.** Sept 27, Sept 29 and Oct 8 asked for the radial (M ui-and-art-decisions-sept27, PRS 1). Oct 14, newer: "The menu is a straight column of round icons, bottom left... No radial menu." (LAW:16). Oct 20 agrees. **Resolved:** the rail. Main matches.
- **C9. Plates, timelines and tab rails.** Oct 29 asked for framed plates under every menu, a vertical timeline for histories, and a tab rail (OD:196). Nov 5 and Nov 7, newer: no boxes, no timelines ("again i said no timeline", R 38). **Call:** Nov wins. Main still draws plates with corners and has `ui/timeline.mjs`. The tab rail is fine if styled per menu-look.
- **C10. Panel see-through.** Oct 24: "Panels keep the slight gold box permanently, not transparent." (recorded, OD:580). Nov 5, newer: 78% solid with a slim brass edge. **Resolved:** Nov 5.
- **C11. Vote bars.** The memory menus-show-data-no-sliders-nov5 says "Vote bars and budget charts are data and stay" (Nov 5, 1 p.m., the CTO's reading). Later that day: "there's this green bar and stuff. No, I said that's not what I want" (R 15). **Resolved:** no bars. Fix that memory.
- **C12. What a click on a glossary term does.** Sept 29: clicking "Got it" marks it learned (PRS 6). The register: a click or focus opens the short explanation; Shift-click toggles learned (REG OCD-UI-014). Main: hover shows it, a click opens the Guide, a button marks it learned. **Call:** hover or focus shows the card with Mark as learned; a click opens the Guide. That fits all three. Add focus.
- **C13. The creator's portraits.** Oct 29: the creator "shows both portraits", everyday and work, standing (OD:275, OD:284). Nov 7, newer: "let's just do the busts... The full body, we keep coming with problems with that" (R 50). The front mock tonight shows busts (FR). **Call:** busts, unless he says the creator is the exception.
- **C14. Six replies or four.** Oct 14: four, always (LAW:58). Main allows six (`play.mjs:1073`). **Call:** four (item 5).

---

## Rules for anyone adding something new

- **Sound:** "No AI-generated music. Other sound direction and controller support remain unresolved" (REG:1024). There's no audio on main. Ask before adding any.
- **Every new player screen gets his look before it ships** ("UI is not done until the owner's build shows it", Oct 28, OD:429), and one UI package: "There needs to be one for every menu, and then a menu type, and then just insert it" (Oct 27, OD:428). Build from the shared parts in `ui/`, never a screen's own markup.
- **Tutorials** are asked by a person in a scene, yes or no, the first time something happens, with figures from the place's records (Nov 1, OD:69). The first-choice glow on main (`play.mjs:292-318`) is not that tutorial.
- **Nothing pops up because someone you know does something there** (Oct 28, recorded, S28 #27). Main honors this on Travel (`play.mjs:3442-3446`).
