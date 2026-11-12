---
id: director-no-borrowed-small-talk
title: "A scene with no lines of its own does not play, instead of borrowing small talk about the President's speech (As Matuis, Northern Mariana Islands)"
area: director
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-director-no-borrowed-small-talk
pr: #8282
after:
blocked-on:
model: sonnet
effort: high
root: rc4-hand-written-words
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4 and the grading section, root causes 4 and 6)
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:20:30.369Z
branch: claude/pool-director-no-borrowed-small-talk
---

**What.** A scene whose own lines are missing hands the player to everyday talk, and everyday talk says whatever is biggest on record, which has often been the President's address. The audit forced a serious illness on the player through dev mode in As Matuis, Northern Mariana Islands, and the mother's scene turned into replies about the President thirteen months after the address. On Nov 10's main (commit 8ac2262853) the scene tool shows 2 of 64 scenes still fall back (both news-arrives, the eviction news at home: Tesuque, New Mexico, seed 8a5d1fba28fc, 2026-11-21, and Odessa, Washington, seed fd7e212758b7, 2026-12-02), and the governor's address in Odessa played as narration alone. The fix is to remove the fallback: a scene whose own lines are missing does not play, its cause becomes a journal line, and the missing bank is reported by kind, purpose and step.

**Cause.** Found in code: `showStory` (`src/bench/play.mjs` line 2058, the branch near line 2118: `story.talk ? playExchange(story) : talkTo(withId, momentId)`) calls `talkTo`, which opens `openConversation` (`src/director/conversation.ts` line 2116) when a scene has no exchange of its own. Five kinds have no purpose and take that road (departure, news-arrives, visit, hearing, verdict). Measured: Tesuque seed 8a5d1fba28fc and Odessa seed fd7e212758b7 on main 8ac2262853.

**Fix.** Delete the hand-off from a scene to everyday talk in the bench and the director. A scene with no lines of its own does not play, and a missing-bank report lists kind, purpose and step. A test fails if the bench can open an everyday talk from a scene.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the hand-off from a scene to everyday talk is deleted in the same change, in the bench and in the director, and the PR counts what was removed; no second fallback takes its place. No hand-written player text: nothing typed in code fills the gap; a missing bank is reported, not papered over. An effect is a read, not a record: a scene that only makes small talk writes nothing another engine reads, so it has no reason to stop the player. Owner, Nov 8, 2026, on the scene that came from this fallback: "this is a terrible scene. And this should have been taken out of the game a long time ago." The audit's fix list, grading section, item 5: "Remove the fallback. A scene whose own lines are missing does not play."

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and plays one year with dev mode's Run, opening every scene that stops play. It runs the crew's scene tool on the same seed (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>`); in its output file a scene has lines of its own when its `exchange` is filled. It must see: every scene that stopped play has its own exchange, zero scenes open an everyday talk, and no scene line names the President's speech unless the scene's cause is that speech. It then forces a serious illness on the player through dev mode's scene controls, as the audit did, and sees either a scene about the illness or no scene and a journal line, with a screenshot. The same on the audit's seeds 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7: the eviction news either plays its own lines or does not stop the player. A command or dev mode panel prints the missing-bank report (kind, purpose, step) for the year, and a test fails if the bench can open an everyday talk from a scene. The owner plays it: no scene ever turns into "Did you catch the President's speech?" again; a moment with nothing written for it stays in his journal.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/story.ts, src/director/scene.ts, src/director/purpose-scene.ts, src/director/conversation.ts, src/director/data/situation-types.json, scripts/dialogue-batch/scene-year.ts

**Notes.** From the Fable audit: Pillar 4 ("Forced through dev mode", "The gap and its root cause"), the grading section ("Three played years show what the grades change", "Size of the fix" item 5) and "Duplicate systems" item 9 ("The President's-speech talk doubles as the filler for any talk without lines").

Nov 10 re-run on main (commit 8ac2262853), scene-year.ts, one year each, counting a scene as its own when the tool's `exchange` is filled. Ninnekah: 16 of 16 have their own lines. Tesuque: 23 of 24; the one without is 2026-11-21, news-arrives, cause event:housing.eviction:eviction:lease:household_65f2cdc6d798bc10:2026-11-06, which opened an everyday talk: "Come sit with me." "We have to move." "Wait. We have to move?" "We'll talk more later." Odessa: 22 of 24; 2026-12-02, news-arrives (eviction), "There's something I need to tell you." "The landlord says we have to leave." "Wait. We have to move?" "Let's talk more tomorrow, okay?"; and 2027-01-21, the governor's address, narration only ("First thing on January 21st finds you at home."). So the audit's 17 of 64 is 2 of 64 on this commit, plus the one address.

One trap in the tool: its console log prints the everyday talk it opens with each scene's cast even when the scene has an exchange of its own, so the log shows small talk ("I should tell you, I lean liberal.") under scenes that the game plays with their own lines. Read the `exchange` field in the output file, not the console.

Not verified: I did not reproduce the forced illness in As Matuis. `subjectsBetween` keeps the address as a subject for 14 days from the day it was given (`directorTalkAddressDays`, src/director/data/director.json), so a line about the President 13 months after the opening address needs explaining: either a later address was inside the window, or the reply came by another road. `openConversation` also carries a rule that a scene's talk keeps to its occasion and does not turn to small talk (near line 2287); the audit's runs show small talk got through it, and I did not find how. The builder reproduces both before deleting anything.

Related: director-no-scene-without-a-purpose (the five kinds with no purpose), words-rejected-nov8-scene-still-plays (the lines themselves), words-talk-ends-as-soon-as-it-starts (the fallback talk closing at once), words-news-ask-gets-answer (blocked; an answer after family news), words-after-address-talk-follows (done; marked done, small talk about the address still showed in the audit).

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:20 UTC) on branch claude/pool-director-no-borrowed-small-talk.
