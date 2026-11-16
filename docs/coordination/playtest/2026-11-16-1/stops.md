# Playtest Nov 16, 2026, sitting 1: stops (v0.112.0, main ca195112)

- Recording: `/Users/lamontae/Desktop/Screen Recording 2026-11-16 at 3.58.22 PM.mov`. It runs 18.4 min, from 3:58:22 p.m. to 4:16:45 p.m. The filename has a narrow no-break space before "PM", so the path must be globbed.
- His words: `cto-notes/playtest/2026-11-16-1.md`, quoted verbatim below. It is a voice transcript, so it says "Christina Hale" where the screen says **Christine Hale**, and "Joanne" where the screen says **Joann** Parsons.
- Frames: 334 frames and 84 four-up sheets, in `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/`, with sheets in `.../pt1/sheets/` and native-size grabs in `.../pt1x/`. This is a scratchpad folder and can be cleared.
- Times are the video time stamped on each frame. One stamp reads "17:60.0", which means 18:00.0 (a rounding quirk in the stamping script).
- Seeking by time in this .mov lands on the wrong frame. Re-grab a frame by reading the file in order: `scratchpad/tools/seqgrab.py`.
- Stops he did not mention are tagged **[not mentioned]**.

## Title and menus

1. **0:00.0 to 1:16.7: the title backgrounds are three monuments on a loop.**
   - Frames:
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00000_00000s.jpg` (Lincoln Memorial)
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00007_00018s.jpg` (Capitol)
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00017_00050s.jpg` (White House)
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00026_00076s.jpg` (Lincoln again)
   - Screen: "New game / Saved games / Options / Patch notes / Quit".
   - The sequence:
     - Lincoln Memorial at night, 0:00 to 0:14.
     - It fades to the Capitol by day, 0:16 to 0:45.
     - It fades to the White House, 0:47 to 1:13.
     - It fades back to the Lincoln Memorial at 1:15.
   - The Lincoln Memorial is also behind New game, Start a life and the loading screen.
   - His words: "Okay, so I started my recording, and once again, it's only these two pictures. What is this? The Lincoln Memorial and then the White House. Oh no, now it changed to, I guess this is the Capitol building. That wasn't there before, but each game, it should start with new ones. I don't understand how many times I have to say that." Later: "See, here we are back again to the White House. Like, where are all the images? Again."
   - Wrong: the same three monuments cycle every 30 s or so and repeat. Nothing is new for each game.

2. **0:31.9: the "blockiness" of the title menu.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00011_00031s.jpg`
   - Screen: a flat grey see-through rectangle with gold corner pieces, holding "New game / Saved games / Options / Patch notes / Quit", with empty space under "Quit".
   - His words: "And again, how many times do I have to say this blockiness? I hate this blockiness here. And I'm not sure if this is the UI I approved. Did that UI ever get wired?"
   - Wrong: the menu is a hard-edged untextured box, taller than its five items. I take "here" to be the box because his cursor sits on it.

3. **0:57.0: the patch notes are one blob.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00019_00056s.jpg`
   - Screen: "PATCH NOTES / BUILDS / 0.112.0 Nov 16 … 0.105.0 Nov 11 / ADDED / Continue and Saved games bring back a saved life. After the game restarts, the title screen's Continue opens your last life where you left it, and Saved games lists every life you have played by name and date, with Load to go back to one. Loading rebuilds the same day, the same you and the same household. / The game keeps your life when you quit and reopen it. …"
   - His words: "These patch notes, as you see, are just a blob. They're not formatted at all." Also: "This is not structured like a real patch note. How hard is it to find that?"
   - Wrong: every change is a run-on paragraph, with no item titles, no bullets and no space between changes.

4. **1:00.4: three scroll bars on the patch notes.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00020_00060s.jpg`
   - Screen: the BUILDS list has its own bar, and the text column has two bars side by side.
   - His words: "And why there's so many scroll things. Again, this is stuff I say I hate. Oh my god."
   - Wrong: one panel carries three scroll bars, and the text scrolls as a page.

5. **1:10.8: developer text in the patch notes [not mentioned].**
   - Frames:
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00023_00070s.jpg`
     - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00019_00056s.jpg`
   - Screen:
     - "Turning on dev mode's full tracing no longer makes everyone in the world choose every day. With the debug observer on, every full person used to choose what to do every day instead of on their own schedule …"
     - "A smaller difference through the relationship record remains and stays open on the item."
     - "… so 2,451 no longer reads as 2451."
     - "The bench keeps its saves in your home folder."
   - His words: none.
   - Wrong: the player reads crew talk: dev mode, debug observer, the bench, "the item".

## New game and creator

6. **1:28.4: the same busts on New game every time.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00030_00088s.jpg`
   - Screen: "NEW GAME / Start a life" with one bust (a man in a green jacket), and "Advanced" with three busts.
   - His words: "Alright, new game. Start a life. I wonder, is that person the same every time, or is that person new? No, it's the same because I recognize these people over here."
   - Wrong: the same four faces appear in every game.

