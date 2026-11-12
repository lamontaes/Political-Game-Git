---
id: play-dev-person-record-list-prints-object-object
title: "Dev mode's record list on a person's card prints '[object Object]' in every slot, and clicking one opens an empty Trace (Ten Broeck, Kentucky)"
area: play
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/pool-play-dev-person-record-list-prints-object-object
pr: #8570
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, Dev mode on the screen)
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:30:03.916Z
merged-at: 2026-11-11T14:39:47.641Z
branch: claude/pool-play-dev-person-record-list-prints-object-object
---

**What.** With Dev mode on, a person's card has a Records section that should list their latest records, each one opening its Trace. Measured on screen by the Nov 9 audit in Ten Broeck, Kentucky (no seed given): every slot in the list prints "[object Object]", and clicking one opens a Trace that says "kind missing, record null". So the one place a tester can click from a person to the records about them leads nowhere. Fix the class: the list shows each record by its own id, with its kind and date beside it as record data, and a click opens that record's Trace; and `idList` and `idLink` take ids only, so a caller that passes anything else fails in a test and never reaches the screen.

**Cause.** Found in code: `devRecordsSection` in src/bench/ui/dev-records.mjs (line 19; the call at line 31) hands the person view's `records` to `idList` (src/bench/ui/dev-view.mjs, line 28), which expects record ids; `person()` in src/bench/dev-mode.ts (line 2076) returns whole record objects, so each slot prints [object Object] and `traceNode` (src/bench/dev-trace.ts, line 1036) finds nothing and answers kind missing. Measured by the Nov 9 audit in Ten Broeck, Kentucky (no seed).

**Fix.** Show each record by its id with kind and date as record data and open that record's Trace on click; make `idList` and `idLink` accept ids only so a wrong caller fails in a test.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every record the game keeps about a person must open the records and reasons behind it, by record id, from that person's card. The owner's ruling of Oct 14, morning, as the CTO recorded it in `OWNER-DECISIONS.md`: "Anything the tracer cannot answer is a dev-mode item." Owner, Nov 8, about 2:15 a.m., on the dev mode mocks: "remove all those subtexts", so the kind and date sit on the record's own row and no explaining line goes under it.

**Done when.** A second session starts the bench (`npm run bench`, `/play`), leaves the Place field empty so the place is drawn, writes down the place and seed the title shows, turns Dev mode on in Options and runs 30 days from the Calendar's Run panel. It opens the player's own card and the card of one person it clicks in People. In each Records section every slot shows a record id; no slot shows "[object Object]". It clicks three slots on each card, and each opens a Trace headed by that record id that shows the record and its kind, never "missing" and never a null record. It saves a screenshot of one open Trace with the place and seed under it. It then does the same in Ten Broeck, Kentucky (the audit's place; no seed was given, so the seed drawn is written down). A browser check (`src/bench/person-card.browser.mjs` or `src/bench/dev-mode.browser.mjs`) opens a person's card with Dev mode on, fails if the text "[object Object]" appears anywhere on the sheet, clicks the first record and fails if the Trace shows kind "missing"; undoing the fix makes that test fail. The owner plays it: with Dev mode on he opens anyone's card, sees their latest records by id, clicks one and reads what it is and what caused it.

**Waits on.** Nothing.

**Files.** src/bench/ui/dev-records.mjs, src/bench/ui/dev-view.mjs, src/bench/ui/dev-trace-box.mjs, src/bench/dev-mode.ts, src/bench/dev-trace.ts, src/bench/person-card.browser.mjs, src/bench/dev-mode.browser.mjs

**Notes.** From the Fable audit of Nov 9, 2026, Pillar 2, "Dev mode on the screen": a helper drove dev mode through the game's own screens in Ten Broeck, Kentucky, for five months of game time; the lead checked the screenshots cited. The screenshot is `docs/audits/fable-vision-2026-11-09-screens/06-dev-person-records-object-object.jpg` on branch `audit/fable-vision`. The audit's words: "A person's record list prints '[object Object]' in every slot. Clicking one opens a Trace that says 'kind missing, record null'." The audit named no cause; the cause lines above were read on Nov 10 by the session that filed this and match what it saw. Not checked by anyone: whether other dev lists pass objects where ids are expected (the Watch panel's `idList(r.marks, open)` in `src/bench/ui/dev-watch.mjs` line 72 passes mark ids, which are strings). Related items found: `play-dev-trace-answers-why-for-every-record-the-game-names` (what the Trace says once a real id reaches it), `dev-mode-move-dev-page-controls-into-game` (done; it moved this section onto the card). A search of the pool for "object Object" found no item.

Not seen in the game (2026-11-11, second-session-2): Montrose-Ghent, Ohio (drawn), seed 90a76187-ae98-4af3-a656-fce5dcce9b65, main fab03930: dev mode person card Records shows no object text but two slots read 'director null' and 'pending null' instead of a record id; ids otherwise listed and Trace opens

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:19 UTC) on branch claude/pool-play-dev-person-record-list-prints-object-object.

Released (2026-11-11): Already built and merged by another session in #8279 (merged Nov 11 00:51Z); the item is waiting on its status flip and a second session's check, nothing for a builder. Continue on branch claude/pool-play-dev-person-record-list-prints-object-object and pull request #8279.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:30 UTC) on branch claude/pool-play-dev-person-record-list-prints-object-object.
