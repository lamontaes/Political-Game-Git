---
id: elections-holdover-seat-next-contest-full-term-on
title: "A seat held over after an election with no winner restarts its term clock instead of being filled for what is left of the term"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-holdover-fix
pr: 9622
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (seen while tracing tl-c)
---

**What.** A seat whose race no one won is held by its old holder until a successor is chosen, and the successor restarted the term clock. At Minnesota (2753080, seed ho-200, opened Oct 20, 2026), the county attorney and coroner races had no filer on Nov 3, 2026. Each seat came up at the next regular election, Nov 7, 2028, but its winner served a full term, Jan 1, 2029 to Jan 3, 2033, and the seat's next race moved to 2032 instead of its normal year, 2030. A hunt over 15 drawn places on Nov 16 found this at 6 of them. Where the office votes only once a term (the Vermont place, 5005725, seed tl-c), the next regular election is the normal year and nothing changes. Seen: in dev mode's trace from the seat, the contests' dates and the winner's term record.

**Cause.** Found in code: `contestFor` in src/core2/modules/elections.ts kept the term clock only when the seat's last contest was still the one it looked up; when the held-over holder's next regular election came first, the contest carried no term end, so the winner's term was a full term from that election (`termEndAfter` in src/core2/modules/voting.ts).

**Ruling.** The Account lead, Nov 15, ruling rather than asking the owner: a holdover does not restart the term. The seat's term clock stays where the law put it; the holder stays only until a successor is chosen, and the seat is filled at the office's next regular election for what is left of the term, then comes up again on its normal year. One general rule in the engine, read from the office's own election cycle; a per-state row only where a state does it differently, as an ESTIMATED row labeled from memory.

**Fix.** In `contestFor`, a holder whose term has ended holds over: the seat's next contest is the office's next regular election, and when that comes before the normal year it carries `termEnd` (the day the normal year's winner takes office) and `heldOverAfter` (the race no one won). takeOffice and the vacancy path read `contestTermEnd`. Dev mode's trace shows the chain: a seat lists its contests, the sooner contest names the race no one won, and that race opens its empty race with the state's rule. No state row is added, since no state is known to differ. No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One rule, all 56 places: when a held-over seat comes up again is read from the office's own election cycle and, only where a state differs, a law-data row, never a named place in code.

**Done when.** A pinned test at Minnesota (2753080, seed ho-200) and Kansas (2058100, seed ho-2) is red without the fix and green with it: the seat left empty in 2026 is on the Nov 7, 2028 ballot for what is left of the term, its winner's term ends the day the 2030 winner takes office, and the seat is on the 2030 ballot; a second session, on the train or main in a drawn place it names with its seed, sees that chain and the winner's shortened term in dev mode's trace from the seat.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/bench/dev-trace.ts, src/core2/held-over-seat.test.ts (new)
