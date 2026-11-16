# Plan after today's playthrough (v0.112.0, Nov 16)

For Lamontae. Written Nov 16, about 5 p.m. ET. It is built from:
- your words (`2026-11-16-1.md`);
- the 70 stops in your recording (`2026-11-16-1-stops.md`);
- the UI audit (`2026-11-16-1-ui-audit.md`);
- the weekend fix list (`weekend-review-nov16/cto-actions.md`);
- the reset account's handoff on #9739 (`2026-11-16-handoff-9739.md`).

Nothing has started and nothing is posted.

**What this means**
- You couldn't get past seven weeks. There was nothing to run for, a screen stuck, and the load froze. Those three go first.
- Most of the "how many times" items were approved and partly built, but the part you see never shipped: the panel, Metrics, the patch notes and the title pictures. Nobody has owned the screens since Nov 12. From now on, one lane owns every screen.
- Every ruling you repeated today gets a check that fails when it's broken (section j).

**Your part**
1. Paste the crew message into the general builder, and tell it to watch the new crew line.
2. On your other account, change the two settings for the two-branch switch. The CTO puts the exact steps on the Desk.
3. Answer four questions on the Desk:
   - what Travel lists;
   - how the speaker shows in scenes;
   - which look choices become pictures;
   - which title paintings go in first.
4. OK two things when they reach the Desk: the panel sheet (each screen beside its mock) and the one desk-figure proof.

**Who's who**
- **CTO** (this account): merges, builds and checks, and makes the art on the Mac.
- **General builder** (the account at 30-40% this week, run by its other CTO): all the code and words work, in four lanes at once, until the account is used up.
- **Reset account** (5 PM): posted its final handoff at 4:57 p.m. and says it is inactive.

Stop numbers below refer to the stops file. Every stop from 1 to 70 appears under the fix it shares.

---

## (a) What blocked the run

### A1. Nothing to run for · stops 59, 64
- **His words:** "There's not much I can do since I can't run for anything." Also: "If filing isn't open... then I should be able to send to it from here."
- **What's wrong:**
  - In Cambrian Park, the one race open to him is Supervisor, District 4, and its filing opens Jan 13, 2028.
  - Coroner, District attorney and the other 2026 offices say "You can't run for this office." with no reason (`src/bench/data/controls.json`, `not-your-office`). Why they're closed isn't known. **Find the cause first.**
  - Your Desk answer isn't built: "Work for someone else's campaign, a party committee or an appointed board until a race opens". #9744 holds only the plan. It found that each engine skips the player: `askForSupport` in `campaigns.ts`, the party picks in `parties.ts`, and the appointer's filter in `executive.ts`.
- **Who:** General builder, World lane. Three PRs from #9744's plan, campaign work first. The Words lead signs the lines.
- **Done when:**
  - On day one of a new game in a drawn town, Elections shows something he can do now: a campaign to work on, a party committee, or a board seat.
  - Each closed office shows its reason as a fact.
  - An open race takes him to the town's filing office. That's my reading of "send to it from here".

### A2. Stuck behind a card · stop 63
- **His words:** "I'm not sure if my game froze or if I'm stuck because I'm in this menu... I think I'm stuck. There we go. I pressed escape."
- **What's wrong:**
  - Time ran while Jennifer James's card was open: the clock and the rail disappeared, and the room turned to sunset.
  - A scene came due and waited behind the card with no sign. Only Escape let it through.
  - Where `src/bench/play.mjs` holds it isn't known. **Find the cause first.**
- **Who:** General builder, Screens lane.
- **Done when:** with any person card open and time running, a scene that comes due closes the card and opens on its own.

### A3. The loading freeze · stops 14, 15
- **His words:** "I can see that this screen has frozen here. That shouldn't happen. It should continue to load. This is just poor optimization."
- **What's wrong:**
  - "Letting the country run a few weeks" runs as one long job with no break. `src/bench/world.ts` reports "warmup" once, then `warmUpOpening` (`src/core2/player-warm-up.ts`) runs every day in one go.
  - The bar and the drifting picture stopped for about 21 s.
  - The first 10 s showed no words at all.
  - Your Desk answer makes the warm-up longer ("Longer. Fills more on its own"). That makes the freeze worse unless the bar reports each day first.
- **Who:** General builder, World lane. Progress first, then the longer warm-up.
- **Done when:**
  - On your Mac, from Begin my life to the first scene, the bar or its words change at least once a second.
  - The first words show within a second.
  - Both still hold after the warm-up gets longer.

---

## (b) Your approved work that never got in

### B1. The textured panel, as one shared change · stops 2, 13, 54 (every screen)
- **His words:** "how many times do I have to say this blockiness? I hate this blockiness here... Did that UI ever get wired?" Also: "this isn't the textured background or whatever I approved."
- **What's wrong:**
  - What's inside each screen follows your Nov 7 mocks. The panel they all sit on is still the Oct 14 gray glass: `.panel` in `src/bench/play.css` (about lines 475-515; its colors at lines 72-73). It has a heavy 2.5 px brass border, corner pictures and no texture.
  - Your Nov 5 pick was dark and 78% solid: warm #1C1A17 under a little texture, a slim brass edge and small corners.
  - Its texture picture, `docs/mocks/2026-11-07-approved/img/panel.png`, was never copied into the game.
  - Hover is a brighter fill, not the fading frame with the halo you picked.
  - The written rule (MENU-LOOK.md) still allows "a bounded box that scrolls inside itself".
- **Who:**
  - General builder, Screens lane: one PR that changes `.panel` and the hover for every screen at once. It also changes MENU-LOOK.md and the menu-look skill to "no scroll boxes in menus".
  - CTO: a sheet on the Desk showing each screen at full window beside its mock.
