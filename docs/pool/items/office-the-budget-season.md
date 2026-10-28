---
id: office-the-budget-season
title: "The budget season:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr: #5533
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 30 (unchecked checklist line)"
claimed-at:
---

**What.** The local budget is passed without a season: the executive's proposal is not an act at its time of year and the council's budget hearing is not on the calendar. Add the budget season: the mayor or executive proposes the budget at the time the body's data sets, the council holds a hearing on the calendar, and the player acts at each step. The player would notice the proposal arriving in its month, a public hearing with speakers, and the vote that sets next year's lines.

**Rules.** One rule, all 56 places: fiscal year and hearing rules come from place data for all 56 places; An effect is a read, not a record: the council reads the proposal and the hearing reads the lines, and the treasury reads the passed budget at the moment it pays; Ask why: the executive's changes and the council's amendments keep reasons by record id; The chain is the acceptance: follow one budget line from proposal to hearing to vote to the payment that changed and a person it reached; This is a game, not a spreadsheet: each step is one choice at its time, not a form; No dice: the executive's proposal follows requests and revenue, not a roll; No hand-written player text: the hearing and results are worded by the English engine; Replace, never layer: the old budget-passing shortcut is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the executive's proposal act, the hearing on the calendar and the budget vote occur in their season (act, meeting and bill ids), and a treasury payment in the next months reflects an amended line. Tests beside `src/core2/office-day-calendar.test.ts` and `executive.test.ts`. The owner plays it: as mayor, sends a budget and watches the council amend it.

**Files.** src/core2/modules/office-day.ts, src/core2/office-day-calendar.ts, src/core2/modules/executive.ts, src/core2/data/legislature/executive-proposal.json

**Notes.** Sent back 2026-10-20 from PR #5217 (branch claude/political-game-pool-udtiwn): merge conflict with origin/main in code (src/core2/modules/office-day.ts and src/core2/office-day-acts.ts); finish on that branch, merge main into it first. Checklist line from OFFICE-LOCAL.md; verify against main before starting.

Sent back 2026-10-20 from PR #5533 (branch claude/political-game-pool-yucp92-tt): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5217 (branch claude/political-game-pool-udtiwn): Merging current origin/main conflicts in code: src/core2/jobs-benefits.ts, src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts, src/core2/world-transfer.ts, and src/core2/data/candidacy/parameters.json. Resolve those on this branch, preserving current main behavior and every included budget-season/money slice, then rerun only the changed-file checks and the required played-world budget chain. The pool-note conflict is resolvable documentation; it is these code conflicts that prevent this merger from gating the merged result.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5533 (branch claude/political-game-pool-yucp92-tt): `src/core2/modules/legislature.ts:515` invokes all pre-vote hooks directly at the hearing, bypassing the stage selection and hooksRun bookkeeping in runBeforeVote; a scheduled committee/floor pass can therefore run those handlers again on the same bill. Route the hearing through the data-driven stage dispatch and prove each applicable handler runs once. `docs/pool/items/office-the-budget-season.md:20` also requires the proposal/hearing/vote-to-amended-treasury-payment chain by record id in a one-year drawn buildBenchWorld run. The body explicitly says that payment was not newly tested, and the added test only checks the hearing and bill; supply that missing payment/person trace before merge. Morning check blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5533 (branch claude/political-game-pool-yucp92-tt): The returned stage dispatcher fixes the prior hook bookkeeping issue, and the test now reaches an employee, but the amended-budget-to-actual-payment acceptance is still not proved.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5533 (branch claude/political-game-pool-yucp92-tt): The hearing dispatcher, nonempty treasury payment, counterfactual budget amount and completed year are valuable repairs. The final person-payment proof still accepts a zero-payment record: src/core2/office-day-budget-season.test.ts:338-340 selects the first owner draw by firm/date without checking drawnMinor, and :354-361 accepts ownerDraw ?? worker merely because it exists. src/core2/modules/business.ts:1342-1356 writes a draw row even when drawn is zero, so this path can pass with no owner cash transfer and no worker witness; its only owner assertion checks identity. Require a positive owner draw or positive worker payroll payment and verify the actual cash posting reaches that named person. Retain the amended-line/provider assertions, stage bookkeeping and full-year completion; the positive Thompsonville receipt is useful evidence to retain beside drawn coverage. Also refresh the PR body: it still says the treasury payment was not newly tested, while the new code and Fixer comment claim it is. The already completed formatting, lint, release, pool, zero-dice and old-import checks passed, but the remaining gate was stopped after this morning-review blocker; no full gate pass or merge is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5533 (branch claude/political-game-pool-yucp92-tt): the owner-plays-it Done-when row lacks a played bench/browser mayor budget submission and observed council amendment with place/seed; positive cash-posting repair is present; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5533 (branch claude/political-game-pool-yucp92-tt): normal integration of current main 8fed3e04a8 conflicts in production configuration src/core2/data/parameters.json at the appended budgetHearingLeadDays versus current main parameter rows; merge aborted, retain both sides on the source branch before the changed-file gate and required played-mayor proof; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5533 (branch claude/political-game-pool-yucp92-tt): integration conflict and positive cash receipt repaired, but the owner-route Done-when still does not prove a council amendment: the test permits unchanged passage and own drawn Samson year proposed/passed +1000000 unchanged; add a positive council-changed proposal through the office route with amendment reasons and the existing treasury-to-person chain; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (roll-up; children carry the rest).
