# A10 missing offense ranges — CTO Oct 2 04:37 R4

This inventories the current production named-offense catalog against `data/research/justice/sentencing-ranges-2026.json`. It is a research queue, not a statutory certification or runtime admission. No offense is mapped to another offense.

| Named offense | Sourced place rows | Estimated place rows | Missing place rows |
|---|---:|---:|---:|
| `campaign-funds-personal-use` | 0 | 0 | 56 |
| `crime:assault` | 46 | 10 | 0 |
| `crime:robbery` | 46 | 10 | 0 |
| `crime:burglary` | 46 | 10 | 0 |
| `crime:vandalism` | 46 | 10 | 0 |

## Missing ranges — PENDING

`campaign-funds-personal-use` lacks a sentencing row in every one of the 56 places:

`US-AK`, `US-AL`, `US-AR`, `US-AS`, `US-AZ`, `US-CA`, `US-CO`, `US-CT`, `US-DC`, `US-DE`, `US-FL`, `US-GA`, `US-GU`, `US-HI`, `US-IA`, `US-ID`, `US-IL`, `US-IN`, `US-KS`, `US-KY`, `US-LA`, `US-MA`, `US-MD`, `US-ME`, `US-MI`, `US-MN`, `US-MO`, `US-MP`, `US-MS`, `US-MT`, `US-NC`, `US-ND`, `US-NE`, `US-NH`, `US-NJ`, `US-NM`, `US-NV`, `US-NY`, `US-OH`, `US-OK`, `US-OR`, `US-PA`, `US-PR`, `US-RI`, `US-SC`, `US-SD`, `US-TN`, `US-TX`, `US-UT`, `US-VA`, `US-VI`, `US-VT`, `US-WA`, `US-WI`, `US-WV`, `US-WY`.

Research must identify the applicable federal/state campaign-finance offense, monetary/intent predicates, court jurisdiction, statutory grade, incarceration bounds and operative dates. Existing `justice/finding-referral.ts` still refers the named campaign-funds offense; that production writer is unchanged. Unknown ranges leave sentencing pending. The public `courtCasesOf` record remains visible with its actual offense label and null sentenced-event reference.

The four crime rows still have applicability limits: robbery is the unenhanced base charge, the other rows require actual saved grade/fact evidence, grid priors and fractional-day conversions may refuse a binding. Having a research row does not admit every case. Arbitrary uncatalogued strings accepted by the referral input also remain unsupported; this list does not invent an exhaustive legal offense catalog.

## Fixture use

The three clemency fixtures explicitly author `crime:vandalism` referrals with saved charge-grade evidence and actual seated judges’ authored fixture principles; they do not reinterpret campaign-money findings. Existing actual due items, judge decisions, saved sentence and clemency writers remain authoritative. Added drawn-place cases assert that campaign-funds referrals remain visible and unsentenced through reload/repeat. The before-repeat assertions passed; the executed repeat currently fails because advanceProsecutions attempts to append an already-saved sentence-decision stable key. Audit owns the requested reuse contract; this is not a replay pass.

The current drawn clemency places IA/LA/TX/ND/NJ/MN/KS have sourced vandalism rows. CT has an already-published `ESTIMATED FROM AVERAGE` vandalism row: its method/contributors and lack of statutory citation remain explicit. This relies on the prior all56 sourced-or-labeled-estimate admission, not a claim that CT is newly sourced. If R4 requires strictly statutory-sourced fixtures, CT requires a CTO/research decision; do not substitute a different place merely to pass.

## Authored fixture inputs and clock scope

The existing judiciary-opening compiler supplies actual court seats, tenures and judge person records. The fixture records firm-sentencing principles on those judges through `recordPrinciples`; strength 1 is an explicit authored test input, not a measured effect or sentencing amount. `recordWorldEvent` records the named vandalism charge grade, and the referral points to that saved evidence. The existing judge decision chooses and saves the actual sentence.

These isolated court proofs cancel unrelated original scheduled commitments but preserve their records. Their clock is the existing `advanceWorld` with every canonical due-handler lookup; the test adapter omits the unrelated ordinary-life routine. No due kind is silently ignored and no new game clock is introduced. The Kansas advisory fixture petitions at the actual sentence start so its sourced deadline falls within the short term; early/deadline assertions remain unchanged.

## Executed checkpoint and remaining contracts

At source `29c3151f6e86f711a2947f0affbcaa097000b8eb`, the complete three changed test files produced **13 PASS / 5 FAIL / 6 SKIP**, plus three before-all failures (LA/TX/CT), in 32.09 seconds. Activation passed 4/4; the required-body pending, Kansas advisory-deadline and sentence-expiry tests passed 3/3. Scoped three-root types reported zero diagnostics and changed lint/format passed. These are team checks, not an official gate.

A bounded decision-file diagnostic preserves the original assertions and adds actual saved-route evidence to their failure messages. It produced 6 PASS / 6 SKIP plus the same three setup failures in 24.16 seconds. LA/TX/CT each saved a six-month vandalism sentence; their half-service petitions waited for a required unseated board and lapsed at sentence end. A sourced offense cannot create board members or votes. The remaining fixture contract is an actual board seating/decision producer, or explicit CTO disposition of those same drawn cases as pending controls. No passing place is substituted and no board vote is invented.

The five campaign-funds tests pass their pre-repeat visible-case/no-sentence checks, then fail replay on an already-saved sentence-decision trace key at `prosecution.ts:875`. Audit has the exact append-only decision reuse question. Their failing assertions remain.

Required static audit scans: pinned main `45cc5ed6d13fea1462672c95fdf5ea902bd9c049` and this branch both report A10 **5/5**, with no flip; the fixture repair is a behavioral-proof prerequisite. Static counts do not close the runtime gaps. An earlier ordinary-day attempt was explicitly stopped with exit 130 and is **NOT COMPLETED**, not a pass. Earlier failures and stock limits remain preserved in the PR receipts. No full suite, browser playtest or official gate was run.
