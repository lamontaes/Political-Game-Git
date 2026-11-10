---
id: director-recall-outcome-and-signing-narration
title: "A recall's outcome casts only its organizer as the petitioner; a signed or vetoed bill's scene plays, naming the bill and the executive"
area: director
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-recall-bills
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "Scenes helper, a year at Ophir, Colorado (seed nx1): 9 recall-outcome scenes cast the player as petitioner; bill-signed and veto scenes skipped with 'no narration can be worded'"
claimed-at:
---

**What.** In a played year at Ophir, Colorado (seed nx1), nine `recall-outcome` scenes cast the player as the petitioner of a recall they had no part in, because the recall type bound petitioners to whoever heard the news. The `bill-signed` and `veto` scenes skipped with "no narration for signing-ask can be worded from the records given": the narration pieces say `{executive}` and nothing in the director supplied that fact, and a veto at a venue by day had no narration piece at all.

**Rules.** Wire to the world: the petitioner is the organizer named on the recall's own outcome record, and the executive's post is read from the office record of the bill's body, never typed in code. Replace, never layer: the recall type's cast rule is changed in place.

**Done when.** In a drawn place with a recall (name the place and seed), the outcome record names its organizer and only that person's ledger holds a recall scene for it, cast as petitioner. In a drawn place where an executive acts on another member's bill, the sponsor's signed or vetoed scene composes, carries an `executive` fact from the body's office record, and names the bill. Both are tests in src/director/reads-wrong.test.ts.

**Files.** src/director/data/situation-types.json, src/core2/modules/recalls.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** What a signed or vetoed bill does (its effect, in plain words) is still not in the signing narration; a later line can read the bill's provisions.

**Time box.** 2 hours.

**You will see.** Bills the council passed arrive with the mayor's signature or veto, said in plain words, and a recall only stars the person who started it.

**Screenshot.** The signing and veto scenes' opening paragraphs in a played year.
