---
id: words-scene-staff-bad-news
title: "Staff bring bad news as a scene when a press record names the player or their bill"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by the acting CTO, Oct 25 (owner ruling)
lead: words
milestone: play-first
---

**What.** The owner ruled Oct 25 that staff bringing bad news is a scene when a press record names the player or their bill. Today a story that names the player sits in the news box and no one in the player's office reacts. The scene reads the press record (an outlet's story whose subjects include the player or a bill they sponsored) and, where the player has staff, stages a staffer bringing the story in: who ran it, what it says, what it moved, with the player's reply from controls (respond, ignore, call the outlet) recorded as an event the press and views engines read. A player with no staff hears it through the news box as today; a story that names neither the player nor their bill produces no scene.

**Rules.** Serves LAW.md §2, Scenes like Wildermyth, and the owner's Oct 16 line that the news is how people learn what moved (OWNER-DECISIONS, Oct 16). Ask why: the scene cites the press record and the outlet. No hand-written player text: the staffer's lines come from the English engine's bank. An effect is a read: the player's reply is read by the press engine and the journal, never a new record type.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a press record naming an office-holding player or their bill produces one scene with a named staffer citing the outlet and record id, a story naming neither produces none, and a bench screenshot at 1440×900 shows the scene with place and seed under it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff on main.

**You will see.** When a paper or station runs a story about you or your bill, a staffer brings it in, says who ran it and what it says, and you answer from the controls.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/situations/, src/director/scene.ts, src/director/scene-talk.ts, src/core2/modules/press.ts (read only), data/english/parts/, src/bench/play.mjs

**Notes.** Owner, Oct 25; build all three scenes without asking (OWNER-DECISIONS, Oct 25). The staffer is a person on the record, introduced before speaking (Oct 15 ruling).