- **Done when:**
  - The title menu, creator, patch notes, People, Politics, Travel and News all sit on the same warm, textured, see-through panel with a slim edge.
  - Hover shows the fading frame with the halo.
  - You OK the sheet.

### B2. Metrics, build order 13 · stop 70
- **His words:** "where are the metrics pages that I approved? Like, that's not even in. Again, what happened to all the UI stuff?"
- **What's wrong:**
  - The plan put the plumbing first and your screen last. Orders 1, 2, 4, 6, 8 and 10 are in main.
  - Order 13, the years table and click-to-open timeline, was never claimed.
  - `sheets.metrics()` in `src/bench/play.mjs` (about line 4424) still draws the Nov 9 three-column board.
  - The item says to build to "the approved Metrics mock", but neither mock (Layout A, and Gracey) is in the repo.
- **Who:**
  - CTO: copies both mocks into `docs/mocks/` tonight.
  - General builder, Screens lane: builds `metrics-years-table-reads-registry` on the new panel.
    - Layout A, with a years table in each area.
    - Every row shows that it opens.
    - A click opens one thin brass line with each value written on it, using `ui/trend-line.mjs`, which already exists. A click closes it.
- **Done when:** Politics > Metrics lists the areas down the left with their years. Clicking Unemployment opens its line over the years with the values written on it, and clicking again closes it.

### B3. New title pictures each game, with the missing paintings made · stops 1, 6, 16
- **His words:** "each game, it should start with new ones. I don't understand how many times I have to say that." Also: "Like, where are all the images?" and "is that person the same every time... No, it's the same".
- **What's wrong:**
  - `src/bench/title.ts` has three monuments in six paintings. The loop shows the White House and the Lincoln Memorial in 8 of every 12 turns.
  - The start comes from today's date plus a counter that resets at launch (`titleVisits`, `src/bench/handler.ts` line 240), so every launch opens the same way.
  - New game's busts are fixed picks (`newGameFaces()` in `src/bench/appearance.ts`).
  - The loading screen shows the title monument: Cambrian Park loaded over the Lincoln Memorial.
  - Never painted: the Washington Monument, the Jefferson Memorial, and more lights for the Lincoln Memorial.
  - On the Mac but never imported: the White House in the morning, at night and in the rain (Sept 29).
- **Who:**
  - CTO on the Mac: checks the three White House lights at full size and imports them, then paints the new monuments. Which go first is a question on the Desk.
  - General builder, Screens lane:
    - shuffle every painting, with none shown twice until all have shown;
    - draw fresh at each launch and each new game;
    - New game draws fresh busts;
    - loading shows the player's state or town.
- **Done when:** across two launches and two new games, each opens on a different painting, nothing repeats until all have shown, the New game busts differ, and loading shows California, not Washington.

### B4. Patch notes like real patch notes · stops 3, 4, 5
- **His words:** "These patch notes... are just a blob. They're not formatted at all. And why there's so many scroll things. Again, this is stuff I say I hate." Also: "This is not structured like a real patch note."
- **What's wrong:**
  - Each change is one long paragraph. 0.112.0 has 87 notes and about 6,800 words.
  - The screen joins each headline to its text in one run (`src/bench/play.mjs`, about line 4919), with no bold head and no bullet.
  - It opens in Options' narrow 760 px panel. The page and the build list scroll separately, with three bars in all.
  - Players read crew talk: "dev mode", "debug observer", "the bench", "the item".
