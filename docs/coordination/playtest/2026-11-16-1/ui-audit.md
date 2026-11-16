# UI audit for the Nov 16 playtest (v0.112.0, main ca195112)

He asked "Did that UI ever get wired?", "where are the metrics pages that I approved?" and "what happened to all the UI stuff?" This file answers each item: what he approved, what got built, where it is now, why he doesn't see it, and what finishing it takes.

**Method.** This was read-only. I read main at ca195112 from the local object store in `~/Documents/PG-LAND` (`git show ca195112:...`, with no checkout and no fetch), plus a few `gh api` and GraphQL calls for PR state. I also read the memory files, the menu-look skill, `cto-notes/` and his screen recording, using the contact sheets in `scratchpad/pt1/sheets/` (times below are recording times). Each claim is marked:
- **[code]**: seen in code on main;
- **[rec]**: seen in his recording;
- **[none found]**: searched for and not found.

## What most of these share

1. **The panel itself never changed.** Builders copied what goes inside the approved mocks (section strips, layouts, busts). The panel every screen sits on is still the Oct 14 Kit 13 gray glass. No pool item ever had changing it as its job. The rule was pasted into at least ten items as boilerplate, and none of them names the surface as its fix.
2. **The visible part came last and was never picked up.**
   - Metrics: the Nov 12 plan put the data plumbing first. The screen he approved is build order 13 of 13, open and unclaimed.
   - The industries work went into the economy engine and dev mode, not into Travel.
