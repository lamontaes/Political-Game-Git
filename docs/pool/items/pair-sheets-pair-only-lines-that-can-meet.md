---
id: pair-sheets-pair-only-lines-that-can-meet
title: "The judges' pair sheets list pairs that can never be said in play, such as a sponsor's line before a lobbyist's reply"
area: words
kind: bug
priority: 2
size: S
status: merged
pr: 9338
standard: 2
after: ""
blocked-on: ""
lead: words
source: M5's noes on #9292 (desk visit, 43e0d31c), and the lead's ruling to split the rule into its own item, Nov 14, 2026
model: opus
effort: medium
root: none
---

**What.** M5 judged 262 of the 885 desk-visit pairs at 43e0d31c "no", and 178 of those 262 could never be said in play. One example is the sponsor's "I carried {bill} to the floor..." followed by a reply only a lobbyist's visit offers. Another is "Who is against it?" after "Nobody voted against {bill}." The pair sheets list them because they pair a reply with a line before it whatever facts either needs. Judges spend verdicts on pairs that can't happen, and their noes look like faults to fix. Guards: the judges' verdicts, so that every "no" is about a pair the player could actually see.

**Cause.** Found in code: `replyPairs` in src/english/reply-pairs.ts checks each reply against the line before with `useFit`, given only the reply's own required facts. It never asks whether those facts can hold together with the facts the line before needs.

**Fix.** A reply meets the line before it only where both sets of facts can hold at once. Never pair a reply that rules out (`excludesFacts`) a fact the line before needs, or the other way round. Never pair two facts an arc keeps apart: a purpose arc's new `apart` list names facts of which at most one holds in one talk, and `talkReplyFlow.apart` reads it. A fact a line sets for the rest of a talk (`setsFacts` on a scene use, the field English composition already uses inside one line) counts as held after that line, and a reply that needs a fact only some line sets follows only a line that sets it (M5's condition, Nov 14). desk-visit is the first arc with an `apart` list: for or against, opposed or unopposed, one passage kind, one cost kind, one opposed reason. Each of those is written by one function, `deskFacts` in src/director/purpose-scene.ts.

**Time box.** 2 hours for one Opus session.

**Rules.** Replace, never layer: the one pair generator decides what the judges see, with no second list beside it. A pair that can be said in play is never left out. reply-pairs.test's "lists every pair the director produced in 60 or more built scenes" fails if one is. The desk-visit scene test fails if two facts of one apart set ever hold in a staged visit. M5 says yes to each kind of exclusion before this folds.

**Done when.** A second session runs the desk-visit scene test in its drawn place (Havre, Montana, and a governor's visit in Hanksville, Vermont): no staged visit holds two facts of one apart set, and the sheets leave out the 871 pairs listed in /mnt/project-files/words-lead/pair-facts/dropped-pairs.md and no other pair. Every pair seen in the built scenes is still listed, and M5 has said yes to each kind of exclusion.

**Waits on.** M5's yes on each kind of exclusion.

**Files.** src/english/reply-pairs.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/director/desk-visit-scene.test.ts