7. **1:52.5: a person shows before a gender is picked.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00037_00112s.jpg`
   - Screen: "START A LIFE / WHO I AM / I AM  Female  Male  Non-binary", with none of the three picked. A bearded man in a tan shirt is already standing there. "BODY Man / SKIN Deep / HAIR Curls / HAIR COLOR Dark brown / FACIAL HAIR Beard / TOP Chambray shirt / TOP COLOR Tan"; birthday "May 27 1963 (age 61)".
   - His words: "So, again, a person shouldn't even pop up until I pick a gender. Male."
   - Wrong: a default man is shown before any choice, and he is the same man every game. He picks Male at 1:59.4.

8. **2:13.2: no way to randomize the whole character.**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00043_00133s.jpg`
   - Screen: separate buttons "Random" (under the portrait), "Randomize name", "Randomize birthday" and "Random place". Name "Levi Hale", birthday "December 14 1987 (age 37)".
   - His words: "Randomized name. Birthday. I'll be 37. Random place. I should be able to randomize my entire character, by the way. Maybe that's what this is. No, I guess this is just his look."
   - Wrong: "Random" only changes the look. No single button makes a whole random person.

9. **2:23.5: the portrait goes blank while the look changes, seen twice (1:49.1 and 2:23.5) [not mentioned].**
   - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00046_00143s.jpg`. Also seen at 1:49.1: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00036_00109s.jpg`
   - Screen: "SKIN Medium / HAIR Receding / HAIR COLOR Black / FACIAL HAIR Mustache", with no portrait under "Levi Hale".
   - His words: none.
   - Wrong: the portrait vanishes for a moment while the new look loads.

10. **2:30.4: skin labels "light, deep, medium".**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00048_00150s.jpg` ("Light"). Also "Deep" in f00037_00112s.jpg and "Medium" in f00046_00143s.jpg.
    - Screen: "SKIN ‹ Light ›".
    - His words: "Alright. Skin, light, deep, medium. What do you mean light, deep, medium?"
    - Wrong: skin tone is a vague word in a text stepper, with no swatch.

11. **2:47.6: hairstyle names.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00053_00167s.jpg` ("Textured")
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/n_00167.6.png` ("Swept back")
    - Screen: "HAIR ‹ Textured ›". The other values seen are "Curls", "Cropped", "Swept back", "Side part" and "Receding".
    - His words: "Cropped, textured, sweat back. Just do hairstyle 1, 2, 3, 4, 5 or something like that, and allow people to, like Enzoi does this, where you can click it and then, or maybe The Sims, I think it's Enzoi, where you can click it and just see the images as well."
    - Wrong: hair is picked by name in an arrow stepper. There is no grid of pictures to click.

12. **3:42.6: empty dead space.** He says this right after setting the beard (3:18 to 3:22).
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00069_00222s.jpg`. His cursor rests in the empty area at (533, 500).
    - Screen: the WHO I AM column ends at "Randomize birthday". Everything below it, and below "Levi Hale / Random", is empty down to the bottom of the panel. The look now reads "SKIN Deep / HAIR Curls / HAIR COLOR Black / FACIAL HAIR Beard / TOP Sweater / TOP COLOR Maroon".
    - His words: "Mustache, beard, okay. Sure, this is fine. Okay, there's just lots of empty, dead space right here. Again, how many times do I have to say I hate this empty space?"
    - Wrong: about half the panel (the lower left and middle) is empty.

13. **3:46.0 to 3:49.5: the border.** He says this just before Begin my life.
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00070_00226s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00071_00229s.jpg`
    - Screen: a thin solid gold line with gold corner pieces around "START A LIFE".
    - His words: "And again, I'm not sure if this border is what I approved."
    - Wrong: he cannot tell whether this is his approved edge. The menu-look rule says a slim brass edge with small corners and nothing hard-edged. This needs a side-by-side check with the approved mock.

## Loading

14. **3:50.4 to 4:00.8: no words for the first 10 seconds.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00072_00230s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00075_00240s.jpg`
    - Screen: "CAMBRIAN PARK, CALIFORNIA" over an empty bar. The first line, "Writing everyone's past", appears at 4:00.8.
    - His words: "Okay, so there's nothing popping up here. Words should be popping up here. Now there is. I like these loading messages."
    - Wrong: the bar sits empty with no message for about 10 s.

15. **4:31.7 to 4:52.4: the loading screen freezes.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00084_00271s.jpg` (start)
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00090_00292s.jpg` (end)
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00091_00295s.jpg` (moving again)
    - Screen: "Letting the country run a few weeks". The bar's end stays at the same pixel (x≈279 to 281 of 1600) from 4:31.7 to 4:52.4, about 21 s. The slow background pan also drops to almost no motion around 4:29 to 4:34. "Preparing the opening" follows at 4:55.8.
    - His words: "Okay, I can see that this screen has frozen here. That shouldn't happen. It should continue to load. This is just poor optimization. Now it just started moving again."
    - Wrong: the bar stalls for about 21 s on one step. The background was moving again by about 4:34 while the bar stayed stuck. I take the stalled bar to be what he called "frozen", but that is my reading.

16. **3:50.4 to 5:06.1: Washington backdrop for a California start [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00094_00306s.jpg`
    - Screen: "CAMBRIAN PARK, CALIFORNIA" over the Lincoln Memorial, which is also the title picture.
    - His words: none.
    - Wrong: the loading picture is the title monument, not the player's place.

## Scenes and words