3. **No UI owner since Nov 12.**
   - On Nov 10 he gave the UI to Fable B ("Fable does the UI and UX itself").
   - That account ran out on Nov 11. From Nov 12 the crew moved to the Account lead on the other account. The Nov 13 to 16 trains were almost all systems, words and tests.
   - After Nov 11 there was no look or design work, only small screen fixes:
     - Travel says why each place is listed (#8485, #9230);
     - the campaign trail card got a picture (#9021);
     - news leads got pictures (#9373);
     - the creator got its Everyday and Formal tabs (Nov 12).
   - He then said the rest of the creator's design waits for his playthrough. Today's sitting was that playthrough.
4. **Written rules allow things he hates.**
   - MENU-LOOK.md on main allows "a bounded box that scrolls inside itself", and the patch notes and People pages both use one.
   - #8526 put a bust in the creator before a gender is picked, on purpose.
5. **GitHub state is misleading.**
   - Four industries PRs show "open" but are already in his build (folded into Train 2).
   - Six drafts sit on base branches that have since merged.
   - Pool status fields lag: Metrics orders 6 and 10 are on main while their items say open or in-pr.

---

## 1. The approved menu look on every screen

**What he approved**
- Nov 5, about 1:40 p.m.: "i like the dark panels but i dont like the boxes being displayted like that. and i wish it was a little transparent but not all the way but still with a little bit of texture. we are just going to update all the ui once and for all."
  - He then picked 78% solid and "Slim frame, cooler panel".
  - About 2:30 p.m., on hover: "I like stuff that kind of glows". About 2:45 p.m.: "I like the fading frame, but with the halo."
  - Source: `docs/mocks/2026-11-07-approved/RULINGS-nov5.md` items 3, 5 and 6.
- Nov 7: he approved the You, person card, Government and Budgets mocks, and section strips with the broken gold outline (items 46 to 56).
- Nov 8, 1:38 a.m.: "I'm going to conditionally approve all the UI stuff you made earlier... take the principles you learned from everything today, apply that to... everything else" (item 59).
- It is locked in `MENU-LOOK.md` and `docs/play-first/LAW.md` line 18: "dark see-through textured panel, no boxes, glowing hover, lit selection, portraits in light, data not sliders".

**What was built (inside the panel)**
- You follows the approved mock: [#7357](https://github.com/lamontaes/Political-Game-Git/pull/7357) (Nov 8).
- Government follows its mock, with the party bars gone: [#7364](https://github.com/lamontaes/Political-Game-Git/pull/7364) (Nov 8).
- Budgets follows its mock, with the ring and bar charts gone: [#7363](https://github.com/lamontaes/Political-Game-Git/pull/7363) (Nov 8).
- Menu-look sweep: glossary card, plates without corners, rail names on hover, the bar hidden during a scene ([#7434](https://github.com/lamontaes/Political-Game-Git/pull/7434)).
- No arrows and no "1 of N" on any list: [#7743](https://github.com/lamontaes/Political-Game-Git/pull/7743).
- One UI system (one button size, one list row, busts on menus): the stack [#8407](https://github.com/lamontaes/Political-Game-Git/pull/8407), [#8442](https://github.com/lamontaes/Political-Game-Git/pull/8442) and [#8474](https://github.com/lamontaes/Political-Game-Git/pull/8474), merged inside #8511 on Nov 10 (closed Nov 11 as contained).
- People, the Guide, Patch notes and the Journal as a list beside a page: [#8819](https://github.com/lamontaes/Political-Game-Git/pull/8819), [#8820](https://github.com/lamontaes/Political-Game-Git/pull/8820), [#8488](https://github.com/lamontaes/Political-Game-Git/pull/8488).
- Menus show busts only, with a check: [#8608](https://github.com/lamontaes/Political-Game-Git/pull/8608).

All of this is on main and in his build.

**What was never built: the panel itself** [code]
- `.panel` in `src/bench/play.css` (about lines 475 to 515) and its colors (`--glass-top: rgba(42, 42, 44, 0.72)`, `--glass-bottom: rgba(22, 22, 24, 0.82)`, lines 72 and 73) are the Oct 14 Kit 13 block (commit 40f85f3e, "Play page on Kit 12").
- It is gray glass with a blur, a heavy 2.5 px brass border and corner pictures. It has no texture, and it isn't the warm dark #1C1A17 at 78% he picked.
- The approved mock's panel is a texture picture, `docs/mocks/2026-11-07-approved/img/panel.png`, with a darkening layer on top (`base-proto.css` line 184: "dark textured glass, 78% solid, darker tint, slim brass edge").
- That picture was never copied into `public/`, and no PR ever touched `.panel`'s surface.
- Hover [code]: buttons get a brighter fill and text gets a glow (play.css about line 905). The "fading frame with the halo" hover is not there.

**Screen by screen**

| Screen | Inside the panel | The panel | What he saw [rec] |
| --- | --- | --- | --- |
| Title menu | 5 items | Gray glass box | 00:21, "I hate this blockiness" |
| Patch notes | List beside detail, strips | Gray, Options' 760 px compact panel | 00:57 (see item 3) |
| Creator | Strips: Who I am, Where I'm from, How I look | Gray | 02:02; dead space under the bust and the left column |
| People | List beside the person card, strips | Gray | 10:40 to 11:24; the right third is empty, the page scrolls, and children show no picture at all |
| Politics: Government | The approved mock's layout (#7364) | Gray | about 18:00 |
| Politics: Elections, Parties, Issues | List beside a page | Gray | 18:02 to 18:12; the office names wrap ("Supervis / or / (District / 4)") |
| Politics: Metrics | Strips in three columns | Gray | 18:16 (see item 4) |
| Travel | Picture tiles and a detail strip | Gray | 10:34 |
| News | Paper columns; not on strips | Gray | 17:28 to 17:52; the right third is empty, and stations show "You don't follow a paper or a station" |

Children have no bust [code]: `src/bench/ui/face.mjs` draws "the empty frame" when there is no face record (a child), because the bust bank has adult heads only.

**Why it is not in his game**
- The four Nov 7 builds followed the mock's layout and kept the game's own `.panel`. The approved-mocks README lists what each screen holds but never names the surface.
- After Nov 11 nobody owned UI (see the top of this file).
- His Oct 14 rule says a screen's look ships only on his full-window screenshot. A one-line change to the surface still needed that, and nobody brought it to him.

**What it would take**
1. One change to the shared panel:
   - put the approved texture under `public/ui/`;
   - make `.panel` the warm 78% textured surface with a slim brass edge;
   - make the hover the fading frame with the halo.

   Every screen uses `.panel`, so title, creator, patch notes, People, Politics, Travel and News all change at once. That is a few hours for one session, plus his OK on one full-window screenshot per screen beside the mock.
2. The dead space, separately:
   - People's card should fill its width, or the panel should shrink to fit.
   - News's right column is empty.
   - The creator's left column is empty under the bust.
3. Child busts are an art job (heads for children), the CTO's on the Mac.

---

## 2. Title backgrounds: DC monuments, different each game

**What he approved**
- Oct 29, about 2:45 p.m.: "the screens like on front, the menu screens, like, I don't know why the convention ones are there. I've said stuff like the Washington Monument or the Lincoln Monument, etc." He picked "Yes, plus passersby": his latest character in front of the monument, with passersby.
- Restated in OWNER-DECISIONS (Nov 3 section): "The Oct 29 monument ruling stands."
- "Each game, it should start with new ones": [none found] in writing. I searched OWNER-DECISIONS, the pool, the playtest folders, owner-record and cto-notes. The Oct 14 title ruling (OWNER-DECISIONS line 1015) doesn't say it. He says he has said it many times, so it now stands as his ruling from today.

**What was built**
- The Lincoln Memorial at night joins the rotation: [#6109](https://github.com/lamontaes/Political-Game-Git/pull/6109) (Oct 25).
- The title painting drifts and rotates: [#6204](https://github.com/lamontaes/Political-Game-Git/pull/6204) (Oct 27).
- One picture at a time: [#6662](https://github.com/lamontaes/Political-Game-Git/pull/6662) (Oct 28).
- The title shows only the monuments on main, in their lights; conventions and rallies are out: [#7213](https://github.com/lamontaes/Political-Game-Git/pull/7213) (Nov 4).
- The desktop check accepts the monuments: [#7315](https://github.com/lamontaes/Political-Game-Git/pull/7315).

All are on main.

**Where it is now** [code]
- `src/bench/title.ts` lists three monuments. Their paintings on main:
  - the Capitol in 4 lights (morning, midday, night, rain);
  - the White House at midday only;
  - the Lincoln Memorial at night only.

  That makes 6 paintings in all.
- The rotation is built so the monuments "take turns", 12 frames per loop:
  - each Capitol light once;
  - the White House midday picture 4 times;
  - the Lincoln night picture 4 times.

  So 8 of every 12 frames are the same two pictures, each held 20 seconds. The recording matches [rec]:
  - the Capitol at 00:21;
  - the White House at 00:47 to 00:57;
  - the Lincoln Memorial at night at 01:35.

  He said the order a little differently while talking, but it is the same three pictures going round.
- Where the loop starts comes from today's date plus a visit counter that starts at 0 each time the app launches (`titleVisits: 0`, `src/bench/handler.ts` line 240). So every launch on the same day opens on the same picture, in the same order. Nothing ties it to a game.
- Never made:
  - the Washington Monument and Jefferson Memorial paintings. I found none on main or anywhere under `~/Documents`, `~/Downloads`, `~/Pictures` or `political-game-play`;
  - more lights for the Lincoln Memorial (only one other night version, `title-lincoln-night-a__215378c3.jpg`, in `~/Documents/antigravity/radiant-hawking/art/incoming/firefly/`);
  - the character in front with passersby. #7213 deferred it to "the people system", and full bodies were set aside on Nov 10.
- **On the Mac but never put in the game:** the White House in the morning, at night and in the rain.
  - Sept 29 Firefly pictures: `~/Documents/OCD-Art-Sept29/places/place-white-house-exterior__mor.png`, `__nig.png`, `__rai.png`.
  - Oct 16 copies in `~/Documents/antigravity/radiant-hawking/art/incoming/firefly/`.
  - Check them at full size against the current set before using them; they may be in the older style.
- On main and unused: the Supreme Court exterior (4 lights) and the White House colonnade (morning). The protest at the Capitol also exists, and whether it fits the title is his call.
- New game's busts are fixed [code]: `newGameFaces()` in `src/bench/appearance.ts` always draws the same picks (Start a life uses index 3; Advanced uses 0, 1 and 2). So "is that person the same every time?" Yes [rec, 01:35].

**Why it is not in his game**
- No new monument art was ever ordered. On Nov 4 the painting was stopped when "menu screens" was misread as the title, and nothing was ordered after that.
- The code repeats the two single-painting monuments by design.
- The start is seeded by the calendar day, not drawn fresh.

**What it would take**
1. Art on the Mac:
   - import the three White House lights already on the Mac, if they pass a full-size check;
   - paint the Washington Monument and Jefferson Memorial;
   - paint more lights (morning, midday, rain, winter) for the Lincoln Memorial;
   - optionally use the Supreme Court exterior and the colonnade already on main.
2. A small code change in `title.ts`:
   - shuffle every painting;
   - show none twice before all have shown;
   - draw a new start at each launch and each new game.
3. His character in front: a bust can stand there now. Ask him how before building it.

---

## 3. Patch notes like real patch notes, with no scroll

**What he approved**
- Nov 8, about 2:10 p.m. playtest: builds in a list, "like real patch notes"; click one to see what it added, changed and fixed. No arrows or "1 of 11" ("like those shitty survey sites"), and never "a huge, big-ass text box" (OWNER-DECISIONS, Nov 8 section).
- The Nov 8 front mock `fr-notes` (`docs/mocks/2026-11-08-front/renders/fr-notes.jpg`, conditionally approved Nov 8): Builds at the left, then Changed, Improved and Fixed strips with one short line per change, on the full-width panel.

**What was built**
- Patch notes open from the title (commit b41b409d, Oct 28).
- One release at a time (00a20bb7, Oct 30).
- "Patch notes follows the Nov 8 front mock" (2ac683e1, Nov 8).
- Patch notes and the Journal on the one list-beside-detail part: [#8488](https://github.com/lamontaes/Political-Game-Git/pull/8488) (Nov 11).

All are on main and wired. He saw it at 00:57 [rec].

**Why it is still a blob** [code, rec]
1. **The content is too big.**
   - `PATCH_NOTES.md` gets one long paragraph for every merged PR.
   - 0.112.0 has 87 notes and about 6,800 words. 0.111.0 has 258 notes and about 20,400 words.
   - The mock had one or two short lines under each heading.
2. **The screen erases the structure.** `play.mjs` (about line 4919) joins each note's bold headline and its text into one plain sentence-run (`[note.title, note.text].filter(Boolean).join(". ")`). `strips.mjs` then prints it as a paragraph, with no bullet and no bold headline, so the notes run together.
3. **The panel is too narrow.** Opened from the title, it uses Options' compact panel (`#sheet.options-sheet`, at most 760 px wide; play.css line 1804), so the text is a thin column.
4. **Two scroll bars.** `.roster-screen.patch-notes .roster-page` has `overflow-y: auto` (play.css about line 3996), and the build list scrolls too.
   - The written rule on main allows this ("a bounded box that scrolls inside itself", MENU-LOOK.md).
   - Today he said the scroll bars themselves are what he hates, so the rule needs changing, not only the screen.

**What it would take**
1. Release notes written for players:
   - each build gets a short list of one-line headlines under Added, Changed and Fixed (grouped by area when long);
   - the long text opens only when a line is clicked;
   - developer and dev-mode items stay off it.

   The release machinery (`scripts/release`) can take the headline from each declaration and cap a build at a readable count.
2. The screen:
   - show headlines as a list with bold heads;
   - use the full-width panel;
   - no scroll bar.
3. Change MENU-LOOK.md and the skill to "no scroll boxes in menus" to match today's words.

---

## 4. The Metrics pages

**What he approved**
- Nov 5: a new Politics tab for how your place is doing, with numbers, this year beside last (player-menus-nov4 memory; it replaced "How it's doing").
- Nov 12, about 3:00 p.m.: "Line over years, on click". Clicking a measure opens a timeline: one thin brass line, each value written on it, no bars, no pies.
- About 3:20 p.m.: "go with A plus the years table. do a mock for all the different metrics that will be tracked. use a real game and look at the history and make the metrics from that. i assume the history wont show because it never has."
- About 3:25 p.m.: he conditionally approved the Gracey mock and wanted every figure traced and a build plan first. Each row needs a visible cue that it opens.
- 20:43Z on the Desk (`q-metrics-plan`): "Approve; Argon builds it, our mergers check it".
- Mocks:
  - layouts A, B and C plus the timeline: https://claude.ai/artifact/A1mSQGEnHHAfs3LJ2yYz8r
  - Gracey: https://claude.ai/artifact/2SuMiUvSthRJCbta5N33Zv

  **Neither mock is on main or in cto-notes** [none found].

**What was built**
- The Metrics tab, Nov 8 to 9: the country's numbers, this year beside last ([#7874](https://github.com/lamontaes/Political-Game-Git/pull/7874)), then the town, state, homes and books (commits 8e960a97, db8cc166, 8d8e5ee7). This is the three-column numbers board he opened at 18:16 [rec].
- The plan, `docs/design/output-numbers.md`: one registry for every figure, in 13 build orders.
- Gemini Argon, Nov 12: one unfinished commit (98e5c6d8 on `pool/metrics-output-numbers-registry`). The review found 8 problems, the owner stopped Argon at about 6 p.m., and it was never merged.
- The Account lead (second account), Nov 12 to 15, built the plumbing. All of this is on main:

  | Order | What it does | PR |
  | --- | --- | --- |
  | 1 | Metrics reads one registry of numbers | [#8966](https://github.com/lamontaes/Political-Game-Git/pull/8966) |
  | 2 | The town's jobless are counted once | [#9391](https://github.com/lamontaes/Political-Game-Git/pull/9391), with #9325, #9316, #9406 |
  | 4 | The town's people and homes, kept by year | [#9059](https://github.com/lamontaes/Political-Game-Git/pull/9059) |
  | 6 | One spending-per-student figure | [#9061](https://github.com/lamontaes/Political-Game-Git/pull/9061); its pool item still says open |
  | 8 | Budgets re-budget revenue every year | [#9480](https://github.com/lamontaes/Political-Game-Git/pull/9480) |
  | 10 | The state's figures from one engine | [#9532](https://github.com/lamontaes/Political-Game-Git/pull/9532); folded into Train 2, though the PR still shows open |

  Also: housing has a simulated past, so last year shows on day one ([#9084](https://github.com/lamontaes/Political-Game-Git/pull/9084)), and a row's change from last year comes from the two figures it shows ([#9245](https://github.com/lamontaes/Political-Game-Git/pull/9245)).

**Where it is now** [code]
- `sheets.metrics()` in `play.mjs` (about line 4424) still draws the Nov 9 board: sections dealt into three columns, one typed row each, "Last year ... since".
- No years table and no click-to-open timeline. Layout A is not applied.
- The timeline part `ui/trend-line.mjs` exists, but only Budgets uses it.
- Not built:
  - order 5, births and deaths;
  - order 7, the web reading the engines;
  - order 9, the federal debt;
  - order 11, every figure opening in dev mode's Trace;
  - order 12, folding old months;
  - **order 13, the years table and the timeline** (`metrics-years-table-reads-registry`). Its status is open and nobody ever claimed it.

**Why it is not in his game**
- The plan ordered the work as the plumbing first and the screen last. Order 13 is the only piece he can see, and it came last.
- The crew built orders 1, 2, 4, 6, 8 and 10 of the plumbing and then moved to trains. I did not check order 3 (why a town's jobless rate runs far above its state's); it has no pool item under its plan name.
- The item tells the builder to follow "the approved Metrics mock", but no Metrics mock exists on main, so there was nothing to build to.
- The Argon stop on Nov 12 is not the cause: the Account lead took over the same day.

**What it would take**
1. Copy the A1m and Gracey mocks into `docs/mocks/`.
2. One screens session (the plan says about 4 hours) for build order 13: Layout A (areas down the left with a report), a years table in each area, and a click on any row opening its timeline, with a visible cue on each row. It reads the registry's year rows, which exist now.
3. Put it on the new panel from item 1.
4. Orders 5, 7, 9, 11 and 12 are back-end work and can follow; he won't see them.

---

## 5. The character creator

**No person until a gender is picked**
- His words today: "a person shouldn't even pop up until I pick a gender."
- Earlier record:
  - Sept 16, 11:58 a.m. (overnight note [17], `docs/reports/owner-record/05-overnight.md`): "it should do gender first: gender, name, birthday, age."
  - Nov 1: "Randomized name shouldn't work until you choose a gender."
  - No written ruling that the figure itself waits for gender [none found; searched OWNER-DECISIONS, pool, playtest, owner-record, cto-notes].
- Built the other way, on purpose [code]: "creator and New game on busts" ([#8526](https://github.com/lamontaes/Political-Game-Git/pull/8526), Nov 10) added `openCreator()` in `play.mjs` (about line 7092), whose comment says: "A bust stands in the creator from its first frame, before a gender is chosen." [rec, 02:02]
- To finish: leave the bust slot empty until a gender is picked. That is a one-line change plus its browser check.

**Everyday and Formal tabs**
- Approved Nov 12, about 12:55 p.m.: "two tabs, everyday and formal, bust flips between them", then "build the tabs".
- Built: Everyday and Formal tabs in How I look, with the bust flipping between them ([#8905](https://github.com/lamontaes/Political-Game-Git/pull/8905), Nov 12). On main and wired [code, rec 02:02: the Everyday tab lit, Formal beside it].
- About 1:00 p.m. the same day: "ill do a playthrough later for the design stuff". The wider creator redesign (boxes, dead space, outlined buttons) was held for that playthrough and never started. Today's sitting is that playthrough.

**Hairstyle choices as pictures**
- His words today: "Just do hairstyle 1, 2, 3, 4, 5... like Enzoi does this, where you can click it and... just see the images." Also "Skin, light, deep, medium. What do you mean?"
- [none found] earlier. I searched OWNER-DECISIONS, RULINGS-nov5, the playtest, voice-note, owner-record and prior-rulings folders on main, cto-notes/playtest and memory for hair with picture, image, preview or thumbnail. The nearest is Oct 27, about generating the hair pictures, not about how the player picks. So treat it as a new ask today.
- Today [code]: each look row (`ui/look-row.mjs`) is arrows around a name ("Curls", "Deep"). His Nov 9 ruling kept arrows on single-value rows ("Lists only"), so pictures for hair are a change he is making now.
- To finish: draw each hairstyle on the player's own head as a small bust picture, using the bust bank already in the game (no new art); click a picture to pick it. The same could work for skin.

**Randomize the whole character**
- His words today: "I should be able to randomize my entire character."
- [none found] earlier. I searched the same folders for random with character, everything, whole or entire. So treat it as a new ask today.
- Today [code, rec]: four separate buttons: Randomize name, Randomize birthday, Random place, and Random under the bust (the look only).
- To finish: one Random that draws gender, name, birthday, place and look together, using the draws that already exist.

---

## 6. People busts in scenes, and a figure behind a desk

**What he approved**
- Nov 3, about 3:45 p.m.: Blender bodies seated in the Oval Office, with the people painted on them. "their feet looks like they're on top of the couch... but other than that, these look great. So, are you able to do the modular people creation from this?" (memory `people-stop-nov3`; OWNER-DECISIONS, Nov 3 section, records "these look great").
  - A modular seated proof followed at about 5:05 p.m.: six seated bodies on the couches, 96 pieces (memory `people-stop-nov3`; https://claude.ai/artifact/GdUCyej5qiJJz5cSDoL3sD).
  - It was never in the game, and none of the seated bodies was behind the desk.
- Nov 7: busts for early access.
- Nov 10, 9:24 p.m.: "Remove all the people. And yes, I think the speaker as a large bust... people can be on top of the text box... get a little bigger when they're talking."
- Nov 11, 12:02 a.m.: "I do like this strip."
- Nov 11, 8:28 a.m., round 4 ("busts r4"): "I approve those clothes. Be sure there are formal clothes and regular clothes, and that they're tagged... the president is wearing the suit."

**What was built** (all on main and wired)
- Round 3 art and its swap-in: [#8555](https://github.com/lamontaes/Political-Game-Git/pull/8555), [#8563](https://github.com/lamontaes/Political-Game-Git/pull/8563).
- Round 4 art: [#8740](https://github.com/lamontaes/Political-Game-Git/pull/8740). Swapped in with a Shirt, Tie and Jacket to choose and officeholders in suits: [#8823](https://github.com/lamontaes/Political-Game-Git/pull/8823).
- The strip of busts on the talk box and along the foot of the room: [#8643](https://github.com/lamontaes/Political-Game-Git/pull/8643). The Journal note sits above the strip, never on a face: [#8741](https://github.com/lamontaes/Political-Game-Git/pull/8741).
- [rec, 05:36] The address in the Oval Office shows Keith Farrell (speaking, lit), Joann Parsons and Sandra Solomon on the strip, and the president's chair empty.

**What is missing** [code, rec]
- **The three-quarter view.** Only the women's round-2 three-quarter pieces exist (`art/busts/v1/women/three-quarter-left/`). The men have none, and round 4 is front-only.
- **Children have no bust** (item 1).
- **The strip's sizing.**
  - Size is set by headcount: 200 px for one person, 180 for two, 150 for more (`#talk-strip`, play.css about line 455).
  - In a talk, the speaker is lit and 16% larger. The others are dimmed but keep the headcount size (play.css lines 371 to 385).
  - With one person, the strip still runs the talk box's whole width.

  On Nov 10 he called them "a little too big", and today: "this huge strip... There's one person, shorten the strip"; "Why is Christina Hale here? She should be smaller since she isn't talking."
- **A figure behind a desk.**
  - His words today: "If you can do that with a figure behind the desk, that would be great... just do one... apply it to, let's say, a scene."
  - He approved the seated look on Nov 3 (above), but the seated proof was on the couches, and on Nov 10 he set people in rooms aside: "people will eventually be in the game, but right now for early access, it's just we have to do the busts."
  - The seating code and the full-body art left the game. They are kept, not deleted: `docs/art/full-body-people-after-early-access.md` on main names the last complete copy, commit 843df6be (Nov 11), and where the art went.
  - So nothing in the build seats anyone: the Oval Office chair is empty [rec, 05:36].

**Why it is not in his game**
- Busts on menus and on the strip are in.
- The figure behind the desk was set aside on purpose on Nov 10 and never ordered again until today.
- The three-quarter view and the child heads are art that waits on the Mac.
- The strip's sizing follows the Nov 11 mock, and he now finds it too big.

**What it would take**
1. One seated figure behind the Oval Office desk, built the bust way:
   - a fixed seated body and arms painted for that desk and camera (the Nov 3 Blender method; the kept seating code at 843df6be shows how a seat was placed);
   - the head, hair and top swapped from the bust bank, the way busts stack.

   This is art plus a small layer in the scene. It is the CTO's on the Mac (people-blender and codex-images skills). Show it to him before wiring anything else.
2. Strip fixes:
   - the strip only as wide as its people;
   - a quiet person smaller;
   - the speaker distinct (he floated the speaker on the card itself, or a big bust to the side, so ask with two mocks).
3. Men's three-quarter pieces and child heads, both art on the Mac.

---

## 7. The industries and jobs work from Nov 15 and 16

**What he asked for**
- Nov 8, about 2:10 p.m.: "I go to travel. Everything's a market or a post office."
- Nov 12, 2:48 p.m.: "even though I've been told multiple times that the job data is in the game... It's only ever like tool places and dye places and markets."
- Nov 12, Wofford Heights: "it's only the market and like craft shops. Why are there no real jobs?"
- Nov 15, 21:09Z, on a power-plant town: "that power plant closes, and then that town."
- Nov 16, 01:58Z: "one session making the industries in the game" and "I think the dev mode stuff should be built immediately, so that way it can be traced, easily within the game". The plan was approved at 02:08Z.
- The plan itself is in the second account's project files (`/mnt/project-files/...`), not in the repo, so I couldn't read it.

**Built and in his build (on main ca195112)** [code]
- Towns hold their county's work, commuters do real jobs, and employers open with standing openings ([#8942](https://github.com/lamontaes/Political-Game-Git/pull/8942), Train 1, merged Nov 15).
- A founded business posts its opening jobs ([#9069](https://github.com/lamontaes/Political-Game-Git/pull/9069)).
- A town's utility sells to buyers beyond the town, industry-0 ([#9579](https://github.com/lamontaes/Political-Game-Git/pull/9579)).
- Businesses weigh what laws cost them when they hire, lay off or close ([#9629](https://github.com/lamontaes/Political-Game-Git/pull/9629)).
- Also: [#9588](https://github.com/lamontaes/Political-Game-Git/pull/9588) (a business holds its credit line), [#9666](https://github.com/lamontaes/Political-Game-Git/pull/9666) (a privacy law binds only big enough businesses), [#9717](https://github.com/lamontaes/Political-Game-Git/pull/9717) (day-one cash) and [#9603](https://github.com/lamontaes/Political-Game-Git/pull/9603) (a clinic is paid Medicare's part).
- **In his build but still shown "open" on GitHub.** Their heads are inside the release, folded into Train 2 at 03:24 to 05:31Z on Nov 16, so they should be closed as contained:
  - the wholesaler sells beyond the town, industry-1 ([#9627](https://github.com/lamontaes/Political-Game-Git/pull/9627));
  - dev mode's Industries panel on the Calendar ([#9631](https://github.com/lamontaes/Political-Game-Git/pull/9631));
  - dev mode: a bill against a do-nothing twin, by industry ([#9640](https://github.com/lamontaes/Political-Game-Git/pull/9640));
  - dev mode Businesses: cut a business's orders or close it ([#9625](https://github.com/lamontaes/Political-Game-Git/pull/9625));
  - dev mode Industries: what a business paid under each law or tax ([#9675](https://github.com/lamontaes/Political-Game-Git/pull/9675), a draft). Its last head is not in the build, but the weekend review (`cto-notes/weekend-review-nov16/unread.md`) found all its code already there line for line, and the Industries panel on main shows each month's law duties.

**Not in his build: drafts, stopped overnight Nov 16 "when the overnight sessions were cut back"** (the PR bodies' words)

Each one's base branch has since merged, so each must be moved onto main before it can merge.
- [#9670](https://github.com/lamontaes/Political-Game-Git/pull/9670), **towns open with as many businesses as their workers fill.** Its "Before": "every town opened with three stores, three restaurants and one clinic, whatever its size." After: Danville, VA opens with 166 stores, 71 restaurants and 5 clinics. It is unfinished, the golden-path check was red on its last head, and three guard fixes are pending. **This is the one that changes the kitchens-and-markets towns he keeps seeing.**
- [#9617](https://github.com/lamontaes/Political-Game-Git/pull/9617): a town clinic has patients from outside the town.
- [#9671](https://github.com/lamontaes/Political-Game-Git/pull/9671): people leave a town when its work dries up.
- [#9673](https://github.com/lamontaes/Political-Game-Git/pull/9673): a closing records what made its losing months.
- [#9644](https://github.com/lamontaes/Political-Game-Git/pull/9644): the paper weighs closings and layoffs by size.
- Open pool items with nobody on them: `dev-mode-industries-against-do-nothing-bill`, `industry-outside-sales-read-no-law`, `dev-mode-reach-by-industry`, `dev-mode-twin-null-bill-jobs-sales-pay-by-industry`.

**Why Travel still shows kitchens and markets** [code, rec 10:34]

None of the jobs or industries work touches Travel. Travel's list is `townPlaces()` in `src/bench/places.ts`.
1. **First, places tied to the player:** where the player, the household and family work; schools while someone at home is of school age; workplaces of people the player knows; political business; a party office.
2. **Then a fill of up to nine from a fixed list of walk-in places:** diner, coffee shop, tavern, grocery, general store, store, gas station, hardware, pharmacy, barbershop, library, post office, church, park, farmers market.
3. **Everything else is left out.** A factory, plant, warehouse or hospital appears only if someone the player knows works there. Add towns that open with three stores and three restaurants (until #9670 lands), and the list is markets and kitchens.
4. **The recording shows exactly this:** Cambrian Park Public Schools (a child at school), then markets, kitchens and a salon.
5. **Missing art is not the blocker for most kinds.** Paintings exist for factory floor, power plant, farm, construction site, hospital and bank lobby.

**What it would take**
1. Finish #9670: fix its red checks, move it onto main, and have a second session check it.
2. Change Travel's rule to list the town's main workplaces across industries by size (each card saying why it's listed), not only walk-in shops. That is one function. It needs his OK, because his Oct 26 ruling keeps an office that is listed only for being an office off Travel.
3. Close #9627, #9631, #9640, #9625 and #9675 as already in the build.
4. Ask the builder account's sessions (it resets at 5 p.m.) for any work that is built but not pushed, and push it along, as he asked.
