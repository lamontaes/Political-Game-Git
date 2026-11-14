---
name: scene-standard
description: The Wildermyth standard every scene and conversation in Our Civic Duty must meet, as checkable rules - a scene exists only if it writes something back, roles are cast from the world, lines vary by the speaker's traits and tie to the player, narration never restates the screen, and time jumps between scenes. Use when writing, wiring, reviewing or grading a scene, talk, situation type, narration or journal line, and in playtests.
---

# Scenes to the Wildermyth standard

**Look first:** run the `look-first` search before building, fixing, filing or asking; a found ruling is built and cited, never asked again.

Owner, Oct 24: scenes "that come out of what is actually happening in the world, narrated into a moment, played out with real dialogue and choices, the outcome back into the game." Owner, Oct 26, after a full year of play: "the biggest problem [is] words and scenes." These rules come from Wildermyth's own event files (studied Oct 26; summary in `docs/design/references/wildermyth-patterns.md`) and from what failed on screen that day.

## The rules

1. **No consequence, no scene.** A scene or talk fires only if its outcome writes something back: a relationship, a promise, a trait, a race or bill record, a history line. If no outcome would change a record, it does not fire. (Oct 26: a parent asks "Are you sure about running?" and nothing follows; owner: "there was no reason to have that conversation.")
2. **Cast from the world.** Every role is filled by scoring real people on traits, relationships and records (the staffer most opposed to the candidate's view, the relative whose job the bill touches). If a role can't be filled, the scene does not fire. Never a stranger standing there for no reason.
3. **Most specific wins.** When several situations qualify, the one whose conditions are rarest plays ("lost by under two points" beats a generic concession). A specific scene fires once per life unless its record changes.
4. **Their own words.** Every spoken line has versions by the speaker's top trait and their tie to the player (friend, rival, partner, none), filled from their record (job, town, the event). The player's replies are up to four, the scene sets the count, and every one is a different stance in the player's own voice, never a rewording of another answer, never filler ("Oh, okay", "Sure").
5. **Choices depend on what happened.** An option exists only when its record does (a jab about the mill closing only if the mill closed), and its stake is named where the player would know it ("Pierce will remember this"). No dice: the outcome follows the people's recorded reasons (`no-dice`), unlike Wildermyth's rolls.
6. **Narration sets a mood, then gets out of the way.** Second person, grounded in records, saying who each person is and why they came, and never restating what the screen already shows (owner, Oct 26: "it shouldn't say you're at home in Albion or it's Tuesday in November. Obviously, it says that in the bottom right.").
7. **History becomes the story.** Every scene's outcome adds a dated first-person line to the journal, and the event goes onto the person's one life record (owner, Nov 10; `docs/design/life-record.md`, module `src/core2/person-life.ts` where it has landed). A scene or screen never builds its own history: the journal, the person card and the You screen are views of that one list. Pasts are built from entries that rule out contradictions and seed later scenes (a union family casts the player into the union-endorsement scene).
8. **Time jumps between scenes.** The world simulates continuously; only a scene stops the player. Routine work never stops him (owner, Oct 26: "Shifts are for the simulation... The player should not be clicking through that."). Months may pass with nothing, then scenes cluster (owner: "January 14th all the way to March 11th, and then there's something on March 11th, 17th, 18th, and 21st, then nothing till July").
9. **Seasons are chapters.** A campaign has fixed beats (deciding to run, filing, the first interview, the debate, election day, the result) with cast scenes between (staff, rallies, donors, endorsements, offers that test the candidate). Election day is several scenes: canvassing, going to vote, the returns, conceding or celebrating (owner, Oct 26: "at least 5 minutes to play out").
10. **The world doesn't need the player.** What the player can do, other people do in the background by the same rules (owner, Oct 26: "I am not the main character."). A scene shows the player's slice of it.
11. **Talk, not a list.** A speaker gives the facts a moment needs in connected sentences, the way people talk, never as stacked one-line facts (owner, Nov 1, on a clerk's answer of five stacked facts, "absolutely god-awful": "Unless it calls for it specifically in the dialogue scene, it shouldn't read as a list. That's not how normal people talk."). A list plays only where the scene's own record is one: a ballot, a printed agenda, a form being read aloud.
12. **The player says only what they chose.** Every choice is worded as the player's real reply, and the transcript shows that reply, never a line the player didn't pick (owner, Nov 1, after choosing "File for this office" showed him saying "I see.": "I never said that"). A control's label that isn't something a person would say ("File for this office") is worded as the reply the player gives, or it says nothing in the transcript.

## Check before a PR or a grade

- Name the record the scene writes back, by id, from a drawn place and seed.
- Name how each role was cast.
- Show two speakers (or two ties to the player) producing different lines in the same scene.
- Show that every reply offered (one to four, the scene sets the count) is a different stance, and that none rewords another. A short set is not a defect (owner, Nov 10, 2026: "it's also allowed to have less than 4 options sometimes... you might only have 1 option, but it's to make the player feel engaged. Or you may only have 2 options in the scene because you have to make a choice, a yes or no choice... So just up to 4.").
- Read the transcript as the player: every line in the player's voice is one they picked, and no speaker says three or more facts as separate one-line sentences.
- Show the scene is reached in ordinary play on the golden path. A scene only a test reaches is not done.
- Show a line that names the hour, the day or a record's time plays only when its record makes it true: "tonight" in the evening, "Morning." before noon, "today" on the record's own day (the time-of-day and day marks).
- Read a return visit against the record's state, never as a first visit: a filing still gathering signatures brings its petition, and one already on the ballot comes back with nothing to bring (#7101, Laramie, Wyoming, where a race needs no petition).
- Read a line shown under a person's name as that person speaking. Narration of their answer ("Ruth agrees to endorse you.") belongs in a summary; the talk box gets their own words by trait and tie (rule 4; the lane's #7111 and #7112).
- Words are split by role (owner, Nov 10): a builder or reviewer never writes or edits a line under `data/english/parts/`; they list the lines needed on the pull request and Story writes them. A rule the owner gives about a line is a rule in `data/english/line-rules.json` that `npm run words:rules` tests (`words-engine`), not a note in this skill.
- Add a "Scene standard" row to the PR's Done when table with this evidence; a session that did not build it checks it in the running game (`seen-in-game`).
- Give the scene its picture in the one list (skill `scene-pictures`): a row in `situationPlaces` per setting it is staged in, or a `wantedScenes` line; a missing picture never holds the scene back (owner, Nov 14).
