---
id: words-circumstance-lines
title: "Lines for the scenes that come from circumstance: the person who stops you names why, from the record, and the ungrounded law lines go"
area: words
kind: feature
priority: 1
size: M
status: done
claimed-by: words/circumstance-lines
pr: #6308
blocked-on:
source: "Oct 27 split: the director engineer's circumstance rows (#6263) need their lines from the words lead"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The director's circumstance rows (#6263) stage a constituent who stops an officeholder, a colleague in the hallway, and fifteen other causes. Each scene needs words that say why this person came, from the record that cast them. The law-reaches lines from Oct 15 claimed things no record held: "took effect this month" and "costing my family real money" when the speaker had only read about a vote. They go.

**Rules.** Serves `scene-standard`: lines vary by speaker and tie, and each says only what its facts carry. No hand-written player text in code: every line is a bank piece with its facts in slots. Ask why: a stance cites the record the speaker learned it from.

**Done when.** In a drawn place (buildBenchWorld, seed printed), with the circumstance producer (pool item director-scenes-from-circumstance), `circumstance.test.ts` and `scene-talk.test.ts` show no gaps for the new types, and `english-parts-banks` passes. Every law-reaches line requires the fact it states (`voted-for`, `voted-against`, `in-force`, `cost`). The ungrounded Oct 15 law-reaches pieces are deleted.

**Time box.** 3 hours.

**You will see.** A resident at the pharmacy who says "You voted for it." only when the player's own vote record says so, and a colleague who names the ordinance they want carried.

**Screenshot.** None: the scenes play in the existing scene panel; the director's PR carries the bench view.

**Files.** data/english/parts/scene-talk.json, data/english/parts/scene-words.json

**Notes.** Facts are filled by the director engineer's follow-up PR (constituent-stop `voted-for`, `voted-against`, `in-force`, `cost`, `law`). The party-ask lines go once #6263, which deletes that type, is on main.