- **Who:** General builder, Screens lane.
  - The release script (`scripts/release`) writes a player version: one section per area (Elections, People, Scenes, Money, Travel and so on), with one short line per change under Added, Changed and Fixed. Developer and dev-mode changes stay off it.
  - The screen uses the full-width panel, bold heads and no scroll bar.
  - This includes weekend fix 22: the health-plan change (#9511) goes in, and the stale filing-fee line comes out.
- **Done when:** Patch notes from the title shows 0.112.0 as a few areas of short lines, readable without scrolling, with no crew words.

### B5. The creator · stops 7, 8, 9, 10, 11, 12
- **His words:**
  - "a person shouldn't even pop up until I pick a gender."
  - "I should be able to randomize my entire character."
  - "What do you mean light, deep, medium?"
  - "Just do hairstyle 1, 2, 3, 4, 5... where you can click it and just see the images"
  - "lots of empty, dead space right here. Again, how many times do I have to say I hate this empty space?"
- **What's wrong:**
  - #8526 put a bust in before a gender is picked, on purpose. See `openCreator()` in `src/bench/play.mjs`, about line 7092: "A bust stands in the creator from its first frame".
  - "Random" changes only the look. Name, birthday and place each have their own button.
  - Skin and hair are words in an arrow stepper (`ui/look-row.mjs`).
  - The portrait goes blank while a new look loads (at 1:49 and 2:23).
  - The lower half of the left and middle columns is empty.
- **Who:** General builder, Screens lane. The pictures come from the bust pieces already in the game, drawn on the player's own head, so no new art is needed.
- **Done when:**
  - No person shows until you pick a gender.
  - One Random makes a whole person: gender, name, birthday, place and look.
  - Hair shows as pictures to click, plus whatever else you pick on the Desk.
  - The portrait never blanks, and the panel has no empty block.

---

## (c) Scenes and people

### C1. Who's talking · stops 18, 38, 41
- **His words:** "it's not distinguished or delineated enough who's talking right here. Maybe the person speaking should be on the actual card... Or maybe they get a big bust on the side. Not sure."
- **What's wrong:**
  - The speaker is lit and 16% larger. The others are dimmed but keep their size (`src/bench/play.css`, about lines 371-385).
  - On a narration line nobody is speaking, yet Christine takes the center.
- **Who:** your call (Desk question 2). The CTO mocks your pick on the Desk before it's built, as you asked on Nov 10. Then the General builder's Screens lane builds it.
- **Done when:** on every card of the opening, you can tell at a glance who is speaking.

### C2. People who aren't talking · stops 38, 41, 43
- **His words:** "Why is Christina Hale here? She should be smaller since she isn't talking." Also: "they should be off to the side or on top or in a corner or something."
- **What's wrong:** Christine is big at center over "It's the evening of January 20. You stay in.", which shows twice. She is the only face through the whole Governor's address and Chair Robbins's address, and she says nothing in either.
- **Who:** General builder, Screens lane, built together with C1.
- **Done when:** anyone not speaking is small, at the side or a top corner, and a narration line shows nobody big.

### C3. The strip sized to who's there · stop 42
- **His words:** "this huge strip right here should not be here. There's one person, shorten the strip." Later: "So again, remove this strip."
- **What's wrong:** a dark band runs the full width of the screen for one bust. Its size follows headcount (200, 180 or 150 px; `#talk-strip`, `play.css` about line 447), not the people actually there.
- **Who:** General builder, Screens lane.
- **Done when:** the strip spans only the people present, so one person never gets a full-width band.

### C4. People shown where they really are · stops 27, 40, 43, 44
- **His words:** "this TV thing needs a graphic made for it." Also: "And why is Christina Hale here? Right? You see what I mean?"
- **What's wrong:**
  - During a broadcast, the President's bust stands in your living room.
  - The Governor and Chair Robbins never appear at all.
  - Lisa Cruz's phone call is staged as if she were standing in your home.
  - TV shows only as a tiny gray icon and call letters.
- **Who:**
  - CTO on the Mac: paints one TV frame for broadcasts.
  - General builder, Screens lane:
    - a broadcast shows the speaker inside the TV frame;
    - a phone call shows nobody standing in the room;
    - #9256 (family life, open) already makes a call a phone talk with no face drawn over it, and it goes in with this.
- **Done when:** during the Governor's address you see her on the TV in your room. Lisa's call shows no one standing there.

### C5. One figure behind a desk · stop 39
- **His words:** "If you can do that with a figure behind the desk, that would be great. So that way we can start getting people in scenes. But again, just do one... Now that you finally got it, I want to see you apply it to, let's say, a scene."
- **What's wrong:**
  - Nothing seats anyone, so the Oval Office chair is empty.
  - Seating and full bodies were set aside on Nov 10. The last full copy is commit 843df6be (`docs/art/full-body-people-after-early-access.md`).
- **Who:**
  - CTO on the Mac makes one proof using the Nov 3 Blender method:
    - a seated body and arms, painted for the Resolute desk and that camera;
    - head, hair and top swapped in from the bust pieces, the way busts stack.
  - You see the proof before anything is wired. Then the General builder adds it as a layer in that one scene.
- **Done when:** the Oval Office scene shows the President seated behind the desk, built from his own bust pieces, and you've OK'd it.

### C6. The paintings look low quality · stop 26
- **His words:** "Every one of these paintings looks so low quality. I don't know why."
- **What's wrong:** not known yet. **Find the cause first:** compare each room painting's pixel size and compression with how big your Mac shows it.
- **Who:** CTO on the Mac.
- **Done when:** the CTO shows the home room, the Oval Office and the train station at full window beside their source files, and says plainly why they looked soft and what changed.

---

## (d) Words: the two addresses and Christine

### D1. The President's address · stops 18, 19, 20, 22, 23
- **His words:**
  - "With Vice President Sandra Solomon here, I'll tell you plainly... what does that have to do with anything?... Americans don't talk like that."
  - "I came to this job from serving as governor. No, that's bad... before I served the country at large, I served Delaware or something like that. It needs to be more natural."
  - "Travelers choose the car and the roads carry them. That's terrible. That doesn't even make any sense."
  - "why pick that out? Like, is that a national issue right now?... the Democrats have been trying to push national rail for the past 7 years. Like I promised you in my campaign, no new rails"
  - "why is this entire, I assume, State of the Union, one paragraph about rail?"
  - "And why does it just say the speaker? Why not the whip or anything?"
- **On screen:**
  - "Speaker Joann Parsons, everyone here."
  - "With Vice President Sandra Solomon here, I'll tell you plainly: things are looking up, and I think there's more good coming."
  - "I came to this job from serving as Governor, and I'm excited about what's next for this country."
  - "As it is now, travelers choose the car, and the roads carry them. Because I've always thought government shouldn't run what drivers and private companies already do well, more passenger rail isn't happening on my watch."
  - "I've told you what I want done on more passenger rail, and now I'll go do it."
- The whole address is three cards: a greeting, rail and a sign-off. Nothing says which speech it is or where it's given. Your Oct 28 ruling makes Jan 20 the inaugural, but the scene called it evening in the Oval Office.

### D2. The Governor's State of the State · stops 28, 29, 30, 31, 32
- **His words:**
  - "Became law here is a little weird... I'm proud to announce in 2025, under our administration, public employees can now collectively bargain in the state of California."
  - "the shops on Main Street tell you so... That's not how people talk."
  - "that's confusing. That doesn't even make sense to me."
  - "I've had my say on, that doesn't make any sense... she just completely pivoted."
  - "I will keep collective bargaining for public workers on the books. Well, that's not her decision. And what do you mean on the books?"
  - "She didn't really say anything that's in front of it."
- **He liked:** "Working people get a fair deal when they can bargain together."

### D3. Christine after the address · stop 25
- **His words:** "Why is she so combative all of a sudden?" Also: "We'll see what Congress does. I'm not changing my mind. Okay, that's unnatural."
- **On screen:** "The President's against more passenger rail. That's wrong. Does that sound right to you?" After he picks "I'm with him on this one.", she says: "We'll see what Congress does. I'm not changing my mind."
- **Fine as it is (his words):** outside scenes, a person who has used up their talk repeating two or three lines.

### D4. What makes these lines unnatural
Each line is a whole fixed sentence from a bank, with one slot filled in (`data/english/parts/opening-speech.json`, `conversation.json`, `data/english/question-names.json`). The same faults run through every speech:
1. **The speech's outline is said out loud.** Its plan shows up as words: "As it is now, {today-clause}", "I've had my say on {turn-from}, and the other thing I came to talk about is {turn-to}", "That's the work in front of {realm}". Real speakers don't announce their structure.
2. **Records are read aloud.** "travelers choose the car, and the roads carry them" is the game's own description of the rail question (`question-names.json`), spoken as if it were speech. "On the books" is law-record talk.
3. **Name-checks with no point.** "With {vice-president} here", "{Speaker}, everyone here" and "I came to this job from serving as {prior-office}" are facts slotted in because the record has them. They give no state and no reason.
4. **A topic with no reason from the world.** Rail fills the whole address because it was the one question picked. Nothing ties it to a fight, a promise or the news. His example shows the kind of fix: the other party has pushed national rail for years, and he promised in his campaign to stop it.
5. **Time words that ignore the date.** "This was the year ... became law" comes three weeks into the year, and Robbins says "this year" about a 2024 race.
6. **Promises that aren't the speaker's to make.** A governor can veto a bill. She can't "keep" a law "on the books".
7. **A whole argument in one clause.** "everybody who gets the raise the union won pays a share of what it costs to win it".
8. **Filler with nothing in it.** "things are looking up, and I think there's more good coming"; "the shops on Main Street can tell you so".
9. **The wrong voice for the relationship.** His partner opens with a pundit's verdict ("That's wrong. Does that sound right to you?") and then shuts the talk down ("I'm not changing my mind.").

What works, going by his grade: short, plain and concrete, as in "Working people get a fair deal when they can bargain together."

### D5. The fix: in the English engine, from real speech
- **No reworded bank line.** Your rules from Nov 11 and 12 say every line goes through the engine with many versions and inserts, because "the problem is the engine". Every rule goes in the shared composer, so it reaches all speeches, talk, the Journal, the news and narration.
- **The address composer** (`src/director/address-render.ts`, `src/director/local-address.ts`, `src/director/data/speech-outlines.json`) builds from four things: what the speaker did and wants, what's in the news, what they promised, and what their office can do. It covers several topics, each a claim tied to a fact from the records and to what they'll do. The opening names the event, the place and the people the way real addresses do. The close names only what was said.
- **Calibration** uses real addresses: State of the Union and inaugural transcripts, State of the State addresses and county board addresses. Talk at home follows the speech corpus rules: short turns, plain agreement, softened disagreement.
- **His own rewrites are examples to calibrate against, not lines to paste.** They include the Delaware line, "I'm proud to announce in 2025..." and "Like I promised you in my campaign".
- **Pre-graded before he sees it.** Every words PR is played in three drawn places, before and after, and pre-graded as you would grade it (your Nov 12 standing order).
- **The long words job from the Desk is part of this.** For the ~4,640 lines #9170 excused, your answer was "Count them again and rewrite them with inserts."
- **Who:**
  - The Words lead leads and signs. It's restarted on the crew account from the handoff in #9091.
  - The General builder's builders write the engine parts.
  - Nobody else writes bank lines.
- **Done when:**
  - In three drawn new games, the opening address names the speech and where it's given, covers several things the President is really dealing with, and opens and closes like a real address.
  - The Governor's address passes the same test.
  - Christine reacts to the speech the way your partner would.
  - The CTO puts the pre-grade on the Desk before any of it reaches your build.

---

## (e) Time and clock

### E1. "You stay in" and the repeated opener · stops 45, 46, 49
- **His words:** "it's the evening of January 20th. You stay in. You stay in. That should not be there." Also: "It's the evening of, again, what?"
- **What's wrong:**
  - "It's {landing}. You stay in." (`data/english/parts/scene-words.json`, about line 4334, and "You stay in, thinking about {happened}" at about line 5475) tells you what you did.
  - It shows before and after the same address.
  - The Governor's address ran on the 21st and played on the 22nd as "You caught... last night".
  - Your Nov 8 rule says an opener names the date, the place and the person: "first thing on June 7th. You head to the clerk's office and speak to Maria Patton."
- **Who:** Words lead, with the General builder's World lane.
- **Done when:** "You stay in" never shows. Each opener names the date, the place and who's there. The same opener never shows twice in a day.

### E2. Midnight right after evening · stop 47
- **His words:** "Now it says it's midnight. Again, the timing is completely messed up in this game."
- **What's wrong:**
  - Right after "the evening of January 20", the clock reads 12:00 AM, the start of January 20, and it stays there through the talk with Christine.
  - #9256 (family life, open) carries a fix: on the opening evening, the clock shows the hour the household gets home, not 12:00 AM.
- **Who:** General builder gets #9256 ready on main; its red check gets a cause, not a re-pin. CTO merges.
- **Done when:** on the opening evening the clock reads an evening hour, and it moves forward through scenes.

### E3. Light that doesn't match the hour · stops 45, 49, 50
- **What's wrong:** "evening" shows daylight. "Early on January 22" and "First thing on January 28th" both show sunset light, and the clock reads 7:00 AM over a sunset.
- **Who:** General builder, World lane: each room's light follows the clock.
- **Done when:** morning scenes look like morning and evening scenes look like evening.

### E4. The Journal note vanishes · stop 24
- **His words:** "I didn't even get to see the journal stuff there."
- **What's wrong:** the Journal and News notes disappear after about 10 s. The note also starts with "Two years later" and nothing before it; its wording is fixed in G3.
- **Who:** General builder, Screens lane. A note stays until it's clicked. That's a crew call; your rule only says a click dismisses one at once.
- **Done when:** a note stays on screen until you click it.

### E5. Dates written two ways · stop 50 (not mentioned)
- **What's wrong:** "January 20" and "January 28th" appear side by side.
- **Who:** General builder, World lane, with the Words lead.
- **Done when:** every date on screen uses one style.

### E6. Calendar order and empty space · stop 48 (not mentioned)
- **What's wrong:** Coming up lists Dec 14, your birthday, ahead of Jan 20. The lower 40% of the panel is empty.
- **Who:** General builder, Screens lane.
- **Done when:** Coming up runs in date order, and the panel has no empty block.

---

## (f) Travel and industries

### F1. Only kitchens and markets · stop 51
- **His words:** "right now, you see it's just a bunch of kitchens and markets and stuff like that. I keep saying, like, it even started with some industries yesterday. So I would love to know what's going on with that."
- **What happened to the industries work** (the reset account's handoff): it changed businesses' books and sales, but it never added places to Travel.
  - In your build now:
    - dev mode's Industries page (#9631);
    - wholesalers selling outside the town (#9627).
  - Open and ready:
    - #9675: dev mode shows what each business paid under each law;
    - #9746: hospitals keep their own books;
    - #9745: town departments buy from town firms.
  - None of these changes Travel.
- **What's wrong** (two causes):
  1. Every town opens with three stores, three restaurants and one clinic, whatever its size.
     - #9670 fixes that: Danville, VA opens with 166 stores, 71 restaurants and 5 clinics.
     - But it's an unfinished draft on an old train branch, with conflicts and red checks, and the reset account's final list left it out.
  2. Travel's list (`townPlaces()` in `src/bench/places.ts`) shows the places tied to you, then fills up to nine with walk-in shops such as a diner, grocery or barbershop.
     - A factory, plant, warehouse or hospital shows up only if someone you know works there.
     - Paintings already exist for a factory floor, power plant, farm, construction site, hospital and bank lobby.
- **Who:** General builder, World lane.
  - Finish #9670 onto main, with a cause for each red check.
  - Finish the drafts beside it:
    - #9617: a clinic's patients come from outside the town;
    - #9671: people leave when work dries up;
    - #9644: the paper weighs closings by size.
  - Travel's rule waits on your answer (Desk question 1), because your Oct 26 ruling keeps a place that's listed only for being an office off Travel.
- **Done when:** Cambrian Park's Travel lists its real kinds of work (offices, a hospital, plants or warehouses where the county has them), and each card says why it's listed.

### F2. A job offer you never applied for · stops 33, 34
- **His words:**
  - "Oh, I'm getting a job offer? I didn't even apply for one."
  - "so I just instantly got a $70 an hour job? How?"
  - "You should say you remember meeting her at Santa Clara County Business Services X amount of years ago, or... she's been your best friend since..."
- **What's wrong:**
  - "Lisa from Santa Clara County Business Services is calling about the opening." (`scene-talk.json`: "{name} from {employer} is calling about the opening.") never says how you know her.
  - The offer came with no application.
  - The wage shows in cents ($68.99).
  - "What hours would I work" is an empty choice.
  - Why the offer came isn't known. Employers now open with standing openings (#8942). **Find the cause first.**
- **Who:** General builder, World lane, finds the cause. The Words lead makes her first mention say how you know her.
- **Done when:** no offer arrives unless you applied or someone put you forward, and the call says which. Lisa is introduced by how you know her, and the wage reads in whole dollars.

### F3. The school · stop 52 (not mentioned)
- **What's wrong:**
  - Cambrian Park Public Schools shows "Open now" at 12:00 AM.
  - "Who's there" lists Madeline Hodges, while your daughter is Madeline Hale. Nobody has checked whether they're two people.
  - The tile names sit on the pictures and are hard to read.
- **Who:** General builder, Screens lane.
- **Done when:** places show their real hours, "Who's there" is right, and names are easy to read.

---

## (g) People screen as a story

### G1. A massive hole · stop 53
- **His words:** "Again, wow. A massive just hole right here. Absolutely nothing going on... How many times do I have to say I hate this?"
- **What's wrong:** the card fills the left half, and everything right of about x=780 is empty.
- **Who:** General builder, Screens lane.
- **Done when:** the person card fills the panel, or the panel shrinks to fit it.

### G2. Not the approved card · stop 54
- **His words:** "this isn't the textured background or whatever I approved. Again, what is going on with wiring the UI? Oh my god, it's terrible."
- **What's wrong:** it's a flat, opaque black panel. Compared with the person card you called "perfect" on Nov 7, it's missing the texture, the see-through panel, the tagged quotes and a portrait for each person.
- **Who:** General builder, Screens lane (with B1).
- **Done when:** People matches the approved card on the new panel.

### G3. Facts, not a story · stops 17, 37, 55
- **His words:** "this doesn't include any information, and this is not told like a story. It's just a bunch of facts. Again, I keep saying this." Also, on the loading history: "a hospital stay isn't really in."
- **What's wrong:** every story is a dated list of records in broken grammar:
  - "At 2 Madeline Hale made the move to Cambrian Park, California."
  - "In 1995 Daniel Hale grew up going to school in California... He was arrested in 2009."
  - "I had a hospital stay in 2008."
  - In the Journal: "Six years on, I gave Lisa Cruz my word, and I meant it."
  - Your rule from Oct 1, said "multiple times": a story is told in chapters like a memoir, with dates where they matter, people named by how you know them, and repeats summed up.
- **Who:** the Words lead and its builders, in the shared story composer used by person stories, "Your life so far" and the Journal.
- **Done when:** each person's story reads as a few short paragraphs about their life, in plain grammar. No line stands for a single record, and nothing is mentioned without its cause.

### G4. Children have no picture · stop 53
- **What's wrong:** `src/bench/ui/face.mjs` draws an empty frame for a child, because the bust pieces have adult heads only.
- **Who:** CTO on the Mac paints child heads in the bust method; General builder wires them.
- **Done when:** every family member on People has a portrait.

---

## (h) Politics, elections, and the 15 stops he didn't mention

### H1. No city council · stop 56
- **His words:** "There's no city council or anything like that."
- **What's wrong:** Local shows only the county board. Nobody has checked whether Cambrian Park has a city government in real life.
- **Who:** General builder, World lane. Check the real record first.
- **Done when:** Local shows whichever body really governs his town.

### H2. Squished office name · stop 58
- **His words:** "look at this. Like, it's squished right here. Why?"
- **What's wrong:** "Supervis / or / (District / 4)" is crushed into a narrow column.
- **Who:** General builder, Screens lane.
- **Done when:** every office name fits on one line.

### H3. Can't learn about the parties · stop 60
- **His words:** "I can't learn about these parties or anything."
- **What's wrong:** a party page lists only who holds office, plus a Join button.
- **Who:** General builder, Screens lane, with the Words lead.
- **Done when:** each party page shows what the party stands for (from its records), its leaders and its record. Join stays.

### H4. "His people" · stop 61
- **His words:** "His people. What does his people mean? I'm not sure what that means."
- **What's wrong:** an unexplained heading sits over a run-on list, and "u.s." is lowercase.
- **Who:** General builder, Screens lane.
- **Done when:** the list has a plain name, and each name sits on its own row with its office written correctly ("U.S. Representative").

### H5. Chair Matthew Robbins · stops 35, 36
- **His words:** "Who is Chair Matthew Robbins?... See, I can't even click and figure out who this is." Also: "Why am I getting a scene about a supervisor or something? That doesn't make any sense."
- **What's wrong:**
  - Nothing says what he chairs.
  - "Robbins's" reads to you as an error.
  - His name can't be clicked.
  - A county chair's yearly address played as a full scene with no tie to you, and its words have the D4 faults: "it's what health care costs", a raw "$2.3 billion", and "this year" for a 2024 race.
- **Who:** General builder, World lane: a yearly address becomes a scene only when it touches you; otherwise it's news. The Words lead fixes the words.
- **Done when:** he's introduced as Chair of the Santa Clara County Board of Supervisors, his name opens his card, and his address reaches you as news unless it touches your life.

### H6. The TV station and the outlet tabs · stops 27, 68
- **His words:** "Is that a real station or is that made up last night?" Also: "this menu right here, not very intuitive, but this is the right approach."
- **What's wrong:**
  - KFWE-TV is never explained, and nobody has checked whether it's a real station.
  - News says you don't follow KFWE-TV, though you watched two addresses on it.
  - Seventeen outlet tabs crowd into two rows.
- **Who:** General builder, Screens lane. The CTO's TV frame is in C4.
- **Done when:** the station's name opens its page, News counts what you watch, and the outlets fit one row grouped by kind.

### H7. Right-to-work isn't underlined · stop 30
- **His words:** "Right-to-work? Is that like at-will employees? See, right-to-work, that should be something that's underlined as well."
- **What's wrong:** civic terms in speeches don't get the glossary underline.
- **Who:** General builder, Screens lane.
- **Done when:** "right-to-work", and every other glossary term, is underlined in scene text, and hovering shows what it means.

### H8. Can't open a news story · stop 67
- **His words:** "there's nothing on the street signs. I can't click the story."
- **What's wrong:** clicking a headline only moves it to the lead spot with the same three lines. There's no article behind it, and the green signs in the lead picture are blank.
- **Who:** General builder, Screens lane, with the Words lead.
- **Done when:** clicking a headline opens the full story, and no picture shows blank signs.

### The 15 stops he didn't mention
- **5.** Crew talk in the patch notes. See B4.
- **9.** The portrait blanks while a new look loads. See B5.
- **16.** A Washington backdrop for a California load. See B3.
- **21.** The Guide talks about the system and hides the scene.
  - On screen: "Not every body in this game has a speaker. Where a body's records name a different presiding office, the game uses that name." While the Guide is open, the scene's box and busts disappear.
  - Who: General builder, Screens lane, with the Words lead.
  - Done when: an entry reads like a glossary entry, never about "the game", and the scene stays visible behind it.
- **37.** "Six years on, I gave Lisa Cruz my word." See G3.
- **43.** The Governor talks and Christine is the face shown. See C2 and C4.
- **44.** A phone caller standing in the room. See C4.
- **48.** Calendar order and empty space. See E6.
- **50.** Morning text over sunset light, and dates written two ways. See E3 and E5.
- **52.** The school is "open" at midnight and lists the wrong name. See F3.
- **57.** Recent votes: on a 5-seat board, six votes show only 3 voting, with no absences named, and the first row is in smaller type.
  - **Find the cause first:** were two members absent, or is the count wrong?
  - Who: General builder, World lane.
  - Done when: each vote accounts for every seat, absences are named, and all rows use one type size.
- **62.** Senate and House races are dated to odd years, and a senator shows "Laws signed 0".
  - Who: General builder, World lane. Find where the history writer dates federal races.
  - Done when: every federal race in a story falls in an even year, and lawmakers show the bills they carried, not laws signed.
- **65.** Issues shows a raw id ("2025-1") and a future date under What changed.
  - Who: General builder, Screens lane.
  - Done when: no ids appear, and a future date reads as when the law takes effect.
- **66.** Budgets cuts off "Housing and", and only 2 of 9 departments show a head.
  - Who: General builder, Screens lane, to your approved Budgets design: heads in words, plus the "Who wrote it" bust.
  - Done when: full department names show and every department has its head.
- **69.** News shows a bill signed a week before the Assembly passed it, and prints "H.R. 2" and "government committee" where a reader expects names.
  - **Find the cause first.**
  - Who: General builder, World lane, with the Words lead.
  - Done when: news runs in the order things happened, and bills and committees go by their names.

---

## (i) Who does what, on which account, in what order

### The accounts
- **CTO (this account, fresh for the week)**
  - Merges, builds and checks.
  - Makes all the Mac-only art.
  - Puts every update and question on the Desk.
- **General builder (the account at 30-40% this week; its other CTO)**
  - Does every code and words job in this plan, in four lanes at once, until the account is used up.
  - Opens PRs and never merges.
- **Reset account (5 PM)**
  - Its final handoff (4:57 p.m. on #9739) says it is inactive.
  - Your words: "You can take everything and then ask it, you know, what's been done in its sessions, push the work that's been done in its sessions along... And then the other account can take care of it."
  - The handoff already answers what each session did.
  - What it still holds is notes and patches in its Project files (`/mnt/project-files/...`), which the other account can't read:
    - the free-company part 1 patch;
    - the scene build-out briefs;
    - the civic-roles handoff;
    - the layoffs search script;
    - the words-lead table.
  - After the reset, the CTO asks it to push those into one repo branch. That's its whole job. The other account takes care of the rest.
- **Branches**
  - PRs go to main until the two-branch switch.
  - After you change the two settings on your other account, all work goes to dev.
  - Main then gets dev's work at most twice a day, and only when dev passes its whole check.
  - Each move to main starts a Mac build.
- **Crew line:** the CTO opens a new crew line for the new crew, as you suggested, and you tell the general builder to watch it. #9739 stays as the handoff record.

### The order
**Tonight**
1. **CTO**
   - Put this plan and the four questions on the Desk, with the exact switch settings for you.
   - Open the new crew line and post this plan there.
   - Copy the Metrics mocks into `docs/mocks/` and start `docs/mocks/APPROVED.md`, which lists each approved screen and what must show on it.
   - Close the PRs already in main (list below).
   - Ask the reset account to push its Project files.
2. **You:** paste the crew message, change the two settings, and answer the questions.
3. **General builder, first job:** the reset account's handoff list on #9739, thread by thread: branch, PR, what's left. It includes three things that list left out:
   - the four drafts #9670, #9617, #9671 and #9644;
   - the unmerged start-at-18 branch (`claude/project-thread-dvz2zo`);
   - #9675's families-guard red, which has no owner.
   - It posts one claim line per item.
4. **General builder starts four lanes:**
   - **Screens** (the one owner of every screen from now on): A2, B4, B5, the B3 code, B1, B2, C1-C4, E4, E6, F3, G1, G2, H2-H4, H6-H8, and stops 21, 65 and 66.
   - **World:**
     - first A3 (progress), then A1 (first-year work from #9744), F1 (#9670 and its drafts, then Travel after your answer) and F2;
     - E2 (#9256), E3 and E5, H1, H5, and stops 57, 62 and 69;
     - your Desk answers: take every count off the screens; "18, unless you pick another age" (from branch `claude/project-thread-dvz2zo`); registration for townspeople only; a longer warm-up once A3 holds.
   - **Words lead** (started first, on the top model, from #9091's handoff): signs every player line. Its work is D1-D5, E1, G3 and the ~4,640-line recount and rewrite.
   - **Long game and honest tests:** the weekend's top faults (below).
5. **CTO on the Mac:** in order,
   - import the White House lights;
   - the desk-figure proof;
   - the TV frame;
   - child heads;
   - why the paintings look soft;
   - then the new monuments, after your answer.

**Every day after**
- The CTO merges in this order: a red main first, then check PRs (each carrying its fix), then the rest.
- A second session plays each done-when before anything is called done.
- Short patch notes go on the Desk. Main gets dev's work at most twice a day.

### PRs open now (for the CTO)
- **Ready to merge now:**
  - #9742 (pool: three scene items say what dev mode shows);
  - #9743 (pool: the named-schools red at Hedrick, IN).
- **Ready once their own gate passes** (the general builder runs each gate):
  - #9745, town departments buy from town firms. Left: the full gate, a year comparison and a dev screenshot.
  - #9746, hospitals keep their own books. Left: the full gate.
  - #9675, dev mode shows what each business paid. Left: the families guard is red, and it needs a cause.
  - #9706, central bank titles from the words file. Left: a gate on the new head and the second reader's stamp.
  - #9256, family life, which carries the 12:00 AM fix. Left: merge main, and give its red a cause, not a re-pin.
- **Not ready:**
  - #9673: its own body says "Do not merge yet."
  - #9685: it wants a test pinned to a seed that passes, which your random-places rule rules out. Find why no ask reached a roll call instead.
  - #9623 and #9662: they conflict with main.
  - #9568 and #9610 (promises): they need one merge pass through 10 conflicts.
  - #9744: plan only.
- **Close, already in main** (the compare shows nothing new): #9652, #9729, #9669, #9720, #9627, #9631, #9625, #9640.
- **Your call:** I searched each listed PR's whole body for an owner's call, answer, OK or ruling, and for a do-not-merge note. None asks for your call; only #9673 says "Do not merge yet."

### The weekend fixes, folded in (cto-actions.md, all 30 lines)
- **Done in your build:**
  - 2: both faults you named. The empty ballot at Cross Anchor, SC (#9740) and the campaigning red at Long Neck, DE (#9737) both came in through #9741. A second session confirms them.
  - 17: you answered "No. Count them again and rewrite them with inserts." It goes to the Words lead.
- **Long game lane:**
  - 1: the year-13 crash at Inarajan, Guam, and the year-on-year climb.
  - 3: the full test run never finishes.
  - 4: years got slower.
  - 5: the 15 "expected to fail" marks come off, each in the same PR as its fix.
  - 6: tests go back on drawn places.
  - 7: undo the loosened checks.
  - 8: trace the world changes instead of moving tests.
  - 10: the 28 reopened stand-ins.
  - 26: state revenue growth.
  - 27: the 14 seeded rolls. The opening-draws thread left 38 sites, 23 of them label-only.
  - 11: the fold check, only if a train ever runs again.
- **World lane:**
  - 16: the two fixed numbers.
  - 25: promises into the engine (#9568's merge pass).
  - 15: delete the "turns 18" leftovers once the start age lands.
- **Words lead:**
  - 12: delete the filing-fee lines.
  - 13: restore "Take care of yourself." and the two liked meeting lines.
  - 18: sign or send back the unsigned words PRs.
- **Screens lane:** 22, the release notes, with B4.
- **General builder housekeeping:**
  - 28: one answer on `docs/current.json`'s replaced list.
  - 29: trim the 154 MB of screenshots, after checking what reads them.
- **CTO:**
  - 9: never merge a PR whose body says not to.
  - 14: close the five carried PRs after their compares.
  - 19: your English work plan and the list of laws taking effect, on the Desk.
  - 20: every update on the Desk.
  - 21: no test-only PRs into main before the switch.
  - 23: tag 0.111.2, or say there's no such build.
  - 24: a second session plays the 8 direct merges.
  - 30: crew rulings are written as the crew's.

---

## (j) How we stop repeats

**How every check works:**
- It ships in the same PR as its fix and is shown failing on the old build, so nothing is marked "expected to fail" and main never goes red.
- It runs at a drawn place and prints the place and seed. A red gets a cause, never a new town.
- Checks merge before anything they judge.
- The Screens lane owns every screen. The CTO keeps `docs/mocks/APPROVED.md`, and `approved-screens-shipped` reads it.

**The checks, each with the ruling you repeated today:**
1. **`title-fresh-each-game`** ("each game, it should start with new ones"). Fails when two launches or two new games open on the same painting, a painting repeats before all have shown, the New game busts are the same, or loading shows a monument.
2. **`menu-panel-approved`** ("I hate this blockiness"; "this isn't the textured background"). Fails when any screen's panel isn't the approved 78% textured surface with a slim edge.
3. **`menus-never-scroll`** ("why there's so many scroll things. Again, this is stuff I say I hate"). Fails when any menu at 1440x900 shows a scroll bar or scrolls as a page.
4. **`menus-no-dead-space`** ("how many times do I have to say I hate this empty space?"; "A massive just hole"). Fails when any panel has an empty block bigger than about a fifth of it.
5. **`patch-notes-like-real`** ("This is not structured like a real patch note"). Fails when a build's notes aren't areas of short lines, or contain crew words.
6. **`creator-waits-for-gender`** ("a person shouldn't even pop up until I pick a gender"). Fails when a bust shows before a gender is picked, or when Random leaves any part unchanged.
7. **`approved-screens-shipped`** ("Did that UI ever get wired?"; "what happened to all the UI stuff?"). Fails when a screen in `docs/mocks/APPROVED.md` is missing what its mock requires, for example a Metrics row that doesn't open its line.
8. **`talk-strip-fits`** ("She should be smaller since she isn't talking"; "shorten the strip"). Fails when a quiet person is as big as the speaker, the people take more width than they fill, or a TV speaker or phone caller stands in the room.
9. **`scene-clock-agrees`** ("the timing is completely messed up"; "You stay in. That should not be there."). Fails when an opener's time of day, the clock and the room's light disagree, "You stay in" shows, or an opener shows twice in a day.
10. **`loading-keeps-moving`** ("It should continue to load. This is just poor optimization."). Fails when the bar and its words don't change for more than a second, or no words show in the first second.
11. **`speech-reads-like-a-speech`** ("Americans don't talk like that." The address was called out on Nov 8, 11, 12 and today). Fails when a pre-graded address at three drawn places has any of these: only one topic, an empty name-check, outline words spoken aloud, time words that ignore the date, or a promise beyond the speaker's power.
12. **`story-not-a-list`** ("this is not told like a story. It's just a bunch of facts. Again, I keep saying this."). Fails when a story or the Journal runs sentence after sentence that starts with a year or an age, mentions a record with no cause ("a hospital stay"), or names a person without how you know them.
13. **`first-mention-says-who`** ("it needs to explain with context if I don't know who these people are"). Fails when someone new to you appears without how you know them, or a named person can't be clicked.
14. **`travel-shows-the-towns-work`** ("it's just a bunch of kitchens and markets"). Fails when a drawn town's Travel shows only shops and kitchens while its records hold other work.
15. **`first-year-has-work`** ("I can't run for anything"). Fails when a new game at a drawn town has nothing the player can do in politics on day one.
16. **`scene-never-waits-behind-a-menu`** ("I think I'm stuck"). Fails when a due scene waits behind an open card.
17. **`civic-terms-underlined`** ("right-to-work, that should be something that's underlined"). Fails when a glossary term in scene text has no underline.

---

## Keep (he liked these)
- The loading messages.
- "Working people get a fair deal when they can bargain together."
- Christine repeating two or three lines outside scenes once her talk is used up.
- The News approach, and the California State Building picture ("It's pretty cool").
