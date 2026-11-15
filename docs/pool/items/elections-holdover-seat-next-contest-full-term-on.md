---
id: elections-holdover-seat-next-contest-full-term-on
title: "A seat held over after an election with no winner next comes up a full term later, not at the office's next regular election"
area: elections
kind: owner-decision
priority: 3
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

**What.** At a Vermont place (5005725, seed tl-c), twelve county seats had no filer on Nov 3, 2026. On Feb 1, 2027 the holders held over by law, and each seat's next contest was dated Nov 5, 2030. In many states a holdover lasts only until a successor is elected at the office's next regular or general election, which can come sooner. Seen: the election calendar in dev mode shows the held-over seat's next race four years on.

**Cause.** Found in code: `contestFor` in src/core2/modules/elections.ts dates a held-over seat's next election from the holder's term end plus a full term (`termYears`) when the seat's own election has passed with no one elected. The law-data question for a ruling: should a held-over seat next come up at the office's next regular election under the state's holdover law (a data row per state and office kind, read where `holdoverRule` is read), or a full term on as now?

**Fix.** None until ruled. If the state's law says the successor is chosen at the next regular election, the holdover row names it and `contestFor` reads it; otherwise the present rule stands with its citation.

**Time box.** 3 hours, Opus at medium effort, after the ruling.

**Rules.** One rule, all 56 places: when a held-over seat comes up again is a law-data row per state, never a named place in code.

**Done when.** The ruling is recorded and built: a test at the Vermont place and two other drawn places with a held-over seat shows its next contest on the date the state's row gives; a second session, on the train or main in a drawn place it names with its seed, sees that date on the election calendar in dev mode.

**Waits on.** A ruling on the law-data question above.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts
