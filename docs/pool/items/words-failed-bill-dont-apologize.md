---
id: words-failed-bill-dont-apologize
title: "After a bill fails, the aide can say sorry and the player can answer 'Don't apologize', as the owner said the exchange should flow"
area: words
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: story/failed-bill-dont-apologize
pr: 8075
blocked-on:
lead: words
milestone: play-first
source: "owner, Nov 9, batch 3 voice note (lesson 9): 'they say, I'm sorry. And then you say, no, don't apologize. This bill is for you. I should be apologizing to you'"
claimed-at: 2026-11-09T20:00:00.000Z
---

**What.** When a sponsor's bill loses its vote, the aide brings the news in the staff-news scene. If the player blames the count, the aide could only promise to find out more. Now the aide may apologize instead, and the player can answer that it is not the aide's to apologize for: the player asked people to vote for it, owes the people the bill was for, and will bring it back next session. The staff-news arc lets blame lead to a promise or an apology, and an apology lead to the player's answer.

**Rules.** No hand-written player text: the lines are bank pieces gated on the record's bill-lost fact. No dice: which follow the aide gives is the arc's choice by the aide's traits, as every other follow.

**Done when.** src/director/staff-news-scene.test.ts, in a played world drawn from all 56 places, finds every aide apology that leaves the player a reply answered by a "Don't apologize" or "Don't be sorry" line; the English guards and liked-lines-kept pass.

**Files.** data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json, src/director/staff-news-scene.test.ts

**Time box.** 1 hour.

**You will see.** "I'm sorry. I told you we had the votes, and I was wrong." / "Don't apologize. You did the work. I'm the one who asked people to vote for it."

**Screenshot.** The staff-news scene after a lost vote.
