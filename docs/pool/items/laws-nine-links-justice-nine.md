---
id: laws-nine-links-justice-nine
title: "Nine of the twelve justice laws pass all nine wiring links in a played year (police, corrections and the vote stay with the family)"
area: laws
lead: laws
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by:
pr: "#6012"
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A bounded part of `laws-nine-links-justice`, as the mergers asked for when a family lands a completed subset first. Nine of the family's twelve laws grade wired on all nine links, or not applicable, on the law checker that credits a law only with its own payment: civilian-oversight-of-police, partner-with-federal-immigration-enforcement, end-cash-bail, raise-juvenile-court-age, child-access-prevention, permit-to-carry-concealed, raise-handgun-purchase-age, stand-your-ground and budget-line:fire. The police line (its low-level arrests link), the corrections line (its money, untraced through the treasury's outside accounts) and restore-voting-after-sentence (its turnout link, a stopgap) stay in the family item.

**Rules.** An effect is a read, not a record. The chain is the acceptance: each law is followed to a payer or payee and a journal id with its control-world amount. A registered stopgap never counts.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8), `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade each of the nine laws wired on all nine links or not applicable in `docs/reports/law-wiring-matrix.json`, and `src/core2/law-wiring-justice.test.ts` names, for each of them, its `lawApplied` record id, the journal entry of its money on the account that record names, and whom it reached. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/public-safety.ts, src/core2/law-wiring-justice.test.ts, docs/reports/law-wiring/families/justice-year-US-MI-2666300.json, docs/reports/law-wiring/families/justice-year-US-NE-3149425.json

**Notes.** Laws lead, Oct 25. PR #6012 moves to this item; `laws-nine-links-justice` stays open for the three laws above.

Sent back 2026-10-25 from PR #6012 (branch claude/laws-nine-links-justice, checked 2d3ed4d536): law-wiring-justice.test.ts:364-382 marks missing applied output after play as an absent subject, and lines 435-439 redraw until that output exists; choose eligibility from opening inputs, then fail a missing required producer in the eligible world and retain a real producer-break negative control. The bounded nine-law item and target-account evidence are acknowledged; the three unfinished laws stay on the open umbrella. No local green gate is claimed. Finish on that branch, merge main into it first.

Laws lead, Oct 26: Merger 0's 23:51 send-back fixed at f682dd421c (eligibility from the engine's census before play; records counted open or ended; laws held through the test's phases), with the two CI failures since; back in PR #6012.
