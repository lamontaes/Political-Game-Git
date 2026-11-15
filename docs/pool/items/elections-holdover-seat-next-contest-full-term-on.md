---
id: elections-holdover-seat-next-contest-full-term-on
title: "A seat held over after an election with no winner next comes up a full term later, not at the office's next regular election"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (seen while tracing tl-c)
---

**What.** At a Vermont place (5005725, seed tl-c), twelve county seats had no filer on Nov 3, 2026. On Feb 1, 2027 the holders held over by law, and each seat's next contest was dated Nov 5, 2030, a full term on. A holdover does not restart the term: the holder serves only until a successor is chosen, and the seat is filled at the office's next regular election for what is left of the term, then comes up again on its normal year. Seen: the election calendar in dev mode and the paper's race list show the held-over seat's next race four years on instead of at the next regular election.

**Cause.** Found in code: `contestFor` in src/core2/modules/elections.ts, when a holder's seat election has passed with no one elected, dates the seat's next election from the holder's term end plus a full term (`termYears`), which restarts the term clock for a holder the law keeps only until a successor is chosen.

**Ruling.** The Account lead, Nov 15, ruling rather than asking the owner: a holdover does not restart the term. The seat's term clock stays where the law put it; the holder stays only until a successor is chosen, and the seat is filled at the office's next regular election for what is left of the term, then comes up again on its normal year. One general rule in the engine, read from the office's own election cycle; a per-state row only where a state does it differently, as an ESTIMATED row labeled from memory.

**Fix.** In `contestFor`, a held-over seat's next contest is the office's next regular election after today (`nextElectionForSeat` from tomorrow), and its winner serves to the end of the term the law set (the held-over term's end plus one term, never a fresh full term from the new election); the seat then comes up on its normal year. Where a state's holdover law names another day, its row in the holdover data read by `holdoverRule` says so, ESTIMATED and labeled from memory. No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One rule, all 56 places: when a held-over seat comes up again is read from the office's own election cycle and, only where a state differs, a law-data row, never a named place in code.

**Done when.** A pinned test at the Vermont place (5005725, seed tl-c) shows the seats left empty in 2026 on the ballot at the office's next regular election, not 2030, with the winner's term ending on the original clock, and the same at one other pinned place with a held-over seat; a second session, on the train or main in a drawn place it names with its seed, sees the held-over seat on the next ballot in the election calendar in dev mode and in the paper's race list.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/office-holdover.ts