17. **4:59.2 to 5:06.1: "a hospital stay" in the life history.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00092_00299s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00094_00306s.jpg`
    - Screen: "2021 / I began college in 2006. / I had a hospital stay in 2008. / I earned a bachelor's degree in 2010. / I was out of work for ten months in 2010. / In 2011 I set up house with Christine Hale. / … / Jennifer came along in 2012. / Aditi arrived after, in 2013. / … / Madeline came next, in 2017. / At 31 I made the move to Cambrian Park, California."
    - His words: "Okay, a hospital stay isn't really in."
    - Wrong: a flat list of record events, such as an unexplained hospital stay, stands in for a life story.

18. **5:26.3: "Speaker" with no context.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00101_00326s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00112_00363s.jpg` (guide, 6:03.6)
    - Screen: "PRESIDENT KEITH FARRELL / Speaker Joann Parsons, everyone here." The bust strip reads "Keith Farrell / Joann Parsons / Sandra Solomon", with no titles. The guide he opened says "Speaker / WHAT IT IS / The presiding officer of a chamber, usually elected by its members. …"
    - His words: "Again, there's no context here when it says Speaker Joanne Parsons, everyone here, because it's just showing the Oval Office." Also: "And why does it just say the speaker? Why not the whip or anything? That's why it shouldn't even say the speaker. Everyone here, again, no context."
    - Wrong: nothing says Speaker of what, or why she is the one named. The setting is just an empty Oval Office.

19. **5:26.3: the President's opening line.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00101_00326s.jpg`
    - Screen: "With Vice President Sandra Solomon here, I'll tell you plainly: things are looking up, and I think there's more good coming."
    - His words: "With Vice President Sandra Solomon here, I'll tell you plainly. Okay, with the Vice President there, okay, what does that have to do with anything? And then I'll tell you plainly. I don't like that. Americans don't talk like that. Things are looking up. And I think there's more good coming. Okay, it's kind of weak."
    - Wrong: an empty name-check and a stiff "I'll tell you plainly" open a weak, contentless line.

20. **5:26.3: "I came to this job from serving as Governor".**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00101_00326s.jpg`
    - Screen: "I came to this job from serving as Governor, and I'm excited about what's next for this country."
    - His words: "I came to this job from serving as governor. No, that's bad. That's not a good way to say it. … It needs to be more natural. … Okay, so what's the point of even saying you came from serving as a governor? There's no, like, what was the point in that?"
    - Wrong: the line is unnatural, names no state and serves no purpose.

21. **6:03.6: developer text in the guide, and the guide hides the scene [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00112_00363s.jpg`
    - Screen: "HERE / Not every body in this game has a speaker. Where a body's records name a different presiding office, the game uses that name."
    - His words: none.
    - Wrong: the guide talks about "the game" and "a body's records" (system talk). While it is open, the scene's text box and busts disappear.

22. **7:28.6: the rail paragraph.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00137_00448s.jpg`
    - Screen: a train station painting with no person. "PRESIDENT KEITH FARRELL / As it is now, travelers choose the car, and the roads carry them. Because I've always thought government shouldn't run what drivers and private companies already do well, more passenger rail isn't happening on my watch."
    - His words: "As it is now, travelers choose the car and the roads carry them. That is completely unnatural. … Travelers choose the car and the roads carry them. That's terrible. That doesn't even make any sense." Also: "More passenger rail isn't happening on my watch. I get what you're trying to say, but why pick that out? Like, is that a national issue right now? … And what drivers and private companies already do well, that doesn't even make any sense."
    - Wrong: the lines are machine-sounding and pick rail for no stated reason.

23. **8:10.4: the address is three cards, one of them about rail.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00150_00490s.jpg`
    - Screen: "PRESIDENT KEITH FARRELL / I've told you what I want done on more passenger rail, and now I'll go do it."
    - His words: "I've told you what I want done on more passenger rail, and now I'll go do it. All right, that's entirely unnatural. And why is this entire, I assume, State of the Union, one paragraph about rail?"
    - Wrong: the President's whole address runs 5:26 to 8:10 in three cards: greeting, rail, sign-off. It covers one issue and closes on an unnatural line.

24. **8:58.5: the journal pop-up vanishes before it can be read.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00164_00538s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00167_00548s.jpg` (gone)
    - Screen: "JOURNAL / Two years later, I moved to Cambrian Park, California. My daughters Jennifer, Madeline and Aditi came too. I was 31 at the time." Also "NEWS / Jean Peters confirmed as Secretary of Agriculture".
    - His words: "I didn't even get to see the journal stuff there."
    - Wrong: both pop-ups are gone by 9:08.8, after about 10 s. The journal line also starts "Two years later" with nothing before it.

25. **9:26.0 to 9:39.8: Christine Hale's lines.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00172_00566s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00176_00579s.jpg`
    - Screen: "CHRISTINE HALE / The President's against more passenger rail. That's wrong. Does that sound right to you? / 1. Same as you, Christine. / 2. I'm with him on this one. / Say nothing / Leave". After he picks 2: "LEVI HALE / I'm with him on this one. / We'll see what Congress does. I'm not changing my mind."
    - His words: "The president's against more passenger rail. That's wrong. Does that sound right to you? All right, that's a little... Well, I'm going to attribute this to the shitty speech. … We'll see what Congress does. I'm not changing my mind. Okay, that's unnatural. Why is she so combative all of a sudden? … This is fine. You know, it's not in a scene. … every NPC has, like, its own dialogue tree. And once you exhaust it, it says the same 2 or 3 things. That's fine. That's mainly how it should be outside of scenes. But... this is unnatural. I don't like that."
    - Wrong: his partner turns curt and combative over rail, in unnatural lines.

