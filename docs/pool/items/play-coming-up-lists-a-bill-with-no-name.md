---
id: play-coming-up-lists-a-bill-with-no-name
title: "The council's Coming up list shows a bill as 'Jul 1 2025-11:' with nothing after the colon (Ten Broeck, Kentucky)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-coming-up-lists-a-bill-with-no-name
pr: #8531
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, Dev mode on the screen)
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:40:18.874Z
---

**What.** On the player's own Government screen, each body has a Coming up list: its next meeting, its bills waiting for the floor, and its election dates. Measured on screen by the Nov 9 audit in Ten Broeck, Kentucky (no seed given): after bills were introduced through dev mode, the council's Coming up list read "Jul 1 2025-11:" with nothing after it, a date, something that reads like a second date, a colon and no name. The "2025-11" is the ordinance's own number printed bare, where `spokenDesignation` exists to say it with its form's word ("Ordinance 2025-11"). Fix the class: every place a screen lists a bill (Coming up, the recent votes, Your office) says a bare number with its form's word, names a bill from its sections' own laws when no title was composed, and never prints a label with an empty slot.

**Cause.** Found in code: `comingUpFor` in src/bench/government-bodies.ts (line 211) lists each drafted bill with its number and `billTitleOf(bill)?.title ?? null`; `billTitleOf` (src/english/bill-names.ts, line 178) returns nothing when no section of the bill has a name, and a bill that dev mode's `introduce` (src/bench/dev-mode.ts, line 979) drafts is one bare amount section the namer cannot name; the label `billOnFloor` in src/bench/data/controls.json fills '{number}: {title}' with an empty title. Measured by the Nov 9 audit in Ten Broeck, Kentucky (no seed).

**Fix.** Make one function word a bill row (date, number with its form's word, name of the law it changes) and use it for Coming up, recent votes and Your office; delete the per-screen copies; give dev-introduced bills a nameable section so they carry what a member's own draft carries.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: a screen shows record data only through worded labels, and a bare record number followed by a colon and nothing is a raw field on the player's screen; the words come from the bill-name bank the English engine already has (`player-screen-text`). One rule, all 56 places: every body's bill is worded by its own form (an ordinance, a resolution, a bill) from data, with no body named in the code. Replace, never layer: the three lists share one function that words a bill row, and the per-screen copies are deleted.

**Done when.** A second session starts the bench (`npm run bench`, `/play`), leaves the Place field empty so the place is drawn (drawing again until the place has a town council), writes down the place and seed the title shows, and turns Dev mode on in Options. On Government it introduces a bill for a law amount at the town council from the Bills panel and does not vote on it. The council's Coming up list then shows that bill as a date in words, the number with its form's word, and a name that says which law the bill changes. No row ends in a colon, and no row is a bare number. It presses Pass, and the same bill reads the same way under the body's recent votes and, when the player holds a seat there, on Your office. It saves a screenshot with the place and seed under it. It then repeats in Ten Broeck, Kentucky (the audit's place; no seed was given, so the seed drawn is written down) and sets its screenshot beside the audit's screenshot 10. A test on `comingUpFor` in a drawn place, with the seed named, drafts one bill of each section kind through `introduce` and fails when any row's words are empty, end in a colon or hold a bare number; undoing the fix makes that test fail. The owner plays it: he opens Government after a bill is filed and reads, under Coming up, the day and the name of the bill, such as an ordinance with its number and what it changes.

**Waits on.** Nothing.

**Files.** src/bench/government-bodies.ts, src/bench/play.mjs, src/bench/office.ts, src/bench/data/controls.json, src/english/bill-names.ts, src/bench/dev-mode.ts, src/bench/ui/date-list.mjs, src/bench/government-first-page.browser.mjs

**Notes.** From the Fable audit of Nov 9, 2026, Pillar 2, "Dev mode on the screen": a helper drove dev mode through the game's own screens in Ten Broeck, Kentucky, for five months of game time; the lead checked the screenshots cited. The screenshot is `docs/audits/fable-vision-2026-11-09-screens/10-government-screen-after-laws.jpg` on branch `audit/fable-vision`. The audit's words: "The player's own screen shows a bill with no name. After the dev bills, the council's Coming up list read 'Jul 1 2025-11:' with nothing after it." The audit named no cause and did not say which law the nameless bill was for. The cause lines above were read on Nov 10 by the session that filed this; they show the "2025-11" is the ordinance's bare number and not an ISO-style date, though it reads like one. Not checked by anyone: whether a bill a member drafts in ordinary play can also come out with no title (any bill whose sections all lack a catalog name would); the test in the done-when covers that. Related items found: `play-stop-02-developer-text-on-play-screens` (blocked, priority 1; the parent for raw text on player screens, its parts a and b are done and do not cover this list), `play-first-12-politics-screen-to-mock-a` (done; it built this screen), `dev-mode-bills-panel-policy-questions` (open, priority 3; the same dev drafting path). No open item covered this defect.
