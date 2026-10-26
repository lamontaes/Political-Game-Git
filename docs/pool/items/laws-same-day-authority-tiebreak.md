---
id: laws-same-day-authority-tiebreak
title: "A state statute and a policy answer that take effect the same day: the answer's enactment always wins the tie"
area: laws
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/same-day-authority
pr: #6120
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T22:39:29.578Z
---

**What.** `localAuthority` in `src/core2/laws-in-force.ts` weighs the state's grant of local authority from two sources: the enactments table, where a policy question's answer lands with a running `sequence`, and the series' own law rows, which enter the comparison with sequence 0. When both take effect the same day, `governs` in `src/rules/laws/law-in-force.ts` compares rank, origin and date, all equal, and then sequence, so the answer's enactment always wins, even when the statute was enacted after it. The labor family test hit it in Ripon, California (seed 791ababc2df0d5d562bd924e6cbc38f44bb664f1). Its day-0 repeal of the authority question and a statute granting the authority took effect the same day, and the council's wage bill was preempted. The test now enacts the grant a day later. The engine still lets the order of enactment on one day decide nothing.

**Rules.** One rule, all 56 places: the later of two same-day state laws on one power governs, whichever table holds it. No dice: the tie is decided by recorded order, never by chance.

**Done when.** In a played world (`buildBenchWorld`, a drawn place where the authority question starts yes), repealing the question and then enacting the statute grant with the same effective date leaves the grant governing a council's wage bill drafted the next day, by the bill's authority record id. A test in `src/core2/` fails before the fix and passes after.

**Files.** src/core2/laws-in-force.ts, src/rules/laws/law-in-force.ts, src/core2/law-wiring-labor.test.ts

**Notes.** Found Oct 25 by the laws lead while fixing the labor family test (#5589).
