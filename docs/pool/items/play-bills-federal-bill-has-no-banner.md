---
id: play-bills-federal-bill-has-no-banner
title: "A federal bill's page has no banner over its chamber's room"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: the Replay of Nov 24 on main 86f796fc (Monserrate, Puerto Rico; Eastshore, Kansas passed)
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
---

**What.** A federal bill opened from Politics > Bills shows no banner over its three columns, while a state or local bill shows its body's number and name over the room that body works in. The Replay saw it on a federal bill in Monserrate, Puerto Rico, and Eastshore, Kansas (state and local bills only) passed. Seen: each federal bill in a drawn place shows its number and the chamber's name over a room picture, like every other bill.

**Cause.** Measured: in Lofall, Washington, seed 4b5a6db2-9477-4230-8def-887e2fae50ee, opening each row of Politics > Bills at 1440x900 gave a banner for HB 1000, SB 5000 and the county ordinance and none for H.R. 1 and H.R. 2. The bill page names its body `federal:us-house` (FEDERAL_HOUSE, src/core2/modules/legislature.ts), but `/api/government/bodies?level=federal` lists the viewer's own state's seats of it as `office:US-WA:us-house`, so the exact id match in `openBill` (src/bench/play.mjs, the `band` lookup) finds no body and returns null.

**Fix.** In the `band` lookup, match a federal body by its kind when the id does not match: strip `federal:` from the bill's body id and take the federal row of that kind (a territory's delegate row, kind `us-house-delegate`, by prefix). The room picture and the body's name already come from the row, so no picture or word is added. Two more of the CTO's Bills send-backs (Nov 24, on the Replay in Monserrate) ride on it: the sponsor line sets `data-no-terms` so the glossary does not underline the word Sponsor, and the Bills sheet takes the `hugs` class so it ends under its content, up to the window's height, instead of leaving the lower half empty with three bills.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the banner reads the same bodies list as the Government screen, so no second source of rooms is made. This is a game, not a spreadsheet: the bill page looks the same at every level.

**Done when.** A second session starts the bench on main, draws a place, opens Politics > Bills at 1440x900 and clicks each federal bill, and sees in a screenshot the banner with the bill's number and the chamber's name over a room picture; a territory is drawn at least once and its federal bill shows the banner too; the word Sponsor carries no underline; and with three bills the panel ends under its content with no empty lower half.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Filed by Box and scroll (lane 2), Nov 24. The glossary underline stays everywhere else (owner, OWNER-DECISIONS Nov 8: "The underline is working. Awesome. Love it, love it, love it."); only the field label on the bill paper is exempt, on the CTO's line of Nov 24.
