---
id: play-nov8-clerk-tells-every-voter-to-register-in-the-county
title: "The filing clerk still has a line that says 'in the county where you want to serve' in every place, counties or not (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C11, partly fixed)
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county
---

**What.** The owner, Nov 8, about 2:20 p.m. (v0.94.0, Manchester, Connecticut), on the filing clerk's lines: "It's just a bunch of garbled mess." The CTO's note (point C11): the clerk says "in the county where you live" though Connecticut has no county government. Most of it is fixed: the residency refusal now names the place the office serves and the place the player's records put them. The sister refusal for a player who is not registered still says "You have to be a registered voter in the county where you want to serve." in every place, including places with no county government and territories with no counties. Every refusal the clerk gives should name the place from the rule's own record, and no clerk line should carry a fixed word for a kind of place.

**Cause.** Found in code: the move `state-rule-registered-voter` in data/english/parts/scene-talk.json (lines 130288 to 130291) hardcodes "in the county where you want to serve", while the residency refusal fills its places from records in `src/director/filing-visit.ts` and `src/core2/modules/elections.ts`. A second piece for the same move (line 130744) has no place word. Read on Nov 10, not measured in the running game.

**Fix.** Rewrite the registered-voter refusal as a bank piece with a slot for the place the rule's record names, the way the residency line does, and have `src/director/filing-visit.ts` fill it from the rule's record. Add a test that reads every clerk piece in the bank and fails on one that names a kind of place outside a slot. Story writes the new piece (every line in data/english/parts/ is Story's, owner's ruling of Nov 10): send the Words line the slot it needs and build the test and the fill against the key it gives back.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: where a person must be registered is read from the place's election rules and said with that place's own name, never the word county fixed in a line for every state, district and territory. No hand-written player text: the fix is a bank piece with a slot filled from the record, graded like any other, not text in code.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`) with dev mode on, starts a new game in a drawn place (place and seed named) as an adult who is not registered to vote, goes to the filing office while filing is open and takes a screenshot at 1440x900 of the clerk's refusal: it names the place the rule's record gives and does not say county unless that record is a county. The same is done in one drawn place whose records hold no county government and in one territory (places and seeds named). The test over the clerk's bank pieces passes. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/filing-visit.ts, src/core2/modules/elections.ts, src/bench/filing.ts

**Notes.** From the Nov 8 playtest, point C11 (docs/coordination/playtest/2026-11-08-1.md), its row in `2026-11-08-1-check.md` (Check C) and that file's "Also wrong" line: "The other refusal lines say 'county' too: 'registered voter in the county where you want to serve.'" The third part of C11, "There's no primary for this one" where the state's law holds a town primary, is elections-town-races-have-primaries-where-law-says (open; evidence added to it on Nov 10 by another audit helper), not this item. This is a words fix: the Words lead owns the bank, so the PR carries `Review: words`. A second piece for the same move has no place word ("You have to be a registered voter.", line 130560) and may be all that is needed; which piece plays is the engine's pick. Related open: words-filing-clerk-scene-where, words-filing-clerk-line-after-filing. Not verified: nothing here was measured in the running game on Nov 10; whether a not-registered player can reach the counter in play was not checked, so the Done when uses dev mode to set it up through the game's own records.

Released (2026-11-11): Blocked on Story: the fix is a new bank piece with a place slot in data/english/parts/scene-talk.json (move state-rule-registered-voter, lines 130288-130291 and 130744), which only the Story session writes. Slot needed: the place word the rule's record names, filled by src/director/filing-visit.ts as the residency line does. The test that fails a clerk piece naming a kind of place outside a slot would be red on main until that piece exists, so it cannot land first. Continue on branch claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:02 UTC) on branch claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county.

Released (2026-11-11): Not built: the fix is a new bank piece for the state-rule-registered-voter refusal in data/english/parts/scene-talk.json (Story only); the test over every clerk piece would be red until Story writes it and returns the slot key, so the fill and the test cannot land green first. Needs the Words line to send the key. Continue on branch claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:02 UTC) on branch claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county.

Released by next (2026-11-13): no push to claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county since 2026-11-11 06:02 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-play-nov8-clerk-tells-every-voter-to-register-in-the-county.
