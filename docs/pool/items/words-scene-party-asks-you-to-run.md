---
id: words-scene-party-asks-you-to-run
title: "A party approaches the player to run for a seat it needs filled"
area: words
kind: feature
priority: 1
size: S
status: in-pr
claimed-by:
pr: #6146
blocked-on:
after:
source: added by the acting CTO, Oct 25 (owner ruling)
lead: words
milestone: play-first
claimed-at:
---

**What.** The owner ruled Oct 25 that the Pendergast approach is built now: a party that needs a seat filled approaches the player to run for it. Today no scene does this; the player finds races only by opening the Politics screen and filing. The scene reads a record, a seat the party holds no candidate for or expects to lose, and a player whose standing (job, ties, views) makes them the party's pick by its own reads, and stages the approach as a talk with a party officer who says what the seat is and why they came, with the player's answer from controls (yes, not now, no) recorded as an event the campaigns engine and the journal read. The approach comes from the party's records, never from a timer or a roll.

**Rules.** Serves LAW.md §2, Scenes like Wildermyth, and the owner's Oct 14 line that the world nudges the player toward politics (a Pendergast-style approach; OWNER-DECISIONS, Oct 14). Ask why: the scene cites the seat record and the party's reasons for choosing this player. No hand-written player text: every line comes from the English engine's bank. No dice: the party picks by its own reads of the player's record.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a party with an unfilled seat approaches the player before the filing deadline, the talk cites the seat and the party's reasons, the player's answer is recorded by scene and record id, and a bench screenshot at 1440×900 shows the scene with place and seed under it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff on main.

**You will see.** Before filing season, a party officer comes to you about a seat the party needs filled, says why they came to you, and you answer from the controls; the race then shows you as its candidate if you said yes.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/situations/, src/director/scene.ts, src/director/scene-talk.ts, src/core2/modules/candidacy.ts (read only), data/english/parts/, src/bench/play.mjs

**Notes.** Owner, Oct 25: "will give me the seats"; build all three scenes without asking (OWNER-DECISIONS, Oct 25). The party officer is a person on the record, introduced before speaking (Oct 15 ruling).
Sent back 2026-10-26 from PR #6146 (branch words/party-asks-you-to-run): owner-decision question and stopgap SG-P15-party-ask-order lack the Read line; finish on that branch, merge main into it first.
