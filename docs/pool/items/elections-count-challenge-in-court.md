---
id: elections-count-challenge-in-court
title: "A count can be fought in court: a challenge to a close result that a judge decides (after early access)"
area: elections
kind: feature
priority: 3
size: M
status: blocked
standard: 2
claimed-by:
pr:
after: elections-contested-count-record
blocked-on: the courts, which come after early access (owner, Nov 10)
model: opus
effort: high
root: rc9-place-facts-one-default
source: "owner, Nov 10, 2026 (the answer on recounts)"
lead: laws
claimed-at:
checked: fable 2026-11-10
---

**What.** The owner ruled on Nov 10, 2026 that a fight over a count like the one in 2000 must be able to happen: "You need a 2000 to be able to happen. And sure, yeah, court after early access." After a recount, the losing side can take the result to court, a judge decides whether the count stands, and the seat waits on that ruling. The simple recount is `elections-contested-count-record`; this item is the court fight on top of it, and it waits for the courts. Seen: the weeks after the player's own close race, where one side files a challenge, the paper follows the case, and the judge's ruling decides who is seated.

**Cause.** Design: the owner's ruling of Nov 10, 2026, and the early-access scope in AGENTS.md ("Courts come after early access"). No court engine exists on main, so there is nothing for a challenge to be filed in.

**Fix.** None until the courts exist. When they do, the challenge is a case in the one court engine that reads the recount record kept by `keepCount` in src/core2/modules/voting.ts, never a second count and never a second court path. This item is rewritten with its fix when the courts' design is on main.

**Time box.** 8 hours for one Opus session as a first guess; the rewrite sets it once the courts exist.

**Rules.** One engine per mechanic: the challenge is a case in the one court engine and reads the one count. No dice: who files follows the loser's traits, the margin and the law in force, and the judge rules from the record, never a roll. One rule, all 56 places: who may challenge and by when is data per place.

**Done when.** A second session, not the builder, plays a drawn place (named, with its seed) to a close race in the running game, sees the losing side file a challenge after the recount, reads the case by record id in dev mode's Trace, and sees the seat filled only after the judge's ruling.

**Waits on.** The courts, which come after early access (owner, Nov 10), and elections-contested-count-record.

**Files.** src/core2/modules/voting.ts (`keepCount`), the court engine's files once they exist
