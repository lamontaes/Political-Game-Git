# The play-first lane's law

Current as of 2026-10-24, 20:30 UTC (the acting CTO's lane PR; OWNER-DECISIONS.md, DECISION-REGISTER.md, prior-rulings/ and the Oct 14 mocks as on main at that hour)

Every ruling the owner made about the game as it is played, in his words or the recorded words, with the date and the line it comes from. The lane does not argue with this file. When an item's text and a line here disagree, this file wins and the agent writes the disagreement in its handoff line. A new ruling is added here only after it is in `docs/coordination/OWNER-DECISIONS.md`; nobody writes a ruling here first.

Sources are cited as `file:line` on main at the time above: `OD` is `docs/coordination/OWNER-DECISIONS.md`, `REG` is `docs/coordination/DECISION-REGISTER.md`, `MOCKS` is `docs/ui/mocks/screens-2026-10-14/README.md`, `PR-screens`, `PR-people`, `PR-opening` and `PR-words` are the digests in `docs/coordination/prior-rulings/`.

## 1. Screens and menus

- "A screen's look ships only on the owner's screenshot ... No change to how a screen looks (the title, a panel, edges, a backdrop, a control added to a screen) merges without the owner approving a full-window screenshot in the PR body." (owner, Oct 14, afternoon; OD:211)
- "The title and New game, as settled ... The menu is New game, Continue, Options, Patch notes, Quit. New game opens the choice: Start a life, Custom world, New world. Then the creator: name, age, birth. No seed field, no place search and no customization on the title itself." (owner, Oct 14, evening; OD:215)
- "World setup: a custom start lives in dev mode; a normal game has little preparation (RimWorld's amount at most)." (owner, Oct 14; OD:142)
- Politics: Government: "Each body: chamber picture, party split bar, members with party, recent votes as yes/no bars, what's coming up, the executive." (owner, Oct 14, mocks pass 2, "good"; MOCKS:28)
- Politics: Issues: "Law cards grouped by subject, like Democracy 4 and Crusader Kings 3: icon, the law in force in large type, a marker between the two extremes, who can change it, since when. The owner rejected a plain list ("like an Excel sheet")." (owner, Oct 14; MOCKS:29)
- The play screen: "Scene fills the window. The menu is a straight column of round icons, bottom left, above the player card; the name shows on hover. No radial menu. The toast (top right) is the pop-up when a story reaches you." (owner, Oct 14; MOCKS:24)
- "Charts: Not a screen of its own. One chart style (donuts, bars, this year against last) used anywhere numbers are compared: budget, money, votes." (owner, Oct 14; MOCKS:30)
- "Screens follow the Oct 14 mockups (owner, Oct 15) with caveats: nothing that breaks immersion on a person card; Issues follows this register, not its mockup; Your office appears only once the player holds one; the calendar is an opaque panel; Day never opens a choice list." (owner, Oct 15; REG:149)
- "The menu structure ... the scene is home; menus are overlays that pause time with the room's people still visible. Bottom left: the player card, with the vertical icon rail above it (names on hover): Journal, Calendar, Money, Politics, News, People, Travel. ... Options (settings, guide, quit to title) moves off the rail to the Esc key and the title screen. ... Politics: Government, Issues, Budgets, Parties, plus Your office only while you hold a seat and Campaigns only once you've filed. Alerts: a toast for news that just reached you, a dot on a rail icon for something unread, a scene when something needs you; no pop-up lists. Actions start from people, places and scenes, not menu lists." (owner, Oct 20, from the menu study; OD:76)
- "Who you are is a character screen ... Portrait, name, age, birthday, home and family, school or work, traits and views in words, money in one line, like any game's character screen. Law effects on the player belong under Politics, written as sentences, never as keys with "undefined"." (owner, Oct 14, night; OD:248)
- "The Politics screen's list of legislators ... keep everyone, behind a division filter: federal, state, local, with the ability to change which city and state you are looking at." (owner, Oct 16; OD:373)
- "Title/home controls must read as bespoke game UI integrated with the visual identity, not generic browser/form/Excel-style buttons." (register, owner direction, Sept 2026; REG:732)
- "Generic time progression must have one coherent primary home and shared behavior ... Use the game's shared visual language for buttons, fields, selectors, open picker surfaces, tabs and dialogs." (owner, Sept 20, OCD-UI-013; PR-screens:97)
- "title screen = recognizable national scenes (White House at night, Lincoln Memorial, rally, convention) with people posed in them, NOT state capitols and never the community-room painting". (owner, Oct 8; PR-screens:29)
- "This is a game, not a spreadsheet (owner, Oct 14)." (standing rule; AGENTS.md, "Standing owner rules")

## 2. People in rooms and figures

- "People art: the layered figure set (art/people-engine/v2/) is the owner's ruling of Oct 15 (he rejected the cut-out people and approved the 'make it once, right' brief); the Oct 12 whole-figure ruling is superseded." (owner, Oct 15; OD:297)
- "Remove all old models, shadows and seated figures (owner, Oct 13, 4:20 p.m.); figures are chosen by what the person is doing; leaders sit in their own buildings." (owner, Oct 13; REG:155)
- "Plain poses first (owner, Oct 13). Figures in plain poses with empty hands; the simulation decides what they are doing." (owner, Oct 13; REG:154)
- "Every figure in a scene must be drawn from that person's own appearance record." (Sept 29, 11:15 a.m., after the owner's playtest; PR-people:38)
- "Appearance selection uses direct arrows/gallery and color swatches, with immediate safe preview for a new unsaved character. Small person cards use headshots; full records show the same saved full-body person in a suitable stable pose." (owner, Sept 19; PR-screens:105)
- People: "Built on the old People web ... Clicking a face lights their lines and says in one sentence how you know them. No side info panel." (owner, Oct 14; MOCKS:26)
- From the Oct 24 read (section 10): the v1 figures ("the ones with the airplane") are completely removed; the Codex v2 set may be used, else people stand generated-in; people in the house need a reason to be there; no "X is with you"; "Noah Chan is with you" is removed; the person in the people web is the one you made. (owner, Oct 24; OD:24)
- "Introduce people before they speak. The narrator says who someone is and why they are here". (owner, Oct 15, night; OD:345)

## 3. The opening and speeches

- "The opening is the montage with the key people inside it: the President working and America, alternating, while the address plays like a broadcast; the Vice President, Congress and your governor with state legislators appear, named by office, when the speech turns to them; it ends at home with the partner's 'Did you see the President's speech?'" (owner, Oct 28, night; OD Oct 29 02:35)
- "The President gives the inaugural on Inauguration Day, the State of the Union in its season, and otherwise a televised address from the Resolute desk." (owner, Oct 28, night; OD Oct 29 02:35)
- "The opening's sequence: the president's address with the vice president and key people behind them, pointed out by name and office as the camera passes; then Congress; then your governor with a few important state legislators; then your family, if you have one (else skip); then into the game at home. Cutaways during the address follow the sentence's subject." (owner, Oct 14; OD:108)
- "The opening's key people ... the president and vice president; the state's legislators; the most powerful person in each chamber ...; and the player's own representatives (their council member, state legislators, U.S. representative and senators). Nothing else is "key" at the opening." (owner, Oct 15; OD:290)
- "Scenes are the narrative ... The President's address at the opening is the model: the director reads the records, picks from everything the simulation supports the scenes that apply to this person now, and fires one, told by the English engine." (owner, Oct 14, night; OD:233)
- From the Oct 24 read: "The opening speech is generated per world and per president from the game's numbers, not formulaic." (owner, Oct 24; OD:24)
- "Speeches are built as the player gives them (the owner's Suzerain example). Short openers and closers, then longer, meatier choices at the core of the speech, on different subjects. A four-line rally is not a speech." (owner, Oct 15, evening; OD:310)
- "Speeches: the player composes a speech by picking one of four parts at a time, as Suzerain does; the parts come from the English engine's speech acts and the player's own record and positions." (owner, Oct 14; OD:138)
- "Public figures are known. Everyone knows what the public knows about the president, the vice president, their governor, their representative and their mayor ... "you have never met" is never the only line." (owner, Oct 14; OD:121)

## 4. Scenes and conversations

- Scenes like Wildermyth: scenes "that come out of what is actually happening in the world, narrated into a moment, played out with real dialogue and choices, the outcome back into the game; the current opening is the right shape, the words are wrong." (owner, Oct 24, relayed by the acting CTO; OD:23)
- "A scene has an endpoint. It exists for something: money, a bill, or the player's political life. ... "Where do you work" between relatives is not a scene. Family talks are personal scenes only ... and lines like "Have you talked to Diana?" do not belong in one." (owner, Oct 15, evening; OD:306)
- "The narrator sets the scene. A few sentences of narration set it up; then the characters play it out. Two short narrator lines ("Your son is with you." "You got a job.") do not set a scene." (owner, Oct 15, evening; OD:307)
- "A reply continues the conversation. "All right" and "Okay" as answers to "How's Keanu?" are not how conversations work, even when grammatical. The four replies each move the talk somewhere." (owner, Oct 15, evening; OD:308)
- "Four dynamic choices, always. A conversation always offers four replies ranked by the engine, with "say nothing" as a smaller control beside them, never one of the four. A reply's second move follows from its first." (owner, Oct 14, afternoon; OD:209)
- "What a scene is. A scene has a setup, a person with a purpose, and stakes, and it plays out ... A yes or no never ends a talk; the asker follows up. Nobody closes with "Talk to you soon" after a question was answered." (owner, Oct 15, evening; OD:327, OD:334)
- "Words (from grading batch 6, spoken): lines must sound like people talk ("Where are you from?", "I'm from Washington. What about you?", "And you?"); a reply's second move must follow from its first (never "I'm from Washington. Have you talked to Omar?")". (owner, Oct 14; OD:117)
- "No cold "How is X?" questions about people not in the room unless something recorded happened to X". (owner, Oct 14, night, Q7; OD:242)
- "Scenes carry the consequential dialogue; the day screen carries the dealing ... A scene has a goal, is told as a narrative with the player's character, the narrator ... and the other people, and its dialogue is consequential". (owner, Oct 14, night, 9:25 p.m.; OD:250)
- "Plain words, no trade or dev language. "Canvassing" or "door knocking", never "the doors"". (owner, Oct 15, night; OD:347)
- "The campaign day: no "Today" list of acts. Campaign acts are scenes you go to (a venue for a speech, doors to knock, an interview, a debate); the Campaigns tab shows standing and polls only." (owner, Oct 20; OD:77)
- "Election day is a scene. The player goes to their polling place and marks a ballot there; the vote is cast in the scene, never in a menu." (owner, Oct 14; OD:110)
- "The player's choices are the player's ... No engine accepts a job, a home, a filing or any choice for the controlled person; the engine offers, the player decides." (owner, Oct 14, night; OD:246)

## 5. Journal and the past

- "The world has a past. History does not start on the day the player generates in. Laws in force carry their enactment history; the prior election for every seat exists with its campaign facts; officials have voting records from the prior term; the year before day one has a news archive". (owner, Oct 14; OD:120)
- "The player's own context: parents, their relationship, siblings, where the family came from and a few remembered moments are kept facts the journal and dossier render from day one." (owner, Oct 14; OD:122)
- "The journal is a dramatized story, not a list of facts. It reads like a memoir: "When I was seven my dad died; I had no idea how much that would shape my life." School years are not entries unless something happened in them. ... Running, winning, losing, deciding to run are entries. ... No entry is a lone event with no story around it." (owner, Oct 14, morning; OD:186)
- "Journal lines carry their subject. "My father was elected mayor" (the office), "My daughter Jane was born" (the name), and "Little did I know" needs what." (owner, Oct 15, evening; OD:309)
- Journal mock: "Approved as is ("solid")." (owner, Oct 14; MOCKS:32)
- From the Oct 24 read: "People's histories are simulated and the journal runs from day one." (owner, Oct 24; OD:24)

## 6. News

- News: "The owner loved the front page idea and wants many looks. Four here: old broadsheet, modern color daily, tabloid, town weekly. Each paper gets its own fonts and layout. The game paints the photo of the actual story". (owner, Oct 14; MOCKS:37)
- "Each outlet gets its own newspaper layout (owner caveat, Oct 15)." (REG:141)
- "News you overhear: TV or radio speaks like anyone else: a small card in the conversation text style with a tiny radio/TV icon, the station, and the line." (owner, Oct 14; MOCKS:38)
- "Not every small world update needs a pop-up." (register; REG:750)
- From the Oct 24 read: "The news box fades or can be dismissed." (owner, Oct 24; OD:24)

## 7. Words that ship

- "Grading (owner, Oct 24): batch-style line grading is not how the owner grades; he reacts to scenes and scenarios with voice notes; the hold on hand-written lines is released; graded and liked lines ship." (owner, Oct 24; OD:22) This replaces the Oct 20 night "Authored parts held until graded" ruling (OD:61) for lines the owner graded or liked: a change in `data/english/` that flips such lines to shippable is the owner's ruling, never a send-back reason.
- "Ungraded is not rejected. Lines and pieces the owner didn't grade aren't rejected; the good ones go into the game as simulation pieces." (owner, Oct 16; OD:360)
- "The text rule ... the banks in `data/english/parts/` are built at development time by writing pieces to the calibrated patterns ... the English engine arranges the pieces at play; no text is typed into screens or code." (owner, Oct 15, evening; OD:315)
- "No hand-written player text. Words come from the English engine; screens show record data and control names." (standing rule; AGENTS.md)
- "Send finished work only. Don't hand over a batch with a "still rough" list; fix what is known before the owner grades." (owner, Oct 16; OD:367)

## 8. Dev-speak

- "English calibration may draw on everything readable ... nothing ships in dev speak." (owner, Oct 14; OD:124)
- "Never developer or record language. Forbidden: 'on the record', 'reported', 'tentative hold'... 'a skip', 'lapses', 'supported', 'this save's'". (owner, Sept 27 UI brief; PR-screens:85)
- "Remove every out-of-world disclaimer from player text... The player is in the world; never talk to them as a developer." (Sept 29, relayed from the owner; PR-words:40)
- "A throwaway developer test bench, not a game screen ... Player screens get no developer text." and "Developer screens (LQ-10). Removed from the player build and kept in the developer route." (owner, Oct 9 to 10; PR-screens:33, PR-screens:125)
- Mark gap is a developer control (it posts a "gap" note from the talk box, `/api/talk/gap`); it is never a player control and never appears on the installed game's screens (from the Oct 24 playtest, log 15:55, and the rulings above; acting CTO reading, the owner may overrule).
- "Dev mode ... one mode where the owner or a player can do anything". (owner, Oct 14; OD:145) The lane never uses it to get past a defect.

## 9. Time

- "Moving time (owner, Oct 15): the Day button and a Week button advance time. On the calendar, clicking a future day shows a small skip-forward icon or button (no 'skip to event' label); pressing it runs time to that day. A scene stops any advance." (owner, Oct 15; OD:302)
- "Day advances time; scenes stop it ... Pressing Day never opens a list of mundane choices ... What stops time is a scene the director fires from the simulation's records." (owner, Oct 14, night; OD:231)
- "The scene is home; menus are overlays that pause time with the room's people still visible." (owner, Oct 20; OD:76)
- "A quiet day is quiet: the player can skip days at a time (Q6: nothing fires)." (owner, Oct 14, night; OD:241)

## 10. The owner's read of the Oct 24 screenshots (in full)

> **The owner's read of the playtest screenshots (owner, Oct 24, relayed by the acting CTO; carried by docs/play-first/ORDER.md):** Start a life is the main one and goes first; Custom world and New world are combined or explained. Panels keep the slight gold box permanently, not transparent. The creator's month, day and year line up. One font in the town list (the states' font), and the populations shown are the simulated ones. The v1 figures ("the ones with the airplane") are completely removed; the Codex v2 set may be used, else people stand generated-in. People in the house need a reason to be there: no "X is with you"; "Noah Chan is with you" is removed. The news box fades or can be dismissed. The opening speech is generated per world and per president from the game's numbers, not formulaic. People's histories are simulated and the journal runs from day one. The person in the people web is the one you made. Menus look like a real game, not a spreadsheet, per the mocks and the UI guides. No budgets for a 17-year-old. The politics screen needs a guide. Buttons are the same size.

(OD:24)

## 11. The world on screen makes sense

- "Why, every time. Recall petitions against every board member at once, a legislature passing its whole year on one day, a nineteen-year-old cashier with $9,900 saved, a governor unopposed, a defeated state House member with no next chapter, every winner taking office on January 1: each is a defect until the record answers why." (owner, Oct 14, morning; OD:190)
- "Statewide races draw statewide candidates. The state's party leaders and officeholders are the pool for governor, lieutenant governor, attorney general and the like; a race with only the town's people weighing it is wrong." (owner, Oct 14, morning; OD:191)
- "Taking office follows the law of the place, from data (constitution or statute, cited), not a single date." (owner, Oct 14, morning; OD:192)
- "Town size (day-one audit): a town opens at its real Census size; nothing pads it to 10,000." (OD:95)
- "Standard for the morning build: the behind-the-scenes logic makes sense and every system works as intended; what remains is graphics, English and the human feel. The player can run for office, debate, read the news." (owner, Oct 14; OD:123)
- "Estimate, never UNKNOWN. A value a player can see starts from the real average with a per-world spread, marked as an estimate with its source." (standing rule; AGENTS.md)

## Also binding on the lane

- "Lane edits director and English files (owner, Oct 24): play-first lane agents may edit `src/director`, `src/english` and `data/english` directly for lane items; the Words session reviews those PRs (`Review: words` in the PR body); the merger does not send a lane PR back for touching those files." (owner, Oct 24; OD, "Oct 24: rulings")

- "Play first (owner, Oct 24): "Only the bare minimum needs to be put in the game right now. I still can't play the game."" (OD:20)
- "The play-first lane (owner, Oct 24): all playtest work in one lane with one owner (docs/play-first/), run by many agents in turn; every assignment SMART and time-boxed; push constantly so nothing is lost between agents; the owner's rulings in LAW.md are the lane's law." (OD:21)

## Conflicts, flagged (newest wins unless the older makes more sense)

- **Budgets.** The Oct 20 menu lists Budgets under Politics at all times (OD:76); the Oct 24 read says "No budgets for a 17-year-old" (OD:24). **Ruled (owner, Oct 24, "go ahead"; newest wins):** Budgets is hidden until it is relevant to the player: they hold office, have filed, or are of age to vote. The Oct 20 "always shown" line is superseded (item `play-first-14-budgets-hidden-until-relevant`).
- **Custom world on New game.** Oct 14 lists Start a life, Custom world, New world (OD:215) and puts a custom start in dev mode (OD:142); Oct 24 says Start a life goes first and the two world modes are combined or explained (OD:24). **Ruled (owner, Oct 24, "go ahead"):** one button, Start a life; the world modes (custom, watch) live under one Advanced link beneath it; the Oct 14 dev-mode custom start stands for the custom world (item `play-stop-13-start-a-life-or-new-world`).
- **Issues.** REG:149 says "Issues follows this register, not its mockup"; MOCKS:29 records the owner rejecting a plain list. **Ruled (owner, Oct 24, "go ahead"):** law cards per the mock, not a plain list; the register's list line is superseded (item `play-first-12-politics-screen-to-mock-b`).
- **Populations on the town list.** The Oct 24 read asks for "the populations shown are the simulated ones" (OD:24); a town opens at its real Census size (OD:95). Both hold: the list shows the count the world opens with, from the one source the world builds from.
- **State legislators on Politics.** The Oct 16 ruling keeps every legislator behind a division filter (OD:373); `play-stop-05`'s done-when asks for one per chamber. OD:373 wins: the player's own come first, everyone stays behind the filter.
