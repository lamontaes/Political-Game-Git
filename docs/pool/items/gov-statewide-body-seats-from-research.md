---
id: gov-statewide-body-seats-from-research
title: "A statewide commission or board holds the seats its research row gives, not one"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Words builder W2, Nov 13, while building the seat article Fable A asked for on #8928"
---

**What.** A state's elected commission or board (Oklahoma's Corporation Commission, Alabama's Public Service Commission, Michigan's State Board of Education) is one seat in the game. Its research row gives it several: `"seats": 3` for Oklahoma's commission. The Politics tab lists one person for it, and a card says that person's office as the only seat ("Has served as corporation commission member since 2021.") where a member of a three-seat body is "a corporation commission member". Seen: Vera, Oklahoma, seed `w2o11`, Politics, State, Executive.

**Cause.** Found in code: `stateOffices` in `src/core2/offices-state.ts` builds every statewide executive office with `seats: 1` and one seat row. It never reads the research row's `seats` (`data/research/offices/state-offices.json`, `executives[].seats`), which 11 rows carry.

**Fix.** In `stateOffices`, set the office's `seats` from `executive.seats ?? 1`, and build one seat row per seat, as the chambers do (`index` 0 to n-1, at large). Then check, not assumed: the officials engine seats each seat at the opening through the one term writer, and the race loop in `src/core2/modules/voting.ts` races the office's seats (it has at-large races with several seats). A row whose seats are staggered keeps one election year per seat only if the row says which (else all share the office's year; register a stopgap in `src/core2/data/stopgaps/gov.json`).

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the seats come from the office record, never from a list of titles. Place facts live in data; no state is named in code.

**Done when.** A second session starts a new life in a drawn place whose state has a multi-seat elected commission or board (place and seed named), opens Politics, State, Executive, and sees as many members listed for it as its research row gives. Opening one member's card reads "Has served as a ... member since ..." with "a".

**Waits on.** Nothing.

**Files.** src/core2/offices-state.ts, src/core2/offices-state.test.ts

**Notes.** Filed Nov 13 by Words builder W2. The card's article (`seatOf` in `src/bench/card.ts`, from the office record's seat count) already says "a" for any office whose record holds more than one seat.