26. **10:00.4: the paintings look low quality.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00182_00600s.jpg`
    - Screen: the wood-paneled home room, with "Monday, January 20, 2025 / 12:00 AM", "HERE" and "Christine Hale".
    - His words: "So again, remove this strip. Every one of these paintings looks so low quality. I don't know why."
    - Wrong: he finds the scene paintings (home, Oval Office, station) low quality.

27. **13:22.9: the TV graphic for the Governor's address.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00244_00802s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/gov1.jpg` (enlarged)
    - Screen: "GOVERNOR JUDY HENRY / [small monitor icon] KFWE-TV".
    - His words: "You caught Governor Judy Henry's State of the State. Is that what it's called? State of the State? Address on KFWE-TV. Is that a real station or is that made up last night? All right, this TV thing needs a graphic made for it."
    - Wrong: TV is shown only as a tiny grey icon and call letters. There is no TV picture, and the station is never explained. Whether KFWE-TV is real was not checked.

28. **13:22.9: the Governor's opening line.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00249_00820s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/gov_f00249_00820s.jpg`
    - Screen: "Members of the California legislature, and every citizen of California. This was the year collective bargaining for public workers became law here."
    - His words: "This was the year collective bargaining for workers became law here. Became law here is a little weird. It would sound more natural to say, like, I'm proud to announce that in 2025... Which, by the way, it's January 20th, 2025, so I'm not sure if that makes sense. … I'm proud to announce in 2025, under our administration, public employees can now collectively bargain in the state of California. You know, that would sound more natural."
    - Wrong: "became law here" is stiff, and "this was the year" makes no sense three weeks into the year.

29. **14:00.7: "the shops on Main Street can tell you so".**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00255_00840s.jpg`
    - Screen: "There are more jobs than when this term began, and the shops on Main Street can tell you so."
    - His words: "There are more jobs than when this term began, and the shops on Main Street tell you so. Yeah, that's completely unnatural. … That's not how people talk."
    - Wrong: the line is unnatural.

30. **14:14.5: the right-to-work line, which is confusing and not underlined.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00259_00854s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/govlines.jpg`
    - Screen: "Why would we change course, when everybody who gets the raise the union won pays a share of what it costs to win it? Because I believe the right to organize built the middle class in this country, I will stand against any bill for right-to-work rules, whoever brings it."
    - His words: "Why would we change course when everybody who gets the raise the union won pays a share of what it costs to win? Alright, that when everybody costs to win it, that's confusing. That doesn't even make sense to me. … I will stand with any bill for right-to-work rules, whoever brings it. I don't like that. And wait, what? Right-to-work? Is that like at-will employees? See, right-to-work, that should be something that's underlined as well. I don't understand this one."
    - Wrong: the sentence is tangled, and "right-to-work" has no glossary underline. The screen says "against"; he read it aloud as "with".

31. **14:59.2: "I've had my say", then a pivot.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00272_00899s.jpg`
    - Screen: "I've had my say on right-to-work rules, and the other thing I came to talk about is collective bargaining for public workers. Teachers and other public workers have a seat at the table. I will keep collective bargaining for public workers on the books, and I will veto any bill that would undo it. Working people get a fair deal when they can bargain together."
    - His words: "I've had my say on right-to-work rules, and the other, I've had my say on, that doesn't make any sense. I don't get what she's trying to say. … Wait, so she just completely pivoted. I don't understand. … I will keep collective bargaining for public workers on the books. Well, that's not her decision. And what do you mean on the books? … That's not how people would talk. Working people get a fair deal when they can bargain together. That's better. I like that."
    - Wrong: a stitched-on transition and a promise that is not hers to make ("keep … on the books"). He liked the last sentence.

32. **15:30.1: the Governor's close.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00281_00930s.jpg`
    - Screen: "That's the work in front of California, and I thank you for hearing me out."
    - His words: "That's the work in front of California. She didn't really say anything that's in front of it."
    - Wrong: the close sums up work the speech never laid out.

33. **15:37.0: Lisa Cruz arrives with no context.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00283_00937s.jpg`
    - Screen: "First thing on January 28th, your phone lights up with Lisa Cruz's name. / Lisa from Santa Clara County Business Services is calling about the opening."
    - His words: "Okay, so this is where I said it needs to explain with context if I don't know who these people are, but it shouldn't say Lisa from Santa. … You should say you remember meeting her at Santa Clara County Business Services X amount of years ago, or, you know, she's been your best friend since you met getting a job, or, you know, something like that."
    - Wrong: the scene never says how he knows her. "The opening" is a job he never applied for.

34. **16:08.0: a job offer at $68.99 an hour with no application.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00292_00967s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/lisa.jpg`
    - Screen: "LISA CRUZ / We went through everybody, and we'd like to bring you on as a business analyst, at $68.99 an hour. / 1. What hours would I work at Santa Clara County Business Services? / 2. That's great news. Count me in. / 3. Thank you, but I'm going to pass on working as a business analyst. It isn't what I'm looking for. / 4. Can I think it over and call you back?" After he picks 2: "Good. We'll be glad to have you."
    - His words: "We went through everybody, and I'd like to bring you on as a business analyst at $68.99 an hour. Oh, I'm getting a job offer? I didn't even apply for one. Okay, what hours? That's irrelevant for the, you know, standard hours, obviously. … She said, so I just instantly got a $70 an hour job? How?"
    - Wrong: an unsolicited, unexplained job at a raw-cents wage, with a pointless "what hours" option.

