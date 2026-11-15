---
id: play-post-pick-list-finds-a-person
title: "The list of people for an open post can be searched, and each row says what they do and where they live"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after: executive-governor-pick-offers-the-state
blocked-on:
lead: play-first
source: "Civic roles builder, Nov 15, building executive-governor-pick-offers-the-state"
model: sonnet
effort: medium
---

**What.** The list of people for an open post now holds everyone the post could go to, best first. At Edgar, Wisconsin (seed edgar-petition-1) a cabinet post lists 165 people, in one dropdown with no search. Each row shows only a name: the screen asks for `work` and `place`, but the view sends `job` and no place. So a player cannot tell one person from another, and cannot find someone they have in mind. Seen: Office, an open post's "Ask someone" list, for a mayor, a governor, and the President's nominations.

**Cause.** Found in code: the post rows in src/bench/play.mjs (line 2966 and line 1069) build each label from `c.work` and `c.place`. Meanwhile officeView, ordersView and nominationsView in src/bench/office.ts (lines 508, 824 and 958) return `job` and no place, so every label falls back to the name alone.

**Fix.** Have the views send `work` (workHeld in src/core2/person-work.ts, or the drawn person's home town's work) and `place`, so the controls' row words name both. Give the list the same stated search the town picker has (src/bench/place-selection.mjs), through the shared controls.

**Time box.** 3 hours for one session.

**Rules.** One rule, all 56 places. Words come from the controls file, not code.

**Done when.** A second session, as governor in a drawn place named with its seed, opens an open post's list, sees each person's work and town, and finds a named person by typing part of their name.

**Waits on.** executive-governor-pick-offers-the-state.

**Files.** src/bench/office.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Filed by hand by the civic roles builder.
