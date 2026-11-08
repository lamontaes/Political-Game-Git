# Front, Options, pop-ups and dev mode mocks (Nov 8): what each follows

**Nov 8, about 2:15 a.m., the owner on the dev person screen (verbatim, via the CTO):** "I see, again, I say remove all those subtexts. I'm seeing make her decide. Only what the game offers her today. Remove all of those submenus. Kept. That's why she holds the tax at 35 mils. Also, I've never seen any of the inline helping stuff for the glossary. Fades about October too. Those, I already said I don't like those."

So no caption or explanatory line sits under any heading, control, item or memory on these screens. A figure goes into the control's own value or on the same line at the right, never on a line under it. A memory is the memory and its line. The glossary's inline help is shown once, on the dev bill: "General obligation bonds" is underlined; hover or focus shows its short meaning and Mark as learned.

## Lines removed (2:15 a.m. ruling)

- Dev person: "Only what the game offers her today." / "At her next decision. She keeps her own reasons."; under each memory "Kept: it's why she holds the tax at 38 mills.", "Kept for good.", "Fades about September 3.", "Fades about October 2."; after the bribe, "$6,000 from Wade Pruitt, on her record and his..." and "Pruitt knows she said no, and so does she." (only "She took it." or "She refused." stays).
- Dev bill: "435 members. Each member's vote is cast through their own vote record, the same as a vote they choose." (now Yes and No counts); "Vetoed by the mayor, through the mayor's own decision." (the veto shows in the vote line and on the lit Veto button).
- Dev scene: "They're a couple: yes.", "Needs a death first.", "Needs a couple ready for the next step. Nothing records that yet.", "Ready."; after Play it, "Handed to the director. It plays at the next moment they're together..." (the button lights instead; a scene nothing can start stays off).
- Dev run: "197 days in 3 minutes, 12 seconds." (the stop stays: "August 5, 2025: Resolution 25-31 passed, 4 to 2.").
- Dev trace: the second line under each reason and each later record ("Against, strongly", "He said so at the meeting"...) is now on the same line at the right, or gone.
- World: the line under each setting ("Median pay in Latimer, $38,900 a year", "A typical household, $4,200 put away", "Latimer in 2024, 58 to 41 for Garrity", "In 2024, 62 of every 100 voted"): the figure is now the control's value; the line under each start date ("Inauguration Day", "New Year's Day", "Election Day", "Today"); "about 6,400 people · Copiah County" under each town (the count is on the same line).
- Play as: the role under each name (on the same line now); the line under the bust ("The board's water rate increase passed 4 to 2 on January 6 and is on her desk until February 3." and the others).
- Creator: "24 · Latimer, Mississippi" under the name; "A name first" under the field (the field and Begin flash red instead).
- New game: both descriptions ("Begin at eighteen in a town of your choosing...", "You pick a name, where you're from...", "Pick the place and the day it starts...") and the Mayor, Governor and President labels under the busts.
- Title: "John Spencer · Latimer, Mississippi" and "Monday, January 20, 2025" under Continue (now "Continue as John Spencer").
- Options: "Anything else waits until I'm free.", "On. The menus show dev controls beside what they act on...", "Version 0.88.4".
- Loading: "6,412 people in 2,488 households so far." / "...ready."
- Saved games: the role, the place, and "6 hours in this life. Saved tonight at 11:42 PM." under each bust (the game date stays, with Load).
- Patch notes: the date under each build (on the same line now).
- Pop-ups: "my neighbor, on the stairs" beside Hal's name in the talk box.

Built after the owner's conditional approval, Nov 8, about 1:35 a.m.: "take the principles you learned from everything today, apply that to, you know, dev mode screens and all that." Files: `front.js`, `front.css`, `front-groups.json` (spliced by `build.py`).

| Screen                                    | Key        | His words it follows                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                                     | fr-title   | Oct 29: menu screens are DC monuments ("the Washington Monument or the Lincoln Monument"); his pick "Yes, plus passersby". Nov 7 audit: Saved games was a dead button. Hover = soft fill plus the fading frame (menu-look).                                                                                                                 |
| New game                                  | fr-new     | Oct 28: "Remove every Continue and Back from every menu. They serve no purpose."                                                                                                                                                                                                                                                            |
| Advanced: the world                       | fr-world   | Oct 26: "more like RimWorld or Crusader Kings... get rid of the opening questions". Oct 14: a custom start lives in dev mode. Settings are shown as what they mean in the place, not multipliers.                                                                                                                                           |
| Advanced: play as                         | fr-playas  | Oct 26: "being able to click somebody and play as them or start off as a legislator or the president".                                                                                                                                                                                                                                      |
| Creator                                   | fr-creator | Oct 28: no Back or Continue; a missing field "should flash red, or say what is missing". Oct 26: "Are these the real populations?" Oct 27: each garment its own choice. Nov 7: busts, never full figures.                                                                                                                                   |
| Loading                                   | fr-loading | Oct 27: "There is a weird little bar at the end, though." No developer labels (Oct 9 to 10).                                                                                                                                                                                                                                                |
| Saved games                               | fr-saves   | Nov 7 audit: missing.                                                                                                                                                                                                                                                                                                                       |
| Patch notes                               | fr-notes   | Oct 28: "get them in"; menu-look: no box per card, no chips.                                                                                                                                                                                                                                                                                |
| Options                                   | fr-options | Nov 5: color-blind "an option in the settings like it usually is... a global tick"; "those checkboxes are not an approved style". The server's scene filter (`/api/scene-filter`) gets a screen.                                                                                                                                            |
| Pop-ups                                   | fr-notify  | Nov 7: "too builky and there is still no way for me to manually/quickly remove them"; Oct 26: "there's no way to get rid of it"; Nov 7: the talk takes center stage in scenes.                                                                                                                                                              |
| Dev mode: run, bill, person, scene, trace | fr-dev-*   | Nov 8: "simulate X amount of days at a time, or until a certain thing has happened"; "force pass things and you could choose the margin"; "Making it happen should just trigger the code in the game that makes it happen"; "force a bribe"; "force a scene"; "See what people remember". Oct 14: "Dev mode's Trace is the ultimate trace." |

## Fixtures (made up for the mock; the game reads its own records)

- Latimer's population (6,400), median pay ($38,900), household savings ($4,200), its 2024 vote (58 to 41) and turnout (62 of 100). The other towns' populations are rounded 2020 census counts.
- The saves, the world number and the play times.
- Carol Whitfield's memories, the bribe (Wade Pruitt, Pruitt Paving, $6,000), each member's reasons in the trace, and the glossary's meaning of general obligation bonds.
- Patch notes use tonight's real merges in plain words (#7347 to #7358); which build each landed in is approximate.

## Calls made

- Dev controls carry a quiet steel "Dev mode" label (heading tag and under Week on the player card), so they never pass for the player's own controls. Bare control names and record data only.
- A forced scene that needs an event first (a funeral) offers a button to force that event through the game; one nothing in the game can start yet (a proposal) keeps Play it off, with no line explaining it.
- A member with no pack v4 figure shows no face at all, never a stand-in.
- Front screens hide the player card and show a monument; in-game screens (Options, pop-ups, dev mode) keep it.

- Kept on purpose: a name's title line under the name (Mayor of Latimer), as on the approved person card and Government; the person's description paragraph on Play as, as on the approved card; the vote's result and who voted which way, as on the approved floor vote; a save's game date; the stop on Run; the bribe's outcome in two words.