35. **16:38.9: "Chair Matthew Robbins's yearly address".**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00301_00998s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/lisa.jpg` (enlarged)
    - Screen: "It's early on February 11. You stay in. You caught Chair Matthew Robbins's yearly address on KFWE-TV last night."
    - His words: "Who is Chair Matthew Robbins? And also, Robbins is... No. Grammatical error here. Who is Chair Matthew Robbins? See, I can't even click and figure out who this is."
    - Wrong: "Chair" of what is never said, "Robbins's" reads as a grammar error to him, and the name cannot be clicked.

36. **16:56.1: a supervisor's speech nobody asked for.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00306_01016s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1x/robbins.jpg`
    - Screen: "CHAIR MATTHEW ROBBINS / KFWE-TV / Everybody in this room, and everybody watching. Folks in Santa Clara County, I've got one thing on my mind tonight, and it's what health care costs. Our 2024 books have about $2.3 billion more coming in than going out, and I'd like to keep it that way. The race for Santa Clara County supervisor was on your ballot this year, and I watched it closely."
    - His words: "I'm not even going to read this. Oh, this guy was a supervisor? Why am I getting a scene about a supervisor or something? That doesn't make any sense."
    - Wrong: a county board chair's yearly address plays as a full scene with no reason given. Its words are also broken: "it's what health care costs", a raw "$2.3 billion", and "this year" for a 2024 race.

