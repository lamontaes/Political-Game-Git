---
id: director-street-stop-only-for-laws-that-reach-the-player
title: "A resident stops the player about a law that is none of the player's business: 24 of 38 law stops in a played year at Port O'Connor, Texas were other states' laws"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/project-thread-7m0bnz
pr:
blocked-on:
lead: account
source: Account lead, Nov 15, 2026 (owner: a scene needs an outcome; a law that cannot reach the player is not a scene)
model: sonnet
effort: medium
root: none
after:
---

**What.** The street stops `law-news-street` and `law-reached-street` staged for any law story or law effect in the paper, including another state's law, so a resident at the player's door said "that's a law in Hawaii, not here". Counted over one played year from 2025-01-20 (pa-seed-9320 label pa-a): Port O'Connor, Texas 38 stops, 14 reach the player and 24 do not; Lincoln, Vermont 31, 9 reach and 22 do not (`scripts/play-walks/whose-business.mts`). The resident's lines then explained the mismatch aloud, which no neighbor does for a law they would not have read. Seen: Politics, News and the street scenes in a played year.

**Cause.** Found in code: src/director/circumstance.ts `circumstancePicks` filtered a law record only by its kind and facts, never by whether the law is one of the player's own governments (their town's chain, the nation, or an office they hold).

**Fix.** A row flag `reach: "player"` and `lawReaches` (src/director/circumstance.ts) keep a law stop for a law in the player's town chain, the nation's, or the jurisdiction of an office they hold, by the laws engine's own `lawChain`. The wording that explained a mismatch (`lawstate`, `homestate`, eight bank lines) is deleted with the branch of `lawReachFacts` that built it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and say so in one line.

**Rules.** Follow the standing rule "Replace, never layer": the mismatch wording is deleted with the branch that built it, and the other standing rules in AGENTS.md hold.

**Done when.** A second session plays one year at a drawn place and no law stop on the street names a law of a government outside the player's chain; the pinned test src/director/circumstance-reach.test.ts passes at Port O'Connor, Texas (pa-seed-9320, pa-a).

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/circumstance-reach.test.ts, src/director/law-reaches-tell.test.ts

**Notes.** Words lines deleted, none added. Replaces nation-another-states-law-reaches-nobody only in the scene sense; that item (another state's law moving its own people) stays open.
