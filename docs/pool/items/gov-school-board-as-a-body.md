---
id: gov-school-board-as-a-body
title: "A school board is a body with members, bills and a budget the one body engine reads, so dev mode and play can reach it"
area: gov
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: governing
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** Dev mode drives bills at every legislative body but not at a school board, because the game has no school board as a body: no office, seats, meetings or bills. A place's school board (elected or appointed, with its own budget line and policies) should be a data row the one body engine reads, as a council or a county board is, so a tester and a player can introduce and vote a school bill and read what it did. Seen: Politics shows a place's school board with its members and meetings, and dev mode can introduce and vote a school bill at it. Feeds: dev-mode-trial-verdict-control

**Cause.** Found in code: a search of src for school board, school-board and schoolBoard finds the phrase only in data/benchmarks and wording files (src/core2/data/candidacy/benchmarks.json, src/bench/data/scene-places.json, src/bench/printed-words.ts), and no office, body or seat; `members` in src/core2/modules/legislature.ts and `townSeats` in src/core2/modules/offices.ts take a body from the offices data, so what is missing is the data rows and the school laws they would carry, not a new engine. AGENTS.md: one engine per mechanic.

**Fix.** Add school boards as body rows in the offices data (seats, term, election cycle, meeting schedule) for the places whose records say they have one, from sourced data per place (research first, the place's own law decides if elected or appointed); give the board one budget line the budgets engine already reads; let dev mode's bill page list it with the other bodies. Build no second legislature, meeting or budget engine.

**Time box.** 6 hours

**Rules.** One rule, all 56 places: whether a place has a school board, elected or appointed, comes from sourced data per place and never from a name in code. One engine per mechanic: the board is a data row the one body engine reads, and a per-body code path is a duplicate to delete.

**Done when.** A second session, not the builder, plays buildBenchWorld in two drawn places (names and seeds written down), one with an elected school board and one without any, opens Politics, sees the board's members and meetings in the first and no board in the second, introduces and votes a school bill with dev mode's Hold the vote, and reads who it reached by record id. A test in src/core2 shows both places in a drawn place with its seed, and a body with no row in the data does not appear.

**Waits on.** Nothing for the body rows; any school law it votes on follows the laws matrix. Appointments and confirmations are the existing office-appointments and gov-appointment-record-names-appointee items.

**Files.** src/core2/data/offices,src/core2/modules/offices.ts,src/core2/modules/legislature.ts,src/bench/dev-mode.ts,data/research/offices

**Notes.** Filed under dev-mode-bodies-without-game-code (owner: dev mode cannot reach school boards, courts and appointments). Courts: dev-mode-trial-verdict-control. Appointments: office-appointments, gov-appointment-record-names-appointee.