37. **17:03.0: a journal line that means nothing [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00308_01022s.jpg`
    - Screen: "JOURNAL / Six years on, I gave Lisa Cruz my word, and I meant it."
    - His words: none.
    - Wrong: "Six years on" from nothing. The entry reads like a template, not a journal.

## People in scenes

38. **5:08.6: Christine Hale is big while she isn't speaking.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00095_00308s.jpg`
    - Screen: a large "Christine Hale" bust at center, above "It's the evening of January 20. You stay in. / Continue".
    - His words: "Why is Christina Hale here? She should be smaller since she isn't talking." Also: "Okay. Speaker. Yeah, see, it's not distinguished or delineated enough who's talking right here. Maybe the person speaking should be on the actual card, and then maybe they go back to the top when they're not speaking. I'm not sure how that would look. Or maybe they get a big bust on the side. Not sure."
    - Wrong: a non-speaker gets the speaker's spot on a narration line. Nothing marks who is talking.

39. **5:26.3: an empty desk and busts in a strip.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00101_00326s.jpg`
    - Screen: the Oval Office with an empty chair. A strip over the desk holds "Keith Farrell / Joann Parsons / Sandra Solomon".
    - His words: "So if there's a way to get the guy his bust, … If you can do that with a figure behind the desk, that would be great. So that way we can start getting people in scenes. But again, just do one, because it doesn't, the way you did these modular things is perfect. … Now that you finally got it, I want to see you apply it to, let's say, a scene."
    - Wrong: nobody is in the room. He asks for one modular-bust figure seated behind the desk as the first person in a scene.

40. **8:10.4: the President stands in the Hale living room.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00150_00490s.jpg`
    - Screen: the strip shows "President Keith Farrell" and "Christine Hale" side by side in the home room.
    - His words: "And why is Christina Hale here? Right? You see what I mean? Like, it doesn't make any sense."
    - Wrong: the President's bust sits in the family's living room as if present. Christine is shown although she says nothing. Nothing shows a TV.

41. **8:31.0: the narration card shows her again.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00156_00511s.jpg`
    - Screen: a big "Christine Hale" bust over "It's the evening of January 20. You stay in."
    - His words: "If she's not talking, she should be like, you know, who's here or whatever. Don't call it who's here, but, you know, they should be off to the side or on top or in a corner or something. I don't know. Maybe there needs to be a better way of doing this. I'm thinking I'm not liking this."
    - Wrong: people who are present but silent need a smaller place (side, top or corner), not center stage.

42. **8:58.5: the wide strip for one person.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00164_00538s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00095_00308s.jpg` (the dark band behind the bust in scenes)
    - Screen: a dark band across the whole bottom of the screen reading "HERE … Christine Hale", with one bust.
    - His words: "See, this huge strip right here should not be here. There's one person, shorten the strip. And here, like, I don't like that." Later: "So again, remove this strip."
    - Wrong: a full-width band for one person. I take "right here" to be this bottom band because his cursor is on it at 8:58.5.

43. **13:22.9 to 15:33.6: the Governor talks, Christine is shown [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00244_00802s.jpg`. The same happens for Robbins at 16:56.1: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00306_01016s.jpg`
    - Screen: "GOVERNOR JUDY HENRY" (or "CHAIR MATTHEW ROBBINS"), with only the "Christine Hale" bust above the box.
    - His words: none.
    - Wrong: the speaker never appears. The only face shown belongs to someone who says nothing in the whole address.

44. **15:37.0: a phone caller standing in the room [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00283_00937s.jpg`
    - Screen: the "Lisa Cruz" bust in the living room over "your phone lights up with Lisa Cruz's name".
    - His words: none.
    - Wrong: a phone call is staged as if the caller were standing in his home.

## Time

45. **5:08.6: "It's the evening of January 20. You stay in."**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00095_00308s.jpg`
    - Screen: "It's the evening of January 20. You stay in."
    - His words: "Okay, it's the evening of January 20th. You stay in. You stay in. That should not be there."
    - Wrong: "You stay in" tells him what he did. The window shows daylight for "evening".

46. **8:31.0: the same card repeats after the address.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00156_00511s.jpg`
    - Screen: "It's the evening of January 20. You stay in."
    - His words: "It's the evening of, again, what? Okay, I know it's the evening of January 20th. You stay in. That shouldn't be there."
    - Wrong: the same opener is shown twice, before and after the speech.

47. **8:58.5: midnight.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00164_00538s.jpg`
    - Screen: "Monday, January 20, 2025 / 12:00 AM".
    - His words: "Now it says it's midnight. Again, the timing is completely messed up in this game."
    - Wrong: just after "the evening of January 20", the clock reads the midnight that starts January 20. The window is in daylight, and the clock still reads 12:00 AM after the talk with Christine (10:00.4).

48. **12:32.3: Calendar "Coming up" starts with December [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00228_00752s.jpg`
    - Screen: "COMING UP / Dec 14 Your birthday / Jan 20 Inauguration Day / Jan 21 The Santa Clara County Board of Supervisors meets / Feb 17 Washington's Birthday / …"
    - His words: none.
    - Wrong: December is listed ahead of January in the upcoming list. The lower 40% of the panel is empty.

49. **13:02.2: "early on January 22", lit like sunset.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00238_00782s.jpg`
    - Screen: "It's early on January 22. You stay in. You caught Governor Judy Henry's State of the State address on KFWE-TV last night."
    - His words: "It's early on January 22nd. You stay in."
    - Wrong: the room is in golden sunset light for "early", "You stay in" is back, and the speech plays a day after it aired.

50. **15:37.0 and 17:03.0: morning text, sunset light [not mentioned].**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00283_00937s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00308_01022s.jpg`
    - Screen: "First thing on January 28th …". The clock reads "Tuesday, February 11, 2025 / 7:00 AM".
    - His words: none.
    - Wrong: both morning moments use the sunset-lit room. The dates are written two ways ("January 20" and "January 28th").

## Travel

51. **10:24.0: only kitchens and markets.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00189_00624s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00186_00613s.jpg`
    - Screen: "TRAVEL / CAMBRIAN PARK / Cambrian Park Public Schools / Moon Academy / McKee's Kitchen / O'Brien's Market / Gomez's Market / Crawford's Kitchen / Riddle's Kitchen / Brown's Salon and Barbershop".
    - His words: "So let's go to travel. Academy market." Also: "Because right now, you see it's just a bunch of kitchens and markets and stuff like that. I keep saying, like, it even started with some industries yesterday. So I would love to know what's going on with that."
    - Wrong: the town has eight places: two schools, three kitchens, two markets and a salon. There are no workplaces, offices, county buildings or industries.

52. **10:24.0: the school is "Open now" at midnight, and the wrong name is there [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00189_00624s.jpg`
    - Screen: "Cambrian Park Public Schools / OPEN / Open now / WHY IT'S LISTED / Someone in your home goes to school here / WHO'S THERE / Madeline Hodges".
    - His words: none.
    - Wrong: the school is open at 12:00 AM. The person listed is "Madeline Hodges", while the daughter who goes there is "Madeline Hale". They may be different people; this is not verified. Tile names are printed over the pictures and are hard to read.

## People screen

53. **10:40.2: a massive hole.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00194_00640s.jpg`
    - Screen: "PEOPLE / MY PEOPLE / HOME Madeline Hale daughter / Aditi Hale daughter / Christine Hale partner / Jennifer Hale daughter / FAMILY Daniel Hale brother / Amanda Stewart mother". The card reads "Madeline Hale / Daughter · Age 8". Everything right of x≈780 (about half the panel) is empty, and the daughter has no portrait.
    - His words: "All right, let's go to people. Again, wow. A massive just hole right here. Absolutely nothing going on. Like, again, what is with this? How many times do I have to say I hate this?"
    - Wrong: half the screen is empty.

54. **10:40.2: not the approved panel.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00194_00640s.jpg`
    - Screen: a flat, opaque black panel with stacked headed rows: "WHO SHE IS", "HOW I SEE HER", "POLITICS", "BETWEEN US", "HER STORY".
    - His words: "And again, this isn't the textured background or whatever I approved. Again, what is going on with wiring the UI? Oh my god, it's terrible."
    - Wrong: compared with the approved person card (menu-look skill, "per-hale"):
      - Present: section headers, "Between us", and perceived traits.
      - Missing: any visible texture, the see-through panel, a portrait for the daughters, and tagged quotes.
      - Whether the approved card's code is wired cannot be told from frames.

55. **10:40.2 to 11:14.6: facts, not a story.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00194_00640s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00203_00671s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00204_00674s.jpg`
    - Screen:
      - "HER STORY / At 2 Madeline Hale made the move to Cambrian Park, California. In 2022 she was enrolled at Cambrian Park Public Schools."
      - "HIS STORY / In 1995 Daniel Hale grew up going to school in California. … He was arrested in 2009. …"
      - "HER STORY / At age 5 Amanda Stewart did her schooling in California. … She had a hospital stay in 1992. / She separated from Kenneth Meyer in 1993. …" (cut off, with its own scroll bar)
    - His words: "Okay, this doesn't include any information, and this is not told like a story. It's just a bunch of facts. Again, I keep saying this."
    - Wrong: every story is a dated list of record events in broken grammar, such as "In 1995 … grew up going to school" and "At age 5 … did her schooling".

## Politics and elections

56. **11:36.7: no city council.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00211_00696s.jpg`
    - Screen: "Government / Local State Federal / Legislative Executive / SANTA CLARA COUNTY BOARD OF SUPERVISORS / SEATS 5 Nonpartisan / MEMBERS Matthew Robbins District 1, Cathy Wynn District 2, Naomi Beck District 3, Casey Moreno District 4, Russell Shah District 5".
    - His words: "There's no city council or anything like that."
    - Wrong: Local shows only the county board. From memory and not checked: Cambrian Park is unincorporated (a census-designated place) in real life, so it has no council. Either way, the screen never says why there is none. Issues still offers a "City" filter.

57. **11:36.7: recent votes in a raw format [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00211_00696s.jpg`
    - Screen: "Mixed-Income Housing Ordinance Dec 24, 2024 Passed · 5 yes, 0 no" (this row is in smaller type), then six rows of "Passed · 3 yes, 0 no".
    - His words: none.
    - Wrong: on a 5-seat board, six votes show only 3 voting, with no absences explained. The first row's type size does not match the rest.

58. **11:40.2: squished office name.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00212_00700s.jpg`
    - Screen: "OFFICES YOU CAN RUN FOR / Supervis / or / (District / 4) · / County / office   Filing opens January 13, 2028".
    - His words: "Okay, so first of all, you see, look at this. Like, it's squished right here. Why?"
    - Wrong: the office name is crushed into a narrow column, breaking "Supervis/or" mid-word.

59. **11:40.2 to 12:00.8: nothing is open to file for.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00212_00700s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00218_00720s.jpg`
    - Screen:
      - "Supervisor (District 4) June 6, 2028 / WHO'S RUNNING No one has filed / LAST TIME November 5, 2024 Casey Moreno / Share of the vote 60 percent / DATES Jan 13, 2028 Filing opens / Mar 13, 2028 Filing closes / Jun 6, 2028 Election day / Filing for this race hasn't opened yet."
      - "Coroner June 2, 2026 … You can't run for this office."
    - His words: "If I can't... If filing isn't open... then I should be able to send to it from here. But it doesn't look like anything is open. Like, what is going on here?"
    - Wrong: the only office he may run for opens filing in three years. The 2026 offices say "You can't run for this office." with no reason.

60. **12:07.7: can't learn about the parties.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00220_00727s.jpg`
    - Screen: "PARTIES / Republican / Democratic / Green / Peace and Freedom / Libertarian — Republican / IN OFFICE Keith Farrell President / Sandra Solomon Vice President / ME Join Republican".
    - His words: "I can't learn about these parties or anything."
    - Wrong: a party page lists only who holds office and a Join button. There is nothing on what the party stands for.

61. **12:14.1: "His people".**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00222_00734s.jpg`
    - Screen: "Benjamin Wyatt / Democratic / … HIS PEOPLE / Jane Mitchell (u.s. representative), Jennifer James (u.s. representative), Joseph Howell (u.s. representative), Steven Hammond (u.s. representative), Judy Henry (governor), Robert Hamilton (u.s. representative), Brenda McNeil (u.s. senator), Ian Lynch (u.s. representative)".
    - His words: "His people. What does his people mean? I'm not sure what that means. This is better, but I'm not sure."
    - Wrong: an unexplained heading over a run-on list. "u.s." is lowercase.

62. **12:14.1 to 12:24.4: impossible dates in politicians' stories [not mentioned].**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00222_00734s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00224_00740s.jpg`
    - Screen:
      - "In 2019 he ran for U.S. senator and won." beside "In office since January 3, 2019".
      - Jane Mitchell: "In 2017 she ran for U.S. representative and won. … She won election as a U.S. representative, and won it again in 2021 and 2023."
      - Jennifer James: "In 2017 she won election as a U.S. representative".
    - His words: none.
    - Wrong: Senate and House races are dated to odd years, when no regular federal elections are held. "Laws signed 0" also shows for a senator.

63. **12:46.4 to 13:02.0: stuck until Escape.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00233_00767s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00236_00778s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00238_00782s.jpg`
    - Screen: the "Jennifer James" person card stays up while the clock and the menu rail disappear and the room turns to sunset light, so time ran behind it. Nothing on screen changes from 12:46.4 to 12:58.1 (11.6 s; measured frame difference near zero). He clicks into "Steven Hammond" and the screen is still again to 13:02.0. Escape at about 13:02.3 brings up the waiting scene.
    - His words: "I mean, maybe I'll sim. I guess we'll see some scenes here. Although I'm not sure if my game froze or if I'm stuck because I'm in this menu. Okay, so my game did not freeze. I think I'm stuck. There we go. I pressed escape."
    - Wrong: the scene that comes due waits behind an open card, with no sign anything is pending. Only Escape releases it.

64. **18:02.5: Elections, can't run for anything.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00327_01082s.jpg`. Also `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00328_01085s.jpg` ("District attorney … You can't run for this office.")
    - Screen: "Supervisor (District 4) June 6, 2028 … Filing for this race hasn't opened yet."
    - His words: "There's not much I can do since I can't run for anything. I mean, I don't know what to do from here." Also: "Okay, I'm going to leave this as my playthrough for now because I can't... I mean, I don't think I can run for anything. Let's see. Elections. Yeah, I can't run for anything."
    - Wrong: seven weeks in (it is March 10, 2025), there is still no race he can enter. The run ends here.

65. **18:12.8: raw developer text in Issues [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00330_01092s.jpg`
    - Screen: "Age verification for social media / IN FORCE / STATE LAW No / SINCE July 1, 2024 / WHAT CHANGED / JULY 1, 2025   2025-1".
    - His words: none.
    - Wrong: a raw id ("2025-1") and a future date sit under "What changed".

66. **18:23.1: a cut-off budget label, and heads on only some rows [not mentioned].**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00333_01103s.jpg`
    - Screen: "Highways / Vicki Poole $735 million" and "Housing and / Ray Hampton $655.4 million". The other departments show no head.
    - His words: none.
    - Wrong: "Housing and" is cut off mid-name. Department heads, which the approved Budgets design shows, appear on only two of the nine visible rows. There are no head busts, and "Who wrote it" has no bust either.

## News

67. **17:17.7: can't click into a story, and the street signs are blank.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00313_01037s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00315_01044s.jpg`
    - Screen: "Cambrian Park Dispatch Monday, March 10, 2025 / United States House of Representatives approves the Clean Power Plant Standards Act / February 28 / The Clean Power Plant Standards Act passed 226 to 208. / The United States House of Representatives took the vote. / The measure covers limits on the carbon power plants may emit." The lead picture's green street signs are empty. Clicking a headline (17:24.6) only moves it into the lead spot, with the same lines and "Back to the front page".
    - His words: "Let's look at the news. Okay, this is better, although obviously there's nothing on the street signs. I can't click the story. There's somewhat of a story, but I can't click the story."
    - Wrong: there is no full article behind any headline, and the picture's signs are blank.

68. **17:17.7 to 17:52.1: the outlet tabs.**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00313_01037s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00317_01051s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00323_01072s.jpg`
    - Screen: 17 outlet tabs in two rows: "Cambrian Park Courier … KFWE-TV … The Groundswell / The National Sentinel / Town Square Show". Cambrian Park Chronicle and KFWE-TV both say "You don't follow a paper or a station."
    - His words: "And this menu right here, not very intuitive, but this is the right approach."
    - Wrong: the tab row is hard to use. KFWE-TV says he doesn't follow it, though he watched two addresses on it.

69. **17:17.7: news events out of order, and raw bill numbers [not mentioned].**
    - Frames:
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00313_01037s.jpg`
      - `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00319_01058s.jpg`
    - Screen:
      - "Governor Judy Henry signs the Groundwater Protection Act / February 21" next to "California Assembly approves the Groundwater Protection Act / February 28".
      - "The government committee voted 6 to 5 to send H.R. 2 to the floor."
      - "United States House of Representatives passes H.R. 2, 226 to 208".
    - His words: none.
    - Wrong: the bill is signed a week before the Assembly passes it. The text uses "H.R. 2" and "government committee" where a reader expects names.

## Missing screens

70. **18:16.2: no approved Metrics pages.**
    - Frame: `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/pt1/f00331_01096s.jpg`
    - Screen: "Politics / Metrics" is one flat list:
      - "THE COUNTRY / Unemployment 4.5 % / Last year 4.3 % · up 0.2 points since last year …"
      - "YOUR TOWN / People in town 3,574 … People looking for work 180 of 1,857 …"
      - "YOUR STATE / … Residents with jobs 18,577,607 …"
      - "HOMES", "EVICTIONS", "SANTA CLARA COUNTY"
    - His words: "Okay, where are the metrics pages that I approved? Like, that's not even in. Again, what happened to all the UI stuff?"
    - Wrong: the approved design (Nov 12) is not in: numbers first, and a click on a measure opens a TPP-style timeline. The recording shows no measure opening anything.

---

**Outside the list:** between Travel and People (about 10:13 to 10:40) he talked about the builder account. It resets at 5 p.m., he wants its sessions' work pushed along, and he wants "the job stuff" and the industries checked. That is not a game stop, and nothing was done about it.

**What he liked:**
- The loading messages.
- "Working people get a fair deal when they can bargain together."
- Christine repeating two or three lines outside scenes is fine.
- The News approach.
- The California capitol picture on The Groundswell (17:41.8): "It's pretty cool."
- Politics was "better" in places.

**Checked and none seen** in the roughly 60 frames read at full size or in crops (body text on the four-up sheets is too small to read):
- ISO dates.
- British spellings.
- The game's title. The window shows no title bar text.
