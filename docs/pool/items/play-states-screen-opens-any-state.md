---
id: play-states-screen-opens-any-state
title: "One States screen opens any state: its governor, its laws in force, what it changed and the roll call, from the records already kept"
area: play
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-play-states-screen-opens-any-state
pr: #8462
after:
blocked-on:
standard: 2
model: opus
effort: medium
root: rc1-world-outside-town
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "The detail on demand has no door" and "What a player sees")
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:07:57.070Z
---

**What.** The game keeps what other states do, and the player has no way to look. The audit's words: "No screen opens another state, its governor, its legislature or its vote." A player gets a Nation heading in News with one-line items such as "Bottle deposit in New York became law." In the played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af), 54 other states and territories changed 473 laws that no screen could open. Build one States screen from the records already kept, for all 56 places: pick any state or territory and see its governor, the party in each chamber, its laws in force, what it changed and when with the vote count, and open any change to its roll call and sponsor. It is a view only and computes and stores no fact of its own.

**Cause.** Found in code: `rollCallOf` in src/core2/modules/world-legislating.ts (line 1548) builds another state's roll call correctly when asked, and its only callers are the two lines of src/core2/state-sessions.test.ts (lines 82 and 83). `stateLegislators` and `politicsStates` in src/bench/government.ts (lines 107 and 139) list another state's members, but nothing opens its laws, its governor outside election night, what it changed or a roll call. Confirmed by search on Nov 10.

**Fix.** Build one States screen onto the existing state filter in Politics (not beside it), drawn with the one list-beside-detail renderer (`rosterScreen`), that opens any state's governor, chamber party counts, laws changed with dates and vote counts, and each roll call (generated on open, the same every time, kept once seen), all from kept records. Make a Nation item in News open the same change on this screen. The screen reaches further once nation-other-states-never-change-an-amount and gov-other-towns-and-counties-never-meet land, and does not wait for them.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: every label is a control name and every sentence comes from the English engine's banks; the screen shows no record kind, id, ISO date or unrounded number. Replace, never layer: any older state list it replaces is deleted in the same change. One rule, all 56 places: every state, D.C. and each territory opens the same way from its own rows. This is a game, not a spreadsheet: the page tells what a state did in sentences a player can use. Owner, Nov 5: "generate on demand"; Owner, Nov 8: no arrows and no "1 of N" pages anywhere.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`, play at /play) with the Place field empty so the place is a drawn place, writes down the place and seed, and with dev mode's Run on the Calendar plays one year. It opens the States screen, picks a state other than the player's own, and sees its governor by name and party, each chamber's party count and a list of what it changed in the year with dates and vote counts. It opens one change: the roll call lists members voting yes and no, the two lists add up to the count on the row, and the sponsor is named; closed and reopened, the same names show. A Nation item clicked in News opens the same change. Screenshots at 1440x900 of each step carry the place and seed. The named repro, Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year: any of the 54 other states and territories opens and its changes are listed. A browser test opens two states in a drawn place and fails if a roll call does not add up to its count.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/state-sessions.test.ts, src/bench/government.ts, src/bench/handler.ts, src/bench/nation-news.ts, src/bench/archive-words.ts, src/core2/modules/laws.ts, src/core2/modules/officials.ts, src/bench/play.mjs, src/bench/ui/roster-screen.mjs

**Notes.** From the Fable audit, Pillar 3; the audit names it one of two medium pieces worth doing before the country tier: "add one States screen that opens any state's laws, governor and roll calls from the records already kept." One point where the code on main differs from the audit's wording: the Politics screen already has a state filter that lists every sitting member of any state's legislature (`stateLegislators`, tested in `src/bench/government-states.test.ts`), and election night's Nation page lists other states' governor races (`src/bench/nation-governors.test.ts`). So a player can list another state's members; nothing opens that state's laws, its governor outside election night, what it changed or a roll call, and `rollCallOf` still has no caller but its test (confirmed Nov 10 by search). Build this screen onto that filter, not beside it. The audit did not test what the Nation items in the News do when clicked. It reaches further once `nation-other-states-never-change-an-amount` and `gov-other-towns-and-counties-never-meet` land, and it does not wait for them. Related: `words-nation-newsworthy-by-reach-and-ties` (open), `press-wire-other-states-officials` (open), `play-other-states-news-on-screen` (open).
