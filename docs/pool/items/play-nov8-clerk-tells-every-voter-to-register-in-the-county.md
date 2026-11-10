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
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C11, partly fixed)
---

**What.** The owner, Nov 8, about 2:20 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "Okay, so it says you have to file your papers. Like you see party endorsements. It's like listing what the town clerk does. It's just a bunch of garbled mess." The CTO's note on the same screenshot (point C11): the clerk says "'in the county where you live' (Connecticut has no county government)". Most of this is fixed on main: the residency refusal now names the place the office serves and the place the player's records put them ("You can only file for {office} if you live in {required}, and your address has you in {actual}.", `data/english/parts/scene-talk.json`, line 130066; `src/core2/modules/elections.ts` fills both from the place's records), the pasted record is cut to the office's name (`spokenOffice` in `src/director/filing-visit.ts`), and "All right, Selectman." is gone. What main still does, read on Nov 10, not measured: the sister refusal for a player who is not registered keeps a fixed piece, "You have to be a registered voter in the county where you want to serve." (`scene-talk.json`, line 130100, move `rule-registered-voter`), written from one state's voter guide. It is said in every place, including places whose records hold no county government and territories that have no counties. Fix the class: every refusal the clerk gives names the place from the rule's own record, the way the residency line now does, and no clerk line carries a fixed word for a kind of place.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: where a person must be registered is read from the place's election rules and said with that place's own name, never the word county fixed in a line for every state, district and territory. No hand-written player text: the fix is a bank piece with a slot filled from the record, graded like any other, not text in code. Owner, Nov 1 (OWNER-DECISIONS, quoted in the playtest check, point C12): bodies are named as the place names them ("Do you mean city council? ... I'm in Northampton, Massachusetts").

**Done when.** A different session starts the bench (`npm run bench`) with dev mode on, starts a new game in a drawn place (place and seed named in the proof) as an adult who is not registered to vote, goes to the filing office while filing is open and takes a screenshot at 1440×900 of the clerk's refusal. The line must name the place the rule's record gives and must not say county unless that record is a county. The same is done in one drawn place in a state whose records hold no county governments and in one territory (places and seeds named). A test reads every clerk piece in the bank and fails on one that names a kind of place outside a slot. The check is then repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The owner plays it: when a clerk turns him down she tells him where he must be registered, by that place's name.

**Files.** data/english/parts/scene-talk.json, src/director/filing-visit.ts, src/core2/modules/elections.ts, src/bench/filing.ts

**Notes.** From the Nov 8 playtest, point C11 (docs/coordination/playtest/2026-11-08-1.md), its row in `2026-11-08-1-check.md` (Check C) and that file's "Also wrong" line: "The other refusal lines say 'county' too: 'registered voter in the county where you want to serve.'" The third part of C11, "There's no primary for this one" where the state's law holds a town primary, is elections-town-races-have-primaries-where-law-says (open; evidence added to it on Nov 10 by another audit helper), not this item. This is a words fix: the Words lead owns the bank, so the PR carries `Review: words`. A second piece for the same move has no place word ("You have to be a registered voter.", line 130560) and may be all that is needed; which piece plays is the engine's pick. Related open: words-filing-clerk-scene-where, words-filing-clerk-line-after-filing. Not verified: nothing here was measured in the running game on Nov 10; whether a not-registered player can reach the counter in play was not checked, so the Done when uses dev mode to set it up through the game's own records.
