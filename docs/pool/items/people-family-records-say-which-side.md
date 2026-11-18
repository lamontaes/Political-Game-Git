---
id: people-family-records-say-which-side
title: "A grandparent, aunt or uncle on the record says which parent's side of the family they are on"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
after:
blocked-on:
pr:
lead: screens
source: 'coordinator note on #9351; owner, Nov 8, 2026: "I''m Mexican and my son is white."'
model: opus
effort: medium
root: none
checked: not yet
---

**What.** A grandparent, aunt or uncle (and their children) is recorded only as "grandparent" or "aunt-or-uncle" of the person, with no mark of which parent they come from. So when the player chooses a look of another origin, the family's origins are worked out again from the parents (`src/core2/family-origin.ts`), but these relatives keep their drawn origin, because nothing says whether they are on the side that took the chosen origin. Seen: in People, the player's mother's mother and father's father cannot be told apart, and a grandparent can look unrelated to the parent they come from.

**Cause.** Found in code: `familyRelation` in `src/core2/closeness.ts` returns only "grandparent" or "aunt-or-uncle" from the `family:*` past facts; the fact holds the other person but not the parent it runs through.

**Fix.** Where the opening family is written, record on each grandparent, aunt or uncle fact the parent it runs through (the id of the player's parent they are the parent or sibling of). Then `familyTakesChosenOrigin` gives such a relative that parent's origin, and the grandparent or aunt or uncle of the parent who kept the drawn origin keeps it. Extend `src/bench/creator-origin.test.ts` with a grandparent on each side.

**Time box.** 4 hours, one Opus session. When it runs out, push what passes and say so.

**Rules.** No dice: the side comes from the record. One engine: births and the opening write the same field. No new stopgap.

**Done when.** A creator life with parents of two origins shows each grandparent, aunt and uncle in the origin of the parent they come from, in three drawn places named with seeds, with before and after People screens at 1440x900; the pinned test covers both sides. A second session creates a life in a place and seed nobody chose, on main, opens People and sees a grandparent drawn like the parent they belong to.

**Waits on.** Nothing.

**On screen.** The People screen's faces for grandparents, aunts and uncles.

**Files.** src/core2/closeness.ts, src/core2/family-origin.ts, the opening family writer in src/core2, src/bench/creator-origin.test.ts.

**Notes.** Filed by hand from #9351 (two-parent look), which leaves these relatives unchanged.
