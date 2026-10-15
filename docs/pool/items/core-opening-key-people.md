---
id: core-opening-key-people
title: "The opening's key people list per the ruling"
area: core
kind: wiring
priority: 2
status: in-pr
claimed-by: claude/core-opening-key-people
pr: #4501
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-15T22:41:25.676Z
---

**What.** The opening needs a ruled list of key people and today it has none that both the opening story and the Politics hub read. Per the owner's Oct 15 afternoon ruling the key people are the president and vice president; the state's legislators; the most powerful person in each chamber (the one chamber where a state has only one); and the player's own representatives (council member, state legislators, U.S. representative and senators). The player would see the opening story and the Politics hub name exactly these people and no others.

**Rules.** No dice: who is key comes from offices and chamber leadership records, never a pick. One rule, all 56 places: unicameral states, territories and D.C. follow the same rule from data. The chain is the acceptance: one key person is followed from the office record to the opening story line and the hub entry. An effect is a read: both consumers read one list.

**Done when.** In a drawn place (a unicameral state in one run, a bicameral in another, named with the seed) the opening story and the Politics hub name exactly this set by record id and nothing else is marked key. A test in src/core2/opening-key-people.test.ts proves the set for three drawn places across the 56. The owner plays it: start a game and see his own representatives and the heads of each chamber named in the opening.

**Files.** src/core2/population.ts, src/core2/modules/leadership.ts, src/director/, docs/coordination/OWNER-DECISIONS.md

**Notes.** Ruling: OWNER-DECISIONS.md, Oct 15 afternoon.
